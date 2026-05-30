REBUILD_SPEC.md — Full engineering specification

Build instruction for the agent, run locally. This is the complete specification for a BSV-native, enterprise-grade implementation of two patents. Build every package, type, function, error, algorithm, and test described here, in full. No stubs, no placeholders, no "to be implemented", no declared-but-unimplemented function, no empty test. Where this document specifies a signature, implement that signature exactly; where it specifies an algorithm, implement those steps exactly; where it enumerates test cases, write every one. Expect a large codebase.

================================================================================
PART 0 — UNIVERSE, SCOPE, AND ABSOLUTE RULES
================================================================================

0.0 What this is. This is an ACCOUNTING AND AUDIT EVIDENCE solution — for financial audit, tax, and assurance.
It is NOT a cryptography project. It is built for auditors, tax authorities, regulators, and preparers who must
be able to examine the genuine underlying records that support a financial assertion. Every design choice serves
that purpose: producing admissible, examinable audit evidence about real accounting records.

The evidence mechanism is SELECTIVE DISCLOSURE, and selective disclosure is the ONLY acceptable mechanism here.
When an assertion is examined, the system discloses the actual accounting records needed for that specific
assertion — and nothing about any other record. The examiner sees the real figures under examination, anchored
immutably and verifiably on the Bitcoin (BSV) chain, while unrelated records stay undisclosed.

Zero-knowledge proofs, hidden-value commitments, range proofs, and any "prove the numbers are right without
showing them" construction DO NOT PROVE ANYTHING for audit or tax purposes — that is the entire point, and it is
the reason they are excluded. Such a construction demonstrates only a mathematical relationship among concealed
numbers; it does not establish that a figure is real, that it ties to a genuine transaction, or that the record
is authentic and examinable. "The hidden values satisfy this equation" is not proof of anything an auditor, a
tax authority, or a court can rely on, because the records themselves are never produced. This is not a weaker
grade of evidence — it is NOT EVIDENCE AT ALL. In audit and tax, proof means the genuine record is produced and
examined. Selective disclosure does exactly that: it produces the actual records under examination. Hidden-value
cryptography categorically cannot, so it is not used anywhere in this system. This is not an anarchist or
privacy-maximalist crypto exercise; it is accounting infrastructure. Build it as such throughout: naming,
documentation, examples, and the security/trust model all speak the language of audit evidence, not of
cryptographic privacy.

0.1 Universe. BSV (Bitcoin SV) is Bitcoin — the original Bitcoin protocol — and is the entire technical universe of this project. The name "Bitcoin" is correct and may be used to refer to BSV. What is forbidden is any reference to, dependency on, or feature of the BTC fork or its ecosystem, or of any other altcoin/fork — because those are not this chain. Nothing in source, comments, documentation, dependencies, transitive dependencies, the lockfile, configuration, fixtures, vector filenames, commit messages, or example data may name, imply, depend on, or use the BTC fork or any other fork/altcoin, their software, their libraries, or their fork-specific features. The elliptic curve is secp256k1, Bitcoin's curve, referred to without altcoin/Blockstream attribution. Forbidden tokens anywhere in the project: btc, "bitcoin core", segwit, taproot, lightning, cltv, csv, op_checklocktimeverify, op_checksequenceverify, satoshi (as a unit name — use "minor units"), blockstream, rust-bitcoin, bitcoin-private, pedersen, bulletproof, "block 170", "hal finney". Note: the token "bitcoin" by itself is PERMITTED (it is BSV's correct name); only the fork-specific and altcoin-ecosystem tokens above are forbidden. The unit of value is "minor units".

0.2 Scope and the CORE DATA MODEL. This is the heart of the system; read it carefully, because earlier framings
that treated the Merkle tree as a block tree of transaction identifiers were WRONG. The correct model:

  An accounting transaction — an invoice, a journal entry, a ledger posting, a reconciliation, a financial
  statement line set — has a set of STANDARD FIELDS (for an invoice, e.g. invoice number, date, supplier,
  customer, line descriptions, line net amounts, tax codes, tax amounts, discounts, gross, currency, terms;
  for a journal entry, the account, debit, credit, narrative, period; and so on). An accounting transaction can
  carry hundreds or thousands of such fields.

  EACH FIELD IS A LEAF in a standard Merkle tree built over that one accounting transaction's fields. The tree
  is INTRA-transaction: its leaves are the fields of a single accounting transaction, NOT transaction identifiers
  in a block. The Merkle ROOT commits the entire field set of that accounting transaction.

  The whole structure — the field data and the Merkle commitment over it — is carried inside a SINGLE Bitcoin
  (BSV) transaction, using the full Bitcoin script language (data placed as pushdata in script). This is not
  digital cash; Bitcoin (BSV) is a full scripting platform, and the accounting fields and their Merkle structure
  live in script. OP_RETURN IS NEVER USED — not once; if OP_RETURN appears anywhere it is a failure. Data is
  carried as pushdata within script (e.g. an OP_FALSE/OP_IF-guarded pushdata envelope, or a PushDrop-style
  push-then-drop pattern), never as OP_RETURN.

  SELECTIVE DISCLOSURE is per-field and provable: because each field is a leaf, the holder can disclose exactly
  the field(s) an auditor or tax authority needs and provide the Merkle path proving that field belongs to the
  committed root — revealing NOTHING about the other fields of the same accounting transaction. The Merkle proof
  is divided into non-overlapping PORTIONS, and the ROOT can be HELD IN PARTS; only the portion(s) needed to
  verify the queried field are produced. All of this — fields, tree, root-in-parts, proof portions — is broken
  down within the single Bitcoin (BSV) transaction.

  Layer A — provable presence/inclusion: a Merkle path proves a given field-leaf belongs to the accounting
  transaction's committed root; and the committing Bitcoin (BSV) transaction's inclusion in a block is itself
  provable, so the field commitments inherit immutable on-chain timestamping. Verification terminates in the
  validated Bitcoin (BSV) header chain.
  Layer B — selective disclosure / proof-sharding: the field-proof is sharded into non-overlapping portions with
  published proof-assistance, addressable so that a query returns ONLY the portion for the field(s) requested.

There is NO commitment scheme, NO Pedersen, NO zero-knowledge, NO Bulletproofs, NO range proof, and none is to be
added (see Part 0.0 — hidden-value constructions prove nothing for audit). Selective disclosure — disclosing the
genuine field(s) under examination and proving inclusion, while revealing nothing about other fields — is the
entire mechanism, and it requires no added cryptography. The system MAY use these patent mechanisms as building
blocks where they fit (Merkle Proof Entity for presence; the selective-verification / proof-portion and BURI
referencing methods for sharded per-field retrieval; deterministic sub-keys for addressing/controlling fields),
but the design above is the requirement, and it is implemented even where no patent text is cited for a step.

0.3 Verification trust root. Every verification terminates in BSV public data: a proof is valid only when its Merkle root is carried by a header in a validated BSV header chain. No service component is ever a trust root. The proof store is an availability and retrieval service.

0.4 Two assurance modes. Adversarial audit mode (default, and the only mode that yields independent audit evidence): ordinary Merkle reconstruction against public node labels / the on-chain root. Trusted-operational mode (off by default, explicit opt-in only): the homomorphic proof-assistance compression of WO 2025/119666 claims 9–11; never accepted by the audit verification path; documented as not adversarially sound.

0.5 No fabrication. No value, number, benchmark, or chain fixture is invented. Every reported value is produced by running the code and is regenerated by the reproduce command. Any BSV block data used in tests is genuine and sourced; if genuine data cannot be obtained in the build environment, the relevant test is marked pending with the exact BSV fields it requires, never filled with invented values.

0.6 No tool identity. Nothing in the project, its comments, its documentation, its commit messages, or its dependencies names any build agent, assistant, or tooling provider.

0.7 Engineering bar. Safety-critical standard. Every external input validated; every failure path returns a typed, handled error; no operation throws or panics on malformed, truncated, oversized, or adversarial input. Strict TypeScript; no `any` in public APIs. Concurrency-safe. Bounded resource use. Configuration explicit and validated at startup. Comprehensive tests at every layer.

================================================================================
================================================================================
PART 0B — MANDATORY PRE-BUILD: FIX THE EXISTING CONTAMINATED REPOSITORY FIRST
================================================================================

CRITICAL ORDERING. This specification describes a clean target system. It does NOT, on its own, fix the
existing contaminated repository. Before building anything described in Part 1 onward, the agent MUST first
remediate the existing `verifiable-accounting` repository in place. If the agent builds the clean system
without first doing this phase, it risks building anew ALONGSIDE the existing mess rather than resolving it —
which is a failure. Do this phase first, fully, with the CI gate green, before any new construction.

Reason this phase exists: the existing repository contains (a) an invented cryptography layer that is not part
of the two patents — Pedersen commitments, zero-knowledge / Σ-protocol code, range proofs — in the `commit`
and `zk` crates; (b) BTC-fork-lineage dependencies pulled in by that layer (`secp256k1-zkp` and its transitive
`bitcoin-private`, with "Blockstream" / "Bitcoin Core" attributions); and (c) wording and fixtures that must be
re-framed: the unit "satoshi" used as a denomination, a `bsv_block_170_v1.json` vector and a "Satoshi-to-Hal-
Finney" historic-transfer comment, and Lightning-style "channel" / "bonded-subsat-channel" framing in the
integration examples. None of this is patched by the clean-target spec; it must be remediated explicitly here.

NOTHING IS DELETED. Everything below archives in place. Files are moved into a new `legacy/` area within the
repository, preserved, and clearly marked superseded. History is never rewritten. The repository is never wiped.

0B.1 Work inside the existing repository.
  Operate on the existing `verifiable-accounting` working tree. Do not create a second project beside it. The
  packages described from Part 1 onward replace the live system within THIS repository; the superseded material
  is archived within the same repository.

0B.2 Archive the invented-cryptography layer in place (no deletion).
  Move the crates that implement non-patent cryptography into `legacy/` within the repository, preserved exactly:
    crates/commit  -> legacy/commit
    crates/zk      -> legacy/zk
  and any other module whose purpose is Pedersen commitments, Σ-protocols, zero-knowledge proofs, or range
  proofs. Add `legacy/README` (project voice) stating only that this material is superseded and is not part of
  the live system. Remove these crates from the live workspace members so the live build no longer compiles
  them — but do NOT delete them. The two simulation studies are NOT invented crypto and are NOT archived; they
  are kept and rebuilt per the simstore/simstudy specifications to measure the patent system.

0B.3 Purge BTC-fork-lineage dependencies from the live system.
  Remove from the live workspace manifest, every live crate/package manifest, and the lockfile: `secp256k1-zkp`,
  any `bitcoin`-fork dependency, and any package whose name or metadata references the BTC fork or its ecosystem,
  including the transitive `bitcoin-private`. Regenerate the lockfile. Then search the regenerated lockfile and
  fail if any forbidden token (Part 0.1) appears. The only curve dependency permitted in the live system is
  secp256k1 obtained through the BSV SDK (or a BSV-native source), referred to as Bitcoin's curve with no
  altcoin/Blockstream attribution, and only where the selective-verification optional homomorphic mode needs
  group operations.

0B.4 Re-denominate units: "satoshi" -> "minor units".
  Wherever "satoshi"/"satoshis" is used as a unit — the proofstore amount-field documentation, the simstudy,
  and the `examples/realistic_quarter` and `examples/integration` material — relabel the unit to "minor units"
  in field names, JSON keys, comments, and prose. Amounts and arithmetic are unchanged. Regenerate any example
  or vector JSON whose keys change (e.g. `"units": "minor_units"`) via its generator so the values still verify
  and `reproduce` still passes.

0B.5 Replace the historic-chain Merkle vector and its framing.
  Replace the `bsv_block_170_v1.json` vector and its filename with a genuine Bitcoin (BSV) mainnet block vector
  named neutrally (e.g. `vectors/merkle/bsv_block_v1.json`) carrying real txids in block order and the real
  Merkle root, with a `source` field pointing only to a BSV source. Reword the merkle source comment and the CLI
  reproduce step to reference only "a Bitcoin (BSV) mainnet block" with no historic-transfer narrative and no
  external-figure names. Do not fabricate any hash; if genuine block data cannot be fetched in the build
  environment, mark the dependent test pending with the exact fields required (block hash, ordered txids,
  expected merkle root). Keep the genesis vector only if described purely as the Bitcoin (BSV) genesis block.

0B.6 Re-frame the integration examples in BSV + accounting terms.
  Re-frame `examples/integration` (the channel-verify document, the sample channel ledger, the bridge and full-
  stack demo scripts, and the integration and realistic_quarter READMEs) using BSV-native, accounting-domain
  language only: generic settlement/ledger records, neutral party names, Bitcoin (BSV) script pushdata-envelope anchoring (never OP_RETURN), minor-unit
  amounts. Remove all channel / Lightning / historic-figure framing. The demonstrated flow is unchanged: anchor
  an accounting evidence object on BSV and verify inclusion and selective retrieval.

0B.7 Sweep and prove the live system is clean.
  Run a repository-wide, case-insensitive search across the LIVE system (everything outside `legacy/`) for the
  forbidden tokens of Part 0.1. Every one must be absent from source, comments, docs, configuration, the
  lockfile, vector filenames, example data, and commit messages — with "secp256k1" referred to only as Bitcoin's
  curve and the name "Bitcoin" permitted. Confirm commit messages and any PR template carry none of the
  forbidden tokens either. Then rebuild the live workspace: formatting, strict type-checking, lint with warnings
  as errors, the full test suite, and `reproduce` — all green.

0B.8 Gate.
  Only after 0B.1–0B.7 are complete and green does construction of the clean system (Part 1 onward) proceed.
  The clean system is built within this same repository; the archived `legacy/` material remains present but
  plainly superseded; nothing was deleted; history was not rewritten.

PART 1 — STACK, TOOLCHAIN, WORKSPACE
================================================================================

1.1 Language and runtime. TypeScript in strict mode (`"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`, `"noImplicitOverride": true`). Node.js LTS. ECMAScript modules.

1.2 Dependencies. The official BSV SDK (@bsv/sdk) is the sole chain and cryptographic dependency: BSV transaction parsing and serialisation, scripts, block headers, Merkle proof handling (BUMP / BRC-74), SPV header-chain verification, double-SHA256, and secp256k1 group operations where Layer B's optional homomorphic mode needs them. Permitted supporting libraries: a structured logger; a schema validator; a unit/integration test runner; a property-testing library; a benchmarking library; a CLI argument parser. No other chain or cryptographic dependency, directly or transitively. Pin every version. Commit the lockfile. After install, search the lockfile and fail if any forbidden token (0.1) appears.

1.3 Workspace. A single monorepo using workspaces, packages under `packages/`:
  bsv, merkle, proofstore, evidence, api, cli, simstore, simstudy.
Root files: README.md, LICENSE, CONTRIBUTING.md, SECURITY.md, package.json (workspace root), tsconfig.base.json, .editorconfig, .gitignore, Dockerfile, .dockerignore, ENVIRONMENT, docs/, .github/workflows/ci.yml, .github/workflows/release.yml, config/.
Each package has its own package.json, tsconfig.json (extends base), src/, test/, and a README in the project's own voice. Inter-package dependencies are by workspace reference.

1.4 Shared conventions. A common error base: every package defines a typed error union; no thrown strings; no bare Error. A common Result pattern for verification outcomes: `type VerifyResult = { ok: true } | { ok: false; reason: <typed reason> }`. All hashing goes through the bsv package; no package computes a hash directly. All byte-order conversion goes through the bsv package. Logging is structured; no secret or full-record content is logged.

================================================================================
PART 2 — PACKAGE: bsv (BSV primitives and node access)
================================================================================

2.1 Hash
  Type Hash: an immutable 32-byte value with internal (little-endian) storage.
  Constructors / functions:
    fromInternalBytes(bytes: Uint8Array): Hash — error HashError.BadLength if length ≠ 32.
    fromDisplayHex(hex: string): Hash — parse big-endian display hex (64 hex chars), reverse to internal; errors HashError.BadHex (non-hex / wrong length).
    toInternalBytes(h: Hash): Uint8Array (copy).
    toDisplayHex(h: Hash): string (reverse internal, lower-case hex).
    equals(a: Hash, b: Hash): boolean (constant-time compare).
  Tests: round-trip internal↔display for known values; reject 31- and 33-byte inputs; reject odd-length and non-hex strings; equality reflexive/symmetric; a fixed known display↔internal pair.

2.2 doubleSha256
  doubleSha256(data: Uint8Array): Hash — SHA-256 applied twice via the SDK; returns a Hash (internal order). No single-hash mode exists. concatHashes(a: Hash, b: Hash): Uint8Array helper for node hashing (internal-order concatenation).
  Tests: doubleSha256 of empty and of a known vector; equals the SDK's own double-SHA256 of the same bytes.

