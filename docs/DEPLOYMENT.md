# Deploying UniRide

## 1. Database (Supabase)
1. Create tables: from `backend/` run `alembic upgrade head` (or `alembic stamp head` if they already exist).
2. Run `backend/scripts/enable_rls.sql`, then `backend/scripts/verify_rls.sql`:
   every table must show `rls_enabled = true`, the policy list must be empty and all counts must be 0.
3. Optional: `restrict_email_domain.sql`, and `promote_admin.sql` to create your first admin.

## 2. Backend (Docker, for example Render, Railway or Fly.io)
Build from `backend/` (uses `backend/Dockerfile`; it runs migrations, then starts the API).

| Variable | Value |
|---|---|
| `DATABASE_URL` | Supabase connection string (the pooled "session" one) |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | from Supabase project settings |
| `CORS_ORIGINS` | your frontend URL, e.g. `https://uniride.example.com` (no trailing slash) |
| `AUTO_CREATE_TABLES` | `false` |
| `RATE_LIMIT_PER_MINUTE` / `RATE_LIMIT_WRITE_PER_MINUTE` | `240` / `60` |

Check `https://<backend>/health` returns `{"status":"ok"}`.
The rate limiter trusts `X-Forwarded-For`, so run the API behind the platform's proxy and not directly on the internet.

## 3. Frontend (Vercel, Netlify or any static host)
Build command `npm run build`, output folder `dist`. Set at build time:
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_API_BASE_URL=https://<backend>/api/v1`.
Camera (QR) and GPS only work on **HTTPS**, so deploy with HTTPS.
In Supabase, Authentication > URL Configuration: add the frontend URL as Site URL and a redirect URL (password reset).

## 4. Before launch
- Run the full student and admin workflows once on the deployed site, on a phone.
- Keep `.env` files out of git. `frontend/dist`, `node_modules` and `tsconfig.tsbuildinfo` should not be committed either.
