import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) return json({ error: 'Authentication required' }, 401);
    const url = Deno.env.get('SUPABASE_URL'); const anon = Deno.env.get('SUPABASE_ANON_KEY'); const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anon || !service) throw new Error('Function environment is incomplete');
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Invalid session' }, 401);
    const payload = await request.json() as { campaignId?: string; dealClaimId?: string };
    if (!payload.campaignId || !payload.dealClaimId) return json({ error: 'campaignId and dealClaimId are required' }, 400);
    const { data: claim, error: claimError } = await userClient.from('deal_claims').select('id,customer_id,status').eq('id', payload.dealClaimId).maybeSingle();
    if (claimError || !claim || claim.customer_id !== userData.user.id || !['claimed','redeemed'].includes(claim.status)) return json({ error: 'Eligible deal claim not found' }, 403);
    const admin = createClient(url, service, { auth: { persistSession: false } });
    const { data, error } = await admin.rpc('play_scratch', { target_campaign_id: payload.campaignId, target_eligibility_key: `deal_claim:${claim.id}`, target_customer_id: userData.user.id });
    if (error) return json({ error: error.message }, error.code === '23505' ? 409 : 400);
    return json({ data });
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, 500); }
});

function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } }); }
