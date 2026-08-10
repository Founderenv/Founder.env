import type {
  Business,
  Post,
  Deal,
  Story,
  Review,
  Comment,
  Notification,
  Conversation,
  Message,
  Reward,
  Referral,
  LoyaltyProgram,
  ScratchCampaign,
  ScratchResult,
  BusinessFollower,
  StoryHighlight,
  VideoClip,
  Subscription,
  Payment,
  Report,
  CustomerAccount,
  AnalyticsMetric,
  AnalyticsSeries,
  TrafficSource,
  Category,
  BusinessTemplateConfig,
  TemplateId,
  QRCode,
  QRScan,
  ReviewReply,
  RedemptionState,
} from '@/types';
import {
  businesses,
  posts,
  deals,
  stories,
  reviews,
  comments,
  notifications,
  conversations,
  messages,
  rewards,
  referrals,
  loyaltyPrograms,
  scratchCampaigns,
  scratchResults,
  followers,
  highlights,
  videoClips,
  subscriptions,
  payments,
  reports,
  adminCustomers,
  categories,
  templates,
  qrCodes,
  qrScans,
  currentCustomer,
  currentOwner,
  ownerAnalytics,
  adminDashboardMetrics,
  getTemplate,
} from '@/mocks/data';

function delay<T>(data: T, ms = 100): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

function clone<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export const mockBusinessService = {
  async getAll(): Promise<Business[]> {
    return delay(clone(businesses));
  },
  async getByUsername(username: string): Promise<Business | null> {
    const b = businesses.find((b) => b.username === username);
    return delay(b ? clone(b) : null);
  },
  async getById(id: string): Promise<Business | null> {
    const b = businesses.find((b) => b.id === id);
    return delay(b ? clone(b) : null);
  },
  async getByCategory(category: string): Promise<Business[]> {
    const filtered = category === 'all' ? businesses : businesses.filter((b) => b.category === category);
    return delay(clone(filtered));
  },
  async getFeatured(): Promise<Business[]> {
    return delay(clone(businesses.slice(0, 4)));
  },
  async getTrending(): Promise<Business[]> {
    return delay(clone([...businesses].sort((a, b) => b.followerCount - a.followerCount)));
  },
  async getTopRated(): Promise<Business[]> {
    return delay(clone([...businesses].sort((a, b) => b.rating - a.rating)));
  },
  async getNew(): Promise<Business[]> {
    return delay(clone([...businesses].sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())));
  },
  async search(query: string): Promise<Business[]> {
    const q = query.toLowerCase();
    return delay(clone(businesses.filter((b) =>
      b.name.toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q) ||
      b.city.toLowerCase().includes(q) ||
      b.username.toLowerCase().includes(q)
    )));
  },
  async getByOwner(ownerId: string): Promise<Business[]> {
    return delay(clone(businesses.filter((b) => b.ownerId === ownerId)));
  },
  async create(input: Partial<Business>, _assets: { logo?: File; cover?: File; gallery?: File[] } = {}): Promise<Business> {
    void _assets;
    const created = { ...businesses[0], ...input, id: `biz_${Date.now()}`, ownerId: input.ownerId ?? 'owner_current', status: 'pending' } as Business;
    businesses.push(created);
    return delay(clone(created));
  },
  async update(id: string, updates: Partial<Business>, _assets: { logo?: File; cover?: File; gallery?: File[] } = {}): Promise<Business | null> {
    void _assets;
    const idx = businesses.findIndex((b) => b.id === id);
    if (idx === -1) return delay(null);
    businesses[idx] = { ...businesses[idx], ...updates };
    return delay(clone(businesses[idx]));
  },
};

