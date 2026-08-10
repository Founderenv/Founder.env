# Frontend → Supabase migration map

| Frontend contract | PostgreSQL source | Notes |
|---|---|---|
| `CustomerAccount`, `BusinessOwner` | `profiles`, `public_profiles` | Email exists only on private `profiles`; owners consume `public_profiles`. |
| `Business`, `BusinessTemplateConfig` | `businesses`, `business_templates`, `business_gallery`, `business_public` | JSON is retained for opening hours and product presentation to preserve the UI contract. |
| `BusinessFollower` | `business_followers` + `business_follower_directory` | Directory deliberately omits customer email. |
| `Post`, `PostMedia`, `Comment` | `posts`, `post_media`, `post_likes`, `post_comments`, `saved_posts`, `reposts` | Aggregates are queried through secured views/service composition. |
| `Story`, `StoryView`, `StoryHighlight` | `stories`, `story_views`, `story_highlights`, `story_highlight_items` | `expires_at` defaults to 24 hours. |
| `VideoClip` | `deal_clips`, `deal_clip_likes`, `saved_deal_clips` | Deal Clips remain business-only content. |
| `Deal`, `DealClaim` | `deals`, `deal_claims`, `claim_deal()` | Client cannot mark a claim redeemed. |
| `Review`, `ReviewReply` | `reviews`, `review_replies`, `review_helpful` | One non-removed review per customer/business. |
| `Conversation`, `Message` | `conversations`, `messages` | Conversation identity is unique by business/customer. |
| `Notification` | `notifications` | Per-recipient RLS; Realtime-ready. |
| `QRCode`, `QRScan` | `qr_codes`, `qr_scans`, `resolve_and_track_qr()` | One permanent QR per business. |
| `Reward*`, `Scratch*` | `reward_campaigns`, `reward_claims`, `scratch_campaigns`, `scratch_plays`, `play_scratch()` | Scratch outcome is selected atomically on the server. |
| `Referral*` | `referral_campaigns`, `referrals`, `create_referral()` | Qualification/rewarding remain privileged server transitions. |
| `Loyalty*` | `loyalty_programs`, `loyalty_members`, `loyalty_transactions` | Balance is derived from immutable transactions. |
| `Subscription`, `Payment` | `subscriptions`, `payments`, `invoices` | Read-only to owners; success state is server/admin controlled. |
| `Report`, analytics types | `reports`, `analytics_events`, `admin_audit_logs` | Owner data is business-scoped; admin access uses `is_admin()`. |

The service facade selects one backend for the entire session. It never merges Supabase rows with fixture rows.
