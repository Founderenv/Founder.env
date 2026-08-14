import { dataMode, requireSupabase } from '@/lib/supabase';

export interface ReferralDashboard {
  enrolled: boolean;
  referralCode?: string;
  payoutUpi?: string;
  payeeName?: string | null;
  earnedPaise: number;
  availablePaise: number;
  reservedPaise: number;
  verifiedBusinesses: number;
  recentReferrals: Array<{ id: string; status: string; applied_at: string; business_name: string }>;
  payoutRequests: Array<{ id: string; amount_paise: number; status: string; requested_at: string; paid_at: string | null }>;
}

export interface AdminReferralPayout {
  id: string;
  customer_id: string;
  amount_paise: number;
  destination_upi_snapshot: string;
  payee_name_snapshot: string | null;
  status: string;
  requested_at: string;
  paid_at: string | null;
  customerName?: string;
}

const emptyDashboard: ReferralDashboard = {
  enrolled: false, earnedPaise: 0, availablePaise: 0, reservedPaise: 0,
  verifiedBusinesses: 0, recentReferrals: [], payoutRequests: [],
};

function dashboard(value: unknown): ReferralDashboard {
  if (!value || typeof value !== 'object') return emptyDashboard;
  const row = value as Record<string, unknown>;
  return {
    enrolled: Boolean(row.enrolled), referralCode: string(row.referralCode), payoutUpi: string(row.payoutUpi),
    payeeName: typeof row.payeeName === 'string' ? row.payeeName : null,
    earnedPaise: number(row.earnedPaise), availablePaise: number(row.availablePaise), reservedPaise: number(row.reservedPaise),
    verifiedBusinesses: number(row.verifiedBusinesses),
    recentReferrals: Array.isArray(row.recentReferrals) ? row.recentReferrals as ReferralDashboard['recentReferrals'] : [],
    payoutRequests: Array.isArray(row.payoutRequests) ? row.payoutRequests as ReferralDashboard['payoutRequests'] : [],
  };
}

function string(value: unknown) { return typeof value === 'string' ? value : undefined; }
function number(value: unknown) { return typeof value === 'number' ? value : Number(value) || 0; }
function fail(error: { message: string } | null) { if (error) throw new Error(error.message); }

let mockDashboard: ReferralDashboard = { ...emptyDashboard };

export const referralRewardsService = {
  async getDashboard(): Promise<ReferralDashboard> {
    if (dataMode === 'mock') return mockDashboard;
    const { data, error } = await requireSupabase().rpc('get_customer_referral_dashboard'); fail(error);
    return dashboard(data);
  },
  async enroll(payoutUpi: string, payeeName?: string): Promise<ReferralDashboard> {
    if (dataMode === 'mock') {
      mockDashboard = { ...emptyDashboard, enrolled: true, referralCode: 'FE-DEMO-X7K2Q9', payoutUpi: payoutUpi.toLowerCase(), payeeName: payeeName || null };
      return mockDashboard;
    }
    const { error } = await requireSupabase().rpc('enroll_customer_referral', { target_upi: payoutUpi, target_payee_name: payeeName || null }); fail(error);
    return this.getDashboard();
  },
  async applyToBusiness(businessId: string, code: string | null): Promise<boolean> {
    if (dataMode === 'mock') return Boolean(code?.trim());
    const { data, error } = await requireSupabase().rpc('apply_business_referral', { target_business_id: businessId, target_referral_code: code }); fail(error);
    return Boolean((data as { applied?: boolean } | null)?.applied);
  },
  async getBusinessReferral(businessId: string): Promise<{ referralCode: string; status: string } | null> {
    if (dataMode === 'mock') return null;
    const { data, error } = await requireSupabase().from('business_owner_referrals').select('referral_code,status').eq('business_id', businessId).maybeSingle(); fail(error);
    return data ? { referralCode: String(data.referral_code), status: String(data.status) } : null;
  },
  async requestPayout(): Promise<void> {
    if (dataMode === 'mock') return;
    const { error } = await requireSupabase().rpc('request_referral_payout'); fail(error);
  },
  async getAdminPayouts(): Promise<AdminReferralPayout[]> {
    if (dataMode === 'mock') return [];
    const client = requireSupabase();
    const { data, error } = await client.from('referral_payout_requests').select('*').order('requested_at', { ascending: false }); fail(error);
    const payouts = (data ?? []) as unknown as AdminReferralPayout[];
    const ids = [...new Set(payouts.map((item) => item.customer_id))];
    const profiles = ids.length ? await client.from('profiles').select('id,display_name').in('id', ids) : { data: [], error: null };
    fail(profiles.error); const names = new Map((profiles.data ?? []).map((item) => [item.id, item.display_name]));
    return payouts.map((item) => ({ ...item, customerName: names.get(item.customer_id) }));
  },
  async updateAdminPayout(id: string, status: 'paid' | 'rejected' | 'needs_review', note?: string): Promise<void> {
    if (dataMode === 'mock') return;
    const { error } = await requireSupabase().rpc('admin_update_referral_payout', { target_payout_id: id, target_status: status, target_note: note || null }); fail(error);
  },
};
