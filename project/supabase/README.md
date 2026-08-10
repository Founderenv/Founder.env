# Founder.env Supabase setup

This folder targets the existing Supabase project `fyomwpwkaqgjcaydqyjt`. It contains ordered SQL migrations, a secure Scratch & Win Edge Function, and a post-deploy verification query.

## Required frontend environment

Copy `.env.example` to `.env.local` and set the public project anon key:

```env
VITE_SUPABASE_URL=https://fyomwpwkaqgjcaydqyjt.supabase.co
VITE_SUPABASE_ANON_KEY=<public anon key>
VITE_DATA_MODE=supabase
```

Never place the service-role key, database password, Google client secret, or other private credentials in a `VITE_` variable. With no public key, `auto` mode uses the isolated mock preview. Explicit `supabase` mode fails closed if configuration is incomplete.

## Deploy in order

Authenticate a Supabase CLI account that can access the existing project, then run from the repository root:

```powershell
npx supabase login
npx supabase link --project-ref fyomwpwkaqgjcaydqyjt
npx supabase db push
npx supabase functions deploy scratch-play --project-ref fyomwpwkaqgjcaydqyjt
```

The Edge Function automatically receives `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from Supabase. Do not commit those secrets.

After deployment, run `verification.sql` in the Supabase SQL Editor. It reports missing tables, tables without RLS, policy coverage, expected storage buckets, unsafe email columns in public views, and Realtime publication membership. Every missing/unsafe result must be empty before production use.

## Google OAuth configuration

1. In Google Cloud Console, create or select the production project and configure the OAuth consent screen.
2. Create a Web application OAuth client.
3. Add `https://fyomwpwkaqgjcaydqyjt.supabase.co/auth/v1/callback` as an authorized redirect URI.
4. Add local and production app origins under authorized JavaScript origins, for example `http://localhost:5173` and the production HTTPS origin.
5. In Supabase Dashboard → Authentication → Providers → Google, enable Google and enter the Google client ID and client secret.
6. In Supabase Dashboard → Authentication → URL Configuration, set the production Site URL and add `http://localhost:5173/auth/callback` plus the production `/auth/callback` URL to Redirect URLs.
7. Test a new Customer and Business Owner login. Admin is never selectable; set `profiles.role = 'admin'` only through a controlled operator workflow.

## Security test matrix

Create Customer A/B and Owner A/B accounts plus two businesses. Confirm that Customer A cannot update Customer B, owners cannot mutate or read another owner's private business data/messages, unrelated users cannot read conversations, duplicate follow/review/claim constraints hold, and follower/public profile queries never return email. Confirm payment status cannot be written by business accounts and Scratch outcomes can only be created through the Edge Function. Finally verify admin reads/mutations with an actual server-assigned admin account and confirm `admin_audit_logs` records privileged changes.

## Phase 3 payment integration

1. Add Razorpay order creation and webhook Edge Functions with secrets stored only as Supabase function secrets.
2. Create pending `payments` rows server-side with idempotency keys and gateway order IDs.
3. Verify webhook signatures against the raw request body and deduplicate gateway events.
4. In one database transaction, mark payment success, issue an invoice, and activate/extend the subscription and business lifecycle.
5. Implement refund and partial-refund webhook transitions, reconciliation, retries, and audit logging.
6. Expose read-only payment/subscription state to owners; never accept success or plan activation from the browser.
7. Add sandbox integration tests, replay/duplicate webhook tests, failure/grace/Lite downgrade jobs, then complete a production credential and observability review.
