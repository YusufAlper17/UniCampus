// Çekirdek varlık tipleri (API ↔ istemci ortak). DB şemasının TS karşılığı.

import type {
  AccountType,
  AccountStatus,
  AccountVisibility,
  ChannelType,
  CommunityType,
  CommunityVisibility,
  ContentDomain,
  ConversationType,
  JoinMode,
  MemberRole,
  MemberStatus,
  ParticipationType,
  PostType,
  StoryAudience,
  Visibility,
} from './enums.js';

export type UUID = string;
export type ISODateString = string;

export interface University {
  id: UUID;
  name: string;
  shortName?: string;
  city?: string;
  logoUrl?: string;
}

export interface User {
  id: UUID;
  universityId: UUID;
  type: AccountType;
  status: AccountStatus;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  careerHeadline?: string;
  accountVisibility: AccountVisibility;
  careerVisibility: Visibility;
  isVerifiedStudent: boolean;
  isVerifiedOrg: boolean;
  followerCount?: number;
  connectionCount?: number;
  statusText?: string;
  statusEmoji?: string;
  createdAt: ISODateString;
}

export type AcademicFieldVisibility = 'public' | 'connections' | 'private';

export interface AcademicInfo {
  userId: UUID;
  faculty?: string;
  department?: string;
  classYear?: number;
  gpa?: number;
  studentNo?: string;
  graduationYear?: number;
  semester?: string;
  visibility: Record<string, AcademicFieldVisibility>;
}

export interface UserPreferences {
  userId: UUID;
  defaultFeedTab: ContentDomain;
  socialNotifications: boolean;
  careerNotifications: boolean;
  dmPermission: Visibility;
  theme: 'system' | 'light' | 'dark';
  locale: string;
}

export interface PollOption {
  id: UUID;
  text: string;
  voteCount: number;
}

export interface PollData {
  id: UUID;
  question: string;
  options: PollOption[];
  totalVotes: number;
  multiChoice: boolean;
  isAnonymous: boolean;
  endsAt: ISODateString;
  myVotes: UUID[];
}

export interface EventAttendee {
  id: UUID;
  displayName: string;
  username?: string;
  avatarUrl?: string;
}

export interface EventData {
  id: UUID;
  title?: string;
  startsAt: ISODateString;
  endsAt?: ISODateString;
  locationText?: string;
  capacity?: number;
  participantCount: number;
  isPaid: boolean;
  price?: number;
  participationType: ParticipationType;
  scope: 'individual' | 'club' | 'team';
  myStatus?: 'joined' | 'pending' | 'invited' | 'cancelled' | null;
  /** Katılımcı önizleme listesi (etkinlik sahibi gösterime izin verdiyse). */
  attendees?: EventAttendee[];
  /** Katılımcı listesinin herkese açık olup olmadığı. */
  attendeesVisible?: boolean;
}

/** Tekil medya öğesi — fotoğraf veya video (poster + süre ile). */
export interface MediaItem {
  type: 'image' | 'video';
  url: string;
  /** Video için kapak görseli (oynatılmadan gösterilir). */
  poster?: string;
  /** Video süresi (saniye) — rozet olarak gösterilir. */
  durationSec?: number;
  width?: number;
  height?: number;
}

export interface Post {
  id: UUID;
  universityId: UUID;
  authorId: UUID;
  author?: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'isVerifiedStudent'>;
  type: PostType;
  contentDomain: ContentDomain;
  content?: string;
  mediaUrls: string[];
  /** Zengin medya (fotoğraf/video). Varsa mediaUrls yerine bu kullanılır. */
  media?: MediaItem[];
  visibility: Visibility;
  likeCount: number;
  commentCount: number;
  likedByMe?: boolean;
  savedByMe?: boolean;
  poll?: PollData;
  event?: EventData;
  location?: string;
  createdAt: ISODateString;
}

export interface Comment {
  id: UUID;
  postId: UUID;
  authorId: UUID;
  author?: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'isVerifiedStudent'>;
  parentId?: UUID;
  content: string;
  likeCount: number;
  createdAt: ISODateString;
}

export interface TrendingHashtag {
  tag: string;
  usageCount: number;
}

export interface CareerProject {
  id: UUID;
  userId: UUID;
  postId?: UUID;
  title: string;
  role?: string;
  description?: string;
  techTags: string[];
  links: { github?: string; demo?: string };
  teamMembers: UUID[];
  mediaUrls: string[];
  createdAt: ISODateString;
}

export interface EventEntity {
  id: UUID;
  universityId: UUID;
  organizerId: UUID;
  title: string;
  description?: string;
  coverUrl?: string;
  locationText?: string;
  locationLat?: number;
  locationLng?: number;
  startsAt: ISODateString;
  endsAt?: ISODateString;
  capacity?: number;
  isPaid: boolean;
  price?: number;
  participationType: ParticipationType;
  participantCount: number;
  createdAt: ISODateString;
}

