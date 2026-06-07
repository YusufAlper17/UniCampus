// API istek/yanıt doğrulama şemaları (Zod). Tek doğruluk kaynağı — api + istemci paylaşır.

import { z } from 'zod';
import {
  ACCOUNT_TYPES,
  ACCOUNT_VISIBILITIES,
  CHANNEL_TYPES,
  CONTENT_DOMAINS,
  COMMUNITY_VISIBILITIES,
  DISAPPEARING_OPTIONS,
  JOIN_MODES,
  MEMBER_ROLES,
  PARTICIPATION_TYPES,
  POST_TYPES,
  STORY_AUDIENCES,
  VISIBILITIES,
} from './enums.js';

export const sendOtpSchema = z.object({
  email: z.string().email(),
  universityId: z.string().uuid(),
});
export type SendOtpInput = z.infer<typeof sendOtpSchema>;

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6).regex(/^\d{6}$/),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const registerSchema = z.object({
  verificationToken: z.string().min(10),
  accountType: z.enum(ACCOUNT_TYPES),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Yalnızca harf, rakam ve alt çizgi'),
  displayName: z.string().min(2).max(80),
  password: z.string().min(8).max(128),
  bio: z.string().max(300).optional(),
  careerHeadline: z.string().max(120).optional(),
  accountVisibility: z.enum(ACCOUNT_VISIBILITIES).default('public'),
  defaultFeedTab: z.enum(CONTENT_DOMAINS).default('social'),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  totpCode: z.string().regex(/^\d{6}$/).optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const totpCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, '6 haneli kod gerekli'),
});
export type TotpCodeInput = z.infer<typeof totpCodeSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(80).optional(),
  bio: z.string().max(300).optional(),
  careerHeadline: z.string().max(120).optional(),
  avatarUrl: z.string().url().optional(),
  accountVisibility: z.enum(ACCOUNT_VISIBILITIES).optional(),
  careerVisibility: z.enum(VISIBILITIES).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

const fieldVis = z.enum(['public', 'connections', 'private']);
export const updateAcademicSchema = z.object({
  faculty: z.string().max(120).optional(),
  department: z.string().max(120).optional(),
  classYear: z.number().int().min(1).max(8).optional(),
  gpa: z.number().min(0).max(4).optional(),
  studentNo: z.string().max(40).optional(),
  graduationYear: z.number().int().min(1950).max(2100).optional(),
  fieldVisibility: z
    .object({
      gpa: fieldVis.optional(),
      studentNo: fieldVis.optional(),
      classYear: fieldVis.optional(),
      department: fieldVis.optional(),
      faculty: fieldVis.optional(),
      graduationYear: fieldVis.optional(),
    })
    .optional(),
});
export type UpdateAcademicInput = z.infer<typeof updateAcademicSchema>;

export const updatePreferencesSchema = z.object({
  defaultFeedTab: z.enum(CONTENT_DOMAINS).optional(),
  socialNotifications: z.boolean().optional(),
  careerNotifications: z.boolean().optional(),
  dmPermission: z.enum(VISIBILITIES).optional(),
  theme: z.enum(['system', 'light', 'dark']).optional(),
  locale: z.string().max(10).optional(),
});
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

export const createPostSchema = z.object({
  contentDomain: z.enum(CONTENT_DOMAINS),
  type: z.enum(POST_TYPES).default('post'),
  content: z.string().max(500).optional(),
  mediaUrls: z.array(z.string().url()).max(4).default([]),
  visibility: z.enum(VISIBILITIES).default('public'),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;

export const createCommentSchema = z.object({
  content: z.string().min(1).max(500),
  parentId: z.string().uuid().optional(),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const presignSchema = z.object({
  contentType: z.string().min(3).max(100),
  size: z.number().int().positive().max(50 * 1024 * 1024),
});
export type PresignInput = z.infer<typeof presignSchema>;

export const createPollSchema = z.object({
  question: z.string().min(1).max(200),
  options: z.array(z.string().min(1).max(100)).min(2).max(4),
  durationHours: z.number().int().positive().max(168),
  multiChoice: z.boolean().default(false),
  isAnonymous: z.boolean().default(true),
});
export type CreatePollInput = z.infer<typeof createPollSchema>;

export const createEventSchema = z
  .object({
    title: z.string().min(1).max(120),
    description: z.string().max(2000).optional(),
    scope: z.enum(['individual', 'club', 'team']).default('individual'),
    locationText: z.string().max(200).optional(),
    locationLat: z.number().optional(),
    locationLng: z.number().optional(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime().optional(),
    capacity: z.number().int().positive().nullable().optional(),
    isPaid: z.boolean().default(false),
    price: z.number().nonnegative().optional(),
    participationType: z.enum(PARTICIPATION_TYPES).default('open'),
  })
  .refine((v) => !v.isPaid || (v.price ?? 0) > 0, {
    message: 'Ücretli etkinlik için fiyat zorunlu',
    path: ['price'],
  });
export type CreateEventInput = z.infer<typeof createEventSchema>;

export const votePollSchema = z.object({
  optionIds: z.array(z.string().uuid()).min(1).max(4),
});
export type VotePollInput = z.infer<typeof votePollSchema>;

export const createProjectSchema = z.object({
  title: z.string().min(2).max(120),
  role: z.string().max(80).optional(),
  description: z.string().max(2000).optional(),
  techTags: z.array(z.string().max(30)).max(12).default([]),
  githubUrl: z.string().url().optional(),
  demoUrl: z.string().url().optional(),
  mediaUrls: z.array(z.string().url()).max(4).default([]),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const createMilestoneSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(1000).optional(),
  occurredOn: z.string().datetime().optional(),
});
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;

export const createOpportunitySchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  type: z
    .enum(['internship', 'job', 'scholarship', 'volunteer', 'research', 'other'])
    .default('other'),
  company: z.string().max(120).optional(),
  location: z.string().max(120).optional(),
  deadline: z.string().datetime().optional(),
  applyUrl: z.string().url().optional(),
});
export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;

export const createCommunitySchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  type: z.enum(['group', 'club_linked', 'team_linked']).default('group'),
  visibility: z.enum(COMMUNITY_VISIBILITIES).default('public'),
  joinMode: z.enum(JOIN_MODES).default('request'),
  category: z.string().max(50).optional(),
});
export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;

export const createInviteLinkSchema = z.object({
  expiresInDays: z.number().int().positive().max(365).optional(),
  maxUses: z.number().int().positive().optional(),
});
export type CreateInviteLinkInput = z.infer<typeof createInviteLinkSchema>;

export const createChannelSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(200).optional(),
});
export type CreateChannelInput = z.infer<typeof createChannelSchema>;

