export type Role = 'guest' | 'customer' | 'owner' | 'admin';

export type Theme = 'light' | 'dark' | 'system';

export type SubscriptionPlan = 'lite' | 'pro';

export type SubscriptionStatus = 'active' | 'expiring' | 'expired' | 'failed' | 'suspended';

export type BusinessStatus = 'active' | 'pending' | 'suspended';

export type PaymentType = 'activation' | 'subscription' | 'promotion';

export type PaymentStatus = 'success' | 'pending' | 'failed' | 'refunded';

export type ReportReason =
  | 'spam'
  | 'fake_business'
  | 'fake_offer'
  | 'abuse'
  | 'misleading_deal'
  | 'inappropriate_content'
  | 'other';

export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'actioned';

export type NotificationType =
  | 'new_post'
  | 'new_deal'
  | 'new_story'
  | 'review_reply'
  | 'new_dm'
  | 'reward_unlocked'
  | 'referral_update'
  | 'coupon_expiry'
  | 'new_follower'
  | 'new_review'
  | 'deal_claim'
  | 'reward_redemption'
  | 'subscription_notice';

export type PostType = 'standard' | 'product' | 'announcement' | 'event' | 'new_arrival';

export type ContentType = 'post' | 'deal' | 'video' | 'story' | 'business' | 'review';

export type FollowSource = 'qr' | 'profile' | 'deal' | 'explore';

export type ReferralState = 'pending' | 'qualified' | 'rewarded' | 'expired' | 'rejected';

export type RewardStatus = 'available' | 'used' | 'expired';

export type RewardType = 'welcome' | 'loyalty' | 'referral' | 'scratch' | 'deal';

export type LoyaltyType = 'visit' | 'points' | 'spend';

export type ScratchOutcome =
  | '50_off'
  | '10_percent'
  | 'free_coffee'
  | 'free_addon'
  | 'better_luck';

export type TemplateId =
  | 'minimal_premium'
  | 'luxury_dark'
  | 'fashion_editorial'
  | 'restaurant_modern'
  | 'salon_beauty'
  | 'tech_store'
  | 'fitness_energy'
  | 'cafe_warm'
  | 'local_services'
  | 'colourful_retail';

export type TemplateThemeMode = 'light' | 'dark' | 'default';

export type RedemptionState = 'valid' | 'already_used' | 'expired' | 'wrong_business';

export interface CustomerAccount {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  createdAt: string;
  lastActiveAt: string;
  followingCount: number;
  rewardsCount: number;
  reviewsCount: number;
  savedCount: number;
  status: 'active' | 'suspended';
}

export interface BusinessOwner {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessIds: string[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  slug: string;
}

export interface BusinessTemplateConfig {
  id: TemplateId;
  name: string;
  description: string;
  accentColor: string;
  fontFamily: string;
  heroStyle: 'cover' | 'split' | 'centered' | 'minimal';
  cardStyle: 'rounded' | 'sharp' | 'editorial';
  sectionOrder: string[];
  imageTreatment: 'natural' | 'grayscale' | 'warm' | 'vibrant';
  defaultThemeMode: TemplateThemeMode;
}

export interface OpeningHours {
  day: string;
  open: string;
  close: string;
  closed: boolean;
}

export interface SocialLinks {
  instagram?: string;
  website?: string;
  facebook?: string;
  whatsapp?: string;
}

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  username: string;
  logoUrl: string;
  coverUrl: string;
  category: string;
  categoryIcon: string;
  description: string;
  bio: string;
  location: string;
  city: string;
  state: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  latitude?: number;
  longitude?: number;
  openingHours: OpeningHours[];
  socialLinks: SocialLinks;
  templateId: TemplateId;
  templateTheme: TemplateThemeMode;
  isVerified: boolean;
  isOpenNow: boolean;
  rating: number;
  reviewCount: number;
  followerCount: number;
  qrCode: string;
  shortUrl: string;
  plan: SubscriptionPlan;
  status: BusinessStatus;
  joinedAt: string;
  galleryImages: string[];
  featuredProducts: { name: string; price: string; image: string; description?: string }[];
  popularItems: { name: string; price: string; image: string }[];
  todayOffer?: string;
  servicesSummary?: string;
  preferredContentLanguage?: 'Auto' | 'English' | 'Hindi' | 'Marathi';
}

