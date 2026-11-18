import { normalizeAdminPayment } from "./paymentDisplay";

test("uses the linked member's name and email in admin payment rows", () => {
  const normalized = normalizeAdminPayment({
    name: "Admin Snapshot",
    email: "admin@example.com",
    user: {
      fullname: "Fayzan",
      email: "fayzan@example.com",
    },
  });

  expect(normalized.name).toBe("Fayzan");
  expect(normalized.email).toBe("fayzan@example.com");
});

test("falls back to the payment snapshot when the user reference is unavailable", () => {
  const normalized = normalizeAdminPayment({
    name: "Fayzan",
    email: "fayzan@example.com",
    user: null,
  });

  expect(normalized.name).toBe("Fayzan");
  expect(normalized.email).toBe("fayzan@example.com");
});