2.3 Txid
  Type Txid wraps Hash. fromDisplayHex / toDisplayHex / fromInternalBytes / toInternalBytes / equals as for Hash. A Txid is the double-SHA256 of the raw transaction bytes.
  Tests: a genuine BSV txid round-trips display↔internal; computing the txid of a known raw transaction equals its published txid.

2.4 Script
  Type Script wraps raw script bytes. fromBytes / toBytes / toHex / fromHex with validation (reject non-hex). No opcode-policy logic beyond what the SDK provides. length(): number.
  Tests: round-trip; reject malformed hex.

2.5 Transaction
  parseTransaction(raw: Uint8Array): Transaction via the SDK. Expose:
    txid(tx): Txid.
    inputs(tx): ReadonlyArray<{ position: number; prevTxid: Txid; prevIndex: number; unlockingScript: Script }>.
    outputs(tx): ReadonlyArray<{ position: number; lockingScript: Script; amountMinorUnits: bigint }>.
  Errors: TxError.Malformed, TxError.Truncated.
  Tests: parse a genuine BSV transaction and read its inputs/outputs/amounts; reject truncated bytes; reject malformed bytes; amounts are bigint and never negative.

2.6 BlockHeader
  Type BlockHeader: { version: number; prevBlockHash: Hash; merkleRoot: Hash; time: number; bits: number; nonce: number }.
    parseHeader(raw80: Uint8Array): BlockHeader — error HeaderError.BadLength if ≠ 80.
    serializeHeader(h): Uint8Array (80 bytes).
    headerHash(h): Hash — double-SHA256 of the 80-byte serialisation.
    meetsTarget(h): boolean — header hash ≤ target decoded from bits.
  Tests: parse/serialise round-trip on a genuine BSV header; headerHash equals the published block hash; meetsTarget true for a genuine header; reject 79/81-byte input.

2.7 HeaderChain
  An append-only validated chain.
    add(h: BlockHeader): void — verifies h.prevBlockHash equals the current tip's headerHash (or that the chain is empty for the first header) AND meetsTarget(h); errors ChainError.NotLinked, ChainError.TargetNotMet.
    height(): number.
    byHeight(n): BlockHeader | undefined.
    byHash(hash: Hash): { header: BlockHeader; height: number } | undefined.
    containsMerkleRoot(root: Hash): { height: number } | undefined — searches validated headers for one carrying that merkle root.
  This is the verification trust root: nothing outside the validated chain is trusted.
  Tests: building a short genuine BSV header sequence links and validates; an out-of-order header is rejected (NotLinked); a header failing target is rejected; containsMerkleRoot finds a genuine block's root and reports its height; returns undefined for an unknown root.

2.8 ScriptDataEnvelope (pushdata in script — NEVER OP_RETURN)
  buildScriptDataEnvelope(payload: Uint8Array): { lockingScript: Script } — encode payload as pushdata inside a
    script envelope (OP_FALSE OP_IF … OP_ENDIF guarded pushdata, or PushDrop-style push-then-drop), used to carry
    the accounting field data and the field-tree commitment (the root, possibly held in parts) inside one Bitcoin
    (BSV) transaction. recognise(lockingScript: Script): Uint8Array | undefined — extract the payload if the
    script is an envelope of the documented form. OP_RETURN IS NEVER USED anywhere in this function or the
    project; if produced, it is a failure. Document the exact opcode layout and size handling in docs/DECISIONS.md.
  Tests: build then recognise round-trips a payload; recognise returns undefined for a non-data output; reject oversize payloads with a typed error.

2.9 NodeClient
  interface NodeClient { getTransaction(txid: Txid): Promise<Transaction>; getBlockTxids(blockHash: Hash): Promise<Txid[]>; getHeader(blockHash: Hash): Promise<BlockHeader>; getHeadersFrom(height: number, count: number): Promise<BlockHeader[]>; }
  OfflineNodeClient: backed by fixtures under test/fixtures and vectors; deterministic; used by CI with no network. LiveNodeClient: talks to a BSV node (Teranode target) under configuration; all network and decode failures surface as typed NodeError (Unreachable, NotFound, BadResponse); no unhandled rejections.
  Tests: OfflineNodeClient returns the fixture transaction/headers; LiveNodeClient error paths are covered with a mocked transport (Unreachable, NotFound, BadResponse).

================================================================================
PART 3 — PACKAGE: merkle (Merkle Proof Entity, WO 2022/100946)
================================================================================

3.1 Node construction. A leaf node is doubleSha256 of its data item. An internal node is doubleSha256 of the
internal-order concatenation of its left and right children. The hash is double-SHA256. When a tree level
contains an odd number of nodes, the last node is paired with itself before hashing.
  LEAVES ARE THE FIELDS OF ONE ACCOUNTING TRANSACTION (see Part 0.2), in a defined field order — NOT transaction
  identifiers in a block. Each leaf = doubleSha256 of one canonicalised accounting field (its tag + value), built
  by the evidence package. The merkle package is generic over Hash leaves and does not itself know they are
  fields; the evidence package supplies the field-leaves and their order. (The same primitives also verify a
  committing transaction's inclusion in a block where needed, but the PRIMARY tree here is the intra-transaction
  field tree.)

3.2 Types.
  type MerkleProof = { index: number; siblings: Hash[] } — index is the leaf position in the leaf layer; siblings is the ordered list of sibling hashes from the leaf level up to (not including) the root.
  type MerkleTree = { root: Hash; levels: Hash[][] } — levels[0] is the leaf layer.

3.3 Functions.
  buildTree(leaves: Hash[]): MerkleTree — construct all levels applying 3.1; error MerkleError.EmptyLeaves on []. Handles 1 leaf (root = the leaf), 2 leaves, odd counts at any level (self-pairing), and large N.
  computeRoot(leaves: Hash[]): Hash — root only, streaming, memory-bounded for large N; same result as buildTree(...).root.
  leafIndexOfTxid(leaves: Hash[], txid: Txid): number | undefined — position of a target txid in the leaf layer.
  merkleProof(leaves: Hash[], index: number): MerkleProof — error MerkleError.IndexOutOfRange; produce the ordered sibling list, applying the self-pairing rule at odd levels (the sibling of a self-paired node is itself).
  reconstructRoot(leaf: Hash, proof: MerkleProof): Hash — fold from the leaf upward: at each level, if the current index bit is 0 the sibling is the right operand else the left operand; hash; halve the index; apply self-pairing where the proof encodes it; return the recomputed root. Never throws on bad input — returns a value that simply will not match.
  verifyProof(leaf: Hash, proof: MerkleProof, root: Hash): VerifyResult — ok iff reconstructRoot equals root; reasons: SiblingCountMismatch (siblings length ≠ tree height implied by index), RootMismatch.
  proveAgainstChain(leaf: Hash, proof: MerkleProof, root: Hash, chain: HeaderChain): VerifyResult — verifyProof AND chain.containsMerkleRoot(root) is defined; reason RootNotAnchored when the root is not in a validated header.

