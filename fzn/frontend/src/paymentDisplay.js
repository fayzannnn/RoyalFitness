export function normalizeAdminPayment(payment) {
  const user = payment.user && typeof payment.user === "object"
    ? payment.user
    : {};

  return {
    ...payment,
    name: user.fullname || payment.name || "",
    email: user.email || payment.email || "",
  };
}
