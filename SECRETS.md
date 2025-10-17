Secrets and local workflow

DO NOT commit real secrets to the repo. Use the following patterns to keep secrets safe.

1) Local development (.env)
- Create a local `.env` in the repo root (DO NOT commit it). Add `.env` to `.gitignore`.
- Example `.env` (copy from `.env.example`):

LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
LINKEDIN_REDIRECT_URI=http://localhost:3003/callback
RESEND_API_KEY=re_xxx
EMAIL_TO=you@example.com

- Load locally before running dev:

export $(grep -v '^#' .env | xargs)
cd app
npx wrangler dev

2) Cloudflare Worker secrets
- Store production secrets with wrangler so they never exist in the repo.

cd app
npx wrangler secret put LINKEDIN_CLIENT_ID
npx wrangler secret put LINKEDIN_CLIENT_SECRET
npx wrangler secret put LINKEDIN_REDIRECT_URI
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put EMAIL_TO

This will prompt you to paste secret values (they won't be stored in any file in the repo).

3) Helper script
- Use `scripts/wrangler-put-secrets.sh` to set multiple secrets from your local `.env` (optional).

4) If a secret is leaked
- Rotate the secret at the provider immediately.
- If it was committed, remove from history with git-filter-repo or BFG and force-push (I can help).