export interface Community {
  id: UUID;
  universityId: UUID;
  ownerId: UUID;
  type: CommunityType;
  name: string;
  description?: string;
  coverUrl?: string;
  avatarUrl?: string;
  category?: string;
  visibility: CommunityVisibility;
  joinMode: JoinMode;
  memberCount: number;
  /** Topluluğun düzenlediği toplam etkinlik sayısı. */
  eventCount?: number;
  /** Etkinliklere katılan toplam kişi sayısı. */
  totalEventAttendees?: number;
  /** Son 7 günde katılan yeni üye sayısı (trend göstergesi). */
  weeklyGrowth?: number;
  /** Aktif (çevrimiçi/son 24s) üye sayısı. */
  activeMemberCount?: number;
  /** Trend sıralaması için skor. */
  trendingScore?: number;
  createdAt: ISODateString;
}

export interface CommunityMember {
  communityId: UUID;
  userId: UUID;
  role: MemberRole;
  status: MemberStatus;
  joinedAt: ISODateString;
  // Profil bilgisi (liste/onay kuyruğu için zenginleştirilir).
  username?: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface CommunityDetail extends Community {
  // İsteyen kullanıcının bu topluluktaki durumu.
  viewerRole?: MemberRole | null;
  viewerStatus?: MemberStatus | 'none';
  channels?: CommunityChannel[];
}

export interface CommunityChannel {
  id: UUID;
  communityId: UUID;
  name: string;
  description?: string;
  position: number;
  isDefault: boolean;
  type: ChannelType;
  writeMinRole: MemberRole;
  slowModeSeconds: number;
  createdAt: ISODateString;
}

export interface ChannelMessage {
  id: UUID;
  channelId: UUID;
  communityId: UUID;
  senderId: UUID;
  content?: string;
  mediaUrl?: string;
  parentMessageId?: UUID;
  pinned?: boolean;
  createdAt: ISODateString;
  mine?: boolean;
  sender?: {
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface InviteLink {
  token: string;
  url: string;
  maxUses?: number;
  useCount: number;
  expiresAt?: ISODateString;
}

export interface AcademicProfile {
  faculty?: string | null;
  department?: string | null;
  classYear?: number | null;
  gpa?: number | null;
  studentNo?: string | null;
  graduationYear?: number | null;
  fieldVisibility?: Record<string, 'public' | 'connections' | 'private'>;
}

export interface ConversationPeer {
  id: UUID;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isVerifiedStudent: boolean;
}

export interface Conversation {
  id: UUID;
  type: ConversationType;
  title?: string;
  avatarUrl?: string;
  peer?: ConversationPeer;
  lastMessagePreview?: string;
  lastMessageAt?: ISODateString;
  unreadCount: number;
  memberCount: number;
  disappearingSeconds?: number;
  createdAt: ISODateString;
}

export interface Message {
  id: UUID;
  conversationId: UUID;
  senderId: UUID;
  content?: string;
  mediaUrl?: string;
  replyToId?: UUID;
  editedAt?: ISODateString;
  expiresAt?: ISODateString;
  viewOnce?: boolean;
  viewed?: boolean;
  createdAt: ISODateString;
  mine?: boolean;
  readByPeer?: boolean;
}

export interface Deal {
  id: UUID;
  sponsorId: UUID;
  title: string;
  description?: string;
  bannerUrl?: string;
  category?: string;
  discountValue?: string;
  endsAt?: ISODateString;
}

// ---- Faz 11 — Story ----
export interface Story {
  id: UUID;
  authorId: UUID;
  mediaUrl: string;
  caption?: string;
  audience: StoryAudience;
  expiresAt: ISODateString;
  createdAt: ISODateString;
  seen?: boolean;
  viewCount?: number;
}

export interface StoryGroup {
  author: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'isVerifiedStudent'>;
  stories: Story[];
  hasUnseen: boolean;
  isMine?: boolean;
}

// ---- Faz 11 — Bağlantı önerisi ----
export interface ConnectionSuggestion {
  id: UUID;
  username: string;
  displayName: string;
  avatarUrl?: string;
  careerHeadline?: string;
  department?: string;
  mutualCount: number;
  reason: string;
}

/** Feed öğesi: heterojen liste. domain=social'da 'ad' bulunur; domain=career'da bulunmaz. */
export type FeedItem =
  | { type: 'post'; post: Post }
  | { type: 'event'; event: EventEntity }
  | { type: 'ad'; campaignId: UUID; mediaUrl: string; ctaText: string; targetUrl: string };

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}
