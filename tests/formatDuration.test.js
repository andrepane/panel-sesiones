import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDuration } from '../utils/formatDuration.js';

test('formatDuration decimal mode', () => {
  assert.equal(formatDuration(0), '0.0 h');
  assert.equal(formatDuration(30), '0.5 h');
  assert.equal(formatDuration(60), '1.0 h');
  assert.equal(formatDuration(75), '1.3 h');
  assert.equal(formatDuration(90), '1.5 h');
});

test('formatDuration compact mode', () => {
  assert.equal(formatDuration(90, { compact: true }), '1:30 h');
  assert.equal(formatDuration(75, { compact: true }), '1:15 h');
});