export interface BusinessFollower {
  id: string;
  customerId: string;
  displayName: string;
  avatarUrl: string;
  businessId: string;
  followedAt: string;
  source: FollowSource;
}

export interface PostMedia {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
}

export interface Post {
  id: string;
  businessId: string;
  businessName: string;
  businessUsername: string;
  businessAvatar: string;
  businessCategory: string;
  businessLocation: string;
  type: PostType;
  media: PostMedia[];
  caption: string;
  location?: string;
  ctaLabel?: string;
  ctaLink?: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  repostCount: number;
  saveCount: number;
  isLiked: boolean;
  isSaved: boolean;
  isReposted: boolean;
  isFollowing: boolean;
  createdAt: string;
  dealId?: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: 'customer' | 'owner';
  text: string;
  likeCount: number;
  isLiked: boolean;
  createdAt: string;
  isReply?: boolean;
  parentCommentId?: string;
}

export interface Story {
  id: string;
  businessId: string;
  businessName: string;
  businessUsername: string;
  businessAvatar: string;
  businessLogo: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  createdAt: string;
  expiresAt: string;
  viewCount: number;
  interactionCount: number;
  hasUnseen: boolean;
  dealId?: string;
  highlights: string[];
}

export interface StoryView {
  id: string;
  storyId: string;
  viewerName: string;
  viewerAvatar: string;
  viewedAt: string;
}

export interface StoryHighlight {
  id: string;
  businessId: string;
  title: string;
  coverUrl: string;
  storyIds: string[];
}

export interface Deal {
  id: string;
  businessId: string;
  businessName: string;
  businessUsername: string;
  businessAvatar: string;
  businessLogo: string;
  businessCategory: string;
  title: string;
  description: string;
  mediaUrl: string;
  originalPrice: number;
  offerPrice: number;
  discount: number;
  startDate: string;
  endDate: string;
  maxClaims: number;
  claimedCount: number;
  terms: string;
  ctaLabel: string;
  isClaimed: boolean;
  isSaved: boolean;
  category: string;
  city: string;
  rating: number;
  createdAt: string;
}

export interface DealClaim {
  id: string;
  dealId: string;
  dealTitle: string;
  businessId: string;
  businessName: string;
  businessLogo: string;
  customerId: string;
  customerName: string;
  claimCode: string;
  claimedAt: string;
  status: 'claimed' | 'redeemed' | 'expired';
}

export interface Review {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  customerAvatar: string;
  rating: number;
  text: string;
  photoUrl?: string;
  likeCount: number;
  reply?: ReviewReply;
  createdAt: string;
  isHelpful: boolean;
}

export interface ReviewReply {
  id: string;
  text: string;
  createdAt: string;
}

export interface RatingBreakdown {
  five: number;
  four: number;
  three: number;
  two: number;
  one: number;
}

export interface Conversation {
  id: string;
  businessId: string;
  businessName: string;
  businessAvatar: string;
  businessLogo: string;
  businessUsername?: string;
  customerId: string;
  customerName: string;
  customerAvatar: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isCustomerSide: boolean;
  isOnline: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: 'customer' | 'owner';
  text?: string;
  imageUrl?: string;
  sharedDealId?: string;
  sharedPostId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  businessAvatar?: string;
  businessId?: string;
  businessUsername?: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
  actionLabel?: string;
  actionLink?: string;
}

export interface QRCode {
  id: string;
  businessId: string;
  businessName: string;
  businessLogo: string;
  code: string;
  shortUrl: string;
  scans: number;
  createdAt: string;
}

export interface QRScan {
  id: string;
  qrCodeId: string;
  businessId: string;
  scannedAt: string;
  source: 'qr' | 'shared' | 'direct';
  resultedInFollow: boolean;
}

