# Acediaura AI deployment

Vercel Git project: acediaura-git
Root directory: acediaura-ai
Integration: existing Neon project through Vercel Storage
Client env: VITE_NEON_AUTH_URL (injected by Neon integration)

Security: Never commit database connection strings, auth keys or credentials. Verify sign-up, sign-in, refresh and sign-out on a trusted production domain before declaring authentication ready.
