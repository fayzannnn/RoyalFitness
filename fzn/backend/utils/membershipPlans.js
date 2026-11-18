const PLAN_PRICES = Object.freeze({
  Basic: 10000,
  Pro: 14000,
  Premium: 20000,
});

function getPlanPrice(plan) {
  return Object.prototype.hasOwnProperty.call(PLAN_PRICES, plan)
    ? PLAN_PRICES[plan]
    : null;
}

function addOneMonth(date) {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(
    result.getUTCFullYear(),
    result.getUTCMonth() + 1,
    0
  )).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

module.exports = { getPlanPrice, addOneMonth };
