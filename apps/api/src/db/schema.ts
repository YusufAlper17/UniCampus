// Drizzle şema — çekirdek tablolar. Tam şema: docs/04-database-schema.md.
// Ölçek fazında posts/events university_id ile partition'lanır (bkz. doküman).

import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  index,
  uuid,
} from 'drizzle-orm/pg-core';

export const accountType = pgEnum('account_type', [
  'student',
  'club',
  'team',
  'admin',
  'super_admin',
]);
export const accountStatus = pgEnum('account_status', [
  'active',
  'pending_approval',
  'suspended',
  'banned',
  'deleted',
]);
export const accountVisibility = pgEnum('account_visibility', ['public', 'private']);
export const contentDomain = pgEnum('content_domain', ['social', 'career']);
export const postType = pgEnum('post_type', [
  'post',
  'poll',
  'event',
  'project',
  'milestone',
  'opportunity',
  'lost_found',
]);
export const visibility = pgEnum('visibility', ['public', 'followers', 'connections', 'private']);
export const followStatus = pgEnum('follow_status', ['active', 'pending']);
export const requestStatus = pgEnum('request_status', ['pending', 'accepted', 'rejected']);
export const academicFieldVisibility = pgEnum('academic_field_visibility', [
  'public',
  'connections',
  'private',
]);
export const themePref = pgEnum('theme_pref', ['system', 'light', 'dark']);
// ---- Faz 11 ----
export const storyAudience = pgEnum('story_audience', ['public', 'close_friends']);
export const channelType = pgEnum('channel_type', ['text', 'voice']);

export const universities = pgTable('universities', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  shortName: text('short_name'),
  city: text('city'),
  logoUrl: text('logo_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const universityDomains = pgTable(
  'university_domains',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    universityId: uuid('university_id')
      .notNull()
      .references(() => universities.id, { onDelete: 'cascade' }),
    domain: text('domain').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    domainIdx: index('idx_university_domains_domain').on(t.domain),
  }),
);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    universityId: uuid('university_id')
      .notNull()
      .references(() => universities.id),
    type: accountType('type').notNull().default('student'),
    status: accountStatus('status').notNull().default('active'),
    username: text('username').notNull().unique(),
    displayName: text('display_name').notNull(),
    emailEnc: text('email_enc').notNull(),
    emailHash: text('email_hash').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    avatarUrl: text('avatar_url'),
    bio: text('bio'),
    careerHeadline: text('career_headline'),
    accountVisibility: accountVisibility('account_visibility').notNull().default('public'),
    careerVisibility: visibility('career_visibility').notNull().default('public'),
    isVerifiedStudent: boolean('is_verified_student').notNull().default(false),
    isVerifiedOrg: boolean('is_verified_org').notNull().default(false),
    followerCount: integer('follower_count').notNull().default(0),
    followingCount: integer('following_count').notNull().default(0),
    connectionCount: integer('connection_count').notNull().default(0),
    postCount: integer('post_count').notNull().default(0),
    // Durum metni (Faz 11 — WhatsApp tarzı "Ders çalışıyorum").
    statusText: text('status_text'),
    statusEmoji: text('status_emoji'),
    statusUpdatedAt: timestamp('status_updated_at', { withTimezone: true }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    // Moderasyon (Faz 7): süreli askı ve yönetici notu.
    suspendedUntil: timestamp('suspended_until', { withTimezone: true }),
    moderationNote: text('moderation_note'),
    // 2FA (Faz 7): TOTP secret AES-GCM ile şifreli saklanır; admin rolleri için zorunlu.
    totpSecretEnc: text('totp_secret_enc'),
    totpEnabled: boolean('totp_enabled').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniCreatedIdx: index('idx_users_university_created').on(t.universityId, t.createdAt),
  }),
);

export const userPreferences = pgTable('user_preferences', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  defaultFeedTab: contentDomain('default_feed_tab').notNull().default('social'),
  socialNotifications: boolean('social_notifications').notNull().default(true),
  careerNotifications: boolean('career_notifications').notNull().default(true),
  dmPermission: visibility('dm_permission').notNull().default('followers'),
  theme: themePref('theme').notNull().default('system'),
  locale: text('locale').notNull().default('tr'),
});

