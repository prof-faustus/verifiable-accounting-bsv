// Verification. reconstructRoot folds a leaf upward using the proof; it never
// throws on adversarial input — a bad proof simply yields a value that will not
// match. proveAgainstChain anchors the result in the validated BSV header chain.
import type { Hash, VerifyResult, HeaderChain } from '@vaa/bsv';
import { hashNode, HashOps, verifyOk, verifyFail } from '@vaa/bsv';
import type { MerkleProof } from './proof.js';
import type { MerkleVerifyReason } from './errors.js';

export function reconstructRoot(leaf: Hash, proof: MerkleProof): Hash {
  let cur = leaf;
  let idx = proof.index;
  for (const sib of proof.siblings) {
    if ((idx & 1) === 0) {
      cur = hashNode(cur, sib); // current node is the left child
    } else {
      cur = hashNode(sib, cur); // current node is the right child
    }
    idx = idx >> 1;
  }
  return cur;
}

// expectedHeight (when known by the caller) lets verifyProof report a
// SiblingCountMismatch; otherwise it simply reconstructs and compares.
export function verifyProof(
  leaf: Hash,
  proof: MerkleProof,
  root: Hash,
  expectedHeight?: number,
): VerifyResult<MerkleVerifyReason> {
  if (expectedHeight !== undefined && proof.siblings.length !== expectedHeight) {
    return verifyFail({ kind: 'SiblingCountMismatch', got: proof.siblings.length, expected: expectedHeight });
  }
  const recomputed = reconstructRoot(leaf, proof);
  if (HashOps.equals(recomputed, root)) return verifyOk();
  return verifyFail({ kind: 'RootMismatch' });
}

export function proveAgainstChain(
  leaf: Hash,
  proof: MerkleProof,
  root: Hash,
  chain: HeaderChain,
  expectedHeight?: number,
): VerifyResult<MerkleVerifyReason> {
  const v = verifyProof(leaf, proof, root, expectedHeight);
  if (!v.ok) return v;
  if (chain.containsMerkleRoot(root) === undefined) {
    return verifyFail({ kind: 'RootNotAnchored' });
  }
  return verifyOk();
}

// REAL LAYERED ANCHORING VERIFIER (matches Appendix A verifyPresence).
// A block header does NOT contain the field-tree root; it commits the block's
// Merkle root over transaction identifiers. The field-tree (artefact) root is
// carried inside one transaction's script. Anchoring is therefore layered:
//   1. the disclosed field folds through its inclusion proof to the committed root;
//   2. the committed root is the artefact root recovered from the transaction script
//      (the caller supplies rootFromTx = parseCommitmentEnvelope(tx.scripts).root);
//   3. the transaction id folds through the block's transaction-Merkle proof to the
//      block header's merkleRoot;
//   4. the block header is in the validated header chain to the required depth.
export interface AnchoredFieldInput {
  fieldLeaf: Hash;             // H(field item)
  fieldProof: MerkleProof;     // inclusion proof to the committed field-tree root
  committedRoot: Hash;         // the field-tree root claimed
  rootFromTx: Hash;            // artefact root parsed out of the transaction script
  txid: Hash;                  // H(serialised transaction)
  txMerkleProof: MerkleProof;  // inclusion proof of txid into the block's tx-Merkle tree
  blockMerkleRoot: Hash;       // the block header's merkleRoot field
  blockHeaderHash: Hash;       // H(80-byte block header)
  chain: HeaderChain;          // validated header chain
  requiredDepth: number;       // settlement depth required by the engagement
}

export function verifyAnchoredField(input: AnchoredFieldInput): VerifyResult<MerkleVerifyReason> {
  // 1. field inclusion into the committed field-tree root
  const fi = verifyProof(input.fieldLeaf, input.fieldProof, input.committedRoot);
  if (!fi.ok) return fi;
  // 2. the committed root is exactly the artefact root carried by the transaction
  if (!HashOps.equals(input.committedRoot, input.rootFromTx)) {
    return verifyFail({ kind: 'RootNotInTransaction' });
  }
  // 3. the transaction id is included in the block's transaction Merkle tree
  const txIn = verifyProof(input.txid, input.txMerkleProof, input.blockMerkleRoot);
  if (!txIn.ok) return verifyFail({ kind: 'TxNotInBlock' });
  // 4. the block header is in the validated chain, to the required settlement depth
  const located = input.chain.byHash(input.blockHeaderHash);
  if (located === undefined) return verifyFail({ kind: 'HeaderNotInChain' });
  // header must also be the one carrying this block Merkle root
  if (!HashOps.equals(located.header.merkleRoot, input.blockMerkleRoot)) {
    return verifyFail({ kind: 'HeaderNotInChain' });
  }
  const depth = input.chain.height() - located.height;
  if (depth < input.requiredDepth) {
    return verifyFail({ kind: 'InsufficientDepth', got: depth, required: input.requiredDepth });
  }
  return verifyOk();
}

// The tree height implied by a leaf count (number of sibling levels in a proof).
export function heightForLeafCount(leafCount: number): number {
  if (leafCount <= 1) return 0;
  let height = 0;
  let size = 1;
  while (size < leafCount) {
    size *= 2;
    height++;
  }
  return height;
}
