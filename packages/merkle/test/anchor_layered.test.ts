import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HashOps, HeaderChain, headerHash } from '@vaa/bsv';
import { computeRoot, merkleProof, verifyAnchoredField } from '@vaa/merkle';
import { leafHashes, blockHeader } from './blockvec.mjs';

// The REAL layered anchoring path (Appendix A verifyPresence), exercised against
// genuine Bitcoin (BSV) block data. The block header commits a Merkle root over
// transaction identifiers; the artefact (field-tree) root is carried INSIDE one
// transaction. We therefore prove: field -> committed root (supplied), committed
// root == artefact root parsed from the tx, txid -> block merkle root, header in
// chain to depth. Here the "artefact transaction" is one genuine txid of the block.

function buildChainWithBlock() {
  const chain = new HeaderChain();
  const added = chain.add(blockHeader());
  assert.equal(added.ok, true);
  return chain;
}

test('B.8 verifyAnchoredField verifies the full layered chain on genuine block data', () => {
  const txids = leafHashes();                         // genuine block transaction ids
  const blockMerkle = computeRoot(txids);
  assert.equal(blockMerkle.ok, true);
  if (!blockMerkle.ok) return;

  const artefactTxIndex = 1;                           // the tx that carries the artefact root
  const txid = txids[artefactTxIndex]!;
  const txMerkleProof = merkleProof(txids, artefactTxIndex);
  assert.equal(txMerkleProof.ok, true);
  if (!txMerkleProof.ok) return;

  // The committed field-tree root and the root parsed from the transaction agree
  // (in a real deployment the caller obtains rootFromTx via parseCommitmentEnvelope).
  const committedRoot = HashOps.fromInternalBytes(new Uint8Array(32).fill(0xab));
  assert.equal(committedRoot.ok, true);
  if (!committedRoot.ok) return;

  // A trivial single-field tree: the field leaf IS the committed root (one-leaf tree),
  // so the inclusion proof is empty and folds to itself. (Field-tree inclusion is
  // tested exhaustively elsewhere; here we focus on the anchoring layers.)
  const hdr = blockHeader();
  const chain = buildChainWithBlock();

  const ok = verifyAnchoredField({
    fieldLeaf: committedRoot.value,
    fieldProof: { index: 0, siblings: [] },
    committedRoot: committedRoot.value,
    rootFromTx: committedRoot.value,
    txid,
    txMerkleProof: txMerkleProof.value,
    blockMerkleRoot: hdr.merkleRoot,
    blockHeaderHash: headerHash(hdr),
    chain,
    requiredDepth: 0,
  });
  assert.equal(ok.ok, true);
});

test('B.8 verifyAnchoredField fails when the committed root is not the one in the transaction', () => {
  const txids = leafHashes();
  const txMerkleProof = merkleProof(txids, 1);
  assert.equal(txMerkleProof.ok, true);
  if (!txMerkleProof.ok) return;
  const hdr = blockHeader();
  const chain = buildChainWithBlock();

  const a = HashOps.fromInternalBytes(new Uint8Array(32).fill(0x11));
  const b = HashOps.fromInternalBytes(new Uint8Array(32).fill(0x22));
  assert.equal(a.ok && b.ok, true);
  if (!a.ok || !b.ok) return;

  const r = verifyAnchoredField({
    fieldLeaf: a.value,
    fieldProof: { index: 0, siblings: [] },
    committedRoot: a.value,
    rootFromTx: b.value,                                  // mismatch
    txid: txids[1]!,
    txMerkleProof: txMerkleProof.value,
    blockMerkleRoot: hdr.merkleRoot,
    blockHeaderHash: headerHash(hdr),
    chain,
    requiredDepth: 0,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.reason.kind, 'RootNotInTransaction');
});

test('B.8 verifyAnchoredField fails when the transaction is not in the block', () => {
  const txids = leafHashes();                           // 2 genuine txids
  const proofForIndex0 = merkleProof(txids, 0);         // valid proof, but for txid 0
  assert.equal(proofForIndex0.ok, true);
  if (!proofForIndex0.ok) return;
  const hdr = blockHeader();
  const chain = buildChainWithBlock();

  const root = HashOps.fromInternalBytes(new Uint8Array(32).fill(0x33));
  assert.equal(root.ok, true);
  if (!root.ok) return;

  const r = verifyAnchoredField({
    fieldLeaf: root.value,
    fieldProof: { index: 0, siblings: [] },
    committedRoot: root.value,
    rootFromTx: root.value,
    txid: txids[1]!,                                      // txid 1 with txid 0's proof -> wrong root
    txMerkleProof: proofForIndex0.value,
    blockMerkleRoot: hdr.merkleRoot,
    blockHeaderHash: headerHash(hdr),
    chain,
    requiredDepth: 0,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.reason.kind, 'TxNotInBlock');
});

test('B.8 verifyAnchoredField fails when the header is not in the chain', () => {
  const txids = leafHashes();
  const txMerkleProof = merkleProof(txids, 1);
  assert.equal(txMerkleProof.ok, true);
  if (!txMerkleProof.ok) return;
  const hdr = blockHeader();
  const emptyChain = new HeaderChain();                  // header never added

  const root = HashOps.fromInternalBytes(new Uint8Array(32).fill(0x44));
  assert.equal(root.ok, true);
  if (!root.ok) return;

  const r = verifyAnchoredField({
    fieldLeaf: root.value,
    fieldProof: { index: 0, siblings: [] },
    committedRoot: root.value,
    rootFromTx: root.value,
    txid: txids[1]!,
    txMerkleProof: txMerkleProof.value,
    blockMerkleRoot: hdr.merkleRoot,
    blockHeaderHash: headerHash(hdr),
    chain: emptyChain,
    requiredDepth: 0,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.reason.kind, 'HeaderNotInChain');
});