export const academicProfiles = pgTable('academic_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  faculty: text('faculty'),
  department: text('department'),
  classYear: integer('class_year'),
  gpa: numeric('gpa', { precision: 3, scale: 2 }),
  studentNo: text('student_no'),
  graduationYear: integer('graduation_year'),
  // Alan bazlı görünürlük JSON: { gpa: 'private', studentNo: 'private', ... }
  fieldVisibility: text('field_visibility').notNull().default('{}'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    deviceInfo: text('device_info'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('idx_refresh_tokens_user').on(t.userId),
    hashIdx: index('idx_refresh_tokens_hash').on(t.tokenHash),
  }),
);

export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    universityId: uuid('university_id').notNull(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: postType('type').notNull().default('post'),
    contentDomain: contentDomain('content_domain').notNull(),
    content: text('content'),
    mediaUrls: text('media_urls').array().notNull().default([]),
    visibility: visibility('visibility').notNull().default('public'),
    // Reels (Faz 12 — V2 lite): isReel true olan postlar normal akıştan ayrılır.
    isReel: boolean('is_reel').notNull().default(false),
    likeCount: integer('like_count').notNull().default(0),
    commentCount: integer('comment_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Dual feed için kritik index — sosyal/kariyer ayrımı
    domainIdx: index('idx_posts_domain_created').on(t.universityId, t.contentDomain, t.createdAt),
    authorIdx: index('idx_posts_author').on(t.authorId, t.createdAt),
    reelIdx: index('idx_posts_reels').on(t.universityId, t.isReel, t.createdAt),
  }),
);

export const follows = pgTable(
  'follows',
  {
    followerId: uuid('follower_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    followingId: uuid('following_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: followStatus('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.followerId, t.followingId] }),
    followingIdx: index('idx_follows_following').on(t.followingId, t.status),
  }),
);

export const connections = pgTable(
  'connections',
  {
    userAId: uuid('user_a_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    userBId: uuid('user_b_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userAId, t.userBId] }),
    userBIdx: index('idx_connections_user_b').on(t.userBId),
  }),
);

// Bağlantı istekleri (LinkedIn tarzı çift yönlü onay). Kabul → connections satırı.
export const connectionRequests = pgTable(
  'connection_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    receiverId: uuid('receiver_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: requestStatus('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pairIdx: uniqueIndex('idx_conn_req_pair').on(t.senderId, t.receiverId),
    receiverIdx: index('idx_conn_req_receiver').on(t.receiverId, t.status),
  }),
);

export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id'),
    content: text('content').notNull(),
    likeCount: integer('like_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    postIdx: index('idx_comments_post').on(t.postId, t.createdAt),
  }),
);

export const likes = pgTable(
  'likes',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.postId] }),
    postIdx: index('idx_likes_post').on(t.postId),
  }),
);

export const bookmarks = pgTable(
  'bookmarks',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.postId] }),
  }),
);

// Hashtag yalnızca sosyal evrende kullanılır (kariyer feed temiz kalır).
export const hashtags = pgTable(
  'hashtags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    universityId: uuid('university_id').notNull(),
    tag: text('tag').notNull(),
    usageCount: integer('usage_count').notNull().default(0),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqueTag: uniqueIndex('idx_hashtags_uni_tag').on(t.universityId, t.tag),
    trendingIdx: index('idx_hashtags_trending').on(t.universityId, t.usageCount),
  }),
);

export const postHashtags = pgTable(
  'post_hashtags',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    hashtagId: uuid('hashtag_id')
      .notNull()
      .references(() => hashtags.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.postId, t.hashtagId] }),
    tagIdx: index('idx_post_hashtags_tag').on(t.hashtagId),
  }),
);

export const eventScope = pgEnum('event_scope', ['individual', 'club', 'team']);
export const participationType = pgEnum('participation_type', ['open', 'approval', 'invite']);
export const participantStatus = pgEnum('participant_status', [
  'joined',
  'pending',
  'invited',
  'cancelled',
]);
export const opportunityType = pgEnum('opportunity_type', [
  'internship',
  'job',
  'scholarship',
  'volunteer',
  'research',
  'other',
]);
export const moderationStatus = pgEnum('moderation_status', [
  'pending',
  'approved',
  'rejected',
]);

