// UniCampus — bellek-içi sahte backend.
// Tüm API uçlarını gerçek bir sunucuya ihtiyaç duymadan karşılar (demo modu).

import type {
  Comment,
  Community,
  CommunityChannel,
  CommunityDetail,
  CommunityMember,
  Conversation,
  Message,
  Post,
  Story,
  StoryGroup,
  User,
} from '@unicampus/shared-types';
import { ApiError } from '../api.js';
import {
  CHANNEL_MESSAGES,
  COMMENTS,
  COMMUNITIES,
  CONVERSATIONS,
  DEALS,
  FOLLOW_REQUESTS,
  HASHTAGS,
  IMG,
  ME_ID,
  MILESTONES,
  OPPORTUNITIES,
  POSTS,
  PROJECTS,
  REELS,
  STORIES,
  SUGGESTIONS,
  TREND_TOPICS,
  UNIVERSITY_ID,
  USERS,
  type MockUser,
} from './data.js';

// ---- Mutable store ----
const usersById = new Map<string, MockUser>(USERS.map((u) => [u.id, u]));
const usersByName = new Map<string, MockUser>(USERS.map((u) => [u.username, u]));

const pendingFollowRequests = new Set(FOLLOW_REQUESTS.map((r) => r.followerId));

const feedPosts: Post[] = [...POSTS];
const reels: Post[] = [...REELS];
const stories: Story[] = [...STORIES];
const commentsByPost: Record<string, Comment[]> = {};
const channelMsgs: Record<string, { id: string; senderId: string; content?: string; mediaUrl?: string; createdAt: string }[]> = {};
const closeFriends = new Set<string>(['u_irem', 'u_zeynep']);
const myCommunityStatus = new Map<string, 'active' | 'pending'>();

const prefs = {
  userId: ME_ID,
  defaultFeedTab: 'social' as const,
  socialNotifications: true,
  careerNotifications: true,
  dmPermission: 'public' as const,
  theme: 'system' as const,
  locale: 'tr',
};

// Topluluk üyelik durumları
for (const c of COMMUNITIES) {
  if (c.members.includes(ME_ID)) myCommunityStatus.set(c.id, 'active');
}

// Yorum tohumları (id eşleştirme)
let cseq = 0;
const cid = () => `c_new${++cseq}`;
for (const [postId, list] of Object.entries(COMMENTS)) {
  commentsByPost[postId] = list.map((c) => ({
    id: cid(),
    postId,
    authorId: c.author,
    content: c.content,
    likeCount: c.likeCount,
    createdAt: new Date(Date.now() - c.ageMin * 60_000).toISOString(),
  }));
}

// Kanal mesajı tohumları
let chseq = 0;
for (const [channelId, list] of Object.entries(CHANNEL_MESSAGES)) {
  channelMsgs[channelId] = list.map((m) => ({
    id: `chm${++chseq}`,
    senderId: m.sender,
    content: m.content,
    createdAt: new Date(Date.now() - m.ageMin * 60_000).toISOString(),
  }));
}

// Sohbet + mesaj tohumları
interface Conv {
  id: string;
  type: 'dm' | 'group';
  peerId?: string;
  title?: string;
  unread: number;
  disappearingSeconds: number;
  msgs: Message[];
  createdAt: string;
}
let mseq = 0;
const conversations: Conv[] = CONVERSATIONS.map((c) => {
  const msgs: Message[] = c.messages.map((m) => ({
    id: `msg${++mseq}`,
    conversationId: c.id,
    senderId: m.sender,
    content: m.content,
    mediaUrl: m.mediaUrl,
    createdAt: new Date(Date.now() - m.ageMin * 60_000).toISOString(),
    mine: m.sender === ME_ID,
    readByPeer: m.sender === ME_ID,
  }));
  return {
    id: c.id,
    type: c.type,
    peerId: c.peer,
    title: c.title,
    unread: c.unread,
    disappearingSeconds: 0,
    msgs,
    createdAt: new Date(Date.now() - 7 * 86_400_000).toISOString(),
  };
});

// ---- Projeksiyonlar ----
function toAuthor(u?: MockUser): Post['author'] {
  if (!u) return undefined;
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    isVerifiedStudent: u.isVerifiedStudent,
  };
}

function toUser(u: MockUser): User {
  return {
    id: u.id,
    universityId: UNIVERSITY_ID,
    type: u.type,
    status: 'active',
    username: u.username,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    bio: u.bio,
    careerHeadline: u.careerHeadline,
    accountVisibility: u.accountVisibility,
    careerVisibility: 'connections',
    isVerifiedStudent: u.isVerifiedStudent,
    isVerifiedOrg: u.isVerifiedOrg,
    followerCount: u.followerCount,
    connectionCount: u.connectionCount,
    statusText: u.statusText,
    statusEmoji: u.statusEmoji,
    createdAt: u.createdAt,
  };
}

function postCountOf(userId: string): number {
  return feedPosts.filter((p) => p.authorId === userId).length;
}