export const mockPostService = {
  async create(_businessId: string, _input: { type: Post['type']; caption: string; location?: string; ctaLabel?: string; ctaLink?: string }, _file?: File): Promise<string> { void _businessId; void _input; void _file; return delay(`post_${Date.now()}`); },
  async getFeed(): Promise<Post[]> {
    return delay(clone(posts));
  },
  async getByBusiness(businessId: string): Promise<Post[]> {
    return delay(clone(posts.filter((p) => p.businessId === businessId)));
  },
  async getById(id: string): Promise<Post | null> {
    const p = posts.find((p) => p.id === id);
    return delay(p ? clone(p) : null);
  },
  async toggleLike(id: string): Promise<Post | null> {
    const p = posts.find((p) => p.id === id);
    if (!p) return delay(null);
    p.isLiked = !p.isLiked;
    p.likeCount += p.isLiked ? 1 : -1;
    return delay(clone(p));
  },
  async toggleSave(id: string): Promise<Post | null> {
    const p = posts.find((p) => p.id === id);
    if (!p) return delay(null);
    p.isSaved = !p.isSaved;
    p.saveCount += p.isSaved ? 1 : -1;
    return delay(clone(p));
  },
  async toggleRepost(id: string): Promise<Post | null> {
    const p = posts.find((p) => p.id === id);
    if (!p) return delay(null);
    p.isReposted = !p.isReposted;
    p.repostCount += p.isReposted ? 1 : -1;
    return delay(clone(p));
  },
  async getComments(postId: string): Promise<Comment[]> {
    return delay(clone(comments.filter((c) => c.postId === postId)));
  },
  async addComment(postId: string, text: string, authorId: string, authorName: string, authorAvatar: string, authorRole: 'customer' | 'owner'): Promise<Comment> {
    const c: Comment = {
      id: 'c_' + Date.now(), postId, authorId, authorName, authorAvatar, authorRole,
      text, likeCount: 0, isLiked: false, createdAt: new Date().toISOString(),
    };
    comments.push(c);
    const p = posts.find((p) => p.id === postId);
    if (p) p.commentCount++;
    return delay(clone(c));
  },
  async getSaved(): Promise<Post[]> {
    return delay(clone(posts.filter((p) => p.isSaved)));
  },
};

export const mockDealService = {
  async create(_businessId: string, _input: { title: string; description: string; originalPrice: number; offerPrice: number; discount: number; startsAt: string; endsAt: string; maxClaims?: number; terms?: string; ctaLabel?: string }, _file?: File): Promise<string> { void _businessId; void _input; void _file; return delay(`deal_${Date.now()}`); },
  async getAll(): Promise<Deal[]> {
    return delay(clone(deals));
  },
  async getByBusiness(businessId: string): Promise<Deal[]> {
    return delay(clone(deals.filter((d) => d.businessId === businessId)));
  },
  async getById(id: string): Promise<Deal | null> {
    const d = deals.find((d) => d.id === id);
    return delay(d ? clone(d) : null);
  },
  async getTrending(): Promise<Deal[]> {
    return delay(clone([...deals].sort((a, b) => b.claimedCount - a.claimedCount)));
  },
  async claim(id: string): Promise<Deal | null> {
    const d = deals.find((d) => d.id === id);
    if (!d) return delay(null);
    d.isClaimed = true;
    d.claimedCount++;
    return delay(clone(d));
  },
  async toggleSave(id: string): Promise<Deal | null> {
    const d = deals.find((d) => d.id === id);
    if (!d) return delay(null);
    d.isSaved = !d.isSaved;
    return delay(clone(d));
  },
  async getSaved(): Promise<Deal[]> {
    return delay(clone(deals.filter((d) => d.isSaved)));
  },
  async search(query: string): Promise<Deal[]> {
    const q = query.toLowerCase();
    return delay(clone(deals.filter((d) =>
      d.title.toLowerCase().includes(q) ||
      d.businessName.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q)
    )));
  },
};

export const mockStoryService = {
  async create(_businessId: string, _input: { storyType: string; caption?: string }, _file?: File): Promise<string> { void _businessId; void _input; void _file; return delay(`story_${Date.now()}`); },
  async getAll(): Promise<Story[]> {
    return delay(clone(stories));
  },
  async getByBusiness(businessId: string): Promise<Story[]> {
    return delay(clone(stories.filter((s) => s.businessId === businessId)));
  },
  async getHighlights(businessId: string): Promise<StoryHighlight[]> {
    return delay(clone(highlights.filter((h) => h.businessId === businessId)));
  },
  async markSeen(storyId: string): Promise<void> {
    const s = stories.find((s) => s.id === storyId);
    if (s) s.hasUnseen = false;
    return delay(undefined);
  },
};

