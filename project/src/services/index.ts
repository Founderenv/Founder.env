import { dataMode } from '@/lib/supabase';
import {
  mockAdminService, mockAnalyticsService, mockBusinessService, mockCategoryService,
  mockCustomerService, mockDealService, mockFollowService, mockLoyaltyService,
  mockMessageService, mockNotificationService, mockOwnerService, mockPostService,
  mockQRService, mockReferralService, mockReviewService, mockRewardService,
  mockScratchService, mockStoryService, mockSubscriptionService, mockTemplateService,
  mockVideoService,
} from './mockServices';
import {
  supabaseAdminService, supabaseAnalyticsService, supabaseBusinessService,
  supabaseCategoryService, supabaseCustomerService, supabaseDealService,
  supabaseFollowService, supabaseLoyaltyService, supabaseMessageService,
  supabaseNotificationService, supabaseOwnerService, supabasePostService,
  supabaseQRService, supabaseReferralService, supabaseReviewService,
  supabaseRewardService, supabaseScratchService, supabaseStoryService,
  supabaseSubscriptionService, supabaseTemplateService, supabaseVideoService,
} from './supabaseServices';

const backend = dataMode === 'supabase';

export const businessService = backend ? supabaseBusinessService : mockBusinessService;
export const postService = backend ? supabasePostService : mockPostService;
export const dealService = backend ? supabaseDealService : mockDealService;
export const storyService = backend ? supabaseStoryService : mockStoryService;
export const reviewService = backend ? supabaseReviewService : mockReviewService;
export const followService = backend ? supabaseFollowService : mockFollowService;
export const messageService = backend ? supabaseMessageService : mockMessageService;
export const notificationService = backend ? supabaseNotificationService : mockNotificationService;
export const qrService = backend ? supabaseQRService : mockQRService;
export const rewardService = backend ? supabaseRewardService : mockRewardService;
export const referralService = backend ? supabaseReferralService : mockReferralService;
export const loyaltyService = backend ? supabaseLoyaltyService : mockLoyaltyService;
export const scratchService = backend ? supabaseScratchService : mockScratchService;
export const videoService = backend ? supabaseVideoService : mockVideoService;
export const templateService = backend ? supabaseTemplateService : mockTemplateService;
export const categoryService = backend ? supabaseCategoryService : mockCategoryService;
export const customerService = backend ? supabaseCustomerService : mockCustomerService;
export const ownerService = backend ? supabaseOwnerService : mockOwnerService;
export const subscriptionService = backend ? supabaseSubscriptionService : mockSubscriptionService;
export const adminService = backend ? supabaseAdminService : mockAdminService;
export const analyticsService = backend ? supabaseAnalyticsService : mockAnalyticsService;
