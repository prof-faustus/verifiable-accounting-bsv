# Reviewer guide — reproducibility package

This package accompanies an anonymised submission. Author- and repository-identifying
metadata has been removed. It contains the reference implementation, the deterministic
test vectors, the correctness and adversarial test suites, the two reproducible studies,
and the reproduction command.

## Requirements

- Node.js 20 or later (any current LTS).

## Build and verify

```
npm ci
npm run build      # strict TypeScript compile, no errors
npm test           # 159 tests, all passing
npm run reproduce  # regenerates and matches all committed vectors
```

## What the tests cover

The suite exercises the byte-level primitives, the intra-transaction Merkle field
tree (including odd-level self-pairing, proof generation, and reconstruction), per-field
selective disclosure, the proof-sharding and proof-assistance layer, the canonical field
serialisation, the five recomputation checks (invoice total, accounts-receivable
roll-forward, debit–credit equality, bank reconciliation, and value-added-tax), and the
adversarial cases (flipped bytes, wrong indices, malformed proofs). It also covers:

- the commitment-only on-chain envelope: `buildAccountingTx` carries only the commitment
  header and root parts; a test asserts that no undisclosed field value appears in the
  on-chain script bytes;
- the per-field nonce: mandatory at commit (`buildAccountingTx` rejects nonce-free fields),
  with serialise/deserialise round-trips and tamper rejection;
- the layered anchoring verifier `verifyAnchoredField`: field inclusion to the committed
  root, the committed root recovered from the transaction, the transaction id included in
  the block transaction-Merkle tree, and the block header present in the validated header
  chain to the required settlement depth, exercised on genuine mainnet block data with
  negative cases.

## Studies

- `npm run study:store` — storage/retrieval study at the continuous-integration point
  (n = 256, predetermined level k = 4, q = 256): baseline 65,536 bytes; sharded store
  36,364 bytes; 29,172 bytes saved, i.e. 44.5% of the baseline avoided (equivalently, the
  sharded store uses 55.5% of the baseline); proof-assistance 524 bytes per root; per-query
  payload 140 bytes assisted against 280 bytes adversarial. Leaves are nonce-blinded; the
  nonce changes only the bytes hashed at each leaf, so these figures are unaffected by it.
- `npm run study:assurance` (alias `study:sim`) — assurance and fault-detection study at the
  continuous-integration point (M = 240 movements), reporting roll-forward agreement, zero
  false positives, and detection of every in-scope integrity fault.

## Leaf encoding

A field-leaf is the double SHA-256 of the canonical encoding of the field's tag, value,
and 32-byte per-field nonce. The nonce blinds low-entropy values against dictionary
confirmation by an observer of the public commitment. Field items are not placed on the
ledger in the confidentiality-preserving mode; only the commitment is carried on-chain,
and field items are disclosed selectively off the medium.