export const mockReviewService = {
  async getByBusiness(businessId: string): Promise<Review[]> {
    return delay(clone(reviews.filter((r) => r.businessId === businessId)));
  },
  async getByCustomer(customerId: string): Promise<Review[]> {
    return delay(clone(reviews.filter((r) => r.customerId === customerId)));
  },
  async add(businessId: string, customerId: string, customerName: string, customerAvatar: string, rating: number, text: string, photoUrl?: string): Promise<Review> {
    const r: Review = {
      id: 'rev_' + Date.now(), businessId, customerId, customerName, customerAvatar,
      rating, text, photoUrl, likeCount: 0, createdAt: new Date().toISOString(), isHelpful: false,
    };
    reviews.push(r);
    return delay(clone(r));
  },
  async reply(reviewId: string, text: string): Promise<ReviewReply> {
    const r = reviews.find((r) => r.id === reviewId);
    const reply: ReviewReply = { id: 'rp_' + Date.now(), text, createdAt: new Date().toISOString() };
    if (r) r.reply = reply;
    return delay(clone(reply));
  },
  async toggleHelpful(reviewId: string): Promise<Review | null> {
    const r = reviews.find((r) => r.id === reviewId);
    if (!r) return delay(null);
    r.isHelpful = !r.isHelpful;
    r.likeCount += r.isHelpful ? 1 : -1;
    return delay(clone(r));
  },
  async getRatingBreakdown(businessId: string) {
    const bizReviews = reviews.filter((r) => r.businessId === businessId);
    return delay({
      five: bizReviews.filter((r) => r.rating === 5).length,
      four: bizReviews.filter((r) => r.rating === 4).length,
      three: bizReviews.filter((r) => r.rating === 3).length,
      two: bizReviews.filter((r) => r.rating === 2).length,
      one: bizReviews.filter((r) => r.rating === 1).length,
    });
  },
};

export const mockNotificationService = {
  async getAll(): Promise<Notification[]> {
    return delay(clone(notifications));
  },
  async markRead(id: string): Promise<void> {
    const n = notifications.find((n) => n.id === id);
    if (n) n.isRead = true;
    return delay(undefined);
  },
  async markAllRead(): Promise<void> {
    notifications.forEach((n) => (n.isRead = true));
    return delay(undefined);
  },
  async getUnreadCount(): Promise<number> {
    return delay(notifications.filter((n) => !n.isRead).length);
  },
};

export const mockMessageService = {
  async getConversations(): Promise<Conversation[]> {
    return delay(clone(conversations));
  },
  async getMessages(conversationId: string): Promise<Message[]> {
    return delay(clone(messages.filter((m) => m.conversationId === conversationId)));
  },
  async sendMessage(conversationId: string, senderId: string, senderType: 'customer' | 'owner', text: string): Promise<Message> {
    const m: Message = {
      id: 'msg_' + Date.now(), conversationId, senderId, senderType, text, isRead: false, createdAt: new Date().toISOString(),
    };
    messages.push(m);
    const conv = conversations.find((c) => c.id === conversationId);
    if (conv) {
      conv.lastMessage = text;
      conv.lastMessageAt = m.createdAt;
    }
    return delay(clone(m));
  },
  async sendMedia(conversationId: string, file: File): Promise<Message> {
    void file;
    const message: Message = { id: `msg_${Date.now()}`, conversationId, senderId: 'mock-user', senderType: 'customer', imageUrl: '', isRead: false, createdAt: new Date().toISOString() };
    messages.push(message);
    return delay(clone(message));
  },
  async markRead(conversationId: string): Promise<void> {
    messages.forEach((m) => { if (m.conversationId === conversationId) m.isRead = true; });
    const conv = conversations.find((c) => c.id === conversationId);
    if (conv) conv.unreadCount = 0;
    return delay(undefined);
  },
  subscribe(_conversationId: string, _onMessage: (message: Message) => void) {
    void _conversationId;
    void _onMessage;
    return () => undefined;
  },
};