export const sendChannelMessageSchema = z
  .object({
    content: z.string().max(4000).optional(),
    mediaUrl: z.string().url().optional(),
    parentMessageId: z.string().uuid().optional(),
  })
  .refine((v) => !!v.content?.trim() || !!v.mediaUrl, {
    message: 'Mesaj boş olamaz',
    path: ['content'],
  });
export type SendChannelMessageInput = z.infer<typeof sendChannelMessageSchema>;

export const feedQuerySchema = z.object({
  domain: z.enum(CONTENT_DOMAINS),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type FeedQuery = z.infer<typeof feedQuerySchema>;

export const connectionRequestSchema = z.object({
  receiverId: z.string().uuid(),
});
export type ConnectionRequestInput = z.infer<typeof connectionRequestSchema>;

export const createConversationSchema = z.object({
  type: z.enum(['dm', 'group']).default('dm'),
  memberIds: z.array(z.string().uuid()).min(1).max(50),
  title: z.string().min(1).max(80).optional(),
});
export type CreateConversationInput = z.infer<typeof createConversationSchema>;

export const sendMessageSchema = z
  .object({
    content: z.string().max(4000).optional(),
    mediaUrl: z.string().url().optional(),
    replyToId: z.string().uuid().optional(),
    viewOnce: z.boolean().default(false),
  })
  .refine((v) => !!v.content?.trim() || !!v.mediaUrl, {
    message: 'Mesaj boş olamaz',
    path: ['content'],
  })
  .refine((v) => !v.viewOnce || !!v.mediaUrl, {
    message: 'Tek görüntülemelik yalnızca medya için geçerli',
    path: ['viewOnce'],
  });
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const registerDeviceSchema = z.object({
  pushToken: z.string().min(10).max(200),
  platform: z.enum(['expo', 'ios', 'android']).default('expo'),
});
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;

export const universitiesQuerySchema = z.object({
  q: z.string().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type UniversitiesQuery = z.infer<typeof universitiesQuerySchema>;

export const cursorQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type CursorQuery = z.infer<typeof cursorQuerySchema>;

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(80),
  type: z.enum(['all', 'user', 'hashtag', 'event']).default('all'),
  limit: z.coerce.number().int().min(1).max(30).default(15),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;

export const exploreQuerySchema = z.object({
  domain: z.enum(CONTENT_DOMAINS).default('social'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ExploreQuery = z.infer<typeof exploreQuerySchema>;

export const createReportSchema = z.object({
  targetType: z.enum(['post', 'comment', 'user', 'message', 'community']),
  targetId: z.string().uuid(),
  reason: z.string().min(3).max(120),
  details: z.string().max(500).optional(),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

// ---- Faz 11 — Story + Close Friends ----
export const createStorySchema = z.object({
  mediaUrl: z.string().url(),
  caption: z.string().max(200).optional(),
  audience: z.enum(STORY_AUDIENCES).default('public'),
});
export type CreateStoryInput = z.infer<typeof createStorySchema>;

// ---- Faz 11 — Durum metni (WhatsApp tarzı) ----
export const updateStatusSchema = z.object({
  statusText: z.string().max(80).nullable().optional(),
  statusEmoji: z.string().max(8).nullable().optional(),
});
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

// ---- Faz 11 — Topluluk rol atama (Discord tarzı) ----
export const assignRoleSchema = z.object({
  role: z.enum(MEMBER_ROLES),
});
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;

// ---- Faz 11 — Kanal (tip + izin + slow mode) ----
export const createChannelV2Schema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(200).optional(),
  type: z.enum(CHANNEL_TYPES).default('text'),
  writeMinRole: z.enum(MEMBER_ROLES).default('member'),
  slowModeSeconds: z.number().int().min(0).max(3600).default(0),
});
export type CreateChannelV2Input = z.infer<typeof createChannelV2Schema>;

// ---- Faz 11 — Disappearing messages ----
export const setDisappearingSchema = z.object({
  seconds: z
    .number()
    .int()
    .refine((v) => (DISAPPEARING_OPTIONS as readonly number[]).includes(v), {
      message: 'Geçersiz süre',
    }),
});
export type SetDisappearingInput = z.infer<typeof setDisappearingSchema>;

// ---- Faz 12 — Reels (V2 lite) ----
export const createReelSchema = z.object({
  mediaUrl: z.string().url(),
  caption: z.string().max(300).optional(),
});
export type CreateReelInput = z.infer<typeof createReelSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
