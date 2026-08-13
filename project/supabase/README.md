# Founder.env Supabase setup

This folder targets the existing Supabase project `fyomwpwkaqgjcaydqyjt`. It contains ordered SQL migrations, secure Edge Functions, and a post-deploy verification query.

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
npx supabase functions deploy razorpay-subscription --project-ref fyomwpwkaqgjcaydqyjt
npx supabase functions deploy razorpay-webhook --no-verify-jwt --project-ref fyomwpwkaqgjcaydqyjt
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

## Razorpay subscription configuration

Create a Razorpay test-mode plan for ₹199 monthly, then configure the four server-only values listed in `supabase/.env.example` with `supabase secrets set`. The application creates a 24-charge subscription with a ₹299 one-time add-on and a `start_at` exactly one calendar month later. Do not put Razorpay credentials in `.env.local`, a `VITE_` variable, or browser code.

Configure the Razorpay webhook URL as the deployed `razorpay-webhook` function and subscribe to the supported subscription events. The function verifies the raw-body HMAC using `RAZORPAY_WEBHOOK_SECRET`, deduplicates `x-razorpay-event-id`, and applies provider state in a database transaction. Existing Early Access, complimentary, and trial activations remain separate from Razorpay billing.