export const mockFollowService = {
  async getFollowers(businessId: string): Promise<BusinessFollower[]> {
    return delay(clone(followers.filter((f) => f.businessId === businessId)));
  },
  async getFollowing(customerId: string): Promise<Business[]> {
    const ids = followers.filter((f) => f.customerId === customerId).map((f) => f.businessId);
    return delay(clone(businesses.filter((b) => ids.includes(b.id))));
  },
  async follow(businessId: string, customerId: string, displayName: string, avatarUrl: string, source: 'qr' | 'profile' | 'deal' | 'explore' = 'profile'): Promise<void> {
    const exists = followers.find((f) => f.businessId === businessId && f.customerId === customerId);
    if (!exists) {
      followers.push({
        id: 'f_' + Date.now(), customerId, displayName, avatarUrl, businessId,
        followedAt: new Date().toISOString(), source,
      });
      const b = businesses.find((b) => b.id === businessId);
      if (b) b.followerCount++;
    }
    return delay(undefined);
  },
  async unfollow(businessId: string, customerId: string): Promise<void> {
    const idx = followers.findIndex((f) => f.businessId === businessId && f.customerId === customerId);
    if (idx !== -1) {
      followers.splice(idx, 1);
      const b = businesses.find((b) => b.id === businessId);
      if (b) b.followerCount--;
    }
    return delay(undefined);
  },
  async isFollowing(businessId: string, customerId: string): Promise<boolean> {
    return delay(followers.some((f) => f.businessId === businessId && f.customerId === customerId));
  },
};

export const mockRewardService = {
  async getByCustomer(customerId: string): Promise<Reward[]> {
    return delay(clone(rewards.filter((r) => r.customerId === customerId)));
  },
  async getByBusiness(businessId: string): Promise<Reward[]> {
    return delay(clone(rewards.filter((r) => r.businessId === businessId)));
  },
  async redeem(rewardId: string): Promise<{ state: RedemptionState; reward?: Reward }> {
    const r = rewards.find((r) => r.id === rewardId);
    if (!r) return delay({ state: 'wrong_business' });
    if (r.status === 'used') return delay({ state: 'already_used', reward: clone(r) });
    if (r.status === 'expired') return delay({ state: 'expired', reward: clone(r) });
    r.status = 'used';
    r.redeemedAt = new Date().toISOString();
    return delay({ state: 'valid', reward: clone(r) });
  },
};

export const mockReferralService = {
  async getByCustomer(customerId: string): Promise<Referral[]> {
    return delay(clone(referrals.filter((r) => r.customerId === customerId)));
  },
  async getByBusiness(businessId: string): Promise<Referral[]> {
    return delay(clone(referrals.filter((r) => r.businessId === businessId)));
  },
};

export const mockLoyaltyService = {
  async getByCustomer(_customerId: string): Promise<LoyaltyProgram[]> {
    void _customerId;
    return delay(clone(loyaltyPrograms));
  },
  async getByBusiness(businessId: string): Promise<LoyaltyProgram[]> {
    return delay(clone(loyaltyPrograms.filter((l) => l.businessId === businessId)));
  },
};

export const mockScratchService = {
  async getAvailable(): Promise<ScratchCampaign[]> {
    return delay(clone(scratchCampaigns));
  },
  async getByBusiness(businessId: string): Promise<ScratchCampaign[]> {
    return delay(clone(scratchCampaigns.filter((s) => s.businessId === businessId)));
  },
  async play(campaignId: string): Promise<ScratchResult> {
    const c = scratchCampaigns.find((s) => s.id === campaignId);
    if (!c) return delay({ id: 'sr_0', campaignId, businessName: '', businessLogo: '', outcome: 'better_luck', label: 'Better Luck Next Time', isWin: false, date: new Date().toISOString() });
    // Frontend preview only: cycle fixtures so the client never pretends to be
    // the trusted production prize-decider. Supabase Edge Functions will decide.
    const result = c.rewards[scratchResults.length % c.rewards.length];
    const sr: ScratchResult = {
      id: 'sr_' + Date.now(), campaignId, businessName: c.businessName, businessLogo: c.businessLogo,
      outcome: result.outcome, label: result.label, isWin: result.outcome !== 'better_luck', date: new Date().toISOString(),
    };
    scratchResults.push(sr);
    return delay(clone(sr), 800);
  },
  async getHistory(customerId: string): Promise<ScratchResult[]> {
    void customerId;
    return delay(clone(scratchResults));
  },
};

