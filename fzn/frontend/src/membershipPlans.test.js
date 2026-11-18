import { hasActiveMembership, PLAN_PRICES, resolvePlan } from './membershipPlans';

test('resolves known plans and falls back for invalid plan names', () => {
  expect(resolvePlan('Pro')).toBe('Pro');
  expect(resolvePlan('toString')).toBe('Basic');
  expect(PLAN_PRICES[resolvePlan('Premium')]).toBe(20000);
});

test('only blocks a purchase when a paid membership has not expired', () => {
  const now = Date.parse('2026-11-17T00:00:00.000Z');
  expect(hasActiveMembership([{ status: 'paid', date: '2026-11-01', expiry: '2026-12-17T00:00:00.000Z' }], now)).toBe(true);
  expect(hasActiveMembership([{ status: 'paid', date: '2026-11-01', expiry: '2026-11-16T00:00:00.000Z' }], now)).toBe(false);
  expect(hasActiveMembership([{ status: 'pending', expiry: '2026-12-17T00:00:00.000Z' }], now)).toBe(false);
  expect(hasActiveMembership([
    { status: 'paid', date: '2026-10-01', expiry: '2026-12-17T00:00:00.000Z' },
    { status: 'paid', date: '2026-11-01', expiry: '2026-11-16T00:00:00.000Z' },
  ], now)).toBe(false);
});