export interface Subscription {
  id: string;
  businessId: string;
  businessName: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: string;
  expiryDate: string;
  nextBillingDate?: string;
  amount: number;
  autoRenew: boolean;
  setupFeePaid?: boolean;
  setupFeeAmount?: number;
  monthlyAmount?: number;
  autopayAuthorized?: boolean;
  providerStatus?: string;
  totalCount?: number;
  paidCount?: number;
  cancelAtPeriodEnd?: boolean;
  activationType?: 'pending' | 'razorpay' | 'early_access' | 'complimentary' | 'trial';
}

export interface Payment {
  id: string;
  businessId: string;
  businessName: string;
  amount: number;
  type: PaymentType;
  status: PaymentStatus;
  date: string;
  invoiceId: string;
  method: string;
}

export interface Reward {
  id: string;
  businessId: string;
  businessName: string;
  businessLogo: string;
  customerId: string;
  title: string;
  description: string;
  type: RewardType;
  status: RewardStatus;
  expiryDate: string;
  terms: string;
  value: string;
  redeemedAt?: string;
  code: string;
}

export interface RewardCampaign {
  id: string;
  businessId: string;
  name: string;
  description: string;
  rewardTitle: string;
  rewardValue: string;
  type: 'welcome' | 'milestone' | 'promotion';
  isActive: boolean;
  maxRewards: number;
  issuedCount: number;
  startDate: string;
  endDate: string;
}

export interface Referral {
  id: string;
  businessId: string;
  businessName: string;
  businessLogo: string;
  customerId: string;
  customerName: string;
  referralCode: string;
  referralLink: string;
  friendReward: string;
  referrerReward: string;
  state: ReferralState;
  referredName?: string;
  createdAt: string;
  qualifiedAt?: string;
  rewardedAt?: string;
}

export interface ReferralCampaign {
  id: string;
  businessId: string;
  name: string;
  friendReward: string;
  referrerReward: string;
  qualifyingAction: string;
  minimumPurchase: number;
  expiry: string;
  maxRewards: number;
  issuedCount: number;
  isActive: boolean;
  shares: number;
  referredCount: number;
  qualifiedCount: number;
  rewardedCount: number;
}

export interface LoyaltyProgram {
  id: string;
  businessId: string;
  businessName: string;
  businessLogo: string;
  name: string;
  type: LoyaltyType;
  totalSteps: number;
  currentSteps: number;
  rewardLabel: string;
  nextReward: string;
  history: { date: string; action: string; points: number }[];
  terms: string;
  isActive: boolean;
}

export interface LoyaltyMember {
  id: string;
  loyaltyProgramId: string;
  customerName: string;
  customerAvatar: string;
  joinedAt: string;
  currentSteps: number;
  totalRewardsEarned: number;
  isRepeatCustomer: boolean;
}

export interface ScratchCampaign {
  id: string;
  businessId: string;
  businessName: string;
  businessLogo: string;
  name: string;
  rewards: { outcome: ScratchOutcome; label: string; probability: number }[];
  maxWins: number;
  validity: string;
  minimumBill: number;
  isActive: boolean;
  winsToday: number;
  totalPlays: number;
}

export interface ScratchResult {
  id: string;
  campaignId: string;
  businessName: string;
  businessLogo: string;
  outcome: ScratchOutcome;
  label: string;
  isWin: boolean;
  date: string;
}

export interface Report {
  id: string;
  reporterName: string;
  reporterAvatar: string;
  entityType: ContentType;
  entityId: string;
  entityPreview: string;
  reason: ReportReason;
  status: ReportStatus;
  createdAt: string;
  businessId?: string;
}

export interface AnalyticsMetric {
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'flat';
  format?: 'number' | 'currency' | 'percent';
}

export interface AnalyticsSeries {
  label: string;
  data: { label: string; value: number }[];
}

export interface TrafficSource {
  source: string;
  count: number;
  percentage: number;
}

export interface VideoClip {
  id: string;
  businessId: string;
  businessName: string;
  businessUsername: string;
  businessAvatar: string;
  businessLogo: string;
  businessCategory: string;
  businessLocation: string;
  videoUrl: string;
  thumbnailUrl: string;
  caption: string;
  dealId?: string;
  dealTitle?: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number;
  isLiked: boolean;
  isSaved: boolean;
  isFollowing: boolean;
  music?: string;
  createdAt: string;
}