export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    universityId: uuid('university_id').notNull(),
    organizerId: uuid('organizer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postId: uuid('post_id').references(() => posts.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    coverUrl: text('cover_url'),
    scope: eventScope('scope').notNull().default('individual'),
    locationText: text('location_text'),
    locationLat: numeric('location_lat'),
    locationLng: numeric('location_lng'),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    capacity: integer('capacity'),
    isPaid: boolean('is_paid').notNull().default(false),
    price: numeric('price', { precision: 10, scale: 2 }),
    participationType: participationType('participation_type').notNull().default('open'),
    participantCount: integer('participant_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniIdx: index('idx_events_university_starts').on(t.universityId, t.startsAt),
  }),
);

export const eventParticipants = pgTable(
  'event_participants',
  {
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: participantStatus('status').notNull().default('joined'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.eventId, t.userId] }),
  }),
);

export const polls = pgTable('polls', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  multiChoice: boolean('multi_choice').notNull().default(false),
  isAnonymous: boolean('is_anonymous').notNull().default(true),
  totalVotes: integer('total_votes').notNull().default(0),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const pollOptions = pgTable(
  'poll_options',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pollId: uuid('poll_id')
      .notNull()
      .references(() => polls.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    position: integer('position').notNull(),
    voteCount: integer('vote_count').notNull().default(0),
  },
  (t) => ({
    pollIdx: index('idx_poll_options_poll').on(t.pollId),
  }),
);

export const pollVotes = pgTable(
  'poll_votes',
  {
    optionId: uuid('option_id')
      .notNull()
      .references(() => pollOptions.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    pollId: uuid('poll_id')
      .notNull()
      .references(() => polls.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.optionId, t.userId] }),
    pollUserIdx: index('idx_poll_votes_poll_user').on(t.pollId, t.userId),
  }),
);

