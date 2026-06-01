// THE FIELD MODEL (core). An accounting transaction is an ordered set of named
// fields; EACH FIELD IS A LEAF in a Merkle tree built over that one accounting
// transaction's fields (intra-transaction). The root commits the whole field set
// and is carried as pushdata in ONE Bitcoin (BSV) transaction (never OP_RETURN);
// the root may be held in parts across the transaction's scripts.
import type { Hash, Script, Result, VerifyResult } from '@vaa/bsv';
import {
  hashLeaf,
  HashOps,
  concat,
  writeVarInt,
  readVarInt,
  buildScriptDataEnvelope,
  recognise,
} from '@vaa/bsv';
import { computeRoot, merkleProof, verifyProof } from '@vaa/merkle';
import type { MerkleProof, MerkleVerifyReason } from '@vaa/merkle';
import type { EvidenceObject } from './schema.js';
import type { EvidenceError } from './errors.js';
import { schemaInvalid, deserialiseTruncated } from './errors.js';

export interface AccountingField {
  tag: string;
  value: Uint8Array;
  // Optional 32-byte per-field nonce (blinding). When present it is folded into
  // the leaf so that low-entropy field values cannot be confirmed by dictionary
  // search against the public commitment. It is disclosed only when the field is
  // disclosed; the nonces of undisclosed fields are never revealed.
  nonce?: Uint8Array;
}

export type AccountingKind = 'invoice' | 'journal' | 'ledgerPosting' | 'reconciliation' | 'statementLines';

export interface AccountingTransaction {
  kind: AccountingKind;
  fields: AccountingField[];
}

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const VALUE_VERSION = 0x01;
const ROOT_PART_MAGIC = Uint8Array.of(0x56, 0x41, 0x52, 0x50); // "VARP" — field-tree root part

const KIND_TO_BYTE: Record<AccountingKind, number> = {
  invoice: 1,
  journal: 2,
  ledgerPosting: 3,
  reconciliation: 4,
  statementLines: 5,
};
const BYTE_TO_KIND: Record<number, AccountingKind> = {
  1: 'invoice',
  2: 'journal',
  3: 'ledgerPosting',
  4: 'reconciliation',
  5: 'statementLines',
};

