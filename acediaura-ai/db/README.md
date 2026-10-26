# Secure cloud profiles — deployment prerequisites

The profile API in `api/profile.js` intentionally fails closed unless `DATABASE_URL`, `NEON_AUTH_BASE_URL`, and `NEON_AUTH_JWKS_URL` are configured on the `acediaura-git` Vercel project.

1. Apply `001_academic_schema.sql` once to the **existing** `neon-coquelicot-leaf` database using Neon's SQL Editor. Review the statement before executing; it adds new tables and indexes and does not drop existing tables.
2. In Neon Better Auth Settings, copy the public **JWKS URL** (not an API key). Add it to Vercel project Environment Variables as `NEON_AUTH_JWKS_URL`, targeting Production and Preview, then redeploy.
3. Test the API unauthenticated (must return 401), with invalid token (must return 401), and with signed-in student token (only that student's profile). Use two test student accounts to verify isolation.
4. Only after successful verification, connect the profile form to `/api/profile` using the short-lived token obtained from Neon Auth. Never put `DATABASE_URL` in client-side code or commit credentials.

Existing frontend still uses browser-local storage for academic content until the migration and client adapter are completed.
