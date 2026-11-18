# Royal Fitness backend

The Express API uses MongoDB. Run `npm run dev` from this directory after configuring the ignored `.env` file.

## Admin accounts

Public registration and Google sign-in create regular user accounts. To grant admin access, an operator must update an existing, verified user's `role` to `admin` through a trusted MongoDB administration process. Do not expose admin provisioning as a public registration option.

For example, in an authenticated MongoDB shell, an operator can promote a verified account with:

```javascript
db.users.updateOne(
  { email: "admin@example.com", isVerified: true },
  { $set: { role: "admin" } }
)
```

## Membership payments

The server owns the membership prices: Basic ₹10,000, Pro ₹14,000, and Premium ₹20,000. Cash reservations remain pending; an admin confirms receipt from the dashboard, at which point the one-month membership period starts.

Run the backend tests with `npm test`.