// Canonical value encodings (a leading version byte, then the value bytes;
// numbers are fixed-width 8-byte big-endian minor units).
export function numericValue(n: bigint): Uint8Array {
  const out = new Uint8Array(9);
  out[0] = VALUE_VERSION;
  let v = ((n % (1n << 64n)) + (1n << 64n)) % (1n << 64n);
  for (let i = 8; i >= 1; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

export function stringValue(s: string): Uint8Array {
  return concat(Uint8Array.of(VALUE_VERSION), encoder.encode(s));
}

// The canonical (tag, value [, nonce]) encoding that is hashed as a leaf.
// Without a nonce the encoding is varint(len(tag)) ‖ tag ‖ varint(len(value)) ‖ value
// (unchanged, so existing commitments and vectors are preserved). When a 32-byte
// nonce is attached, a 0x01 marker and the 32 nonce bytes are appended, blinding
// the leaf against dictionary confirmation of low-entropy values. The nonce is
// disclosed only when the field is disclosed.
export function serialiseField(field: AccountingField): Uint8Array {
  const tagBytes = encoder.encode(field.tag);
  const head = concat(writeVarInt(BigInt(tagBytes.length)), tagBytes, writeVarInt(BigInt(field.value.length)), field.value);
  if (field.nonce === undefined) {
    return head;
  }
  if (field.nonce.length !== 32) {
    throw new Error('field nonce must be exactly 32 bytes');
  }
  return concat(head, Uint8Array.of(0x01), field.nonce);
}

export function deserialiseField(bytes: Uint8Array): Result<AccountingField, EvidenceError> {
  const tagLen = readVarInt(bytes, 0);
  if (!tagLen.ok) return { ok: false, error: deserialiseTruncated() };
  let off = tagLen.value.nextOffset;
  const tn = Number(tagLen.value.value);
  if (off + tn > bytes.length) return { ok: false, error: deserialiseTruncated() };
  let tag: string;
  try {
    tag = decoder.decode(bytes.subarray(off, off + tn));
  } catch {
    return { ok: false, error: schemaInvalid('tag', 'invalid UTF-8') };
  }
  off += tn;
  const valLen = readVarInt(bytes, off);
  if (!valLen.ok) return { ok: false, error: deserialiseTruncated() };
  off = valLen.value.nextOffset;
  const vn = Number(valLen.value.value);
  if (off + vn > bytes.length) return { ok: false, error: deserialiseTruncated() };
  const value = Uint8Array.from(bytes.subarray(off, off + vn));
  off += vn;
  // Optional trailing nonce: 0x01 marker followed by exactly 32 bytes.
  if (off < bytes.length) {
    if (bytes[off] === 0x01 && off + 1 + 32 <= bytes.length) {
      const nonce = Uint8Array.from(bytes.subarray(off + 1, off + 1 + 32));
      return { ok: true, value: { tag, value, nonce } };
    }
    return { ok: false, error: deserialiseTruncated() };
  }
  return { ok: true, value: { tag, value } };
}

export function fieldLeaf(field: AccountingField): Hash {
  return hashLeaf(serialiseField(field));
}

// Attach a 32-byte nonce to a field, blinding its leaf. If `nonce` is omitted a
// cryptographically random one is generated. Use this when committing fields whose
// values are low-entropy (dates, codes, rounded amounts, common totals) so that an
// observer cannot confirm a guessed value against the public commitment.
export function withNonce(field: AccountingField, nonce?: Uint8Array): AccountingField {
  const n = nonce ?? randomNonce();
  if (n.length !== 32) throw new Error('field nonce must be exactly 32 bytes');
  return { tag: field.tag, value: field.value, nonce: n };
}

// Attach fresh random nonces to every field in a list (confidentiality-preserving
// commit path). Fields that already carry a nonce are left unchanged.
export function withNonces(fields: AccountingField[]): AccountingField[] {
  return fields.map((f) => (f.nonce === undefined ? withNonce(f) : f));
}

export function randomNonce(): Uint8Array {
  const g = (globalThis as unknown as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  const out = new Uint8Array(32);
  if (g && typeof g.getRandomValues === 'function') {
    g.getRandomValues(out);
    return out;
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodeCrypto = require('node:crypto') as { randomFillSync: (b: Uint8Array) => Uint8Array };
  nodeCrypto.randomFillSync(out);
  return out;
}

export function fieldLeaves(tx: AccountingTransaction): Hash[] {
  return tx.fields.map((f) => fieldLeaf(f));
}

export function fieldTreeRoot(tx: AccountingTransaction): Result<Hash, EvidenceError> {
  const root = computeRoot(fieldLeaves(tx));
  if (!root.ok) return { ok: false, error: schemaInvalid('fields', 'an accounting transaction needs at least one field') };
  return { ok: true, value: root.value };
}

// Map a typed evidence object to its standard tagged field set.
export function expandToFields(obj: EvidenceObject): AccountingField[] {
  switch (obj.type) {
    case 'invoice':
      return [
        { tag: 'invoice.id', value: stringValue(obj.id) },
        { tag: 'invoice.counterparty', value: stringValue(obj.counterparty) },
        { tag: 'invoice.net', value: numericValue(obj.net) },
        { tag: 'invoice.tax', value: numericValue(obj.tax) },
        { tag: 'invoice.discount', value: numericValue(obj.discount) },
        { tag: 'invoice.gross', value: numericValue(obj.gross) },
      ];
    case 'payment':
      return [
        { tag: 'payment.id', value: stringValue(obj.id) },
        { tag: 'payment.counterparty', value: stringValue(obj.counterparty) },
        { tag: 'payment.amount', value: numericValue(obj.amount) },
      ];
    case 'ledgerEntry':
      return [
        { tag: 'ledger.id', value: stringValue(obj.id) },
        { tag: 'ledger.account', value: stringValue(obj.account) },
        { tag: 'ledger.debit', value: numericValue(obj.debit) },
        { tag: 'ledger.credit', value: numericValue(obj.credit) },
      ];
    case 'reconciliationItem':
      return [
        { tag: 'recon.id', value: stringValue(obj.id) },
        { tag: 'recon.bookAmount', value: numericValue(obj.bookAmount) },
        { tag: 'recon.adjustment', value: numericValue(obj.adjustment) },
      ];
  }
}

// CARRIAGE IN ONE BITCOIN (BSV) TRANSACTION (no OP_RETURN, ever). scripts[0]
// carries the whole field set; scripts[1..2] carry the 32-byte root held in two
// parts. See docs/DECISIONS.md D5.
// HEADER item carried on-chain: kind, field count, and the field-tree root. The
// field items themselves are NOT carried on-chain in the confidentiality-preserving
// mode; they are retained off the medium and disclosed selectively. This function
// therefore emits only commitment material: a HEADER envelope plus two ROOT-PART
// envelopes that reassemble to the same root.
const HEADER_MAGIC = Uint8Array.of(0x56, 0x41, 0x48, 0x44); // "VAHD" — commitment header

export function serialiseCommitmentHeader(kind: AccountingKind, fieldCount: number, root: Hash): Uint8Array {
  const rootBytes = HashOps.toInternalBytes(root);
  return concat(
    HEADER_MAGIC,
    Uint8Array.of(0x01),                 // header version
    Uint8Array.of(KIND_TO_BYTE[kind]),   // kind
    (() => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, fieldCount, false); return b; })(),
    rootBytes,                            // 32-byte root (internal order)
  );
}

export function buildAccountingTx(
  tx: AccountingTransaction,
): Result<{ lockingScripts: Script[]; fieldTreeRoot: Hash }, EvidenceError> {
  // Confidentiality-preserving mode requires every committed field to carry a nonce,
  // so that low-entropy values cannot be confirmed by dictionary search.
  for (const f of tx.fields) {
    if (f.nonce === undefined) {
      return { ok: false, error: schemaInvalid('fields', 'every field must carry a nonce in the confidentiality-preserving commitment path; use withNonce()') };
    }
  }
  const root = fieldTreeRoot(tx);
  if (!root.ok) return { ok: false, error: root.error };

  // HEADER carries kind, field count, and root — NOT the field items.
  const header = serialiseCommitmentHeader(tx.kind, tx.fields.length, root.value);
  const env0 = buildScriptDataEnvelope(header);
  if (!env0.ok) return { ok: false, error: schemaInvalid('header', 'commitment header too large for one envelope') };

  const rootBytes = HashOps.toInternalBytes(root.value);
  const part0 = concat(ROOT_PART_MAGIC, Uint8Array.of(0x00), rootBytes.subarray(0, 16));
  const part1 = concat(ROOT_PART_MAGIC, Uint8Array.of(0x01), rootBytes.subarray(16, 32));
  const env1 = buildScriptDataEnvelope(part0);
  const env2 = buildScriptDataEnvelope(part1);
  if (!env1.ok || !env2.ok) return { ok: false, error: schemaInvalid('root', 'root part too large for one envelope') };

  return { ok: true, value: { lockingScripts: [env0.value.lockingScript, env1.value.lockingScript, env2.value.lockingScript], fieldTreeRoot: root.value } };
}

// Parse the on-chain commitment envelope. Returns ONLY commitment material —
// the kind, field count, and root — never the field items, which are not on-chain.
export function parseCommitmentEnvelope(scripts: Script[]): Result<{ kind: AccountingKind; fieldCount: number; root: Hash }, EvidenceError> {
  if (scripts.length === 0) return { ok: false, error: schemaInvalid('scripts', 'no scripts') };
  const payload = recognise(scripts[0] as Script);
  if (!payload.ok) return { ok: false, error: schemaInvalid('scripts', 'first script is not a data envelope') };
  const b = payload.value;
  // HEADER_MAGIC(4) version(1) kind(1) fieldCount(4) root(32)
  if (b.length < 4 + 1 + 1 + 4 + 32) return { ok: false, error: deserialiseTruncated() };
  for (let i = 0; i < 4; i++) if (b[i] !== HEADER_MAGIC[i]) return { ok: false, error: schemaInvalid('header', 'not a commitment header') };
  const kind = BYTE_TO_KIND[b[5] as number];
  if (kind === undefined) return { ok: false, error: schemaInvalid('kind', `unknown kind byte ${b[5]}`) };
  const fieldCount = new DataView(b.buffer, b.byteOffset + 6, 4).getUint32(0, false);
  const rootRes = HashOps.fromInternalBytes(b.subarray(10, 42));
  if (!rootRes.ok) return { ok: false, error: schemaInvalid('root', 'bad root bytes') };
  return { ok: true, value: { kind, fieldCount, root: rootRes.value } };
}

// OFF-CHAIN retained record. The record-holder keeps the full set of field items
// (the canonical preimages) off the public medium. This serialisation is the
// holder's private bundle, NOT what is carried on-chain; the on-chain envelope is
// only the commitment header (see buildAccountingTx / parseCommitmentEnvelope).
export function serialiseRetainedRecord(tx: AccountingTransaction): Uint8Array {
  const parts: Uint8Array[] = [Uint8Array.of(0x01), Uint8Array.of(KIND_TO_BYTE[tx.kind]), writeVarInt(BigInt(tx.fields.length))];
  for (const f of tx.fields) {
    const fb = serialiseField(f);
    parts.push(writeVarInt(BigInt(fb.length)), fb);
  }
  return concat(...parts);
}

export function parseRetainedRecord(bytes: Uint8Array): Result<AccountingTransaction, EvidenceError> {
  if (bytes.length < 2 || bytes[0] !== 0x01) return { ok: false, error: deserialiseTruncated() };
  const kind = BYTE_TO_KIND[bytes[1] as number];
  if (kind === undefined) return { ok: false, error: schemaInvalid('kind', `unknown kind byte ${bytes[1]}`) };
  const count = readVarInt(bytes, 2);
  if (!count.ok) return { ok: false, error: deserialiseTruncated() };
  let off = count.value.nextOffset;
  const n = Number(count.value.value);
  const fields: AccountingField[] = [];
  for (let i = 0; i < n; i++) {
    const flen = readVarInt(bytes, off);
    if (!flen.ok) return { ok: false, error: deserialiseTruncated() };
    const fstart = flen.value.nextOffset;
    const fn = Number(flen.value.value);
    if (fstart + fn > bytes.length) return { ok: false, error: deserialiseTruncated() };
    const fieldResult = deserialiseField(bytes.subarray(fstart, fstart + fn));
    if (!fieldResult.ok) return fieldResult;
    fields.push(fieldResult.value);
    off = fstart + fn;
  }
  return { ok: true, value: { kind, fields } };
}

// PER-FIELD SELECTIVE DISCLOSURE.
export function discloseField(
  tx: AccountingTransaction,
  fieldIndex: number,
): Result<{ field: AccountingField; proof: MerkleProof; root: Hash }, EvidenceError> {
  const field = tx.fields[fieldIndex];
  if (field === undefined) return { ok: false, error: schemaInvalid('fieldIndex', 'out of range') };
  const leaves = fieldLeaves(tx);
  const proof = merkleProof(leaves, fieldIndex);
  if (!proof.ok) return { ok: false, error: schemaInvalid('fieldIndex', 'out of range') };
  const root = computeRoot(leaves);
  if (!root.ok) return { ok: false, error: schemaInvalid('fields', 'empty') };
  return { ok: true, value: { field, proof: proof.value, root: root.value } };
}

export function verifyDisclosedField(field: AccountingField, proof: MerkleProof, root: Hash): VerifyResult<MerkleVerifyReason> {
  return verifyProof(fieldLeaf(field), proof, root);
}