3.4 Tests (write every one).
  Unit: root of 1, 2, 3 (odd), 4, 5 (odd), 8 leaves against hand-computed values; self-pairing at the odd level produces the documented node; index→sibling-order mapping correct for each position.
  Property: for random leaf sets (sizes 1..1024) and random valid index, merkleProof then verifyProof is ok; flipping any byte of the leaf, any sibling, or the root yields not-ok; a wrong index yields not-ok; a proof with too few or too many siblings yields SiblingCountMismatch, never a throw.
  Field-tree end-to-end: build a tree over a realistic invoice's field-leaves (supplied by the evidence package),
  compute the root, produce a Merkle path for a single field (e.g. one line's net amount), and verify that field
  belongs to the root while NO other field value is needed for the check — per-field selective disclosure. Then
  vary the field count up to thousands and confirm proof size scales as log2(field count).
  Block-inclusion (optional layer): given a genuine Bitcoin (BSV) block's real txids in vectors/merkle/bsv_block_v1.json
  (BSV-only `source` field), computeRoot equals the block's published Merkle root and a single-leaf proof for one
  txid verifies — this is the SAME primitive applied to prove the COMMITTING transaction's inclusion in a block,
  anchoring the field commitments on-chain; proveAgainstChain succeeds when the block header is in the chain and
  fails (RootNotAnchored) when absent. Do not fabricate hashes; if genuine block data cannot be fetched here, mark
  this block-inclusion test pending listing the exact fields required. Keep the genesis vector only if described
  purely as the Bitcoin (BSV) genesis block.

================================================================================
PART 4 — PACKAGE: proofstore (Selective Verification, WO 2025/119666)
================================================================================

4.1 IndexKey (claims 5–6 schema).
  type Direction = "input" | "output".
  type IndexKey = { txid: Txid; direction: Direction; position: number; blockPosition: number; lockingScript?: Script; unlockingScript?: Script; amountMinorUnits?: bigint }.
  serializeKey(k): string — a stable, collision-free string for map keying (canonical concatenation of the fields in fixed order, length-prefixed for the optional script fields). validateKey(k): asserts position ≥ 0, blockPosition ≥ 0, amount ≥ 0 when present; errors KeyError.Invalid.
  Tests: round-trip of serializeKey for keys with and without the optional fields; two keys differing in any field serialise differently; validation rejects negatives.

4.2 ProofShard (claims 2–3, non-overlapping portions).
  type ProofShard = { fromLevel: number; toLevel: number; siblings: Hash[] } — siblings has exactly toLevel − fromLevel entries; portions are non-overlapping and together cover the whole proof.
  type StoredProof = { key: IndexKey; leafIndex: number; shards: ProofShard[]; expectedRoot: Hash }.
  reassemble(stored): MerkleProof — concatenate shard siblings in level order into a single proof; assert contiguity and non-overlap (error ShardError.NonContiguous).

4.3 shardProof.
  shardProof(proof: MerkleProof, predeterminedLevel: number): ProofShard[] — split into a lower portion covering levels [0, predeterminedLevel) and an upper portion covering [predeterminedLevel, height). Error ShardError.BadLevel if the level is outside (0, height).

4.4 ProofAssistance (claim 8, public proof-assistance data).
  type ProofAssistance = { predeterminedLevel: number; nodeLabels: Hash[] } — the labels of the Merkle-tree nodes at the predetermined level.
  computeProofAssistance(leaves: Hash[], predeterminedLevel: number): ProofAssistance — derive the level's node labels from the tree.
  labelsHashToRoot(assistance, root): VerifyResult — independently fold the published node labels up to the root and check equality (reason AssistanceRootMismatch). This lets a verifier confirm the public labels are consistent with the anchored root without any private data.

4.5 ProofStore.
  class ProofStore(predeterminedLevel: number):
    anchor(key: IndexKey, leaves: Hash[], leafIndex: number): Hash — compute the proof, shard it at the predetermined level, store the shards under serializeKey(key), compute and record the ProofAssistance for the resulting root, return the root. Shared upper portions are stored once per root, not duplicated per item.
    query(key: IndexKey): StoredProof — return the stored proof for the key; error StoreError.KeyNotFound. (Claim 12: communicate the relevant proof part to a querying user.)
    proofAssistanceFor(root: Hash): ProofAssistance | undefined.
    verify(leaf: Hash, stored: StoredProof, mode: "adversarial" | "trustedOperational"): VerifyResult — adversarial: reassemble all shards and verifyProof against expectedRoot (this is the independent audit path); trustedOperational: see 4.7; error StoreError.TrustedOperationalNotAcceptedForAudit if a caller asks the audit path to accept this mode.
    verifyWithAssistance(leaf: Hash, stored: StoredProof): VerifyResult — the patent's consumer/selective-disclosure flow: take only the lower shard (fromLevel 0), fold from the leaf up to the predetermined level, confirm the resulting node equals the corresponding published proof-assistance label (reason AssistanceMismatch), and confirm labelsHashToRoot(assistance, expectedRoot). The verifier completes the check from only the lower shard plus public data and learns nothing about any other record. THIS IS SELECTIVE DISCLOSURE.

4.6 Retrieval payloads.
  retrievalBytesAdversarial(stored): number — bytes the verifier receives for a full adversarial reassembly.
  retrievalBytesAssisted(stored): number — bytes for the assisted flow (lower shard only; public labels are already public).
  Used by the studies; measured, not estimated.

4.7 Trusted-operational compression (claims 9–11), optional, off by default.
  A function with a homomorphic property over the proof-assistance node data, realised as a sum of secp256k1 (BSV curve) points, each point representing a node at the predetermined level, via the SDK. Exposed only as the explicit "trustedOperational" mode; never the default; never accepted by the audit verification path; documented as not adversarially sound (easier to manipulate). Implement, gate behind an explicit flag, and test that the audit path refuses it.

4.8 Tests (write every one).
  Unit: shardProof produces non-overlapping contiguous portions whose reassembly equals the original proof; computeProofAssistance returns the correct level labels; labelsHashToRoot accepts genuine labels and rejects altered ones.
  Adversarial: verify (adversarial) accepts a genuine proof and rejects a wrong leaf, wrong index, wrong root, a missing shard, and an altered shard; verifyWithAssistance accepts the genuine lower shard and rejects an altered lower shard, an altered label, and a mismatched root; the audit path refuses trustedOperational.
  Selective disclosure: a query for one key returns only that item's StoredProof and the response contains nothing derived from any other record; verifyWithAssistance succeeds using only the lower shard plus public labels.
  Scale: with many items anchored in one tree, shared upper portions are stored once (assert storage is less than naive per-item full proofs); adversarial soundness still holds at scale.

================================================================================
PART 5 — PACKAGE: evidence (accounting transaction → field tree in ONE Bitcoin (BSV) transaction)
================================================================================

5.0 THE FIELD MODEL (core — see Part 0.2). An accounting transaction is represented as an ORDERED SET OF NAMED
FIELDS. Each field has a stable tag and a value:
  type AccountingField = { tag: string; value: Uint8Array }   // tag e.g. "invoice.number", "line[3].net",
                                                               // "tax.code", "period"; value = canonical bytes
  type AccountingTransaction = { kind: "invoice"|"journal"|"ledgerPosting"|"reconciliation"|"statementLines";
                                 fields: AccountingField[] }   // hundreds or thousands of fields permitted
  An invoice expands to standard fields (number, date, supplier, customer, currency, terms, and per line:
  description, quantity, unit price, net, tax code, tax amount, discount; plus totals net/tax/discount/gross).
  A journal entry expands to account, debit, credit, narrative, period, document reference. Define a documented
  standard field set per kind; the field set is extensible.
  fieldLeaf(field): Hash — doubleSha256 of the canonical encoding of (tag, value): varint-len tag bytes (UTF-8)
    then varint-len value bytes. Deterministic.
  fieldLeaves(tx): Hash[] — fieldLeaf over tx.fields in field order. THESE ARE THE MERKLE LEAVES.
  fieldTreeRoot(tx): Hash — merkle.computeRoot(fieldLeaves(tx)). This root commits the entire accounting
    transaction's field set and is what is carried on-chain.

5.0a CARRIAGE IN ONE BITCOIN (BSV) TRANSACTION (no OP_RETURN, ever).
  The field data and the Merkle commitment are broken down within a SINGLE Bitcoin (BSV) transaction using
  script. Data is placed as pushdata in script — via an OP_FALSE/OP_IF-guarded pushdata envelope or a
  PushDrop-style push-then-drop pattern (record the exact convention in docs/DECISIONS.md). OP_RETURN IS NEVER
  USED; if it appears, it is a failure. The root may be HELD IN PARTS across the transaction's script(s)
  (consistent with proof-assistance node labels and proof portions), so that the structure — fields, field tree,
  root-in-parts — is all contained in the one transaction.
  buildAccountingTx(tx): { lockingScripts: Script[]; fieldTreeRoot: Hash } — encode the field set and the
    commitment into script pushdata for inclusion in one Bitcoin (BSV) transaction; never OP_RETURN.
  parseAccountingTx(scripts): AccountingTransaction — recover the fields from script pushdata.

5.0b PER-FIELD SELECTIVE DISCLOSURE.
  discloseField(tx, fieldIndex): { field: AccountingField; proof: MerkleProof; root: Hash } — reveal exactly one
    field plus the Merkle path proving it belongs to fieldTreeRoot(tx); no other field value is included.
  verifyDisclosedField(field, proof, root): VerifyResult — fieldLeaf(field) + proof reconstructs to root.
  An auditor/tax authority receives only the field(s) under examination and a proof of inclusion; the remaining
  (possibly thousands of) fields are never revealed. Combined with proofstore (Part 4), the proof itself is
  sharded so only the needed portion is retrieved.
  Tests: disclose one field of a 1000-field invoice; verifyDisclosedField ok; assert no other field's value
    appears in the disclosure; tamper the field value -> not ok; wrong proof -> not ok.

5.1 Accounting object types (used to build field sets and to run the checks), each with schema + validation:
  InvoiceFields { id; counterparty; net: bigint; tax: bigint; discount: bigint; gross: bigint } (minor units).
  Payment { id; counterparty; amount: bigint }.
  LedgerEntry { id; account; debit: bigint; credit: bigint }.
  ReconciliationItem { id; bookAmount: bigint; adjustment: bigint }.
  All amounts bigint minor units, non-negative where required; validation errors typed (EvidenceError.SchemaInvalid).
  expandToFields(obj): AccountingField[] — map a typed object to its standard tagged field set (5.0).

5.2 Canonical field/value encoding. The bytes hashed as a leaf are the canonical (tag,value) encoding of 5.0
  (versioned: a leading version byte in the value-canonicalisation; fixed-width big-endian for numeric field
  values in minor units). deserialiseField(bytes) is the inverse with validation.
  Tests: round-trip for representative fields; two distinct fields encode differently; a malformed buffer rejected.

5.3 Accounting transaction anchoring (intra-transaction field tree; NOT a population of separate txs).
  fieldTreeRoot(tx) (5.0) is the committed root; buildAccountingTx (5.0a) carries it in script of ONE Bitcoin
  (BSV) transaction with no OP_RETURN. The committing transaction's own inclusion in a block is provable via the
  merkle/header primitives, anchoring the field commitments on-chain.
  Tests: fieldLeaves deterministic and order-stable; fieldTreeRoot matches merkle.computeRoot; buildAccountingTx
    then parseAccountingTx round-trips the field set; no OP_RETURN opcode appears in any produced script.

5.4 Index population. indexKeyFor(obj, bsvContext: { txid; direction; position; blockPosition; lockingScript?; unlockingScript?; amountMinorUnits? }): IndexKey — derive the proofstore key from the BSV transaction context of the anchored object.
  Tests: derived keys validate and round-trip.

5.5 Accounting checks by recomputation (NOT hidden-value cryptography; operate on disclosed records, consistent with selective disclosure — only the records needed for the assertion are opened):
  checkInvoiceTotal(inv): VerifyResult — gross == net + tax − discount.
  checkArRollForward({ open, invoices[], receipts[], creditNotes[], writeOffs[], close }): VerifyResult — close == open + Σinvoices − Σreceipts − ΣcreditNotes − ΣwriteOffs.
  checkDebitCreditEquality(entries[]): VerifyResult — Σdebit == Σcredit.
  checkBankReconciliation({ bookCash, reconcilingItems[], bankBalance }): VerifyResult.
  checkVat({ outputTax, inputTax, payable }): VerifyResult — payable == outputTax − inputTax.
  All in bigint; reasons typed (e.g. ArRollForwardMismatch with the computed vs stated totals).
  Tests: each check passes on a correct case and fails (with the right reason) on an incorrect case; overflow-safe with large bigints.

================================================================================
PART 6 — PACKAGE: api (service over the two patents)
================================================================================

6.1 Operations (each request schema-validated; each returns a typed response or typed error):
  anchor(accountingTxRequest) → { fieldTreeRoot (display hex), envelopeScripts (hex[]) } — build the field tree for the accounting transaction and the one-tx script envelopes (never OP_RETURN).
  prove(dataItemRequest) → { proof (index + sibling display hexes), root }.
  query(indexKeyRequest) → the StoredProof for the queried item only (serialised), and nothing about other records.
  verify(verifyRequest) → VerifyResult; this operation uses only the adversarial / proof-assistance path and terminates in the BSV header chain; it refuses any result derived from the trusted-operational compression.

6.2 Enterprise concerns, all implemented:
  Request schema validation at the boundary (schema validator); reject with typed 4xx-style errors.
  Caller authentication (an auth middleware; pluggable scheme; configured, not hard-coded).
  Audit log: every proof response recorded with a timestamp, the query key, the returned fragment identifier, and the verification outcome — never the underlying record content.
  Rate limiting (configurable; per-caller).
  Health and readiness endpoints.
  Configuration loaded and validated at startup (fail fast on invalid config).
  Structured logging; no secret/record content in logs.

6.3 Tests: per-operation unit tests; an integration test exercising anchor → prove → query → verify end to end against the OfflineNodeClient at a realistic size; authentication accepts valid and rejects invalid callers; rate limiting triggers; verify refuses a trusted-operational result; malformed requests are rejected with typed errors.

================================================================================
PART 7 — PACKAGE: cli (command-line binary)
================================================================================

7.1 Commands, full argument parsing and validation, typed error reporting, no unhandled rejection:
  anchor (accounting-transaction file → field-tree root, one-tx script envelopes; never OP_RETURN).
  prove (leaves file + index → proof bundle).
  verify (bundle → VerifyResult, terminating in the header chain).
  query (index key → the queried item's fragment only).
  selftest — exercise every layer end to end and report pass/fail per layer.
  reproduce — regenerate every deterministic vector (the BSV block Merkle vector, the study vectors) and every reported figure; diff against committed expected outputs; exit non-zero on any mismatch.
7.2 Tests: each command's happy path and error path; selftest returns success on a clean build; reproduce regenerates and matches committed vectors.

================================================================================
PART 8 — PACKAGE: simstore (storage / retrieval efficiency study) — MANDATORY
================================================================================
8.1 Build a deterministic population of N leaves (report points N ∈ {1024, 16384, 262144}; a small CI point). Anchor a deterministic query sample (Q items) into a ProofStore at a chosen predetermined level (record the choice and how it is chosen). Measure from the real populated structure (no formula substituted for measurement):
  baseline full-proof bytes = Q · ceil(log2 N) · 32, and also re-derived from a real count of stored full proofs;
  sharded stored bytes, counting shared upper portions once;
  duplicate proof material avoided, and the ratio;
  proof-assistance bytes per root;
  retrieval payload bytes for a single query, adversarial and assisted, separately;
  verification time (median + min/max via a real timer, labelled local).
8.2 Output machine-readable lines and write vectors/study/storage_<N>.json for the CI point so reproduce diffs it.
8.3 Tests: assert sharded ≤ baseline for several N; assert a tampered leaf is rejected at scale; assert the assisted retrieval payload contains nothing about other records.

================================================================================
PART 9 — PACKAGE: simstudy (synthetic-population assurance study) — MANDATORY
================================================================================
9.1 Build a deterministic synthetic accounting population (an AR roll-forward whose clean version balances), anchor its records as BSV data items, and measure your system:
  Merkle Proof Entity inclusion proof generation and verification across population sizes (timings, median + range, labelled local);
  selective-disclosure retrieval: assert a query returns only the queried item's fragment and discloses nothing about any other record;
  the AR roll-forward verified by recomputation over the anchored records (evidence.checkArRollForward).
9.2 Fault injection: into copies of the population, inject a tampered leaf, a wrong index, a wrong root, a missing fragment, and an altered, an omitted, and a duplicated record. Report injected / detected / missed counts, with zero false positives on the clean population and every in-scope fault detected by the inclusion / selective-verification / recomputation checks.
9.3 Honest boundary: record explicitly that a record committed falsely at origin (internally consistent but untrue) is NOT detected by the system.
9.4 Write vectors/study/simstudy_<M>.json for the CI point; report large-point timings on stated hardware, labelled local. No commitment / zero-knowledge / range-proof concept anywhere.
9.5 Tests: zero false positives on the clean population; each in-scope fault detected; the false-origin boundary case asserted as NOT detected.

================================================================================
PART 10 — CROSS-CUTTING: ERRORS, LOGGING, CONFIG, SECURITY
================================================================================
10.1 Errors: every package exports a typed error union; functions return typed errors or typed Results; no thrown strings, no bare Error, no unhandled rejection; adversarial input never throws.
10.2 Logging: structured; levels; no record content, no keys, no full proofs at info level; an audit channel for proof responses (metadata only).
10.3 Config: a typed config schema validated at startup (node endpoint, network, predetermined level default, auth scheme, rate limits, log level); fail fast on invalid config.
10.4 Security doc (docs/SECURITY.md): the trust model — verification terminates in the BSV header chain; the proof store is availability-only; selective disclosure is the privacy mechanism and is provided by proof-sharding, with no hidden-value cryptography; the trusted-operational mode is not adversarially sound and is never accepted for audit; threat notes on a misbehaving proof store (withholding or returning a wrong fragment) all surfacing as verification failure.

================================================================================
PART 11 — CI, BUILD, RELEASE, DOCS
================================================================================
11.1 CI (.github/workflows/ci.yml): on every change — install with the pinned lockfile; a lockfile scan failing on any forbidden token (0.1); format check; strict type-check; lint with warnings treated as errors; the full test suite; the reproduce command; and a run of both studies' CI points. Fail on any warning, any test failure, or any reproduce mismatch.
11.2 Dockerfile: a reproducible build/run image; ENVIRONMENT records the toolchain.
11.3 Release (.github/workflows/release.yml): semantic version tags; a documented release process; no history rewrite.
11.4 Docs in the project's own voice: README (what it is, install, quickstart, the two assurance modes with the warning, how to run selftest/reproduce/studies); ARCHITECTURE (the two layers and their patent origins, the eight packages, the trust root); DECISIONS (stack choice, the script pushdata-envelope convention — never OP_RETURN, predetermined-level choice); REPRODUCIBILITY (exact commands and the CI vs full-run distinction, with the note that absolute timings are local and must be re-run on the named reporting hardware); OPERATIONS (deploy and run the service); SECURITY (Part 10.4). No doc names any build tool.

================================================================================
PART 12 — BUILD ORDER AND ACCEPTANCE
================================================================================
12.1 Build order, CI green before each step proceeds: workspace + config + CI + doc skeleton; bsv; merkle; proofstore; evidence; api; cli; simstore; simstudy; benchmarks; reproduce and selftest wired into CI; full documentation.
12.2 Acceptance, all must hold: every package built in full with no stub; every test in Parts 2–9 written and passing; CI runs the full gate including the forbidden-token lockfile scan and reproduce; both studies run and feed reproduce; the merkle end-to-end test validates against genuine BSV block data (or is pending with the exact fields, never fabricated); verification terminates in the BSV header chain; the proof store is availability-only; the trusted-operational mode is explicit, off by default, and refused by the audit path; selective disclosure (verifyWithAssistance returning only the queried fragment) is demonstrated by test; and a repository-wide search finds no forbidden token (0.1) anywhere in source, comments, docs, config, lockfile, vector filenames, example data, or commit messages, with secp256k1 referred to only as the BSV curve.

ABSOLUTE RULES (restated): BSV only, everywhere. Two patents only; no commitment / Pedersen / zero-knowledge / Bulletproofs / range-proof anything; selective disclosure comes from the proof-sharding. Build everything in full — no stubs. Fabricate no value, number, benchmark, or chain fixture; reproduce regenerates them; any BSV block data in tests is genuine. Verification terminates in a BSV public anchor / block header chain; the proof store is an availability/retrieval service; the trusted-operational compression is explicit, off by default, never accepted by the audit path. Nothing names any build tool anywhere in the project.


################################################################################
##  EXPANDED SPECIFICATION — IMPLEMENTATION DEPTH                             ##
##  Every type, field, signature, error, algorithm step, and named test.      ##
################################################################################

================================================================================
EXPANDED PACKAGE A — packages/bsv
================================================================================

A.0 Layout
  packages/bsv/package.json  name "@vaa/bsv"; type module; exports ./dist/index.js;
    scripts: build=tsc -b, test, lint, bench.
  packages/bsv/tsconfig.json extends ../../tsconfig.base.json; composite true; rootDir src; outDir dist.
  packages/bsv/README.md     project-voice description.
  src/: index.ts, errors.ts, bytes.ts, hash.ts, hashing.ts, txid.ts, script.ts,
        transaction.ts, header.ts, headerchain.ts, scriptdataenvelope.ts, nodeclient.ts.
  test/: one *.test.ts per src module, plus test/fixtures/ (genuine BSV data only).

A.1 errors.ts
  Export discriminated union BsvError (string `kind` + message), constructors, and
  isBsvError(x): x is BsvError. Variants:
    HashBadLength {got:number}; HashBadHex {reason:"length"|"charset"};
    TxMalformed {at:string}; TxTruncated {neededBytes:number; gotBytes:number};
    HeaderBadLength {got:number};
    ChainNotLinked {expectedPrev:string; gotPrev:string};
    ChainTargetNotMet {headerHashDisplay:string};
    EnvelopeOversize {maxBytes:number; gotBytes:number};
    EnvelopeNotRecognised {};
    NodeUnreachable {detail:string}; NodeNotFound {what:string};
    NodeBadResponse {detail:string};
    BytesOutOfRange {offset:number; length:number; bufferLength:number}.
  Untrusted-input paths return Result<…,BsvError>, never throw. Where a thrown error
  is idiomatic (programmer misuse), throw a BsvError instance only.

A.2 bytes.ts (total functions; never throw on in-range input)
  readU32LE(buf,offset): Result<number,BsvError> — BytesOutOfRange if offset+4>len.
  writeU32LE(value,into,offset): void — caller guarantees room; dev assert.
  readVarInt(buf,offset): Result<{value:bigint; nextOffset:number},BsvError> —
    compact-size: <0xfd one byte; 0xfd→u16; 0xfe→u32; 0xff→u64; truncation→BytesOutOfRange.
  writeVarInt(value:bigint): Uint8Array.
  reverseBytes(buf): Uint8Array (reversed copy).
  concat(...parts:Uint8Array[]): Uint8Array.
  toHexLower(buf): string. fromHex(str): Result<Uint8Array,BsvError> (reject odd len; non-hex).
  Tests:
    T-bytes-1 readU32LE/writeU32LE round-trip 0,1,0x7fffffff,0xffffffff.
    T-bytes-2 readVarInt for 0x00,0xfc; 0xfd-prefixed=253; 0xfe-prefixed; 0xff-prefixed.
    T-bytes-3 readVarInt truncated at each prefix → BytesOutOfRange.
    T-bytes-4 writeVarInt∘readVarInt round-trips 0,252,253,65535,65536,4294967295,4294967296.
    T-bytes-5 reverseBytes on 4- and 32-byte buffers; double reverse = identity.
    T-bytes-6 fromHex rejects "abc"(odd) and "zz"(charset); toHexLower∘fromHex round-trips 32 bytes; output lower-case.

A.3 hash.ts
  Hash = branded readonly Uint8Array length 32, internal (little-endian) order.
  fromInternalBytes(bytes): Result<Hash,BsvError> — HashBadLength if len≠32; copies.
  fromDisplayHex(hex): Result<Hash,BsvError> — HashBadHex("length") if not 64 chars;
    HashBadHex("charset") if non-hex; parse big-endian display, reverse to internal.
  toInternalBytes(h): Uint8Array (copy). toDisplayHex(h): string (reverse, lower-case, 64 chars).
  equals(a,b): boolean — constant-time over all 32 bytes (no early return).
  zero(): Hash — all-zero sentinel (documented; e.g. coinbase prev-txid).
  Tests:
    T-hash-1 fixed internal buffer ↔ display hex round-trips both ways.
    T-hash-2 fromInternalBytes rejects 31 and 33 bytes (HashBadLength.got).
    T-hash-3 fromDisplayHex rejects 63/65-char (length) and 64-char non-hex (charset).
    T-hash-4 equals reflexive, symmetric, differs on any single-byte change.
    T-hash-5 toDisplayHex always lower-case and 64 chars.

A.4 hashing.ts
  doubleSha256(data): Hash — SHA-256∘SHA-256 via the SDK; result wrapped as internal-order Hash.
    No single-SHA-256 export.
  hashLeaf(dataItem): Hash — doubleSha256(dataItem).
  hashNode(left,right): Hash — doubleSha256(concat(toInternalBytes(left),toInternalBytes(right))).
    The ONLY node-hashing site.
  Tests:
    T-hashing-1 doubleSha256("") equals SDK's independent two-step hash of "".
    T-hashing-2 doubleSha256 of a fixed ASCII vector matches an independent value.
    T-hashing-3 hashNode(a,b) ≠ hashNode(b,a) for a≠b.
    T-hashing-4 hashLeaf of a fixed item is stable.

A.5 txid.ts
  Txid = branded wrapper over Hash (distinct brand).
  ofTransactionBytes(raw): Txid — doubleSha256(raw) as Txid.
  fromDisplayHex/toDisplayHex/fromInternalBytes/toInternalBytes/equals mirror hash.ts.
  Tests:
    T-txid-1 ofTransactionBytes(genuine raw tx) equals its published txid (display).
    T-txid-2 display↔internal round-trip on a genuine txid.
    T-txid-3 Txid and same-bytes Hash are not interchangeable (compile-time type test).

A.6 script.ts
  Script wraps readonly raw script bytes.
  fromBytes(bytes): Script (copy). fromHex(hex): Result<Script,BsvError>.
  toBytes(s): Uint8Array (copy). toHex(s): string (lower-case). length(s): number.
  No opcode interpretation beyond the SDK; no opcode-policy assumptions.
  Tests:
    T-script-1 fromBytes/toBytes round-trip.
    T-script-2 fromHex rejects bad hex.
    T-script-3 toHex lower-case; length correct.

A.7 transaction.ts
  parseTransaction(raw): Result<Transaction,BsvError> — via SDK parser; SDK failure →
    TxMalformed{at} or TxTruncated{neededBytes,gotBytes}. Transaction wraps the SDK tx + raw bytes.
  txid(tx): Txid — ofTransactionBytes of canonical serialisation (assert == SDK txid in tests).
  inputs(tx): ReadonlyArray<{position:number; prevTxid:Txid; prevIndex:number; unlockingScript:Script}>
    (0-based input order).
  outputs(tx): ReadonlyArray<{position:number; lockingScript:Script; amountMinorUnits:bigint}>
    (0-based output order; amount bigint minor units).
  rawBytes(tx): Uint8Array (original).
  Tests:
    T-tx-1 parse a genuine multi-in/multi-out BSV tx; assert input count, output count,
      each amount (bigint), each script length; txid(tx) == published txid.
    T-tx-2 truncate raw by 1 and by half → TxTruncated; corrupt a length prefix → TxMalformed.
    T-tx-3 amounts bigint, never negative; a zero-amount data output parses with 0n.

A.8 header.ts
  BlockHeader = {version:number; prevBlockHash:Hash; merkleRoot:Hash; time:number; bits:number; nonce:number}.
  parseHeader(raw): Result<BlockHeader,BsvError> — HeaderBadLength if len≠80; layout:
    version(4 LE) | prevBlockHash(32 internal) | merkleRoot(32 internal) | time(4 LE) | bits(4 LE) | nonce(4 LE).
  serializeHeader(h): Uint8Array (exactly 80 bytes; inverse of parse).
  headerHash(h): Hash — doubleSha256(serializeHeader(h)).
  targetFromBits(bits): bigint — decode compact "bits" to the full 256-bit target.
  meetsTarget(h): boolean — headerHash(h) as big-endian-display integer ≤ targetFromBits(h.bits).
  Tests:
    T-hdr-1 parse a genuine 80-byte BSV header; assert each field; serializeHeader round-trips to same 80 bytes.
    T-hdr-2 headerHash == published block hash (display) for a genuine header.
    T-hdr-3 targetFromBits on a known bits value == known target.
    T-hdr-4 meetsTarget true for a genuine header; a header whose hash exceeds target → false.
    T-hdr-5 parseHeader rejects 79 and 81 bytes (HeaderBadLength.got).

A.9 headerchain.ts  (THE VERIFICATION TRUST ROOT)
  class HeaderChain:
    state: headers:BlockHeader[] (index=height); Map headerHashHex→height; Map merkleRootHex→height.
    add(h): Result<void,BsvError> — if non-empty require equals(h.prevBlockHash, headerHash(tip))
      else ChainNotLinked{expectedPrev,gotPrev}; require meetsTarget(h) else ChainTargetNotMet;
      on success push and update both maps. The first header on an empty chain has no prev requirement
      but must meet target.
    height(): number — tip index (define and test: −1 when empty).
    byHeight(n): BlockHeader|undefined.
    byHash(hash): {header:BlockHeader; height:number}|undefined.
    containsMerkleRoot(root): {height:number}|undefined — map lookup by display hex.
  Nothing outside the validated chain is ever trusted.
  Tests:
    T-chain-1 build a short run of genuine consecutive BSV headers; each add succeeds; height/byHeight/byHash correct.
    T-chain-2 add with prevBlockHash≠tip hash → ChainNotLinked; chain unchanged after the failed add.
    T-chain-3 add a header failing target → ChainTargetNotMet; chain unchanged.
    T-chain-4 containsMerkleRoot returns correct height for a genuine block in the chain; undefined for an unknown root.
    T-chain-5 first header on an empty chain is accepted but must meet target.

A.10 scriptdataenvelope.ts (pushdata in script; NEVER OP_RETURN)
  buildScriptDataEnvelope(payload): Result<{lockingScript:Script},BsvError> — encode payload as pushdata in an
    OP_FALSE OP_IF … OP_ENDIF guarded envelope (or PushDrop push-then-drop); EnvelopeOversize if over the
    documented limit. OP_RETURN is never emitted. Document the exact opcode layout in docs/DECISIONS.md.
  recognise(lockingScript): Result<Uint8Array,BsvError> — return payload if an envelope of the documented form,
    else EnvelopeNotRecognised.
  Tests:
    T-env-1 build∘recognise round-trips a 32-byte payload (a field-tree root) and a short payload.
    T-env-2 recognise → EnvelopeNotRecognised for an ordinary output script.
    T-env-3 buildScriptDataEnvelope rejects an oversize payload (EnvelopeOversize{max,got}).
    T-env-4 no produced script contains the OP_RETURN opcode (assert by scanning chunks).

A.11 nodeclient.ts
  interface NodeClient {
    getTransaction(txid): Promise<Result<Transaction,BsvError>>;
    getBlockTxids(blockHash): Promise<Result<Txid[],BsvError>>;   // block order
    getHeader(blockHash): Promise<Result<BlockHeader,BsvError>>;
    getHeadersFrom(height,count): Promise<Result<BlockHeader[],BsvError>>;
  }
  OfflineNodeClient — from a fixture set (maps by display hex / height); NodeNotFound when absent;
    deterministic; CI uses it with no network.
  LiveNodeClient — BSV node (Teranode target) via an injected transport; transport failure→NodeUnreachable,
    missing→NodeNotFound, decode failure→NodeBadResponse, timeout→NodeUnreachable; configurable timeout;
    no unhandled rejection.
  Tests:
    T-node-1 OfflineNodeClient returns the fixture tx, the fixture block's ordered txids, the fixture header;
      NodeNotFound for unknown txid/blockHash/height.
    T-node-2 LiveNodeClient with a mock transport: network error→NodeUnreachable; 404-equivalent→NodeNotFound;
      malformed body→NodeBadResponse; timeout→NodeUnreachable; success→parsed value.

A.12 test/fixtures (genuine BSV data; never fabricated)
  Genuine only: ≥1 genuine BSV transaction (raw bytes + published txid); ≥1 genuine BSV block
  (80-byte header + ordered txids + published merkle root + published block hash); a short run of
  consecutive genuine BSV headers for HeaderChain tests. Each fixture file has a `source` field naming
  only a BSV source. If genuine data cannot be obtained here, mark dependent tests pending and list in the
  test file the exact fields each fixture must contain — never fabricate bytes.

A.13 Package acceptance (bsv)
  Every function A.1–A.11 implemented; every test A.2–A.11 written and passing (or pending with exact
  required fixture fields where genuine data is unavailable, never fabricated); no forbidden token (Part 0.1)
  anywhere in the package; secp256k1 not referenced in this package at all; strict-TypeScript build, no warnings.

================================================================================
EXPANDED PACKAGE B — packages/merkle  (Merkle Proof Entity, WO 2022/100946)
================================================================================

B.0 Layout
  packages/merkle/package.json name "@vaa/merkle"; deps: @vaa/bsv. scripts build/test/lint/bench.
  src/: index.ts, errors.ts, tree.ts, proof.ts, verify.ts.
  test/: tree.test.ts, proof.test.ts, verify.test.ts, e2e_block.test.ts.

B.1 errors.ts
  MerkleError union: EmptyLeaves {}; IndexOutOfRange {index:number; leafCount:number};
    SiblingCountMismatch {got:number; expected:number}.

B.2 Node construction (EXACT, per patent)
  Leaf node = hashLeaf(dataItem) = doubleSha256(dataItem).
  Internal node = hashNode(left,right) = doubleSha256(left||right) (internal-order concat).
  Hash = double-SHA256. Leaves = transaction identifiers in block order.
  Odd level: the last node is paired with itself before hashing.

B.3 types
  MerkleProof = { index:number; siblings:Hash[] } — index is leaf position; siblings ordered leaf→root (excl. root).
  MerkleTree  = { root:Hash; levels:Hash[][] } — levels[0] is the leaf layer; last level is [root].

B.4 tree.ts
  buildTree(leaves:Hash[]): Result<MerkleTree,MerkleError> —
    EmptyLeaves on []. levels[0]=leaves. While current level length>1: produce next level by
    pairing (i,i+1); if length odd, pair the last node with itself; node=hashNode(left,right).
    Stop when length==1; that node is the root. Handles 1 (root=leaf), 2, odd at any level, large N.
  computeRoot(leaves:Hash[]): Result<Hash,MerkleError> — same result as buildTree(...).root, computed
    level-by-level without retaining all levels (memory-bounded for large N).
  leafIndexOfTxid(leaves:Hash[], txid:Txid): number|undefined — first position whose leaf equals the
    txid hash (txid bytes are the leaf), else undefined.
  Tests:
    T-tree-1 roots of 1,2,3(odd),4,5(odd),8 leaves vs hand-computed values.
    T-tree-2 odd-level self-pairing produces the documented node at the odd boundary.
    T-tree-3 computeRoot == buildTree(...).root for sizes 1..64 and for 1000 (large).
    T-tree-4 buildTree([]) → EmptyLeaves.
    T-tree-5 leafIndexOfTxid finds a present txid and returns undefined for an absent one.

B.5 proof.ts
  merkleProof(leaves:Hash[], index:number): Result<MerkleProof,MerkleError> —
    IndexOutOfRange if index<0 or ≥leaves.length. Walk levels from buildTree: at each level, the sibling
    of the node at the current position is the adjacent node (position^1); at an odd boundary where the
    node is self-paired, the sibling is the node itself. Collect siblings leaf→root. Return {index, siblings}.
  Tests:
    T-proof-1 for sizes 1..64 and random index, merkleProof returns siblings of length == tree height.
    T-proof-2 the self-paired boundary contributes the node itself as sibling.
    T-proof-3 IndexOutOfRange for index = -1 and index = leaves.length.

B.6 verify.ts
  reconstructRoot(leaf:Hash, proof:MerkleProof): Hash —
    cur=leaf; idx=proof.index; for each sibling s in proof.siblings:
      if (idx & 1)==0 cur=hashNode(cur,s) else cur=hashNode(s,cur); idx = idx>>1.
    return cur. Never throws on bad input — simply yields a value that will not match.
  verifyProof(leaf:Hash, proof:MerkleProof, root:Hash): VerifyResult —
    if proof.siblings.length does not equal the height implied by the tree for proof.index domain
    (caller supplies expected height via the root's tree, or accept any and just compare) →
    reason SiblingCountMismatch only when a height is known; otherwise compare reconstructRoot==root,
    ok or reason RootMismatch.
  proveAgainstChain(leaf:Hash, proof:MerkleProof, root:Hash, chain:HeaderChain): VerifyResult —
    first verifyProof(leaf,proof,root); if ok, require chain.containsMerkleRoot(root) defined else
    reason RootNotAnchored. The presence claim holds only when the root sits in a validated BSV header.
  Tests:
    T-verify-1 merkleProof∘verifyProof ok for random leaf sets (sizes 1..1024) and random valid index.
    T-verify-2 flip any byte of the leaf / any sibling / the root → not-ok (RootMismatch).
    T-verify-3 a wrong index → not-ok.
    T-verify-4 a proof with too few/many siblings → SiblingCountMismatch, never a throw.
    T-verify-5 proveAgainstChain ok when the block header is in the chain; RootNotAnchored when it is not.

B.7 e2e_block.test.ts  (genuine BSV block data; never fabricated)
  From a genuine Bitcoin (BSV) block's real txids in block order, stored in
  vectors/merkle/bsv_block_v1.json with a BSV-source field:
    computeRoot(txids) == the block's published Merkle root (display hex);
    a single-leaf proof for one txid verifies;
    proveAgainstChain succeeds when that block's header is in the HeaderChain and fails (RootNotAnchored)
    when the header is absent.
  If genuine block data cannot be fetched in the build environment, mark this test pending and list the exact
  fields required: block hash, ordered txids, expected merkle root. Never fabricate hashes. Keep the genesis
  vector only if described purely as the Bitcoin (BSV) genesis block.

B.8 Package acceptance (merkle)
  Every function B.4–B.6 implemented; every test B.4–B.7 written and passing (or pending with exact required
  fields where genuine data is unavailable, never fabricated); node construction matches the patent exactly;
  no forbidden token (0.1); strict-TypeScript build, no warnings.

================================================================================
EXPANDED PACKAGE C — packages/proofstore (Selective Verification, WO 2025/119666)
================================================================================

C.0 Layout
  packages/proofstore/package.json name "@vaa/proofstore"; deps: @vaa/bsv, @vaa/merkle.
  src/: index.ts, errors.ts, indexkey.ts, shard.ts, assistance.ts, store.ts, trusted.ts, payload.ts.
  test/: indexkey.test.ts, shard.test.ts, assistance.test.ts, store.test.ts, trusted.test.ts,
         selective_disclosure.test.ts, scale.test.ts.

C.1 errors.ts
  StoreError union: KeyError {reason:"negativePosition"|"negativeBlockPosition"|"negativeAmount"};
    ShardBadLevel {level:number; height:number}; ShardNonContiguous {};
    AssistanceRootMismatch {}; AssistanceMismatch {};
    KeyNotFound {keyHex:string}; RootMismatch {};
    TrustedOperationalNotAcceptedForAudit {}.

C.2 indexkey.ts  (claims 5–6 schema)
  Direction = "input" | "output".
  IndexKey = { txid:Txid; direction:Direction; position:number; blockPosition:number;
               lockingScript?:Script; unlockingScript?:Script; amountMinorUnits?:bigint }.
  validateKey(k): Result<void,StoreError> — position≥0, blockPosition≥0, amount≥0 when present.
  serializeKey(k): string — canonical, collision-free: fixed field order; each field length-prefixed;
    optional script fields encoded as length+hex or an explicit "absent" marker; direction as one byte;
    txid as internal-hex; numbers as fixed-width. Two keys differing in any field serialise differently.
  Tests:
    T-key-1 serializeKey round-trip representation stable for keys with and without optional fields.
    T-key-2 keys differing in txid / direction / position / blockPosition / lockingScript /
      unlockingScript / amount each serialise to distinct strings.
    T-key-3 validateKey rejects negative position, blockPosition, amount.

C.3 shard.ts  (claims 2–3, non-overlapping portions)
  ProofShard = { fromLevel:number; toLevel:number; siblings:Hash[] } — siblings length == toLevel-fromLevel.
  StoredProof = { key:IndexKey; leafIndex:number; shards:ProofShard[]; expectedRoot:Hash }.
  shardProof(proof:MerkleProof, predeterminedLevel:number): Result<ProofShard[],StoreError> —
    ShardBadLevel if level≤0 or ≥proof.siblings.length. Produce exactly two non-overlapping shards:
    lower {0,predeterminedLevel, siblings[0..predeterminedLevel)} and
    upper {predeterminedLevel,height, siblings[predeterminedLevel..height)}.
  reassemble(stored:StoredProof): Result<MerkleProof,StoreError> — sort shards by fromLevel, assert
    contiguity (each toLevel == next fromLevel) and full coverage [0,height) else ShardNonContiguous;
    concatenate siblings into {index:leafIndex, siblings}.
  Tests:
    T-shard-1 shardProof yields two non-overlapping contiguous shards covering the whole proof.
    T-shard-2 reassemble(shardProof(p)) == p for sizes 2..64 at several predetermined levels.
    T-shard-3 ShardBadLevel for level 0 and level==height.
    T-shard-4 reassemble of non-contiguous shards → ShardNonContiguous.

C.4 assistance.ts  (claim 8, public proof-assistance data)
  ProofAssistance = { predeterminedLevel:number; nodeLabels:Hash[] } — labels of the Merkle nodes at the
    predetermined level.
  computeProofAssistance(leaves:Hash[], predeterminedLevel:number): Result<ProofAssistance,…> — build the
    tree, return the node labels at that level (left→right).
  labelsHashToRoot(a:ProofAssistance, root:Hash): VerifyResult — fold a.nodeLabels upward (same node rule,
    odd self-pairing) to a computed root; ok iff equals(computed,root) else AssistanceRootMismatch. This lets
    a verifier confirm the public labels are consistent with the anchored root using no private data.
  Tests:
    T-assist-1 computeProofAssistance returns the correct count and values of level-k nodes.
    T-assist-2 labelsHashToRoot ok for genuine labels; AssistanceRootMismatch when any label is altered.

C.5 store.ts  (the proof store; claim 12 query)
  class ProofStore(predeterminedLevel:number):
    state: Map serializeKey→StoredProof; Map rootHex→ProofAssistance; an upper-shard cache by rootHex so
      shared upper portions are stored once per root, not duplicated per item.
    anchor(key, leaves, leafIndex): Result<Hash,StoreError> — validateKey; proof=merkleProof(leaves,leafIndex);
      shards=shardProof(proof,predeterminedLevel); root=computeRoot(leaves); store StoredProof
      {key,leafIndex,shards,expectedRoot:root} under serializeKey(key); computeProofAssistance(leaves,level)
      recorded under rootHex; the upper shard for this root cached once; return root.
    query(key): Result<StoredProof,StoreError> — return the stored proof for serializeKey(key) else
      KeyNotFound{keyHex}. (Claim 12: communicate the relevant proof part to a querying user.)
    proofAssistanceFor(root): ProofAssistance|undefined.
    verify(leaf, stored, mode:"adversarial"|"trustedOperational"): VerifyResult —
      adversarial: reassemble(stored) then verifyProof(leaf,proof,stored.expectedRoot) — the INDEPENDENT
        AUDIT path (default).
      trustedOperational: delegate to trusted.ts (C.6); this path is never accepted as audit evidence —
        if a caller routes a trustedOperational result into the audit acceptance, return
        TrustedOperationalNotAcceptedForAudit.
    verifyWithAssistance(leaf, stored): VerifyResult — SELECTIVE DISCLOSURE / patent consumer flow:
      take only the lower shard (fromLevel 0); fold from leaf up to predeterminedLevel using ONLY those
      siblings to obtain nodeAtLevel; require it equals the corresponding published proof-assistance label
      (else AssistanceMismatch); and require labelsHashToRoot(assistanceFor(expectedRoot), expectedRoot).
      The verifier completes the check from only the lower shard plus public data and learns nothing about
      any other record.
  Tests:
    T-store-1 anchor then query returns the StoredProof; KeyNotFound for an un-anchored key.
    T-store-2 verify(adversarial) ok for a genuine leaf+proof; not-ok for wrong leaf / wrong index /
      wrong root / a missing shard / an altered shard.
    T-store-3 verifyWithAssistance ok using only the lower shard + public labels; AssistanceMismatch when
      the lower shard is altered; AssistanceRootMismatch surfaced when labels do not hash to the root.
    T-store-4 the audit acceptance refuses a trustedOperational result
      (TrustedOperationalNotAcceptedForAudit).

C.6 trusted.ts  (claims 9–11; optional; OFF by default; never audit evidence)
  A function with a homomorphic property over the proof-assistance node data, realised as a sum of
  secp256k1 (Bitcoin's curve, via the SDK) points, each point representing a Merkle node at the predetermined
  level. Exposed only behind an explicit "trustedOperational" selection. Documented as NOT adversarially sound
  (easier to manipulate). Never the default; never accepted by the audit path.
  Tests:
    T-trusted-1 the homomorphic sum is computed and verifies in a trusted-only check on genuine data.
    T-trusted-2 selecting trustedOperational where audit evidence is required is refused by store.verify.

C.7 payload.ts
  retrievalBytesAdversarial(stored): number — bytes the verifier receives for a full adversarial reassembly
    (sum of all shard sibling bytes + framing).
  retrievalBytesAssisted(stored): number — bytes for the assisted flow (lower shard only; public labels are
    already public, not re-sent).
  Tests:
    T-payload-1 assisted bytes < adversarial bytes when predeterminedLevel>0.
    T-payload-2 both counts are exact (match a byte count of the actual serialised fragments).

C.8 selective_disclosure.test.ts
  T-sd-1 a query for one key returns only that item's StoredProof; the response contains nothing derived
    from any other anchored record (assert by anchoring several items and inspecting the query response).
  T-sd-2 verifyWithAssistance succeeds using only the lower shard + public labels; no other record's data is
    needed or present.

C.9 scale.test.ts
  T-scale-1 anchor many items in one tree; assert shared upper portions are stored once (total stored bytes
    < naive per-item full-proof bytes).
  T-scale-2 adversarial soundness still holds at scale: a tampered leaf among many is rejected.

C.10 Package acceptance (proofstore)
  Every function C.2–C.7 implemented; every test C.2–C.9 written and passing; selective disclosure
  (verifyWithAssistance returning only the queried fragment) demonstrated; the trusted-operational mode
  explicit, off by default, refused by the audit path; no commitment/zk/range-proof concept anywhere; no
  forbidden token (0.1); strict-TypeScript build, no warnings.

================================================================================
EXPANDED PACKAGE D — packages/evidence  (accounting record → Bitcoin (BSV) data item)
================================================================================

D.0 Layout
  packages/evidence/package.json name "@vaa/evidence"; deps: @vaa/bsv, @vaa/merkle, @vaa/proofstore.
  src/: index.ts, errors.ts, schema.ts, serialise.ts, population.ts, indexmap.ts, checks.ts.
  test/: schema.test.ts, serialise.test.ts, population.test.ts, indexmap.test.ts, checks.test.ts.

D.1 errors.ts
  EvidenceError union: SchemaInvalid {field:string; reason:string}; SerialiseBadVersion {got:number};
    DeserialiseTruncated {}; CheckMismatch {check:string; computed:string; stated:string}.

D.2 schema.ts  (evidence object types; bigint minor units; validation)
  InvoiceFields { id:string; counterparty:string; net:bigint; tax:bigint; discount:bigint; gross:bigint }.
  Payment { id:string; counterparty:string; amount:bigint }.
  LedgerEntry { id:string; account:string; debit:bigint; credit:bigint }.
  ReconciliationItem { id:string; bookAmount:bigint; adjustment:bigint }.
  EvidenceObject = InvoiceFields | Payment | LedgerEntry | ReconciliationItem with a discriminant `type`.
  validate(obj): Result<void,EvidenceError> — non-empty id; amounts are bigint; non-negative where required
    (net,tax,discount,gross,amount,debit,credit,bookAmount ≥ 0; adjustment may be negative); SchemaInvalid otherwise.
  Tests:
    T-schema-1 each type validates a correct instance.
    T-schema-2 each type rejects: empty id; a negative non-negative-field; a non-bigint amount (type test).

D.3 serialise.ts  (canonical, versioned, deterministic — this is the anchored data item)
  VERSION = 1 (a leading version byte).
  serializeEvidence(obj): Uint8Array — version byte; a type tag byte; then fields in fixed order; strings as
    varint-length-prefixed UTF-8; bigints as fixed-width (e.g. 8-byte) big-endian minor units; deterministic
    (no map ordering ambiguity).
  deserializeEvidence(bytes): Result<EvidenceObject,EvidenceError> — SerialiseBadVersion if version≠1;
    DeserialiseTruncated on short buffer; the inverse of serialize with validate() applied.
  Tests:
    T-ser-1 serialize∘deserialize round-trips each type.
    T-ser-2 two distinct objects serialise to distinct bytes.
    T-ser-3 a wrong version byte → SerialiseBadVersion; a truncated buffer → DeserialiseTruncated.
    T-ser-4 serialisation is stable across runs (byte-identical).

D.4 fieldtree.ts  (intra-transaction field tree and per-field disclosure — see Part 5.0)
  fieldLeaf(field:AccountingField): Hash — hashLeaf(canonical (tag,value) encoding).
  fieldLeaves(tx:AccountingTransaction): Hash[] — fieldLeaf over tx.fields in field order. THESE ARE THE LEAVES.
  fieldTreeRoot(tx): Hash — computeRoot(fieldLeaves(tx)); commits the whole accounting transaction's field set.
  buildAccountingTx(tx): Result<{ lockingScripts:Script[]; fieldTreeRoot:Hash },…> — encode the field set and the
    commitment (root, optionally held in parts) as pushdata in script of ONE Bitcoin (BSV) transaction via
    buildScriptDataEnvelope; NEVER OP_RETURN.
  parseAccountingTx(scripts:Script[]): Result<AccountingTransaction,…> — recover the fields from script pushdata.
  discloseField(tx, fieldIndex): { field:AccountingField; proof:MerkleProof; root:Hash } — one field plus its
    Merkle path; no other field value included.
  verifyDisclosedField(field, proof, root): VerifyResult — fieldLeaf(field)+proof reconstructs to root.
  Tests:
    T-ft-1 fieldLeaves deterministic and order-stable; fieldTreeRoot == computeRoot(fieldLeaves).
    T-ft-2 buildAccountingTx then parseAccountingTx round-trips a 1000-field invoice; no script chunk is OP_RETURN.
    T-ft-3 discloseField on a 1000-field invoice; verifyDisclosedField ok; no other field's value appears.
    T-ft-4 tamper the disclosed field value -> not ok; wrong proof -> not ok.
    T-ft-5 proof size grows as log2(field count) from tens to thousands of fields.

D.5 indexmap.ts  (proofstore index population)
  indexKeyFor(obj:EvidenceObject, bsv:{ txid:Txid; direction:Direction; position:number; blockPosition:number;
    lockingScript?:Script; unlockingScript?:Script; amountMinorUnits?:bigint }): IndexKey — assemble the
    proofstore IndexKey from the object's BSV transaction context.
  Tests:
    T-idx-1 derived keys validate and serialise/round-trip via proofstore.serializeKey.

D.6 checks.ts  (accounting checks by RECOMPUTATION over disclosed records — NOT hidden-value crypto)
  Each operates on records disclosed for the assertion (consistent with selective disclosure — only the records
  needed for the check are opened), in bigint, overflow-safe:
  checkInvoiceTotal(inv:InvoiceFields): VerifyResult — gross == net + tax − discount else
    CheckMismatch{check:"invoiceTotal",computed,stated}.
  checkArRollForward({ open:bigint; invoices:bigint[]; receipts:bigint[]; creditNotes:bigint[];
    writeOffs:bigint[]; close:bigint }): VerifyResult — close == open + Σinvoices − Σreceipts − ΣcreditNotes
    − ΣwriteOffs else CheckMismatch{check:"arRollForward",…}.
  checkDebitCreditEquality(entries:LedgerEntry[]): VerifyResult — Σdebit == Σcredit else
    CheckMismatch{check:"debitCredit",…}.
  checkBankReconciliation({ bookCash:bigint; reconcilingItems:bigint[]; bankBalance:bigint }): VerifyResult —
    bookCash + Σreconciling == bankBalance else CheckMismatch{check:"bankRec",…}.
  checkVat({ outputTax:bigint; inputTax:bigint; payable:bigint }): VerifyResult — payable == outputTax − inputTax
    else CheckMismatch{check:"vat",…}.
  Tests:
    T-chk-1 each check passes on a correct case.
    T-chk-2 each check fails on an incorrect case with the right `check` label and the computed vs stated totals.
    T-chk-3 overflow-safe with large bigints (values beyond 2^53).

D.7 Package acceptance (evidence)
  Every function D.2–D.6 implemented; every test D.2–D.6 written and passing; serialisation deterministic and
  versioned; checks are recomputation only (no commitment/zk/range-proof); no forbidden token (0.1);
  strict-TypeScript build, no warnings.

================================================================================
EXPANDED PACKAGE E — packages/api  (service over the two patents)
================================================================================

E.0 Layout
  packages/api/package.json name "@vaa/api"; deps: @vaa/bsv,@vaa/merkle,@vaa/proofstore,@vaa/evidence,
    a structured logger, a schema validator, an HTTP framework. src/: index.ts, errors.ts, config.ts,
    auth.ts, ratelimit.ts, auditlog.ts, schemas.ts, handlers.ts, server.ts. test/: per-module + integration.ts.

E.1 errors.ts
  ApiError union: BadRequest {field:string; reason:string}; Unauthorized {}; RateLimited {retryAfterMs:number};
    NotFound {what:string}; Internal {detail:string}. Every handler returns a typed ApiError or a typed success;
    no unhandled rejection; adversarial input never throws.

E.2 config.ts
  AppConfig = { nodeEndpoint:string; network:"mainnet"|"testnet"; predeterminedLevel:number;
    auth:{ scheme:"apiKey"|"jwt"; … }; rateLimit:{ perMinute:number }; logLevel:string }.
  loadConfig(env): Result<AppConfig,ApiError> — validate at startup; fail fast (Internal) on invalid config.
  Tests: T-cfg-1 valid env → AppConfig; T-cfg-2 each missing/invalid field → failure.

E.3 auth.ts
  authenticate(req, cfg): Result<CallerId,ApiError> — pluggable scheme from config; Unauthorized on failure.
  Tests: T-auth-1 valid credential → CallerId; T-auth-2 missing/invalid → Unauthorized.

E.4 ratelimit.ts
  a per-caller limiter (token bucket from cfg.rateLimit); check(callerId): Result<void,ApiError> — RateLimited
    with retryAfterMs when exceeded.
  Tests: T-rl-1 within limit passes; T-rl-2 over limit → RateLimited.

E.5 auditlog.ts
  record({ ts; callerId; queryKeyHex; returnedFragmentId; outcome }) — append-only audit entry; NEVER logs
    underlying record content, keys, or full proofs.
  Tests: T-al-1 a proof response writes one entry with metadata only; T-al-2 no record content appears in the entry.

E.6 schemas.ts
  Request schemas validated at the boundary: AnchorRequest, ProveRequest, QueryRequest, VerifyRequest — each
    with explicit field types; reject with BadRequest{field,reason}.
  Tests: T-sch-1 each schema accepts a valid body and rejects a malformed one with the offending field.

E.7 handlers.ts  (operations)
  anchor(req): Result<{ fieldTreeRootHex:string; envelopeScriptsHex:string[] },ApiError> — build the field tree for the accounting transaction from
    the request, build the field tree and the one-tx script envelopes (never OP_RETURN), return field-tree root + envelope scripts.
  prove(req): Result<{ proof:{ index:number; siblingsDisplayHex:string[] }; rootDisplayHex:string },ApiError> —
    merkle.merkleProof for the requested data item; serialise to display hex.
  query(req): Result<{ storedProof: <serialised StoredProof for the queried item only> },ApiError> — proofstore.query;
    the response contains ONLY the queried item's fragment, nothing about other records.
  verify(req): Result<VerifyResult,ApiError> — proofstore.verify in adversarial mode AND merkle.proveAgainstChain;
    terminates in the BSV HeaderChain; REFUSES any result derived from the trusted-operational compression.
  Tests:
    T-h-1 anchor returns a root that recomputes from the same population.
    T-h-2 prove returns a proof that verifies.
    T-h-3 query returns only the queried item's fragment.
    T-h-4 verify ok for a genuine bundle anchored in the chain; refuses a trusted-operational result;
      fails when the root is not in the chain.

E.8 server.ts
  wire config → auth → ratelimit → schema validation → handler → audit log; health (/healthz) and readiness
  (/readyz) endpoints; structured logging; no secret/record content logged.

E.9 integration.ts
  T-int-1 anchor → prove → query → verify end to end against the OfflineNodeClient at a realistic size, all ok.
  T-int-2 authentication accepts valid and rejects invalid callers.
  T-int-3 rate limiting triggers under burst.
  T-int-4 verify refuses a trusted-operational result.
  T-int-5 malformed requests are rejected with typed BadRequest errors.

E.10 Package acceptance (api)
  Every function E.2–E.8 implemented; every test E.2–E.9 written and passing; verify uses only the adversarial /
  proof-assistance path and terminates in the header chain; audit log holds metadata only; no forbidden token (0.1);
  strict-TypeScript build, no warnings.

================================================================================
EXPANDED PACKAGE F — packages/cli  (command-line binary `vaa`)
================================================================================

F.0 Layout
  packages/cli/package.json name "@vaa/cli"; bin "vaa"; deps: all packages above + a CLI arg parser.
  src/: index.ts, errors.ts, args.ts, cmd_anchor.ts, cmd_prove.ts, cmd_verify.ts, cmd_query.ts,
        cmd_selftest.ts, cmd_reproduce.ts. test/: one per command.

F.1 commands (full arg parsing + validation + typed error reporting; no unhandled rejection)
  anchor  --accounting-tx <file.json>         → prints fieldTreeRoot and one-tx script envelope hex (never OP_RETURN).
  prove   --leaves <file.json> --index <n>    → writes a proof bundle (index + sibling display hexes + root).
  verify  --bundle <file.json>                → prints VerifyResult; terminates in the header chain;
                                                 refuses trusted-operational.
  query   --key <file.json>                   → prints the queried item's fragment only.
  selftest                                    → exercises every layer end to end; prints pass/fail PER LAYER.
  reproduce                                   → regenerates every deterministic vector (the Bitcoin/BSV block
                                                 Merkle vector; the study vectors) and every reported figure;
                                                 diffs against committed expected outputs; exits non-zero on
                                                 any mismatch.
  Input files validated; bad input → a typed error and a non-zero exit, never a stack-only crash.

F.2 tests
  T-cli-1 each command's happy path produces the expected output.
  T-cli-2 each command's error path (missing file, bad json, out-of-range index) → typed error + non-zero exit.
  T-cli-3 selftest returns success per layer on a clean build.
  T-cli-4 reproduce regenerates and matches committed vectors; a deliberately altered vector makes it exit non-zero.

F.3 Package acceptance (cli)
  Every command implemented; every test written and passing; selftest covers every layer; reproduce regenerates
  and diffs all deterministic vectors; no forbidden token (0.1); strict-TypeScript build, no warnings.

================================================================================
EXPANDED PACKAGE G — packages/simstore  (storage / retrieval efficiency study) — MANDATORY
================================================================================

G.0 Layout
  packages/simstore/package.json name "@vaa/simstore"; bin "vaa-simstore"; deps: @vaa/bsv,@vaa/merkle,
    @vaa/proofstore, a benchmarking helper, a seeded RNG. src/: index.ts, population.ts, measure.ts, main.ts.
    test/: measure.test.ts.

G.1 Deterministic inputs
  A fixed seed (recorded in code and docs/REPRODUCIBILITY.md). Build N synthetic leaves deterministically
  (these stand in for committed-accounting tx leaves; documented as such). Report points N ∈ {1024,16384,262144};
  a small CI point (e.g. N=256). Query sample Q = min(N, 1000), deterministically chosen.

G.2 Measurements (from the REAL populated structure — never a formula substituted for a measurement)
  Anchor the Q-sample into a ProofStore at a chosen predeterminedLevel (record the level and the rule used to
  pick it, e.g. floor(log2 N / 2)). Measure:
    baseline_full_proof_bytes = Q · ceil(log2 N) · 32, AND re-derived from a real count of stored full proofs;
    sharded_stored_bytes — actual bytes the ProofStore holds, counting shared upper portions once;
    duplicate_avoided_bytes = baseline − sharded, and the ratio;
    proof_assistance_bytes per root;
    retrieval_adversarial_bytes and retrieval_assisted_bytes for a single query, separately
      (via proofstore.payload);
    verify_time and verify_with_assistance_time — median + min/max via a real timer, labelled local.

G.3 Output
  Machine-readable stdout lines, one per measurement. Write vectors/study/storage_<N>.json for the CI point
  so `reproduce` diffs it. Large report points printed with the hardware noted, labelled local.

G.4 Tests
  T-store-eff-1 sharded_stored_bytes ≤ baseline_full_proof_bytes for several N.
  T-store-eff-2 a tampered leaf among the sample is rejected (adversarial soundness at scale).
  T-store-eff-3 the assisted retrieval payload contains nothing about other records.
  T-store-eff-4 the CI-point JSON regenerates byte-identically (reproduce determinism).

G.5 Package acceptance (simstore)
  Implemented; tests written and passing; numbers are measured from the real structure; CI point feeds reproduce;
  no fabricated numbers; no forbidden token (0.1); strict-TypeScript build, no warnings.

================================================================================
EXPANDED PACKAGE H — packages/simstudy  (synthetic-population assurance study) — MANDATORY
================================================================================

H.0 Layout
  packages/simstudy/package.json name "@vaa/simstudy"; bin "vaa-simstudy"; deps: @vaa/bsv,@vaa/merkle,
    @vaa/proofstore,@vaa/evidence, a seeded RNG. src/: index.ts, population.ts, faults.ts, measure.ts, main.ts.
    test/: study.test.ts.

H.1 Deterministic population
  A fixed seed. Build a synthetic AR roll-forward population whose CLEAN version balances exactly
  (close = open + Σinvoices − Σreceipts − ΣcreditNotes − ΣwriteOffs), with M movements (report point e.g.
  M=100000; a small CI point). Each value is an evidence object (minor units). Anchor the records as Bitcoin
  (BSV) data items (evidence.populationLeaves + a ProofStore).

H.2 Assurance measurements (YOUR system; no commitment/zk/range-proof anywhere)
  Merkle Proof Entity inclusion proof generation and verification across population sizes (timings, median+range,
    labelled local).
  Selective-disclosure retrieval: assert a query returns only the queried item's fragment and discloses nothing
    about any other record.
  The AR roll-forward verified by RECOMPUTATION over the anchored records (evidence.checkArRollForward).

H.3 Fault injection (into copies of the population; report injected/detected/missed; zero false positives on clean)
  Fault classes: tampered leaf; wrong index; wrong root; missing fragment; altered record; omitted record;
  duplicated record. Each in-scope fault MUST be detected by the inclusion / selective-verification / recomputation
  checks. On the clean population there are ZERO false positives.

H.4 Honest boundary (record explicitly; do not hide)
  A record committed FALSELY AT ORIGIN (internally consistent but untrue) is NOT detected by the system. The study
  reports this as a stated boundary, not a defect.

H.5 Output
  Machine-readable summary lines. Write vectors/study/simstudy_<M>.json for the CI point so `reproduce` diffs it.
  Large-point timings on stated hardware, labelled local.

H.6 Tests
  T-study-1 zero false positives on the clean population.
  T-study-2 each in-scope fault class is detected (assert per class).
  T-study-3 the false-origin boundary case is asserted as NOT detected (explicitly).
  T-study-4 the CI-point JSON regenerates byte-identically (reproduce determinism).

H.7 Package acceptance (simstudy)
  Implemented; tests written and passing; measures your system (presence + selective disclosure + recomputation),
  not any removed crypto; the false-origin boundary recorded honestly; CI point feeds reproduce; no fabricated
  numbers; no commitment/zk/range-proof concept; no forbidden token (0.1); strict-TypeScript build, no warnings.


################################################################################
##  DEEP EXPANSION — FULL PSEUDOCODE BODIES, BYTE LAYOUTS, PER-CASE TESTS      ##
##  This section drives the spec to implementation-complete depth. Every       ##
##  function body is written as step-by-step pseudocode; every wire format as  ##
##  a byte table; every test as its own fully-stated case.                     ##
################################################################################

================================================================================
DEEP A — packages/bsv, full pseudocode and byte layouts
================================================================================

DA.1 bytes.ts — full bodies
  function readU32LE(buf, offset) -> Result<number>:
    if offset < 0 OR offset + 4 > buf.length: return Err(BytesOutOfRange{offset, length:4, bufferLength:buf.length})
    return Ok(buf[offset] | (buf[offset+1]<<8) | (buf[offset+2]<<16) | (buf[offset+3]<<24) >>> 0)
  function writeU32LE(value, into, offset) -> void:
    assert offset + 4 <= into.length
    into[offset]   = value & 0xff
    into[offset+1] = (value >>> 8)  & 0xff
    into[offset+2] = (value >>> 16) & 0xff
    into[offset+3] = (value >>> 24) & 0xff
  function readVarInt(buf, offset) -> Result<{value:bigint, nextOffset:number}>:
    if offset >= buf.length: return Err(BytesOutOfRange{offset, length:1, bufferLength:buf.length})
    first = buf[offset]
    if first < 0xfd:  return Ok({value: BigInt(first), nextOffset: offset+1})
    if first == 0xfd:
      if offset+3 > buf.length: return Err(BytesOutOfRange{offset, length:3, bufferLength:buf.length})
      return Ok({value: BigInt(buf[offset+1] | (buf[offset+2]<<8)), nextOffset: offset+3})
    if first == 0xfe:
      if offset+5 > buf.length: return Err(BytesOutOfRange{offset, length:5, bufferLength:buf.length})
      r = readU32LE(buf, offset+1); if r.isErr: return r
      return Ok({value: BigInt(r.value), nextOffset: offset+5})
    // first == 0xff
    if offset+9 > buf.length: return Err(BytesOutOfRange{offset, length:9, bufferLength:buf.length})
    lo = readU32LE(buf, offset+1).value; hi = readU32LE(buf, offset+5).value
    return Ok({value: (BigInt(hi)<<32n) | BigInt(lo), nextOffset: offset+9})
  function writeVarInt(value:bigint) -> Uint8Array:
    if value < 0n: throw BsvError programmer-misuse
    if value < 0xfdn: return Uint8Array([Number(value)])
    if value <= 0xffffn: return Uint8Array([0xfd, Number(value & 0xffn), Number((value>>8n)&0xffn)])
    if value <= 0xffffffffn: out=Uint8Array(5); out[0]=0xfe; writeU32LE(Number(value),out,1); return out
    out=Uint8Array(9); out[0]=0xff; writeU32LE(Number(value & 0xffffffffn),out,1);
      writeU32LE(Number((value>>32n)&0xffffffffn),out,5); return out
  function reverseBytes(buf) -> Uint8Array: out=Uint8Array(buf.length); for i in 0..buf.length: out[i]=buf[buf.length-1-i]; return out
  function concat(...parts) -> Uint8Array: total=Σ part.length; out=Uint8Array(total); off=0; for p in parts: out.set(p,off); off+=p.length; return out
  function toHexLower(buf) -> string: map each byte to two lower-case hex chars, join.
  function fromHex(str) -> Result<Uint8Array>:
    if str.length is odd: return Err(BytesOutOfRange-equivalent HashBadHex... use a BytesError variant)
    for each pair: if not hex digit: return Err(...charset); else parse
    return Ok(bytes)
  Per-case tests (each its own `it(...)`):
    DA.1-T1 readU32LE([0,0,0,0],0)==0
    DA.1-T2 readU32LE([1,0,0,0],0)==1
    DA.1-T3 readU32LE([0xff,0xff,0xff,0x7f],0)==0x7fffffff
    DA.1-T4 readU32LE([0xff,0xff,0xff,0xff],0)==0xffffffff
    DA.1-T5 readU32LE(buf,len-2) -> Err BytesOutOfRange
    DA.1-T6 readVarInt([0x00]) -> {0n,1}
    DA.1-T7 readVarInt([0xfc]) -> {252n,1}
    DA.1-T8 readVarInt([0xfd,0xfd,0x00]) -> {253n,3}
    DA.1-T9 readVarInt([0xfe,0,0,1,0]) -> {65536n,5}
    DA.1-T10 readVarInt([0xff,0,0,0,0,1,0,0,0]) -> {4294967296n,9}
    DA.1-T11 readVarInt([0xfd]) -> Err; ([0xfe,0,0]) -> Err; ([0xff,0]) -> Err
    DA.1-T12 writeVarInt then readVarInt identity for 0,252,253,65535,65536,4294967295,4294967296
    DA.1-T13 reverseBytes([1,2,3,4])==[4,3,2,1]; double reverse identity on 32 bytes
    DA.1-T14 fromHex("abc") -> Err length; fromHex("zz") -> Err charset; round-trip 32 bytes; output lower-case

DA.2 hash.ts — full bodies
  const HASH_LEN = 32
  function fromInternalBytes(bytes) -> Result<Hash>:
    if bytes.length != 32: return Err(HashBadLength{got:bytes.length})
    return Ok(brand(copyOf(bytes)))
  function fromDisplayHex(hex) -> Result<Hash>:
    if hex.length != 64: return Err(HashBadHex{reason:"length"})
    parsed = fromHex(hex); if parsed.isErr: return Err(HashBadHex{reason:"charset"})
    return Ok(brand(reverseBytes(parsed.value)))   // display(BE) -> internal(LE)
  function toInternalBytes(h) -> Uint8Array: return copyOf(unbrand(h))
  function toDisplayHex(h) -> string: return toHexLower(reverseBytes(unbrand(h)))
  function equals(a,b) -> boolean:
    diff = 0; for i in 0..32: diff |= unbrand(a)[i] ^ unbrand(b)[i]; return diff == 0   // constant-time
  function zero() -> Hash: return brand(Uint8Array(32))   // all zero
  Per-case tests:
    DA.2-T1 a fixed internal buf -> toDisplayHex -> fromDisplayHex == original (round-trip)
    DA.2-T2 fromInternalBytes(31 bytes) -> Err{got:31}; (33) -> Err{got:33}
    DA.2-T3 fromDisplayHex(63 chars) -> Err length; (65) -> Err length; (64 non-hex) -> Err charset
    DA.2-T4 equals(x,x) true; equals(x,y) false when one byte differs; symmetric
    DA.2-T5 toDisplayHex output is 64 chars, lower-case

DA.3 hashing.ts — full bodies
  function doubleSha256(data) -> Hash:
    d1 = SDK.sha256(data); d2 = SDK.sha256(d1); return fromInternalBytes(d2).value  // 32 bytes guaranteed
  function hashLeaf(item) -> Hash: return doubleSha256(item)
  function hashNode(left,right) -> Hash: return doubleSha256(concat(toInternalBytes(left), toInternalBytes(right)))
  Per-case tests:
    DA.3-T1 doubleSha256(empty) equals SDK.sha256(SDK.sha256(empty)) wrapped
    DA.3-T2 doubleSha256(ascii "abc") matches an independently computed constant
    DA.3-T3 hashNode(a,b) != hashNode(b,a) for distinct a,b
    DA.3-T4 hashLeaf(item) stable across two calls

DA.4 header.ts — byte layout (the 80-byte Bitcoin/BSV header)
  Offset  Size  Field           Encoding
  0       4     version         uint32 little-endian
  4       32    prevBlockHash   32 bytes, internal order (as stored on the wire)
  36      32    merkleRoot      32 bytes, internal order
  68      4     time            uint32 little-endian
  72      4     bits            uint32 little-endian (compact target)
  76      4     nonce           uint32 little-endian
  total   80
  function parseHeader(raw) -> Result<BlockHeader>:
    if raw.length != 80: return Err(HeaderBadLength{got:raw.length})
    version = readU32LE(raw,0).value
    prevBlockHash = fromInternalBytes(raw.slice(4,36)).value
    merkleRoot    = fromInternalBytes(raw.slice(36,68)).value
    time = readU32LE(raw,68).value; bits = readU32LE(raw,72).value; nonce = readU32LE(raw,76).value
    return Ok({version,prevBlockHash,merkleRoot,time,bits,nonce})
  function serializeHeader(h) -> Uint8Array:
    out=Uint8Array(80); writeU32LE(h.version,out,0); out.set(toInternalBytes(h.prevBlockHash),4);
    out.set(toInternalBytes(h.merkleRoot),36); writeU32LE(h.time,out,68); writeU32LE(h.bits,out,72);
    writeU32LE(h.nonce,out,76); return out
  function headerHash(h) -> Hash: return doubleSha256(serializeHeader(h))
  function targetFromBits(bits) -> bigint:
    exponent = bits >>> 24; mantissa = BigInt(bits & 0x007fffff)
    if exponent <= 3: target = mantissa >> (8n*BigInt(3-exponent)) else target = mantissa << (8n*BigInt(exponent-3))
    return target
  function meetsTarget(h) -> boolean:
    hashBE = BigInt("0x" + toDisplayHex(headerHash(h)))   // display order = big-endian numeric
    return hashBE <= targetFromBits(h.bits)
  Per-case tests:
    DA.4-T1 parse a genuine 80-byte header; each field equals the known value; serialize round-trips to the same 80 bytes
    DA.4-T2 headerHash(genuine) == published block hash (display)
    DA.4-T3 targetFromBits(known bits) == known target
    DA.4-T4 meetsTarget(genuine) true; a header with hash>target -> false
    DA.4-T5 parseHeader(79 bytes) -> Err{got:79}; (81) -> Err{got:81}

DA.5 headerchain.ts — full bodies
  class HeaderChain:
    headers = []; byHashMap = Map(); byRootMap = Map()
    function add(h) -> Result<void>:
      if headers.length > 0:
        tipHash = headerHash(headers[last])
        if not equals(h.prevBlockHash, tipHash):
          return Err(ChainNotLinked{expectedPrev: toDisplayHex(tipHash), gotPrev: toDisplayHex(h.prevBlockHash)})
      if not meetsTarget(h): return Err(ChainTargetNotMet{headerHashDisplay: toDisplayHex(headerHash(h))})
      idx = headers.length; headers.push(h)
      byHashMap.set(toDisplayHex(headerHash(h)), idx); byRootMap.set(toDisplayHex(h.merkleRoot), idx)
      return Ok()
    function height() -> number: return headers.length - 1
    function byHeight(n) -> BlockHeader | undefined: return headers[n]
    function byHash(hash) -> {header,height} | undefined: idx=byHashMap.get(toDisplayHex(hash)); return idx==undefined?undefined:{header:headers[idx],height:idx}
    function containsMerkleRoot(root) -> {height} | undefined: idx=byRootMap.get(toDisplayHex(root)); return idx==undefined?undefined:{height:idx}
  Per-case tests:
    DA.5-T1 add three genuine consecutive headers in order; all Ok; height==2; byHeight/byHash/containsMerkleRoot correct
    DA.5-T2 add a header whose prevBlockHash != tip -> ChainNotLinked; headers.length unchanged
    DA.5-T3 add an under-target header -> ChainTargetNotMet; headers.length unchanged
    DA.5-T4 containsMerkleRoot(genuine root) -> its height; containsMerkleRoot(random) -> undefined
    DA.5-T5 first header on empty chain Ok if it meets target

================================================================================
DEEP B — packages/merkle, full pseudocode (WO 2022/100946)
================================================================================

DB.1 tree.ts — full bodies
  function buildTree(leaves) -> Result<MerkleTree>:
    if leaves.length == 0: return Err(EmptyLeaves)
    levels = [ copyOf(leaves) ]
    current = levels[0]
    while current.length > 1:
      next = []
      i = 0
      while i < current.length:
        left = current[i]
        right = (i+1 < current.length) ? current[i+1] : current[i]   // ODD: pair last with itself
        next.push(hashNode(left,right))
        i += 2
      levels.push(next)
      current = next
    return Ok({root: current[0], levels})
  function computeRoot(leaves) -> Result<Hash>:
    if leaves.length == 0: return Err(EmptyLeaves)
    current = copyOf(leaves)
    while current.length > 1:
      next = []; i = 0
      while i < current.length:
        left = current[i]; right = (i+1<current.length)?current[i+1]:current[i]
        next.push(hashNode(left,right)); i += 2
      current = next
    return Ok(current[0])
  function leafIndexOfTxid(leaves, txid) -> number | undefined:
    for i in 0..leaves.length: if equals(leaves[i], txidAsHash(txid)): return i
    return undefined
  Per-case tests:
    DB.1-T1 buildTree([a]).root == a
    DB.1-T2 buildTree([a,b]).root == hashNode(a,b)
    DB.1-T3 buildTree([a,b,c]).root == hashNode(hashNode(a,b), hashNode(c,c))   // odd self-pair
    DB.1-T4 buildTree([a,b,c,d]).root == hashNode(hashNode(a,b),hashNode(c,d))
    DB.1-T5 buildTree([a..e]) (5, odd) matches hand value with the self-pair at the right boundary
    DB.1-T6 computeRoot == buildTree(...).root for sizes 1..64 and for 1000
    DB.1-T7 buildTree([]) -> EmptyLeaves; computeRoot([]) -> EmptyLeaves
    DB.1-T8 leafIndexOfTxid finds present, returns undefined for absent

DB.2 proof.ts — full body
  function merkleProof(leaves, index) -> Result<MerkleProof>:
    if index < 0 OR index >= leaves.length: return Err(IndexOutOfRange{index, leafCount:leaves.length})
    tree = buildTree(leaves); if tree.isErr: return tree
    siblings = []
    pos = index
    for level in 0 .. tree.levels.length-2:        // exclude the root level
      nodes = tree.levels[level]
      if (pos % 2) == 0:
        sib = (pos+1 < nodes.length) ? nodes[pos+1] : nodes[pos]   // ODD: sibling is self
      else:
        sib = nodes[pos-1]
      siblings.push(sib)
      pos = floor(pos / 2)
    return Ok({index, siblings})
  Per-case tests:
    DB.2-T1 for sizes 1..64, random index: siblings.length == tree height (levels-1)
    DB.2-T2 at an odd boundary the self-paired node contributes itself as sibling (size 3, index 2)
    DB.2-T3 IndexOutOfRange for index -1 and index==leaves.length

DB.3 verify.ts — full bodies
  function reconstructRoot(leaf, proof) -> Hash:
    cur = leaf; idx = proof.index
    for sib in proof.siblings:
      if (idx & 1) == 0: cur = hashNode(cur, sib)   // current node is left child
      else:              cur = hashNode(sib, cur)   // current node is right child
      idx = idx >> 1
    return cur
  function verifyProof(leaf, proof, root) -> VerifyResult:
    recomputed = reconstructRoot(leaf, proof)
    if equals(recomputed, root): return {ok:true}
    return {ok:false, reason:"RootMismatch"}
    // SiblingCountMismatch is reported by callers that know the expected height; reconstructRoot never throws.
  function proveAgainstChain(leaf, proof, root, chain) -> VerifyResult:
    v = verifyProof(leaf, proof, root); if not v.ok: return v
    if chain.containsMerkleRoot(root) == undefined: return {ok:false, reason:"RootNotAnchored"}
    return {ok:true}
  Per-case tests:
    DB.3-T1 for sizes 1..1024 random index: merkleProof then verifyProof -> ok
    DB.3-T2 flip 1 byte of leaf -> not ok; flip 1 byte of any sibling -> not ok; flip 1 byte of root -> not ok
    DB.3-T3 use wrong index in the proof -> not ok
    DB.3-T4 truncate/extend siblings by one -> reconstructRoot yields a non-matching root (not ok), no throw
    DB.3-T5 proveAgainstChain ok when the block header is in the chain; RootNotAnchored when absent

================================================================================
DEEP C — packages/proofstore, full pseudocode (WO 2025/119666; selective disclosure)
================================================================================

DC.1 indexkey.ts — full bodies
  function validateKey(k) -> Result<void>:
    if k.position < 0: return Err(KeyError{reason:"negativePosition"})
    if k.blockPosition < 0: return Err(KeyError{reason:"negativeBlockPosition"})
    if k.amountMinorUnits != undefined AND k.amountMinorUnits < 0n: return Err(KeyError{reason:"negativeAmount"})
    return Ok()
  function serializeKey(k) -> string:
    parts = []
    parts.push("t:" + toInternalHex(k.txid))
    parts.push("d:" + (k.direction == "input" ? "0" : "1"))
    parts.push("p:" + u32hex(k.position))
    parts.push("b:" + u32hex(k.blockPosition))
    parts.push("l:" + (k.lockingScript ? len(scriptBytes)+":"+toHex(scriptBytes) : "-"))
    parts.push("u:" + (k.unlockingScript ? len(scriptBytes)+":"+toHex(scriptBytes) : "-"))
    parts.push("a:" + (k.amountMinorUnits != undefined ? k.amountMinorUnits.toString(16) : "-"))
    return parts.join("|")
  Per-case tests:
    DC.1-T1 serializeKey is stable for a key with all optional fields and for one with none
    DC.1-T2 changing txid / direction / position / blockPosition / lockingScript / unlockingScript / amount each yields a different string (7 sub-cases)
    DC.1-T3 validateKey rejects negative position, blockPosition, amount

DC.2 shard.ts — full bodies
  function shardProof(proof, k) -> Result<ProofShard[]>:
    height = proof.siblings.length
    if k <= 0 OR k >= height: return Err(ShardBadLevel{level:k, height})
    lower = {fromLevel:0, toLevel:k, siblings: proof.siblings.slice(0,k)}
    upper = {fromLevel:k, toLevel:height, siblings: proof.siblings.slice(k,height)}
    return Ok([lower, upper])
  function reassemble(stored) -> Result<MerkleProof>:
    shards = sortByFromLevel(stored.shards)
    expect = 0; sib = []
    for s in shards:
      if s.fromLevel != expect: return Err(ShardNonContiguous)
      sib = sib.concat(s.siblings); expect = s.toLevel
    // expect should equal the full height; coverage from 0..height contiguous
    return Ok({index: stored.leafIndex, siblings: sib})
  Per-case tests:
    DC.2-T1 shardProof yields lower [0,k) and upper [k,height) non-overlapping, covering all
    DC.2-T2 reassemble(shardProof(p,k)) == p for sizes 2..64 and several k
    DC.2-T3 ShardBadLevel for k=0 and k=height
    DC.2-T4 reassemble of a gap (drop the upper shard) -> ShardNonContiguous

DC.3 assistance.ts — full bodies
  function computeProofAssistance(leaves, k) -> Result<ProofAssistance>:
    tree = buildTree(leaves); if tree.isErr: return tree
    if k <= 0 OR k >= tree.levels.length: return Err(ShardBadLevel{level:k, height:tree.levels.length-1})
    return Ok({predeterminedLevel:k, nodeLabels: copyOf(tree.levels[k])})
  function labelsHashToRoot(a, root) -> VerifyResult:
    current = a.nodeLabels
    while current.length > 1:
      next=[]; i=0
      while i < current.length:
        left=current[i]; right=(i+1<current.length)?current[i+1]:current[i]
        next.push(hashNode(left,right)); i+=2
      current=next
    if equals(current[0], root): return {ok:true}
    return {ok:false, reason:"AssistanceRootMismatch"}
  Per-case tests:
    DC.3-T1 computeProofAssistance returns level-k node count and values
    DC.3-T2 labelsHashToRoot ok for genuine labels; altering any label -> AssistanceRootMismatch

DC.4 store.ts — full bodies
  class ProofStore(k):
    proofs = Map(); assistanceByRoot = Map()
    function anchor(key, leaves, leafIndex) -> Result<Hash>:
      v = validateKey(key); if v.isErr: return v
      proof = merkleProof(leaves, leafIndex); if proof.isErr: return proof
      shards = shardProof(proof.value, k); if shards.isErr: return shards
      root = computeRoot(leaves); if root.isErr: return root
      proofs.set(serializeKey(key), {key, leafIndex, shards:shards.value, expectedRoot:root.value})
      assist = computeProofAssistance(leaves, k); if assist.isErr: return assist
      assistanceByRoot.set(toDisplayHex(root.value), assist.value)
      return Ok(root.value)
    function query(key) -> Result<StoredProof>:
      s = proofs.get(serializeKey(key)); if s == undefined: return Err(KeyNotFound{keyHex:serializeKey(key)})
      return Ok(s)            // ONLY this item's proof; nothing about other records
    function proofAssistanceFor(root) -> ProofAssistance | undefined:
      return assistanceByRoot.get(toDisplayHex(root))
    function verify(leaf, stored, mode) -> VerifyResult:
      if mode == "trustedOperational":
        return Err(TrustedOperationalNotAcceptedForAudit)   // audit path refuses it
      proof = reassemble(stored); if proof.isErr: return {ok:false, reason:"ShardNonContiguous"}
      return verifyProof(leaf, proof.value, stored.expectedRoot)
    function verifyWithAssistance(leaf, stored) -> VerifyResult:    // SELECTIVE DISCLOSURE
      lower = find shard in stored.shards with fromLevel == 0
      if lower == undefined: return {ok:false, reason:"ShardNonContiguous"}
      assist = proofAssistanceFor(stored.expectedRoot)
      if assist == undefined: return {ok:false, reason:"AssistanceRootMismatch"}
      // fold leaf up using ONLY the lower siblings to the predetermined level
      cur = leaf; idx = stored.leafIndex
      for sib in lower.siblings:
        if (idx & 1)==0: cur = hashNode(cur,sib) else cur = hashNode(sib,cur)
        idx = idx >> 1
      // the node reached must be one of the published level-k labels at the right position
      labelPos = stored.leafIndex >> assist.predeterminedLevel
      if labelPos >= assist.nodeLabels.length OR not equals(cur, assist.nodeLabels[labelPos]):
        return {ok:false, reason:"AssistanceMismatch"}
      return labelsHashToRoot(assist, stored.expectedRoot)   // labels independently hash to the anchored root
  Per-case tests:
    DC.4-T1 anchor then query returns the stored proof; query of an un-anchored key -> KeyNotFound
    DC.4-T2 verify(adversarial) ok for a genuine leaf; wrong leaf/index/root -> not ok; a removed/altered shard -> not ok
    DC.4-T3 verifyWithAssistance ok via lower shard + labels; altered lower shard -> AssistanceMismatch
    DC.4-T4 verify(...,"trustedOperational") -> TrustedOperationalNotAcceptedForAudit
    DC.4-T5 with several items anchored, the query response for one contains no data from any other (selective disclosure)

================================================================================
DEEP D — packages/evidence, serialisation byte layout + full check bodies
================================================================================

DD.1 serialise.ts — byte layout of the anchored data item (VERSION 1)
  Common prefix:
    Offset 0  Size 1  version      = 0x01
    Offset 1  Size 1  typeTag      0x01 Invoice, 0x02 Payment, 0x03 LedgerEntry, 0x04 ReconciliationItem
  String field encoding: varint length (compact-size) + UTF-8 bytes.
  Amount field encoding: 8 bytes, big-endian, unsigned minor units (bigint). For the one signed field
    (ReconciliationItem.adjustment) use 8 bytes big-endian two's-complement; document the signedness.
  Invoice (0x01) body, in order: id(str), counterparty(str), net(u64), tax(u64), discount(u64), gross(u64)
  Payment (0x02) body: id(str), counterparty(str), amount(u64)
  LedgerEntry (0x03) body: id(str), account(str), debit(u64), credit(u64)
  ReconciliationItem (0x04) body: id(str), bookAmount(u64), adjustment(i64)
  function serializeEvidence(obj) -> Uint8Array:
    parts = [Uint8Array([0x01]), Uint8Array([typeTagOf(obj)])]
    for each field in the type's fixed order: push encodeStr(field) or encodeU64(field)/encodeI64(field)
    return concat(...parts)
  function deserializeEvidence(bytes) -> Result<EvidenceObject>:
    if bytes.length < 2: return Err(DeserialiseTruncated)
    if bytes[0] != 0x01: return Err(SerialiseBadVersion{got:bytes[0]})
    tag = bytes[1]; offset = 2
    read each field per the tag's layout using readVarInt + slices and readU64BE/readI64BE; on any short read
      return Err(DeserialiseTruncated)
    obj = construct; v = validate(obj); if v.isErr: return v
    return Ok(obj)
  Per-case tests:
    DD.1-T1 serialize∘deserialize round-trips one instance of each of the 4 types
    DD.1-T2 two invoices differing only in net serialise to different bytes
    DD.1-T3 a buffer with version byte 0x02 -> SerialiseBadVersion{got:2}
    DD.1-T4 a buffer truncated mid-amount -> DeserialiseTruncated
    DD.1-T5 serialisation byte-identical across two runs (determinism)
    DD.1-T6 a negative adjustment round-trips correctly (signed field)

DD.2 checks.ts — full bodies (bigint, overflow-safe by construction)
  function sum(xs:bigint[]) -> bigint: acc=0n; for x in xs: acc+=x; return acc
  function checkInvoiceTotal(inv) -> VerifyResult:
    lhs = inv.gross; rhs = inv.net + inv.tax - inv.discount
    return lhs==rhs ? {ok:true} : {ok:false, reason:CheckMismatch{check:"invoiceTotal", computed:rhs.toString(), stated:lhs.toString()}}
  function checkArRollForward(p) -> VerifyResult:
    rhs = p.open + sum(p.invoices) - sum(p.receipts) - sum(p.creditNotes) - sum(p.writeOffs)
    return p.close==rhs ? {ok:true} : {ok:false, reason:CheckMismatch{check:"arRollForward", computed:rhs.toString(), stated:p.close.toString()}}
  function checkDebitCreditEquality(entries) -> VerifyResult:
    d = sum(entries.map e->e.debit); c = sum(entries.map e->e.credit)
    return d==c ? {ok:true} : {ok:false, reason:CheckMismatch{check:"debitCredit", computed:c.toString(), stated:d.toString()}}
  function checkBankReconciliation(p) -> VerifyResult:
    rhs = p.bookCash + sum(p.reconcilingItems)
    return p.bankBalance==rhs ? {ok:true} : {ok:false, reason:CheckMismatch{check:"bankRec", computed:rhs.toString(), stated:p.bankBalance.toString()}}
  function checkVat(p) -> VerifyResult:
    rhs = p.outputTax - p.inputTax
    return p.payable==rhs ? {ok:true} : {ok:false, reason:CheckMismatch{check:"vat", computed:rhs.toString(), stated:p.payable.toString()}}
  Per-case tests (each its own it):
    DD.2-T1 checkInvoiceTotal ok for {net:100,tax:21,discount:1,gross:120}; not ok for gross:119 with computed=120 stated=119
    DD.2-T2 checkArRollForward ok for a balancing set; not ok when one invoice is dropped, reason arRollForward
    DD.2-T3 checkDebitCreditEquality ok when Σdebit==Σcredit; not ok otherwise
    DD.2-T4 checkBankReconciliation ok/not-ok cases
    DD.2-T5 checkVat ok for payable==output-input; not ok otherwise
    DD.2-T6 all checks correct with values > 2^53 (bigint), proving no float overflow

================================================================================
DEEP E — packages/api, handler bodies (abbreviated to the verify trust path)
================================================================================

DE.1 handlers.verify — full body (the audit path; terminates in the header chain)
  function verify(req, ctx) -> Result<VerifyResult, ApiError>:
    parsed = schemas.VerifyRequest(req); if parsed.isErr: return Err(BadRequest{...})
    leaf = Hash.fromDisplayHex(parsed.leafHex); proof = decodeProof(parsed.proof); root = Hash.fromDisplayHex(parsed.rootHex)
    // audit mode only — never trusted-operational
    v1 = proofstore.verify(leaf, parsed.stored, "adversarial")
    if not v1.ok: return Ok(v1)
    v2 = merkle.proveAgainstChain(leaf, proof, root, ctx.headerChain)   // terminates in the BSV header chain
    return Ok(v2)
  Note: any attempt to pass mode "trustedOperational" returns TrustedOperationalNotAcceptedForAudit from proofstore.verify; the API never accepts it as evidence.
  Per-case tests:
    DE.1-T1 a genuine bundle anchored in the chain -> {ok:true}
    DE.1-T2 a bundle whose root is not in the chain -> {ok:false, reason:"RootNotAnchored"}
    DE.1-T3 a request asking trustedOperational -> refused (not accepted as evidence)
    DE.1-T4 a malformed request body -> BadRequest with the offending field

================================================================================
DEEP G/H — the studies, measurement bodies (abbreviated to the core loops)
================================================================================

DG.1 simstore measure loop — full body sketch
  for N in reportPoints:
    leaves = deterministicLeaves(seed, N)
    k = chooseLevel(N)                       // record the rule, e.g. floor(log2 N / 2)
    store = new ProofStore(k)
    sample = deterministicSample(seed, N, Q)
    for i in sample: store.anchor(keyFor(i), leaves, i)
    baseline = Q * ceil(log2 N) * 32
    sharded  = measureStoredBytes(store)     // real bytes; shared upper portions counted once
    avoided  = baseline - sharded; ratio = sharded / baseline
    assistBytes = measureAssistanceBytes(store)
    radv = retrievalBytesAdversarial(store.query(keyFor(sample[0])))
    rasst = retrievalBytesAssisted(store.query(keyFor(sample[0])))
    tadv = median(times of store.verify(...))      ; twasst = median(times of store.verifyWithAssistance(...))
    print machine-readable line; if N is the CI point: write vectors/study/storage_<N>.json
  Assertions in tests: sharded <= baseline; tampered leaf rejected; assisted payload carries nothing about other records; CI-point JSON byte-identical on regenerate.

DH.1 simstudy measure + fault loop — full body sketch
  pop = buildBalancedArPopulation(seed, M)         // clean roll-forward balances exactly
  leaves = evidence.populationLeaves(pop); store = new ProofStore(k); anchor each record
  // assurance
  for sampled i: assert merkle proof generation+verify ok; assert query(i) returns only i's fragment
  assert evidence.checkArRollForward(pop) ok        // recomputation over anchored records
  // faults: for each class, inject into a COPY and count detected
  classes = [tamperedLeaf, wrongIndex, wrongRoot, missingFragment, alteredRecord, omittedRecord, duplicatedRecord]
  for c in classes: injected=count; detected=run checks and count failures caught; missed=injected-detected
  falsePositives = run all checks on the CLEAN pop and count any failure  // must be 0
  // honest boundary
  falseOrigin = commit a wrong-but-internally-consistent value at origin; assert NOT detected; record as boundary
  print summary; write vectors/study/simstudy_<M>.json for the CI point
  Assertions in tests: zero false positives on clean; every in-scope class detected; false-origin asserted NOT detected; CI-point JSON byte-identical.

================================================================================
PART 1B — VERIFIED @bsv/sdk API (version 2.1.4) — USE THESE REAL NAMES
================================================================================

This section pins the actual @bsv/sdk surface (verified against version 2.1.4). The agent uses these real
classes and methods; it does NOT reimplement what the SDK already provides, and does NOT invent SDK calls.
Pin @bsv/sdk to ^2.1.4. Import subpaths: "@bsv/sdk" (root) and "@bsv/sdk/primitives", "@bsv/sdk/transaction",
"@bsv/sdk/script" as needed.

1B.1 Hashing (primitives).
  hash256(msg: HashInput, enc?: 'hex'|'utf8'): number[] — double SHA-256 (SHA-256 of SHA-256), returns a
    number[] of 32 bytes. This IS the BSV double-SHA256. The bsv package's doubleSha256 wraps hash256 and
    converts the number[] to the Hash type. (Also available: sha256, hash160, ripemd160 — not needed here.)
  Byte-order idiom used throughout the SDK for Merkle work: hash a value by
    toHex(hash256(toArray(m,'hex').reverse()).reverse()) — i.e. reverse to internal, hash, reverse to display.
  The bsv package centralises this so no other package handles byte order directly.

1B.2 Merkle proof — class MerklePath (BUMP / BRC-74), from "@bsv/sdk/transaction".
  THIS IS THE BSV-STANDARD MERKLE PROOF. The merkle package builds ON this, not a hand-rolled tree, as the
  primary representation; a hand-rolled tree is used only internally where a raw tree over evidence leaves is
  needed (e.g. populationLeaves), but transaction-inclusion proofs use MerklePath.
  Shape: interface MerklePathLeaf { offset:number; hash?:string; txid?:boolean; duplicate?:boolean }.
  A MerklePath has blockHeight:number and path: MerklePathLeaf[][] (level 0 is the leaf row; `duplicate:true`
    encodes the odd-node self-pairing; `txid:true` marks the leaf being proven).
  Static: MerklePath.fromHex(hex:string): MerklePath; MerklePath.fromBinary(bin:number[]|Uint8Array): MerklePath;
    MerklePath.fromReader(...): MerklePath.
  Instance: toBinary():number[]; toHex():string; computeRoot(txid?:string):string (display-hex root);
    async verify(txid:string, chainTracker:ChainTracker):Promise<boolean>; trim():void; combine(other):void;
    indexOf(txid):number.
  Use computeRoot for the root and verify for chain-anchored verification.

1B.3 Trust root — interface ChainTracker, from "@bsv/sdk/transaction".
  interface ChainTracker {
    isValidRootForHeight(root:string, height:number): Promise<boolean>;
    currentHeight(): Promise<number>;
  }
  THIS IS WHERE VERIFICATION TERMINATES. The bsv package's HeaderChain implements ChainTracker:
  isValidRootForHeight(root,height) returns true iff a validated header at that height carries that Merkle root;
  currentHeight returns the tip height. MerklePath.verify(txid, chainTracker) then gives chain-anchored
  inclusion verification using the SDK directly. proofstore/api verification calls through this ChainTracker;
  nothing is trusted that the ChainTracker does not validate.

1B.4 Transaction — class Transaction, from "@bsv/sdk/transaction".
  Static parse: Transaction.fromHex(hex):Transaction; Transaction.fromBinary(bin):Transaction;
    Transaction.fromReader(br):Transaction; Transaction.fromBEEF(...)/fromHexBEEF(...) for BEEF-wrapped tx+proof.
  Instance: id(enc?:'hex'): number[]|string (the txid; SDK reverses internally so id('hex') is display order);
    hash(enc?): number[]|string; toBinary():number[]; toHex():string; inputs:TransactionInput[];
    outputs:TransactionOutput[]; merklePath?:MerklePath; async verify(chainTracker):Promise<boolean>.
  TransactionOutput { satoshis?:number; lockingScript:LockingScript; change?:boolean }.
  TransactionInput { sourceTransaction?:Transaction; sourceTXID?:string; sourceOutputIndex:number;
    unlockingScript?:UnlockingScript; sequence:number; ... }.
  NOTE ON UNITS: the SDK's own field is named `satoshis`. This is the SDK's internal field name and is used
  as-is when calling the SDK; it is NOT the project's wording. The bsv package maps SDK `satoshis` into the
  project's `amountMinorUnits: bigint` at the boundary, and ALL project code, types, docs, and examples use
  "minor units" — never "satoshi" — outside the direct SDK call. (This boundary mapping is the one permitted
  place the SDK's term appears, and it appears only in the SDK call, not in project identifiers or output.)

1B.5 Script — from "@bsv/sdk/script".
  class Script with chunks:ScriptChunk[], static fromASM(asm):Script, fromHex(hex):Script; toASM():string;
    toHex():string; toBinary():number[]. class LockingScript extends Script; class UnlockingScript extends Script.
  Data carriage (the convention to DOCUMENT in DECISIONS.md): carry the accounting field data and the field-tree
  commitment as PUSHDATA in script — an OP_FALSE OP_IF … OP_ENDIF guarded pushdata envelope, or the SDK's
  PushDrop template (script/templates/PushDrop.ts) for a push-then-drop pattern. OP_RETURN IS NEVER USED — not
  once; if it appears, it is a failure. Pin ONE pushdata convention, implement the carry/recover functions
  against it, and record the exact opcodes and layout in DECISIONS.md. Do not leave the convention unspecified
  and do not fall back to OP_RETURN.

1B.6 What the SDK already gives you (do NOT reimplement):
  double-SHA256 (hash256), the BSV Merkle proof object and its root computation and verification
  (MerklePath.computeRoot/verify), transaction parsing/serialisation and txid (Transaction.fromHex/id),
  script parsing/serialisation (Script/LockingScript), and the ChainTracker verification seam. The project's
  merkle package may still implement a raw tree over evidence leaves (for populationLeaves and the studies),
  but transaction-inclusion proofs and their verification go through MerklePath + ChainTracker.

1B.7 What remains the project's own code:
  the evidence model and the five accounting checks; the proof-sharding / selective-disclosure layer
  (proofstore) which shards a proof into non-overlapping portions, publishes proof-assistance node labels, and
  on query returns only the queried fragment; the index schema; the api service and cli; and the two studies.
  The selective-disclosure layer is built over the SDK's proof and chain-tracker primitives, not over any
  reimplemented chain logic.

================================================================================
PART 5C — PINNED ON-CHAIN ENCODING (the script pushdata-envelope; NEVER OP_RETURN)
================================================================================

This section PINS the exact opcode and byte layout for carrying an accounting transaction's fields and its
field-tree commitment (root, held in parts) inside ONE Bitcoin (BSV) transaction. It is authoritative: the
evidence and bsv packages implement exactly this. OP_RETURN (0x6a) is NEVER emitted; assertions scan for it.
Opcode values (verified against @bsv/sdk): OP_FALSE/OP_0=0x00, OP_IF=0x63, OP_ELSE=0x67, OP_ENDIF=0x68,
OP_DROP=0x75, OP_2DROP=0x6d, OP_PUSHDATA1=0x4c, OP_PUSHDATA2=0x4d, OP_PUSHDATA4=0x4e. Pushdata minimal-encoding
rule (verified): a data item of length L is pushed as: L<0x4c → single byte L then data; L<2^8 → 0x4c, 1-byte L,
data; L<2^16 → 0x4d, 2-byte little-endian L, data; else → 0x4e, 4-byte little-endian L, data.

5C.1 Envelope shape (unspendable, carries data, leaves outputs spendable-independent).
  Each data-carrying output uses an OP_FALSE OP_IF … OP_ENDIF envelope so the pushed data is never executed and
  the output carries data without OP_RETURN:
      OP_FALSE OP_IF <pushdata item_0> <pushdata item_1> ... <pushdata item_m> OP_ENDIF
  Because the branch guard is OP_FALSE, the IF body is skipped at validation; the data items sit in the script as
  pushdata. (PushDrop is an allowed alternative ONLY if documented in DECISIONS.md and OP_RETURN-free; the
  pinned default is the OP_FALSE OP_IF envelope.) An output's lockingScript MAY additionally carry a real
  spend condition before the envelope; the envelope itself adds no spend path.

5C.2 Item framing inside the envelope (every pushed item is TLV).
  The first pushdata item in the first envelope is the HEADER item; subsequent items are FIELD items or
  ROOT-PART items. Every item is a self-describing TLV byte string pushed as one pushdata:
      byte 0      : itemType  (0x01 header, 0x02 field, 0x03 root-part, 0x04 proof-assistance-label)
      byte 1      : version   (0x01)
      bytes 2..   : itemType-specific body (below)
  Multi-byte integers in bodies are big-endian unless stated.

5C.3 HEADER item (itemType 0x01).
  body:
      kind            : 1 byte (0x01 invoice, 0x02 journal, 0x03 ledgerPosting, 0x04 reconciliation, 0x05 statementLines)
      fieldCount      : 4 bytes (uint32) — number of field-leaves in the tree
      treeRoot        : 32 bytes — fieldTreeRoot in INTERNAL byte order
      rootPartScheme  : 1 byte (0x00 root carried whole in this header; 0x01 root carried in parts via 0x03 items)
      partCount       : 1 byte — number of root-part items if rootPartScheme==0x01, else 0x00
  The header commits fieldCount and the root so a verifier knows the tree shape and the anchored root up front.

5C.4 FIELD item (itemType 0x02) — one accounting field = one Merkle leaf.
  body:
      leafIndex   : 4 bytes (uint32) — the field's position in the leaf order (0-based)
      tagLen      : 2 bytes (uint16) ; tag : tagLen bytes UTF-8 (e.g. "line[3].net", "tax.code", "invoice.number")
      valueLen    : 4 bytes (uint32) ; value : valueLen bytes — canonical field value
  Canonical value encoding by field datatype (documented in DECISIONS.md): monetary amounts are 8-byte
  big-endian signed minor units; dates are 4-byte big-endian days-since-epoch; codes/strings are UTF-8 bytes;
  booleans are 1 byte 0x00/0x01. The Merkle leaf for this field is:
      fieldLeaf = doubleSha256( 0x02 || version || leafIndex(4) || tagLen(2) || tag || valueLen(4) || value )
  i.e. the leaf is the double-SHA256 of the EXACT field-item body (including itemType/version), so what is on
  chain and what is hashed are identical — no separate canonicalisation can drift from the on-chain bytes.

5C.5 ROOT-PART item (itemType 0x03) — the root held in parts (Part 0.2 "root held in parts").
  Used when rootPartScheme==0x01. The 32-byte root is split into partCount contiguous segments; each part item:
      partIndex   : 1 byte ; partTotal : 1 byte ; segOffset : 1 byte ; segLen : 1 byte ; seg : segLen bytes
  A verifier reassembles the root by ordering parts by partIndex and concatenating seg at segOffset; the
  reassembled 32 bytes MUST equal the header treeRoot (the header always carries the whole root too, so parts
  are an additional on-chain representation, never the sole source — the header root is authoritative).

5C.6 PROOF-ASSISTANCE-LABEL item (itemType 0x04) — optional published node labels (Part 4).
  body: level : 1 byte ; labelCount : 4 bytes (uint32) ; then labelCount × 32-byte node labels (internal order),
  left-to-right at that predetermined level. These are the public proof-assistance labels used by
  verifyWithAssistance; publishing them on-chain lets a verifier complete a check from a lower shard plus this
  public data. Including them is optional and controlled by the anchoring caller.

5C.7 Spanning multiple outputs (thousands of fields).
  A single output's script has a size budget; when the field set is large, items are split across multiple
  OP_FALSE OP_IF envelopes in multiple outputs of the SAME transaction, in leafIndex order. The HEADER item
  appears once (first envelope, first output). Item ordering across outputs is by output index then position in
  script. parseAccountingTx reads all envelopes across all outputs of the one transaction and concatenates items
  in that order. All of it is still ONE Bitcoin (BSV) transaction.

5C.8 Functions pinned to this layout (evidence + bsv).
  buildScriptDataEnvelope(items: Uint8Array[]): LockingScript — emit OP_FALSE OP_IF, then each item as one
    minimal-pushdata, then OP_ENDIF; assert no chunk equals 0x6a (OP_RETURN).
  readScriptDataEnvelope(script: Script): Uint8Array[] — verify the OP_FALSE OP_IF … OP_ENDIF shape and return
    the ordered pushed items; EnvelopeNotRecognised otherwise.
  encodeHeaderItem / encodeFieldItem / encodeRootPartItem / encodeAssistanceItem and their decoders — exactly
    per 5C.3–5C.6.
  buildAccountingTx(tx): produce the header item, the field items (leaf order), optional root-part items, optional
    assistance items; pack into one or more envelopes across outputs of ONE transaction (5C.7); return the
    lockingScripts and the fieldTreeRoot. NEVER OP_RETURN.
  parseAccountingTx(scripts): reverse — recover header, fields, and (if present) root-parts/assistance; verify
    fieldTreeRoot recomputed from the field items equals the header treeRoot, and (if parts present) the
    reassembled parts equal it too.
  fieldLeaf(fieldItemBody): doubleSha256(fieldItemBody) exactly as in 5C.4.

5C.9 Pinned-encoding tests (write every one).
  T-enc-1 buildScriptDataEnvelope emits OP_FALSE(0x00) OP_IF(0x63) … OP_ENDIF(0x68) and the items round-trip via
    readScriptDataEnvelope; assert no 0x6a byte appears as an opcode chunk.
  T-enc-2 a field item encodes/decodes with leafIndex, tag, value intact; the monetary value is 8-byte BE signed
    minor units; a date is 4-byte BE days; a string is UTF-8.
  T-enc-3 fieldLeaf(body) equals doubleSha256 of the exact on-chain field-item bytes (on-chain bytes == hashed
    bytes); the field tree over these leaves has root == header treeRoot.
  T-enc-4 root-part items reassemble to the header treeRoot; a corrupted part fails reassembly-equality.
  T-enc-5 a 1000-field invoice spans multiple envelopes/outputs of ONE transaction; parseAccountingTx recovers
    all 1000 fields in leafIndex order; discloseField on field 742 yields a proof verifying to the header root and
    reveals no other field's value.
  T-enc-6 minimal pushdata: a 0x4b-byte value uses a direct length byte; a 0x4c–0xff value uses OP_PUSHDATA1; a
    larger value uses OP_PUSHDATA2; verify the exact prefix bytes.
  T-enc-7 NEGATIVE: any attempt to encode via OP_RETURN is rejected/absent — scan every produced script and
    assert the OP_RETURN opcode (0x6a) never appears.