function toProfileUser(u: MockUser) {
  return {
    id: u.id,
    universityId: UNIVERSITY_ID,
    type: u.type,
    status: 'active',
    username: u.username,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    bio: u.bio,
    careerHeadline: u.careerHeadline,
    accountVisibility: u.accountVisibility,
    careerVisibility: 'connections' as const,
    isVerifiedStudent: u.isVerifiedStudent,
    isVerifiedOrg: u.isVerifiedOrg,
    followerCount: u.followerCount,
    followingCount: u.followingCount,
    connectionCount: u.connectionCount,
    postCount: postCountOf(u.id),
    statusText: u.statusText,
    statusEmoji: u.statusEmoji,
    twoFactorEnabled: false,
    createdAt: u.createdAt,
  };
}

function academicOf(u: MockUser) {
  return {
    faculty: u.faculty ?? null,
    department: u.department ?? null,
    classYear: u.classYear ?? null,
    gpa: u.gpa ?? null,
    studentNo: u.id === ME_ID ? '150220XXX' : null,
    graduationYear: u.graduationYear ?? null,
  };
}

function myCommunityIds(): string[] {
  return COMMUNITIES.filter((c) => myCommunityStatus.get(c.id) === 'active' || c.members.includes(ME_ID)).map((c) => c.id);
}

function featuredCommunitiesOf(u: MockUser) {
  const ids = u.featuredCommunityIds ?? [];
  return ids
    .map((id) => COMMUNITIES.find((c) => c.id === id))
    .filter(Boolean)
    .map((c) => ({
      id: c!.id,
      name: c!.name,
      avatarUrl: c!.avatarUrl,
      category: c!.category,
    }));
}

function lastChannelPreview(c: (typeof COMMUNITIES)[number]) {
  for (const ch of [...c.channels].reverse()) {
    const msgs = channelMsgs[ch.id];
    if (msgs?.length) {
      const last = msgs[msgs.length - 1];
      const sender = usersById.get(last.senderId);
      return {
        channelId: ch.id,
        channelName: ch.name,
        content: last.content ?? '📷 Medya',
        createdAt: last.createdAt,
        senderName: sender?.displayName,
      };
    }
  }
  return null;
}

function withAuthor(p: Post): Post {
  return { ...p, author: toAuthor(usersById.get(p.authorId)) };
}

function toPeer(u: MockUser): Conversation['peer'] {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    isVerifiedStudent: u.isVerifiedStudent,
  };
}

function preview(m?: Message): string | undefined {
  if (!m) return undefined;
  if (m.content) return m.content;
  if (m.mediaUrl) return '📷 Fotoğraf';
  return undefined;
}

function toConversation(c: Conv): Conversation {
  const last = c.msgs[c.msgs.length - 1];
  const peer = c.peerId ? toPeer(usersById.get(c.peerId)!) : undefined;
  return {
    id: c.id,
    type: c.type,
    title: c.title,
    peer,
    lastMessagePreview: preview(last),
    lastMessageAt: last?.createdAt,
    unreadCount: c.unread,
    memberCount: c.type === 'group' ? 5 : 2,
    disappearingSeconds: c.disappearingSeconds,
    createdAt: c.createdAt,
  };
}

// ---- Indeksler (poll/event/eventMeta) ----
interface EventMeta { id: string; title: string; startsAt: string; postId: string }
const eventMeta = new Map<string, EventMeta>();
for (const p of feedPosts) {
  if (p.event) {
    const title = (p.content ?? '').split('\n')[0].slice(0, 48) || 'Etkinlik';
    eventMeta.set(p.event.id, { id: p.event.id, title, startsAt: p.event.startsAt, postId: p.id });
  }
}
function findPoll(pollId: string) {
  for (const p of feedPosts) if (p.poll?.id === pollId) return p.poll;
  return undefined;
}
function findEvent(eventId: string) {
  for (const p of feedPosts) if (p.event?.id === eventId) return p.event;
  return undefined;
}
function findPostById(id: string) {
  return feedPosts.find((p) => p.id === id) ?? reels.find((p) => p.id === id);
}

// ---- Pagination ----
function page<T>(list: T[], cursor: string | null | undefined, size: number) {
  const start = cursor ? parseInt(cursor, 10) || 0 : 0;
  const items = list.slice(start, start + size);
  const nextCursor = start + size < list.length ? String(start + size) : null;
  return { items, nextCursor };
}

// ---- Stories ----
function storyGroups(): StoryGroup[] {
  const byAuthor = new Map<string, Story[]>();
  for (const s of stories) {
    const arr = byAuthor.get(s.authorId) ?? [];
    arr.push(s);
    byAuthor.set(s.authorId, arr);
  }
  const groups: StoryGroup[] = [];
  for (const [authorId, list] of byAuthor) {
    const u = usersById.get(authorId);
    if (!u) continue;
    groups.push({
      author: { id: u.id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl, isVerifiedStudent: u.isVerifiedStudent },
      stories: list,
      hasUnseen: authorId !== ME_ID && list.some((s) => !s.seen),
      isMine: authorId === ME_ID,
    });
  }
  // Kendi hikayem başta
  groups.sort((a, b) => (a.isMine ? -1 : b.isMine ? 1 : 0));
  return groups;
}

