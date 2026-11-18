const assert = require('node:assert/strict');
const test = require('node:test');
const { addOneMonth, getPlanPrice } = require('../utils/membershipPlans');

test('returns only the configured membership prices', () => {
  assert.equal(getPlanPrice('Basic'), 10000);
  assert.equal(getPlanPrice('Pro'), 14000);
  assert.equal(getPlanPrice('Premium'), 20000);
  assert.equal(getPlanPrice('basic'), null);
  assert.equal(getPlanPrice('toString'), null);
});

test('clamps a month-end membership expiry to the end of the next month', () => {
  assert.equal(
    addOneMonth(new Date('2026-01-31T12:00:00.000Z')).toISOString(),
    '2026-02-28T12:00:00.000Z'
  );
});