export const careerProjects = pgTable('career_projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  postId: uuid('post_id').references(() => posts.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  role: text('role'),
  description: text('description'),
  techTags: text('tech_tags').array().notNull().default([]),
  githubUrl: text('github_url'),
  demoUrl: text('demo_url'),
  mediaUrls: text('media_urls').array().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const careerMilestones = pgTable('career_milestones', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  postId: uuid('post_id').references(() => posts.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  occurredOn: timestamp('occurred_on', { withTimezone: true }),
  // Tebrik sayacı (Faz 11 — milestone tebrik).
  congratsCount: integer('congrats_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Milestone tebrikleri (her kullanıcı bir kez tebrik eder).
export const careerCongrats = pgTable(
  'career_congrats',
  {
    milestoneId: uuid('milestone_id')
      .notNull()
      .references(() => careerMilestones.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.milestoneId, t.userId] }),
  }),
);

export const careerOpportunities = pgTable(
  'career_opportunities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    universityId: uuid('university_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postId: uuid('post_id').references(() => posts.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    type: opportunityType('type').notNull().default('other'),
    company: text('company'),
    location: text('location'),
    deadline: timestamp('deadline', { withTimezone: true }),
    applyUrl: text('apply_url'),
    moderationStatus: moderationStatus('moderation_status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniIdx: index('idx_opportunities_university').on(t.universityId, t.createdAt),
    modIdx: index('idx_opportunities_moderation').on(t.moderationStatus),
  }),
);

export const deals = pgTable('deals', {
  id: uuid('id').primaryKey().defaultRandom(),
  sponsorId: uuid('sponsor_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  bannerUrl: text('banner_url'),
  discountCode: text('discount_code'),
  discountValue: text('discount_value'),
  category: text('category'),
  targetUniversities: uuid('target_universities').array().notNull().default([]),
  targetDepartments: text('target_departments').array().notNull().default([]),
  usageLimit: integer('usage_limit'),
  usedCount: integer('used_count').notNull().default(0),
  sponsorUrl: text('sponsor_url'),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  status: text('status').notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---- Monetizasyon (Faz 8) ----
export const entityStatus = pgEnum('entity_status', ['draft', 'active', 'paused', 'ended']);
export const contractType = pgEnum('contract_type', ['cpa', 'cpc', 'cpm', 'fixed', 'hybrid']);

export const sponsors = pgTable('sponsors', {
  id: uuid('id').primaryKey().defaultRandom(),
  brandName: text('brand_name').notNull(),
  logoUrl: text('logo_url'),
  contactName: text('contact_name'),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  status: entityStatus('status').notNull().default('draft'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sponsorContracts = pgTable('sponsor_contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  sponsorId: uuid('sponsor_id')
    .notNull()
    .references(() => sponsors.id, { onDelete: 'cascade' }),
  type: contractType('type').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }),
  targetUniversities: uuid('target_universities').array().notNull().default([]),
  contractFileUrl: text('contract_file_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const dealRedemptions = pgTable(
  'deal_redemptions',
  {
    dealId: uuid('deal_id')
      .notNull()
      .references(() => deals.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    revealedAt: timestamp('revealed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.dealId, t.userId] }),
  }),
);

export const dealClicks = pgTable('deal_clicks', {
  id: uuid('id').primaryKey().defaultRandom(),
  dealId: uuid('deal_id')
    .notNull()
    .references(() => deals.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  clickedAt: timestamp('clicked_at', { withTimezone: true }).notNull().defaultNow(),
});

export const adCampaigns = pgTable('ad_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  sponsorId: uuid('sponsor_id')
    .notNull()
    .references(() => sponsors.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  mediaUrl: text('media_url').notNull(),
  ctaText: text('cta_text').default('Daha Fazla'),
  targetUrl: text('target_url'),
  targeting: text('targeting').default('{}'),
  feedPositionInterval: integer('feed_position_interval').notNull().default(5),
  budgetType: text('budget_type'),
  budgetAmount: numeric('budget_amount', { precision: 12, scale: 2 }),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  status: entityStatus('status').notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const adImpressions = pgTable(
  'ad_impressions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => adCampaigns.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    universityId: uuid('university_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    campaignIdx: index('idx_ad_impressions_campaign').on(t.campaignId, t.createdAt),
  }),
);

export const adClicks = pgTable('ad_clicks', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => adCampaigns.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const otpCodes = pgTable(
  'otp_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    universityId: uuid('university_id').notNull(),
    codeHash: text('code_hash').notNull(),
    attempts: integer('attempts').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex('idx_otp_email').on(t.email),
  }),
);

// ---- Mesajlaşma (Faz 5) ----
export const conversationType = pgEnum('conversation_type', ['dm', 'group']);
export const conversationMemberRole = pgEnum('conversation_member_role', ['member', 'admin']);

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: conversationType('type').notNull().default('dm'),
    title: text('title'),
    avatarUrl: text('avatar_url'),
    universityId: uuid('university_id').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // DM çiftleri için deterministik anahtar (min:max) — tekilleştirme.
    dmKey: text('dm_key'),
    // Disappearing messages (Faz 11): 0/null = kapalı, aksi halde saniye.
    disappearingSeconds: integer('disappearing_seconds'),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    lastMessagePreview: text('last_message_preview'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    dmKeyIdx: uniqueIndex('idx_conversations_dm_key').on(t.dmKey),
  }),
);

export const conversationMembers = pgTable(
  'conversation_members',
  {
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: conversationMemberRole('role').notNull().default('member'),
    lastReadAt: timestamp('last_read_at', { withTimezone: true }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.conversationId, t.userId] }),
    userIdx: index('idx_conversation_members_user').on(t.userId),
  }),
);

// messages: ölçekte conversation_id ile HASH partition (bkz. docs/04). MVP tek tablo.
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content'),
    mediaUrl: text('media_url'),
    replyToId: uuid('reply_to_id'),
    editedAt: timestamp('edited_at', { withTimezone: true }),
    // Disappearing/view-once (Faz 11).
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    viewOnce: boolean('view_once').notNull().default(false),
    viewedAt: timestamp('viewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    convIdx: index('idx_messages_conversation_created').on(t.conversationId, t.createdAt),
  }),
);

export const devices = pgTable(
  'devices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    pushToken: text('push_token').notNull().unique(),
    platform: text('platform').notNull().default('expo'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('idx_devices_user').on(t.userId),
  }),
);

// ---- Topluluklar (Faz 6) ----
export const communityType = pgEnum('community_type', ['group', 'club_linked', 'team_linked']);
export const communityVisibility = pgEnum('community_visibility', [
  'public',
  'unlisted',
  'private',
]);
export const joinMode = pgEnum('join_mode', ['open', 'request', 'invite']);
export const memberRole = pgEnum('member_role', ['owner', 'admin', 'moderator', 'member']);
export const memberStatus = pgEnum('member_status', ['active', 'pending', 'banned']);

