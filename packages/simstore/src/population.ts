// Deterministic synthetic population for the storage study. The leaves stand in
// for committed-accounting transaction leaves (documented as such); they are
// produced from a fixed seed so the study is fully reproducible. Each leaf is
// NONCE-BLINDED to match the specified artefact (Section 5.1): the preimage is a
// canonical field encoding carrying an 8-byte value and a 32-byte per-field nonce.
// Nonce-blinding changes only the bytes hashed at each leaf; the number of leaves,
// the tree height, the proof sizes, and the node count are unchanged, so the
// measured storage and retrieval figures are unaffected by the nonce, while the
// measured artefact is now the nonced one.
import type { Hash, Txid } from '@vaa/bsv';
import { hashLeaf, TxidOps } from '@vaa/bsv';
import { serialiseField, type AccountingField } from '@vaa/evidence';
import type { IndexKey } from '@vaa/proofstore';

export const SEED = 0x12345678; // recorded here and in docs/REPRODUCIBILITY.md

function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) >>> 0;
    s = Math.imul(s ^ (s >>> 12), 0x297a2d39) >>> 0;
    return (s ^ (s >>> 15)) >>> 0;
  };
}

export function deterministicLeaves(seed: number, n: number): Hash[] {
  const next = prng(seed);
  const out: Hash[] = [];
  for (let i = 0; i < n; i++) {
    const value = new Uint8Array(8);
    for (let j = 0; j < 8; j++) value[j] = next() & 0xff;
    const nonce = new Uint8Array(32);
    for (let j = 0; j < 32; j++) nonce[j] = next() & 0xff;
    const field: AccountingField = { tag: 'f', value, nonce };
    out.push(hashLeaf(serialiseField(field)));
  }
  return out;
}

export function deterministicSample(seed: number, n: number, q: number): number[] {
  // Evenly spaced, deterministic indices into [0, n).
  const count = Math.min(n, q);
  const step = Math.max(1, Math.floor(n / count));
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push((i * step) % n);
  void seed;
  return out;
}

function txidForIndex(i: number): Txid {
  const t = new Uint8Array(32);
  t[0] = i & 0xff;
  t[1] = (i >> 8) & 0xff;
  t[2] = (i >> 16) & 0xff;
  t[3] = (i >> 24) & 0xff;
  const r = TxidOps.fromInternalBytes(t);
  if (!r.ok) throw new Error('unreachable: 32-byte txid');
  return r.value;
}

export function keyForIndex(i: number): IndexKey {
  return { txid: txidForIndex(i), direction: 'output', position: i, blockPosition: i };
}