export const mockVideoService = {
  async create(_businessId: string, _input: { caption: string; dealId?: string; music?: string }, _file: File): Promise<string> { void _businessId; void _input; void _file; return delay(`clip_${Date.now()}`); },
  async getAll(): Promise<VideoClip[]> {
    return delay(clone(videoClips));
  },
  async getByBusiness(businessId: string): Promise<VideoClip[]> {
    return delay(clone(videoClips.filter((v) => v.businessId === businessId)));
  },
  async toggleLike(id: string): Promise<VideoClip | null> {
    const v = videoClips.find((v) => v.id === id);
    if (!v) return delay(null);
    v.isLiked = !v.isLiked;
    v.likeCount += v.isLiked ? 1 : -1;
    return delay(clone(v));
  },
  async toggleSave(id: string): Promise<VideoClip | null> {
    const v = videoClips.find((v) => v.id === id);
    if (!v) return delay(null);
    v.isSaved = !v.isSaved;
    v.saveCount += v.isSaved ? 1 : -1;
    return delay(clone(v));
  },
};

export const mockQRService = {
  async getByBusiness(businessId: string): Promise<QRCode | null> {
    const qr = qrCodes.find((q) => q.businessId === businessId);
    return delay(qr ? clone(qr) : null);
  },
  async getByCode(code: string): Promise<Business | null> {
    const qr = qrCodes.find((q) => q.code === code);
    if (!qr) return delay(null);
    const b = businesses.find((b) => b.id === qr.businessId);
    return delay(b ? clone(b) : null);
  },
  async getScans(businessId: string): Promise<QRScan[]> {
    return delay(clone(qrScans.filter((s) => s.businessId === businessId)));
  },
};

export const mockAdminService = {
  async getDashboardMetrics(): Promise<AnalyticsMetric[]> {
    return delay(clone(adminDashboardMetrics));
  },
  async getBusinesses(): Promise<Business[]> {
    return delay(clone(businesses));
  },
  async getCustomers(): Promise<CustomerAccount[]> {
    return delay(clone(adminCustomers));
  },
  async getPayments(): Promise<Payment[]> {
    return delay(clone(payments));
  },
  async getSubscriptions(): Promise<Subscription[]> {
    return delay(clone(subscriptions));
  },
  async getReports(): Promise<Report[]> {
    return delay(clone(reports));
  },
};

export const mockSubscriptionService = {
  async getByBusiness(businessId: string): Promise<Subscription | null> {
    const s = subscriptions.find((s) => s.businessId === businessId);
    return delay(s ? clone(s) : null);
  },
  async getPayments(businessId: string): Promise<Payment[]> {
    return delay(clone(payments.filter((p) => p.businessId === businessId)));
  },
};

export const mockCategoryService = {
  async getAll(): Promise<Category[]> {
    return delay(clone(categories));
  },
};

export const mockTemplateService = {
  async getAll(): Promise<BusinessTemplateConfig[]> {
    return delay(clone(templates));
  },
  async getById(id: TemplateId): Promise<BusinessTemplateConfig> {
    return delay(clone(getTemplate(id)));
  },
};

export const mockCustomerService = {
  async getCurrent(): Promise<CustomerAccount> {
    return delay(clone(currentCustomer));
  },
};

export const mockOwnerService = {
  async getCurrent() {
    return delay(clone(currentOwner));
  },
};

export const mockAnalyticsService = {
  async getOwnerMetrics(businessId: string): Promise<{ metrics: AnalyticsMetric[]; series: AnalyticsSeries[]; trafficSources: TrafficSource[] }> {
    void businessId;
    return delay(clone(ownerAnalytics));
  },
};
