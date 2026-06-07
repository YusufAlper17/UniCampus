// Veri modeli enum'ları — DB şemasıyla birebir (docs/04-database-schema.md)

export const ACCOUNT_TYPES = ['student', 'club', 'team', 'admin', 'super_admin'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_STATUSES = [
  'active',
  'pending_approval',
  'suspended',
  'banned',
  'deleted',
] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const ACCOUNT_VISIBILITIES = ['public', 'private'] as const;
export type AccountVisibility = (typeof ACCOUNT_VISIBILITIES)[number];

/** Unicorn çekirdeği: sosyal ve kariyer evreni asla karışmaz. */
export const CONTENT_DOMAINS = ['social', 'career'] as const;
export type ContentDomain = (typeof CONTENT_DOMAINS)[number];

export const POST_TYPES = [
  'post',
  'poll',
  'event',
  'project',
  'milestone',
  'opportunity',
  'lost_found',
] as const;
export type PostType = (typeof POST_TYPES)[number];

export const VISIBILITIES = ['public', 'followers', 'connections', 'private'] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const FOLLOW_STATUSES = ['active', 'pending'] as const;
export type FollowStatus = (typeof FOLLOW_STATUSES)[number];

export const REQUEST_STATUSES = ['pending', 'accepted', 'rejected'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const EVENT_SCOPES = ['individual', 'club', 'team'] as const;
export type EventScope = (typeof EVENT_SCOPES)[number];

export const PARTICIPATION_TYPES = ['open', 'approval', 'invite'] as const;
export type ParticipationType = (typeof PARTICIPATION_TYPES)[number];

export const PARTICIPANT_STATUSES = ['joined', 'pending', 'invited', 'cancelled'] as const;
export type ParticipantStatus = (typeof PARTICIPANT_STATUSES)[number];

export const COMMUNITY_TYPES = ['group', 'club_linked', 'team_linked'] as const;
export type CommunityType = (typeof COMMUNITY_TYPES)[number];

export const COMMUNITY_VISIBILITIES = ['public', 'unlisted', 'private'] as const;
export type CommunityVisibility = (typeof COMMUNITY_VISIBILITIES)[number];

export const JOIN_MODES = ['open', 'request', 'invite'] as const;
export type JoinMode = (typeof JOIN_MODES)[number];

export const MEMBER_ROLES = ['owner', 'admin', 'moderator', 'member'] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const MEMBER_STATUSES = ['active', 'pending', 'banned'] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const CONVERSATION_TYPES = ['dm', 'group'] as const;
export type ConversationType = (typeof CONVERSATION_TYPES)[number];

export const CONTRACT_TYPES = ['cpa', 'cpc', 'fixed', 'hybrid'] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];

export const ENTITY_STATUSES = ['draft', 'active', 'paused', 'ended'] as const;
export type EntityStatus = (typeof ENTITY_STATUSES)[number];

export const REPORT_STATUSES = ['open', 'reviewing', 'resolved', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

// ---- Faz 11 — Rekabetçi özellikler ----
export const STORY_AUDIENCES = ['public', 'close_friends'] as const;
export type StoryAudience = (typeof STORY_AUDIENCES)[number];

export const CHANNEL_TYPES = ['text', 'voice'] as const;
export type ChannelType = (typeof CHANNEL_TYPES)[number];

// Disappearing message süre seçenekleri (saniye). 0 = kapalı.
export const DISAPPEARING_OPTIONS = [0, 86400, 604800, 7776000] as const;
export type DisappearingOption = (typeof DISAPPEARING_OPTIONS)[number];