// ---- Communities ----
function communityMembers(c: (typeof COMMUNITIES)[number]): CommunityMember[] {
  const ids = new Set<string>([c.ownerId, ...c.members]);
  if (myCommunityStatus.get(c.id) === 'active') ids.add(ME_ID);
  const out: CommunityMember[] = [];
  for (const uid of ids) {
    const u = usersById.get(uid);
    if (!u) continue;
    out.push({
      communityId: c.id,
      userId: uid,
      role: uid === c.ownerId ? 'owner' : uid === ME_ID ? 'member' : 'member',
      status: 'active',
      joinedAt: c.createdAt,
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
    });
  }
  return out;
}

function toCommunity(c: (typeof COMMUNITIES)[number]): Community {
  return {
    id: c.id,
    universityId: c.universityId,
    ownerId: c.ownerId,
    type: c.type,
    name: c.name,
    description: c.description,
    coverUrl: c.coverUrl,
    avatarUrl: c.avatarUrl,
    category: c.category,
    visibility: c.visibility,
    joinMode: c.joinMode,
    memberCount: c.memberCount,
    eventCount: c.eventCount,
    totalEventAttendees: c.totalEventAttendees,
    weeklyGrowth: c.weeklyGrowth,
    activeMemberCount: c.activeMemberCount,
    trendingScore: c.trendingScore,
    createdAt: c.createdAt,
  };
}

const channelUnread: Record<string, number> = { c_acm_duyurular: 2, c_acm_sohbet: 1, c_ai_duyurular: 1, c_kariyer_duyurular: 3 };

function communityDetail(c: (typeof COMMUNITIES)[number]): CommunityDetail {
  const status = myCommunityStatus.get(c.id) ?? 'none';
  const role = c.ownerId === ME_ID ? 'owner' : status === 'active' ? 'member' : null;
  const channels = (c.channels as CommunityChannel[]).map((ch) => {
    const msgs = channelMsgs[ch.id];
    const last = msgs?.length ? msgs[msgs.length - 1] : undefined;
    return {
      ...ch,
      lastMessage: last
        ? {
            content: last.content ?? '📷 Medya',
            senderName: usersById.get(last.senderId)?.displayName,
            createdAt: last.createdAt,
          }
        : undefined,
      unreadCount: channelUnread[ch.id] ?? 0,
    };
  });
  return {
    ...toCommunity(c),
    viewerRole: role,
    viewerStatus: status,
    channels,
  };
}

// ---- Utils ----
const nowIso = () => new Date().toISOString();
const notFound = () => {
  throw new ApiError(404, 'not_found', 'Kaynak bulunamadı (mock)');
};

