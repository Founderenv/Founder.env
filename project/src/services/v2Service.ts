import { requireSupabase } from '@/lib/supabase';

type Row = Record<string, unknown>;
const rows = (value: unknown): Row[] => Array.isArray(value) ? value as Row[] : [];
const number = (value: unknown) => Number(value ?? 0);

export interface FounderBill {
  id: string; businessId: string; customerId: string; originalAmount: number; memberDiscount: number;
  coinDiscount: number; finalAmount: number; status: string; paymentStatus: string; createdAt: string; description?: string | null;
}
export interface BillRequest { id: string; businessId: string; customerId: string; status: string; createdAt: string; }
export interface Relationship { paidBills: number; totalSpend: number; totalSavings: number; coinsEarned: number; loyaltyLevel: string; }

function bill(row: Row): FounderBill { return { id:String(row.id), businessId:String(row.business_id), customerId:String(row.customer_id), originalAmount:number(row.original_amount), memberDiscount:number(row.member_discount), coinDiscount:number(row.fe_coin_discount), finalAmount:number(row.final_amount), status:String(row.status), paymentStatus:String(row.payment_status), createdAt:String(row.created_at), description:typeof row.description === 'string' ? row.description : null }; }
function request(row: Row): BillRequest { return { id:String(row.id), businessId:String(row.business_id), customerId:String(row.customer_id), status:String(row.status), createdAt:String(row.created_at) }; }

export const founderV2Service = {
  async requestBill(businessId: string) { const { data, error } = await requireSupabase().rpc('request_bill', { target_business_id: businessId }); if (error) throw error; return request(data as Row); },
  async createBill(requestId: string, input: { amount: number; description?: string; invoiceNumber?: string; note?: string; coinDiscount?: number }) {
    const { data, error } = await requireSupabase().rpc('owner_create_bill', { target_request_id: requestId, amount: input.amount, bill_description: input.description ?? null, invoice_ref: input.invoiceNumber ?? null, bill_note: input.note ?? null, requested_coin_discount: input.coinDiscount ?? 0 });
    if (error) throw error; return bill(data as Row);
  },
  async getMyBills(businessId?: string) { let query = requireSupabase().from('bills').select('*').order('created_at', { ascending: false }); if (businessId) query = query.eq('business_id', businessId); const { data, error } = await query; if (error) throw error; return rows(data).map(bill); },
  async getMyRelationship(businessId: string): Promise<Relationship | null> { const { data, error } = await requireSupabase().from('customer_business_relationships').select('*').eq('business_id', businessId).maybeSingle(); if (error) throw error; if (!data) return null; const row=data as Row; return { paidBills:number(row.paid_bill_count), totalSpend:number(row.total_spend), totalSavings:number(row.total_savings), coinsEarned:number(row.fe_coins_earned), loyaltyLevel:String(row.loyalty_level) }; },
  async getCoinBalance() { const { data, error } = await requireSupabase().from('fe_coin_accounts').select('balance').eq('account_type','customer').is('business_id',null).maybeSingle(); if (error) throw error; return number((data as Row | null)?.balance); },
  async getOwnerRequests() { const { data, error } = await requireSupabase().from('bill_requests').select('*').eq('status','pending').order('created_at', { ascending: false }); if (error) throw error; return rows(data).map(request); },
  async getOwnerBills() { const { data, error } = await requireSupabase().from('bills').select('*').order('created_at', { ascending: false }); if (error) throw error; return rows(data).map(bill); },
};

/** A deliberately non-settling payment boundary. Provider confirmation must call the service-role RPC. */
export const paymentService = {
  async createPayment(billId: string) { void billId; throw new Error('Online payments are not configured yet. This bill remains pending until a verified payment provider is connected.'); },
  async verifyPayment(reference: string) { void reference; throw new Error('Payment verification is available only to the trusted payment webhook.'); },
};