export const communities = pgTable(
  'communities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    universityId: uuid('university_id').notNull(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: communityType('type').notNull().default('group'),
    name: text('name').notNull(),
    description: text('description'),
    avatarUrl: text('avatar_url'),
    coverUrl: text('cover_url'),
    category: text('category'),
    visibility: communityVisibility('visibility').notNull().default('public'),
    joinMode: joinMode('join_mode').notNull().default('request'),
    memberCount: integer('member_count').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Keşfet: yalnızca public topluluklar listelenir.
    discoverIdx: index('idx_communities_discover').on(t.universityId, t.visibility, t.createdAt),
  }),
);

export const communityMembers = pgTable(
  'community_members',
  {
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: memberRole('role').notNull().default('member'),
    status: memberStatus('status').notNull().default('active'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.communityId, t.userId] }),
    userIdx: index('idx_community_members_user').on(t.userId),
  }),
);

export const communityChannels = pgTable(
  'community_channels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    position: integer('position').notNull().default(0),
    isDefault: boolean('is_default').notNull().default(false),
    // Faz 11 — Discord tarzı: kanal tipi, yazma izni eşiği, slow mode.
    type: channelType('type').notNull().default('text'),
    writeMinRole: memberRole('write_min_role').notNull().default('member'),
    slowModeSeconds: integer('slow_mode_seconds').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    communityIdx: index('idx_channels_community').on(t.communityId, t.position),
  }),
);

// Kanal mesajları DM'lerden ayrı tutulur (farklı erişim modeli).
export const channelMessages = pgTable(
  'channel_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => communityChannels.id, { onDelete: 'cascade' }),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content'),
    mediaUrl: text('media_url'),
    // Thread (Faz 11): bir üst mesaja yanıt zinciri.
    parentMessageId: uuid('parent_message_id'),
    // Pin (Faz 11): yöneticinin sabitlediği mesaj.
    pinnedAt: timestamp('pinned_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    channelIdx: index('idx_channel_messages_channel').on(t.channelId, t.createdAt),
    parentIdx: index('idx_channel_messages_parent').on(t.parentMessageId),
  }),
);

export const inviteLinks = pgTable(
  'invite_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    maxUses: integer('max_uses'),
    useCount: integer('use_count').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tokenIdx: index('idx_invite_links_token').on(t.token),
  }),
);

export const membershipRequests = pgTable(
  'membership_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: requestStatus('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pairIdx: uniqueIndex('idx_membership_req_pair').on(t.communityId, t.userId),
    queueIdx: index('idx_membership_req_queue').on(t.communityId, t.status),
  }),
);

// ---- Moderasyon & Admin (Faz 7) ----
export const reportTargetType = pgEnum('report_target_type', [
  'post',
  'comment',
  'user',
  'message',
  'community',
]);
export const reportStatus = pgEnum('report_status', [
  'open',
  'reviewing',
  'resolved',
  'dismissed',
]);

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    targetType: reportTargetType('target_type').notNull(),
    targetId: uuid('target_id').notNull(),
    reason: text('reason').notNull(),
    details: text('details'),
    status: reportStatus('status').notNull().default('open'),
    resolvedBy: uuid('resolved_by').references(() => users.id, { onDelete: 'set null' }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusIdx: index('idx_reports_status').on(t.status, t.createdAt),
    targetIdx: index('idx_reports_target').on(t.targetType, t.targetId),
  }),
);

// ---- Faz 11 — Story + Close Friends ----
export const stories = pgTable(
  'stories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    universityId: uuid('university_id').notNull(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mediaUrl: text('media_url').notNull(),
    caption: text('caption'),
    audience: storyAudience('audience').notNull().default('public'),
    viewCount: integer('view_count').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    authorIdx: index('idx_stories_author').on(t.authorId, t.expiresAt),
    uniIdx: index('idx_stories_university').on(t.universityId, t.expiresAt),
  }),
);

export const storyViews = pgTable(
  'story_views',
  {
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    viewerId: uuid('viewer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    viewedAt: timestamp('viewed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.storyId, t.viewerId] }),
  }),
);

export const closeFriends = pgTable(
  'close_friends',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    friendId: uuid('friend_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.friendId] }),
    friendIdx: index('idx_close_friends_friend').on(t.friendId),
  }),
);

export const adminAuditLogs = pgTable(
  'admin_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    adminId: uuid('admin_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    action: text('action').notNull(),
    targetType: text('target_type'),
    targetId: text('target_id'),
    metadata: text('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    adminIdx: index('idx_audit_admin').on(t.adminId, t.createdAt),
    createdIdx: index('idx_audit_created').on(t.createdAt),
  }),
);
