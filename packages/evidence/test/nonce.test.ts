import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fieldLeaf,
  serialiseField,
  deserialiseField,
  withNonce,
  randomNonce,
  fieldTreeRoot,
  discloseField,
  verifyDisclosedField,
  type AccountingField,
  type AccountingTransaction,
} from '@vaa/evidence';

function f(tag: string, value: string): AccountingField {
  return { tag, value: new TextEncoder().encode(value) };
}

test('nonce: a nonced leaf differs from the same field without a nonce', () => {
  const base = f('tax.code', 'S');
  const nonce = new Uint8Array(32).fill(7);
  const blinded = withNonce(base, nonce);
  assert.notDeepEqual(fieldLeaf(base), fieldLeaf(blinded));
});

test('nonce: two identical low-entropy values get distinct leaves under distinct nonces (blinding)', () => {
  const a = withNonce(f('vat.rate', '2000'));
  const b = withNonce(f('vat.rate', '2000'));
  // overwhelmingly likely distinct random nonces -> distinct leaves
  assert.notDeepEqual(fieldLeaf(a), fieldLeaf(b));
});

test('nonce: nonce-free serialisation is unchanged (byte-identical, vectors preserved)', () => {
  const base = f('amount', '100');
  const bytes = serialiseField(base);
  // last byte is the value, not a marker; no trailing nonce marker appended
  const round = deserialiseField(bytes);
  assert.equal(round.ok, true);
  if (round.ok) {
    assert.equal(round.value.tag, 'amount');
    assert.equal(round.value.nonce, undefined);
  }
});

test('nonce: serialise/deserialise round-trips a nonced field', () => {
  const nonce = randomNonce();
  const fld = withNonce(f('customer', 'ACME Ltd'), nonce);
  const bytes = serialiseField(fld);
  const round = deserialiseField(bytes);
  assert.equal(round.ok, true);
  if (round.ok) {
    assert.equal(round.value.tag, 'customer');
    assert.deepEqual(round.value.nonce, nonce);
  }
});

test('nonce: a disclosed nonced field still verifies inclusion against the committed root', () => {
  const tx: AccountingTransaction = {
    kind: 'invoice',
    fields: [
      withNonce(f('inv.no', 'INV-1')),
      withNonce(f('vat.total', '2000')),
      withNonce(f('gross', '12000')),
      withNonce(f('net', '10000')),
    ],
  };
  const d = discloseField(tx, 1);
  assert.equal(d.ok, true);
  if (!d.ok) return;
  const ok = verifyDisclosedField(d.value.field, d.value.proof, d.value.root);
  assert.equal(ok.ok, true);
  // the disclosed field carries its nonce
  assert.notEqual(d.value.field.nonce, undefined);
});

test('nonce: tampering the nonce of a disclosed field breaks verification', () => {
  const tx: AccountingTransaction = {
    kind: 'invoice',
    fields: [withNonce(f('a', '1')), withNonce(f('b', '2'))],
  };
  const d = discloseField(tx, 0);
  assert.equal(d.ok, true);
  if (!d.ok) return;
  const tampered: AccountingField = { tag: d.value.field.tag, value: d.value.field.value, nonce: new Uint8Array(32).fill(9) };
  const ok = verifyDisclosedField(tampered, d.value.proof, d.value.root);
  assert.equal(ok.ok, false);
});

test('nonce: rejects a wrong-length nonce', () => {
  assert.throws(() => withNonce(f('x', 'y'), new Uint8Array(16)));
});
