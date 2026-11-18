export const PLAN_PRICES = Object.freeze({
  Basic: 10000,
  Pro: 14000,
  Premium: 20000,
});

export function resolvePlan(plan) {
  return Object.prototype.hasOwnProperty.call(PLAN_PRICES, plan) ? plan : "Basic";
}

export function hasActiveMembership(payments, now = Date.now()) {
  const latestPaidPayment = payments
    .filter(payment => payment.status !== "pending")
    .reduce((latest, payment) => {
      if (!latest) return payment;
      const currentDate = new Date(payment.date || 0).getTime();
      const latestDate = new Date(latest.date || 0).getTime();
      return currentDate > latestDate ? payment : latest;
    }, null);

  if (!latestPaidPayment) return false;
  const expiry = new Date(latestPaidPayment.expiry).getTime();
  return Number.isFinite(expiry) && expiry > now;
}
