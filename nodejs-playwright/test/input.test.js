import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canonical, hasValidSignature, parseCardInput, sign } from '../src/input.js';

test('cleans up white space and control characters', () => {
  assert.deepEqual(parseCardInput({ title: '  Hello \n\t world\u0000 ', subtitle: ' a  b ' }), {
    title: 'Hello world',
    subtitle: 'a b',
  });
  assert.deepEqual(parseCardInput({ title: 'Only a title' }), { title: 'Only a title', subtitle: '' });
});

test('counts characters, not UTF-16 units', () => {
  assert.doesNotThrow(() => parseCardInput({ title: '🚀'.repeat(120) }));
  assert.throws(() => parseCardInput({ title: '🚀'.repeat(121) }), { status: 400 });
});

test('rejects bad input with status 400', () => {
  const bad = [
    {},
    { title: '' },
    { title: '   ' },
    { title: ['a', 'b'] },
    { title: 'a'.repeat(121) },
    { title: 'ok', subtitle: 'a'.repeat(201) },
    { title: 'ok', subtitle: ['a'] },
  ];
  for (const query of bad) {
    assert.throws(() => parseCardInput(query), { status: 400 }, JSON.stringify(query));
  }
});

test('the signature covers the version, the title and the subtitle', () => {
  const input = { title: 'Hello', subtitle: '' };
  const sig = sign(input, 'secret', '1');
  assert.match(sig, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(hasValidSignature({ v: '1', sig }, input, 'secret'), true);
  assert.equal(hasValidSignature({ v: '2', sig }, input, 'secret'), false);
  assert.equal(hasValidSignature({ v: '1', sig }, { title: 'Hello!', subtitle: '' }, 'secret'), false);
  assert.equal(hasValidSignature({ v: '1', sig }, input, 'other secret'), false);
  assert.equal(hasValidSignature({ v: '1', sig: 'short' }, input, 'secret'), false);
  assert.equal(hasValidSignature({ v: '1' }, input, 'secret'), false);
  assert.notEqual(canonical({ title: 'a b', subtitle: '' }), canonical({ title: 'a', subtitle: 'b' }));
});