// ---- Router ----
export async function handleMock<T>(
  method: string,
  rawPath: string,
  body?: unknown,
): Promise<T> {
  const [pathOnly, qs] = rawPath.split('?');
  const seg = pathOnly.split('/').filter(Boolean);
  const q = new URLSearchParams(qs ?? '');
  const b = (body ?? {}) as Record<string, any>;
  const M = method.toUpperCase();

  const me = usersById.get(ME_ID)!;
  const r = (data: unknown) => data as T;

  // ---------- AUTH ----------
  if (seg[0] === 'universities') {
    return r({
      items: [
        { id: UNIVERSITY_ID, name: 'İstanbul Teknik Üniversitesi', shortName: 'İTÜ', city: 'İstanbul', logoUrl: null, domains: ['itu.edu.tr'] },
        { id: 'metu', name: 'Orta Doğu Teknik Üniversitesi', shortName: 'ODTÜ', city: 'Ankara', logoUrl: null, domains: ['metu.edu.tr'] },
        { id: 'boun', name: 'Boğaziçi Üniversitesi', shortName: 'BOUN', city: 'İstanbul', logoUrl: null, domains: ['boun.edu.tr'] },
      ],
    });
  }
  if (seg[0] === 'auth') {
    if (seg[1] === 'send-otp') return r({ sent: true, retryAfter: 30, devCode: '123456' });
    if (seg[1] === 'verify-otp') return r({ verified: true, verificationToken: 'mock-verify-token' });
    if (seg[1] === 'login' || seg[1] === 'refresh') {
      return r({
        accessToken: 'mock-access',
        refreshToken: 'mock-refresh',
        user: { id: me.id, username: me.username, displayName: me.displayName },
      });
    }
    if (seg[1] === '2fa') return r({ enabled: seg[2] === 'enable', otpauthUrl: 'otpauth://x', secret: 'MOCK' });
  }
  if (seg[0] === 'users' && seg[1] === 'register') {
    return r({
      accessToken: 'mock-access',
      refreshToken: 'mock-refresh',
      user: { id: me.id, username: me.username, displayName: me.displayName },
    });
  }

  // ---------- USERS ----------
  if (seg[0] === 'users' && seg[1] === 'me' && seg.length === 2) {
    if (M === 'PATCH') {
      if (typeof b.displayName === 'string') me.displayName = b.displayName;
      if (typeof b.bio === 'string') me.bio = b.bio;
      if (typeof b.careerHeadline === 'string') me.careerHeadline = b.careerHeadline;
      if (b.accountVisibility) me.accountVisibility = b.accountVisibility;
      return r({ user: toProfileUser(me) });
    }
    return r({ user: toProfileUser(me), preferences: prefs, academic: { userId: ME_ID, ...academicOf(me), gpa: me.gpa != null ? String(me.gpa) : null, fieldVisibility: 'public' }, featuredCommunities: featuredCommunitiesOf(me), myCommunityIds: myCommunityIds() });
  }
  if (seg[0] === 'users' && seg[1] === 'me' && seg[2] === 'featured-communities') {
    const ids = Array.isArray(b.communityIds) ? (b.communityIds as string[]) : [];
    const allowed = new Set(myCommunityIds());
    me.featuredCommunityIds = ids.filter((id) => allowed.has(id)).slice(0, 6);
    return r({ featuredCommunities: featuredCommunitiesOf(me) });
  }
  if (seg[0] === 'users' && seg[1] === 'me' && seg[2] === 'academic') {
    if (typeof b.faculty === 'string') me.faculty = b.faculty;
    if (typeof b.department === 'string') me.department = b.department;
    if (typeof b.classYear === 'number') me.classYear = b.classYear;
    if (typeof b.gpa === 'number') me.gpa = b.gpa;
    if (typeof b.graduationYear === 'number') me.graduationYear = b.graduationYear;
    return r({ academic: { userId: ME_ID, ...academicOf(me), gpa: me.gpa != null ? String(me.gpa) : null, fieldVisibility: 'public' } });
  }
  if (seg[0] === 'users' && seg[1] === 'me' && seg[2] === 'preferences') {
    Object.assign(prefs, b);
    return r({ preferences: prefs });
  }
  if (seg[0] === 'users' && seg[1] === 'me' && seg[2] === 'status') {
    if ('statusText' in b) me.statusText = b.statusText ?? undefined;
    if ('statusEmoji' in b) me.statusEmoji = b.statusEmoji ?? undefined;
    return r({ statusText: me.statusText, statusEmoji: me.statusEmoji });
  }
  // follow / connections
  if (seg[0] === 'users' && seg[2] === 'follow') return r(M === 'DELETE' ? { success: true } : { status: 'active' });
  if (seg[0] === 'follow-requests') {
    if (seg.length === 1) {
      const items = [...pendingFollowRequests].map((followerId) => {
        const u = usersById.get(followerId)!;
        const req = FOLLOW_REQUESTS.find((r) => r.followerId === followerId);
        return {
          followerId,
          username: u.username,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
          createdAt: req?.createdAt ?? nowIso(),
        };
      });
      return r({ items });
    }
    const followerId = seg[1];
    if (seg[2] === 'accept') {
      pendingFollowRequests.delete(followerId);
      const u = usersById.get(followerId);
      if (u) me.followerCount += 1;
      return r({ success: true });
    }
    if (seg[2] === 'reject') {
      pendingFollowRequests.delete(followerId);
      return r({ success: true });
    }
    return r({ success: true });
  }
  if (seg[0] === 'connections') {
    if (seg[1] === 'request') return r({ status: 'pending' });
    if (seg[1] === 'requests') return r({ items: [] });
    if (seg[1] === 'suggestions') return r({ items: SUGGESTIONS.map((s) => ({ ...s, reason: 'Önerilen' })) });
    return r({ success: true });
  }
  // GET /users/:id/posts
  if (seg[0] === 'users' && seg.length === 3 && seg[2] === 'posts') {
    const u = usersById.get(seg[1]) ?? usersByName.get(seg[1]);
    const uid = u?.id ?? seg[1];
    const list = feedPosts.filter((p) => p.authorId === uid).map(withAuthor);
    return r({ items: list });
  }
  // GET /users/:username
  if (seg[0] === 'users' && seg.length === 2) {
    const u = usersByName.get(seg[1]) ?? usersById.get(seg[1]);
    if (!u) notFound();
    return r({ user: toProfileUser(u!), academic: academicOf(u!), featuredCommunities: featuredCommunitiesOf(u!) });
  }

  // ---------- FEED / POSTS ----------
  if (seg[0] === 'feed') {
    const { items, nextCursor } = page(feedPosts, q.get('cursor'), 8);
    const feedItems: any[] = items.map((p) => ({ type: 'post', post: withAuthor(p) }));
    if (!q.get('cursor') && feedItems.length > 3) {
      feedItems.splice(3, 0, {
        type: 'ad',
        campaignId: 'ad1',
        mediaUrl: IMG.grad,
        ctaText: 'İTÜ Kariyer Günleri · Kayıt Ol',
        targetUrl: 'https://kariyer.itu.edu.tr',
      });
    }
    return r({ items: feedItems, nextCursor });
  }
  if (seg[0] === 'posts' && seg.length === 1 && M === 'POST') {
    const mediaUrls: string[] = Array.isArray(b.mediaUrls) ? b.mediaUrls : [];
    const post: Post = {
      id: `pnew${Date.now()}`,
      universityId: UNIVERSITY_ID,
      authorId: ME_ID,
      type: b.type ?? 'post',
      contentDomain: 'social',
      content: b.content,
      mediaUrls,
      media: mediaUrls.map((u: string) => ({ type: 'image' as const, url: u })),
      visibility: b.visibility ?? 'public',
      likeCount: 0,
      commentCount: 0,
      likedByMe: false,
      savedByMe: false,
      createdAt: nowIso(),
    };
    feedPosts.unshift(post);
    return r({ post: withAuthor(post) });
  }
  if (seg[0] === 'posts' && seg[2] === 'like') {
    const p = findPostById(seg[1]);
    if (p) {
      if (M === 'DELETE') {
        if (p.likedByMe) p.likeCount = Math.max(0, p.likeCount - 1);
        p.likedByMe = false;
      } else {
        if (!p.likedByMe) p.likeCount += 1;
        p.likedByMe = true;
      }
    }
    return r({ liked: M !== 'DELETE' });
  }
  if (seg[0] === 'posts' && seg[2] === 'comments') {
    if (M === 'POST') {
      const c: Comment = {
        id: cid(),
        postId: seg[1],
        authorId: ME_ID,
        content: String(b.content ?? ''),
        likeCount: 0,
        createdAt: nowIso(),
      };
      (commentsByPost[seg[1]] ??= []).push(c);
      const p = findPostById(seg[1]);
      if (p) p.commentCount += 1;
      return r({ comment: { ...c, author: toAuthor(me) } });
    }
    const list = (commentsByPost[seg[1]] ?? []).map((c) => ({ ...c, author: toAuthor(usersById.get(c.authorId)) }));
    return r({ items: list, nextCursor: null });
  }
  if (seg[0] === 'posts' && seg.length === 2) {
    const p = findPostById(seg[1]);
    if (!p) notFound();
    return r({ post: withAuthor(p!) });
  }
  if (seg[0] === 'trending') return r({ items: HASHTAGS.slice(0, 8) });
  if (seg[0] === 'trend-topics') return r({ items: TREND_TOPICS });

  // ---------- POLLS ----------
  if (seg[0] === 'polls' && seg[2] === 'vote') {
    const poll = findPoll(seg[1]);
    if (poll && !poll.myVotes.length) {
      const ids: string[] = b.optionIds ?? [];
      for (const oid of ids) {
        const opt = poll.options.find((o) => o.id === oid);
        if (opt) {
          opt.voteCount += 1;
          poll.totalVotes += 1;
          poll.myVotes.push(oid);
        }
      }
    }
    return r({ poll });
  }
  if (seg[0] === 'polls' && seg.length === 2) return r({ poll: findPoll(seg[1]) });

  // ---------- EVENTS ----------
  if (seg[0] === 'events' && seg[2] === 'join') {
    const ev = findEvent(seg[1]);
    if (ev && ev.myStatus !== 'joined') {
      ev.myStatus = 'joined';
      ev.participantCount += 1;
      ev.attendees = [
        { id: me.id, displayName: me.displayName, username: me.username, avatarUrl: me.avatarUrl },
        ...(ev.attendees ?? []).filter((a) => a.id !== me.id),
      ];
    }
    return r({ status: 'joined' });
  }
  if (seg[0] === 'events' && seg[2] === 'leave') {
    const ev = findEvent(seg[1]);
    if (ev && ev.myStatus === 'joined') {
      ev.myStatus = null;
      ev.participantCount = Math.max(0, ev.participantCount - 1);
      ev.attendees = (ev.attendees ?? []).filter((a) => a.id !== me.id);
    }
    return r({ success: true });
  }
  if (seg[0] === 'events' && seg.length === 2) return r({ event: findEvent(seg[1]) });

  // ---------- STORIES ----------
  if (seg[0] === 'stories' && seg.length === 1) {
    if (M === 'POST') {
      const s: Story = {
        id: `snew${Date.now()}`,
        authorId: ME_ID,
        mediaUrl: String(b.mediaUrl ?? IMG.coffee),
        caption: b.caption,
        audience: b.audience ?? 'public',
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        createdAt: nowIso(),
        seen: true,
        viewCount: 0,
      };
      stories.unshift(s);
      return r({ story: s });
    }
    return r({ items: storyGroups() });
  }
  if (seg[0] === 'stories' && seg[1] === 'user') {
    return r({ items: stories.filter((s) => s.authorId === seg[2]) });
  }
  if (seg[0] === 'stories' && seg[2] === 'view') {
    const s = stories.find((x) => x.id === seg[1]);
    if (s) s.seen = true;
    return r({ seen: true });
  }
  if (seg[0] === 'stories' && seg.length === 2 && M === 'DELETE') {
    const i = stories.findIndex((x) => x.id === seg[1]);
    if (i >= 0) stories.splice(i, 1);
    return r({ success: true });
  }
  if (seg[0] === 'close-friends') {
    if (seg.length === 1) {
      return r({
        items: [...closeFriends].map((id) => {
          const u = usersById.get(id)!;
          return { userId: id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl };
        }),
      });
    }
    if (M === 'DELETE') { closeFriends.delete(seg[1]); return r({ removed: true }); }
    closeFriends.add(seg[1]);
    return r({ added: true });
  }

  // ---------- REELS ----------
  if (seg[0] === 'reels') {
    if (M === 'POST') {
      const reel: Post = {
        id: `rnew${Date.now()}`,
        universityId: UNIVERSITY_ID,
        authorId: ME_ID,
        type: 'post',
        contentDomain: 'social',
        content: b.caption,
        mediaUrls: [IMG.laptopCode],
        media: [{ type: 'video', url: String(b.mediaUrl ?? ''), poster: IMG.laptopCode, durationSec: 20 }],
        visibility: 'public',
        likeCount: 0,
        commentCount: 0,
        createdAt: nowIso(),
      };
      reels.unshift(reel);
      return r({ reel: withAuthor(reel) });
    }
    const { items, nextCursor } = page(reels, q.get('cursor'), 5);
    return r({ items: items.map(withAuthor), nextCursor });
  }

  // ---------- SEARCH / EXPLORE ----------
  if (seg[0] === 'search') {
    const term = (q.get('q') ?? '').toLowerCase().trim();
    const type = q.get('type') ?? 'all';
    const matchUser = (u: MockUser) =>
      u.displayName.toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term) ||
      (u.department ?? '').toLowerCase().includes(term) ||
      (u.careerHeadline ?? '').toLowerCase().includes(term);
    const users = type === 'all' || type === 'user' ? USERS.filter(matchUser).slice(0, 12).map((u) => ({
      id: u.id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl,
      careerHeadline: u.careerHeadline, isVerifiedStudent: u.isVerifiedStudent, type: u.type,
    })) : [];
    const hashtags = type === 'all' || type === 'hashtag' ? HASHTAGS.filter((h) => h.tag.toLowerCase().includes(term)).slice(0, 10) : [];
    const events = type === 'all' || type === 'event' ? [...eventMeta.values()].filter((e) => e.title.toLowerCase().includes(term) || term.length < 2).slice(0, 8) : [];
    const posts = type === 'all'
      ? feedPosts.filter((p) => (p.content ?? '').toLowerCase().includes(term)).slice(0, 12).map(withAuthor)
      : [];
    return r({ users, hashtags, events, posts });
  }
  if (seg[0] === 'explore') {
    const suggestedUsers = USERS.filter((u) => u.id !== ME_ID && u.type === 'student').slice(0, 8).map((u) => ({
      id: u.id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl,
      careerHeadline: u.careerHeadline, isVerifiedStudent: u.isVerifiedStudent, type: u.type,
    }));
    // Keşfet: medyası olan gönderiler öne (Instagram grid hissi)
    const visual = feedPosts.filter((p) => (p.media?.length ?? 0) > 0);
    const { items, nextCursor } = page(visual, q.get('cursor'), 12);
    return r({ suggestedUsers, posts: items.map(withAuthor), nextCursor });
  }

  if (seg[0] === 'communities' && seg[1] === 'mine' && seg[2] === 'hub') {
    const mine = COMMUNITIES.filter((c) => myCommunityStatus.get(c.id) === 'active' || c.members.includes(ME_ID));
    const items = mine.map((c) => ({
      community: toCommunity(c),
      lastMessage: lastChannelPreview(c),
      unreadCount: c.id === 'c_acm' ? 3 : c.id === 'c_ai' ? 1 : 0,
    }));
    return r({ items });
  }
  if (seg[0] === 'communities' && seg[1] === 'mine' && seg[2] === 'feed') {
    const memberIds = new Set<string>();
    for (const c of COMMUNITIES) {
      if (myCommunityStatus.get(c.id) !== 'active' && !c.members.includes(ME_ID)) continue;
      memberIds.add(c.ownerId);
      for (const m of c.members) memberIds.add(m);
    }
    const items = feedPosts.filter((p) => memberIds.has(p.authorId) || p.type === 'event').slice(0, 20).map((p) => ({ type: 'post' as const, post: withAuthor(p) }));
    return r({ items });
  }

  // ---------- COMMUNITIES ----------
  if (seg[0] === 'communities' && seg.length === 1) {
    if (M === 'POST') {
      const created = {
        ...COMMUNITIES[0],
        id: `cnew${Date.now()}`,
        ownerId: ME_ID,
        name: String(b.name ?? 'Yeni Topluluk'),
        description: b.description,
        category: b.category,
        visibility: b.visibility ?? 'public',
        joinMode: b.joinMode ?? 'request',
        memberCount: 1,
        eventCount: 0,
        totalEventAttendees: 0,
        weeklyGrowth: 0,
        activeMemberCount: 1,
        trendingScore: 0,
        members: [ME_ID],
        createdAt: nowIso(),
      } as (typeof COMMUNITIES)[number];
      COMMUNITIES.unshift(created);
      myCommunityStatus.set(created.id, 'active');
      return r({ community: toCommunity(created) });
    }
    let list = COMMUNITIES.map(toCommunity);
    if (q.get('mine') === 'true') {
      list = list.filter((c) => myCommunityStatus.get(c.id) === 'active');
    }
    if (q.get('sort') === 'trending') {
      list = [...list].sort((a, b2) => (b2.trendingScore ?? 0) - (a.trendingScore ?? 0));
    }
    const cat = q.get('category');
    if (cat && cat !== 'all') list = list.filter((c) => c.category === cat);
    const { items, nextCursor } = page(list, q.get('cursor'), 20);
    return r({ items, nextCursor });
  }
  if (seg[0] === 'communities' && seg.length === 2) {
    const c = COMMUNITIES.find((x) => x.id === seg[1]);
    if (!c) notFound();
    return r({ community: communityDetail(c!) });
  }
  if (seg[0] === 'communities' && seg[2] === 'join') {
    const c = COMMUNITIES.find((x) => x.id === seg[1]);
    if (!c) notFound();
    if (c!.joinMode === 'open') { myCommunityStatus.set(c!.id, 'active'); c!.memberCount += 1; return r({ status: 'active' }); }
    myCommunityStatus.set(c!.id, 'pending');
    return r({ status: 'pending' });
  }
  if (seg[0] === 'communities' && seg[2] === 'leave') {
    const c = COMMUNITIES.find((x) => x.id === seg[1]);
    if (c && myCommunityStatus.get(c.id) === 'active') c.memberCount = Math.max(0, c.memberCount - 1);
    myCommunityStatus.delete(seg[1]);
    return r({ status: 'left' });
  }
  if (seg[0] === 'communities' && seg[2] === 'members') {
    const c = COMMUNITIES.find((x) => x.id === seg[1]);
    return r({ items: c ? communityMembers(c) : [] });
  }
  if (seg[0] === 'communities' && seg[2] === 'posts') {
    const c = COMMUNITIES.find((x) => x.id === seg[1]);
    if (!c) return r({ items: [], nextCursor: null });
    const memberIds = new Set<string>([c.ownerId, ...c.members]);
    const list = feedPosts.filter((p) => memberIds.has(p.authorId));
    const { items, nextCursor } = page(list, q.get('cursor'), 10);
    return r({ items: items.map(withAuthor), nextCursor });
  }
  if (seg[0] === 'communities' && seg[2] === 'requests') {
    return r({ items: [] });
  }
  if (seg[0] === 'communities' && seg[2] === 'channels') {
    const c = COMMUNITIES.find((x) => x.id === seg[1]);
    const ch: CommunityChannel = {
      id: `${seg[1]}_${Date.now()}`, communityId: seg[1], name: String(b.name ?? 'kanal'),
      description: b.description, position: (c?.channels.length ?? 0), isDefault: false, type: 'text',
      writeMinRole: 'member', slowModeSeconds: 0, createdAt: nowIso(),
    };
    c?.channels.push(ch);
    return r({ channel: ch });
  }
  if (seg[0] === 'communities' && seg[2] === 'invites') {
    return r({ invite: { token: 'mock-token', url: 'https://unicampus.app/join/mock-token', useCount: 0, maxUses: undefined, expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString() } });
  }
  if (seg[0] === 'join' && seg.length === 2) {
    return r({ communityId: COMMUNITIES[0].id, status: 'active' });
  }
  if (seg[0] === 'channels' && seg[2] === 'messages') {
    if (M === 'POST') {
      const msg = { id: `chm${++chseq}`, senderId: ME_ID, content: b.content, mediaUrl: b.mediaUrl, createdAt: nowIso() };
      (channelMsgs[seg[1]] ??= []).push(msg);
      return r({ message: { ...msg, channelId: seg[1], communityId: seg[1].split('_')[0], mine: true, sender: { username: me.username, displayName: me.displayName, avatarUrl: me.avatarUrl } } });
    }
    const list = (channelMsgs[seg[1]] ?? []).map((m) => {
      const u = usersById.get(m.senderId);
      return {
        id: m.id, channelId: seg[1], communityId: seg[1].split('_')[0], senderId: m.senderId,
        content: m.content, mediaUrl: m.mediaUrl, createdAt: m.createdAt, mine: m.senderId === ME_ID,
        sender: u ? { username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl } : undefined,
      };
    });
    return r({ items: list, nextCursor: null });
  }

  // ---------- MESSAGING ----------
  if (seg[0] === 'conversations' && seg.length === 1) {
    if (M === 'POST') {
      const memberIds: string[] = b.memberIds ?? [];
      const peerId = memberIds[0];
      const existing = conversations.find((c) => c.type === 'dm' && c.peerId === peerId);
      if (existing) return r({ conversation: toConversation(existing) });
      const conv: Conv = { id: `cvnew${Date.now()}`, type: b.type ?? 'dm', peerId, title: b.title, unread: 0, disappearingSeconds: 0, msgs: [], createdAt: nowIso() };
      conversations.unshift(conv);
      return r({ conversation: toConversation(conv) });
    }
    const sorted = [...conversations].sort((a, b2) => {
      const ta = a.msgs[a.msgs.length - 1]?.createdAt ?? a.createdAt;
      const tb = b2.msgs[b2.msgs.length - 1]?.createdAt ?? b2.createdAt;
      return new Date(tb).getTime() - new Date(ta).getTime();
    });
    return r({ items: sorted.map(toConversation) });
  }
  if (seg[0] === 'conversations' && seg[2] === 'messages') {
    const conv = conversations.find((c) => c.id === seg[1]);
    if (!conv) notFound();
    if (M === 'POST') {
      const msg: Message = {
        id: `msg${++mseq}`, conversationId: conv!.id, senderId: ME_ID,
        content: b.content, mediaUrl: b.mediaUrl, viewOnce: b.viewOnce,
        createdAt: nowIso(), mine: true, readByPeer: false,
      };
      conv!.msgs.push(msg);
      // Karşı taraftan otomatik kısa yanıt (canlı his)
      maybeAutoReply(conv!);
      return r({ message: msg });
    }
    return r({ items: conv!.msgs, nextCursor: null });
  }
  if (seg[0] === 'conversations' && seg[2] === 'read') {
    const conv = conversations.find((c) => c.id === seg[1]);
    if (conv) conv.unread = 0;
    return r({ readAt: nowIso() });
  }
  if (seg[0] === 'conversations' && seg[2] === 'disappearing') {
    const conv = conversations.find((c) => c.id === seg[1]);
    if (conv) conv.disappearingSeconds = Number(b.seconds ?? 0);
    return r({ disappearingSeconds: conv?.disappearingSeconds ?? 0 });
  }
  if (seg[0] === 'messages' && seg[2] === 'view') {
    for (const c of conversations) {
      const m = c.msgs.find((x) => x.id === seg[1]);
      if (m) { m.viewed = true; return r({ mediaUrl: m.mediaUrl, content: m.content }); }
    }
    return r({});
  }
  if (seg[0] === 'devices') return r({ success: true });

  // ---------- CAREER ----------
  if (seg[0] === 'career') {
    if (seg[1] === 'users' && seg[3] === 'projects') return r({ items: PROJECTS[seg[2]] ?? [] });
    if (seg[1] === 'users' && seg[3] === 'milestones') return r({ items: MILESTONES[seg[2]] ?? [] });
    if (seg[1] === 'projects' && seg.length === 3) {
      for (const [uid, list] of Object.entries(PROJECTS)) {
        const pr = list.find((x) => x.id === seg[2]);
        if (pr) return r({ project: pr, author: toAuthor(usersById.get(uid)) });
      }
      notFound();
    }
    if (seg[1] === 'milestones' && seg[3] === 'congrats') {
      for (const list of Object.values(MILESTONES)) {
        const m = list.find((x) => x.id === seg[2]);
        if (m) {
          m.congratulatedByMe = !m.congratulatedByMe;
          m.congratsCount += m.congratulatedByMe ? 1 : -1;
          return r({ congratsCount: m.congratsCount, congratulated: m.congratulatedByMe });
        }
      }
      return r({ congratsCount: 0, congratulated: false });
    }
    if (seg[1] === 'opportunities') {
      if (M === 'POST') return r({ moderation: 'pending', message: 'İlanın moderasyona alındı.' });
      return r({ items: OPPORTUNITIES });
    }
    if (seg[1] === 'projects' && M === 'POST') return r({ project: { id: `prnew${Date.now()}`, ...b, techTags: b.techTags ?? [] }, postId: `pnew${Date.now()}` });
    if (seg[1] === 'milestones' && M === 'POST') return r({ postId: `pnew${Date.now()}` });
  }

  // ---------- DEALS / ADS ----------
  if (seg[0] === 'deals') {
    if (seg.length === 1) {
      const cat = q.get('category');
      const items = cat ? DEALS.filter((d) => d.category === cat) : DEALS;
      return r({ items });
    }
    if (seg[2] === 'reveal') return r({ discountCode: 'ITU-' + seg[1].toUpperCase() + '-26', sponsorUrl: 'https://example.com' });
    if (seg[2] === 'click') return r({ url: 'https://example.com' });
  }
  if (seg[0] === 'ads') return r({});

  // ---------- REPORTS ----------
  if (seg[0] === 'reports') {
    return r({ report: { id: `rep${Date.now()}`, targetType: b.targetType, targetId: b.targetId, reason: b.reason, status: 'open', createdAt: nowIso() } });
  }

  // Bilinmeyen uç
  throw new ApiError(404, 'not_found', `Mock uç bulunamadı: ${M} ${pathOnly}`);
}

// Mesaja otomatik yanıt — sohbet canlı hissettirir.
const AUTO_REPLIES = ['Süper 👍', 'Tamamdır!', 'Haha aynen 😄', 'Birazdan dönerim', 'Görüşürüz 🙌', 'Çok iyi olur'];
function maybeAutoReply(conv: Conv) {
  if (conv.type !== 'dm' || !conv.peerId) return;
  const text = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
  setTimeout(() => {
    conv.msgs.push({
      id: `msg${++mseq}`,
      conversationId: conv.id,
      senderId: conv.peerId!,
      content: text,
      createdAt: new Date().toISOString(),
      mine: false,
      readByPeer: false,
    });
  }, 2500);
}
