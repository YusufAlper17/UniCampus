// UniCampus — İTÜ odaklı zengin demo verisi.
// Bu dosya backend.ts tarafından okunur ve bellek-içi sahte API'yi besler.
// Amaç: uygulama gerçek bir backend olmadan "kullanılıyormuş" gibi hissettirsin.

import type {
  Comment,
  Community,
  CommunityChannel,
  CommunityMember,
  Conversation,
  Deal,
  EventData,
  MediaItem,
  Message,
  PollData,
  Post,
  Story,
} from '@unicampus/shared-types';

export const UNIVERSITY_ID = 'itu';
export const UNIVERSITY_NAME = 'İstanbul Teknik Üniversitesi';

// ---- Medya yardımcıları ----
const img = (id: string, w = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;
const av = (n: number) => `https://i.pravatar.cc/300?img=${n}`;

export const IMG = {
  grad: img('1523050854058-8df90110c9f1'),
  library: img('1521587760476-6c12a4b040da'),
  studyGroup: img('1522202176988-66273c2fd55f'),
  laptopCode: img('1517694712202-14dd9538aa97'),
  codeScreen: img('1555066931-4365d14bab8c'),
  hackathon: img('1531482615713-2afd69097998'),
  robot: img('1485827404703-89b55fcc595e'),
  circuit: img('1518770660439-4636190af475'),
  basketball: img('1546519638-68e109498ffc'),
  soccer: img('1431324155629-1a6deb1dec8d'),
  sailing: img('1505118380757-91f5f5632de0'),
  sea: img('1500627964684-141351970a7f'),
  mountain: img('1551632811-561732d1e306'),
  camp: img('1504280390367-361c6d9f38f4'),
  sunset: img('1506744038136-46273834b3fb'),
  concert: img('1459749411175-04bf5292ceea'),
  festival: img('1470229722913-7c0e2dbbafd3'),
  coffee: img('1495474472287-4d71bcdd2085'),
  burger: img('1568901346375-23c9450c58cd'),
  dessert: img('1551024601-bec78aea704b'),
  cat: img('1514888286974-6c03e2ca1dba'),
  cat2: img('1592194996308-7b43878e84a6'),
  books: img('1512820790803-83ca734da794'),
  chess: img('1529699211952-734e80c4d42b'),
  racecar: img('1552519507-da3b142c6e3d'),
  istanbul: img('1541432901042-2d8bd64b4a9b'),
  istanbul2: img('1524231757912-21f4fe3a7200'),
  theater: img('1503095396549-807759245b35'),
  camera: img('1502920917128-1aa500764cbd'),
  math: img('1635070041078-e363dbe005cb'),
  presentation: img('1505373877841-8d25f7d46678'),
  guitar: img('1510915361894-db8b60106cb1'),
  art: img('1513364776144-60967b0f800f'),
  drone: img('1473968512647-3e447244af8f'),
  street: img('1567620905732-2d1ec7ab7445'),
  cityNight: img('1480714378408-67cf0d13bc1b'),
  park: img('1441974231531-c6227db76b6e'),
  gym: img('1534438327276-14e5300c3a48'),
  party: img('1492684223066-81342ee5ff30'),
  rocket: img('1541185933-ef5d8ed016c2'),
  plane: img('1436491865332-7a61a109cc05'),
} as const;

const VID = {
  blazes: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  bunny: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  dream: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  fun: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  joy: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  escapes: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  sintel: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  steel: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
} as const;

// ---- Zaman yardımcıları ----
const NOW = Date.now();
const min = (m: number) => new Date(NOW - m * 60_000).toISOString();
const hrs = (h: number) => new Date(NOW - h * 3_600_000).toISOString();
const days = (d: number) => new Date(NOW - d * 86_400_000).toISOString();
const inDays = (d: number) => new Date(NOW + d * 86_400_000).toISOString();
const inHrs = (h: number) => new Date(NOW + h * 3_600_000).toISOString();

// ---- Kullanıcılar ----
export interface MockUser {
  id: string;
  type: 'student' | 'club' | 'team' | 'admin' | 'super_admin';
  username: string;
  displayName: string;
  avatarUrl: string;
  bio?: string;
  careerHeadline?: string;
  accountVisibility: 'public' | 'private';
  isVerifiedStudent: boolean;
  isVerifiedOrg: boolean;
  followerCount: number;
  followingCount: number;
  connectionCount: number;
  postCount: number;
  statusText?: string;
  statusEmoji?: string;
  faculty?: string;
  department?: string;
  classYear?: number;
  gpa?: number;
  graduationYear?: number;
  /** Profilde gösterilecek topluluklar (üye olunanlardan seçilir). */
  featuredCommunityIds?: string[];
  createdAt: string;
}

export const ME_ID = 'u_me';

export const USERS: MockUser[] = [
  {
    id: ME_ID,
    type: 'student',
    username: 'yusufalper',
    displayName: 'Yusuf Alper',
    avatarUrl: av(12),
    bio: 'Bilgisayar Müh. 3. sınıf · React Native & yapay zeka · İTÜ ACM',
    careerHeadline: 'Bilgisayar Mühendisliği Öğrencisi',
    accountVisibility: 'public',
    isVerifiedStudent: true,
    isVerifiedOrg: false,
    followerCount: 842,
    followingCount: 391,
    connectionCount: 214,
    postCount: 0,
    statusText: 'Bitirme projesi modunda',
    statusEmoji: '💻',
    faculty: 'Bilgisayar ve Bilişim Fakültesi',
    department: 'Bilgisayar Mühendisliği',
    classYear: 3,
    gpa: 3.42,
    graduationYear: 2027,
    featuredCommunityIds: ['c_acm', 'c_oyun', 'c_giris'],
    createdAt: days(420),
  },
  {
    id: 'u_zeynep',
    type: 'student',
    username: 'zeynepkaya',
    displayName: 'Zeynep Kaya',
    avatarUrl: av(5),
    bio: 'Yapay zekâ ile uğraşıyorum 🤖 · İTÜ ACM yönetim',
    careerHeadline: 'AI/ML Öğrencisi · İTÜ ACM',
    accountVisibility: 'public',
    isVerifiedStudent: true,
    isVerifiedOrg: false,
    followerCount: 3120,
    followingCount: 412,
    connectionCount: 530,
    postCount: 0,
    statusText: 'Vize haftası 😭',
    statusEmoji: '☕',
    faculty: 'Bilgisayar ve Bilişim Fakültesi',
    department: 'Bilgisayar Mühendisliği',
    classYear: 3,
    gpa: 3.78,
    graduationYear: 2027,
    featuredCommunityIds: ['c_acm', 'c_oyun'],
    createdAt: days(500),
  },
  {
    id: 'u_mert',
    type: 'student',
    username: 'mertdemir',
    displayName: 'Mert Demir',
    avatarUrl: av(13),
    bio: 'Gömülü sistemler & PCB tasarımı · İTÜRO',
    careerHeadline: 'Elektronik & Haberleşme Müh.',
    accountVisibility: 'public',
    isVerifiedStudent: true,
    isVerifiedOrg: false,
    followerCount: 1840,
    followingCount: 220,
    connectionCount: 340,
    postCount: 0,
    faculty: 'Elektrik-Elektronik Fakültesi',
    department: 'Elektronik ve Haberleşme Mühendisliği',
    classYear: 4,
    gpa: 3.21,
    graduationYear: 2026,
    createdAt: days(610),
  },
  {
    id: 'u_elif',
    type: 'student',
    username: 'elifsahin',
    displayName: 'Elif Şahin',
    avatarUrl: av(9),
    bio: 'Maket & 3B modelleme · Taşkışla yerlisi 🏛️',
    careerHeadline: 'Mimarlık Öğrencisi',
    accountVisibility: 'public',
    isVerifiedStudent: true,
    isVerifiedOrg: false,
    followerCount: 2260,
    followingCount: 510,
    connectionCount: 190,
    postCount: 0,
    statusText: 'Stüdyo teslimi var',
    statusEmoji: '✏️',
    faculty: 'Mimarlık Fakültesi',
    department: 'Mimarlık',
    classYear: 2,
    gpa: 3.55,
    graduationYear: 2028,
    createdAt: days(330),
  },
  {
    id: 'u_can',
    type: 'student',
    username: 'canyildiz',
    displayName: 'Can Yıldız',
    avatarUrl: av(33),
    bio: 'ARI Takımı · Güneş arabası ARIBA aero ekibi ☀️🏎️',
    careerHeadline: 'Makine Müh. · ARI Takımı',
    accountVisibility: 'public',
    isVerifiedStudent: true,
    isVerifiedOrg: false,
    followerCount: 1530,
    followingCount: 300,
    connectionCount: 410,
    postCount: 0,
    faculty: 'Makine Fakültesi',
    department: 'Makine Mühendisliği',
    classYear: 4,
    gpa: 3.10,
    graduationYear: 2026,
    createdAt: days(700),
  },
  {
    id: 'u_ada',
    type: 'student',
    username: 'adacelik',
    displayName: 'Ada Çelik',
    avatarUrl: av(16),
    bio: 'Veri & optimizasyon · kahve bağımlısı',
    careerHeadline: 'Endüstri Mühendisliği',
    accountVisibility: 'public',
    isVerifiedStudent: true,
    isVerifiedOrg: false,
    followerCount: 980,
    followingCount: 260,
    connectionCount: 175,
    postCount: 0,
    faculty: 'İşletme Fakültesi',
    department: 'Endüstri Mühendisliği',
    classYear: 3,
    gpa: 3.66,
    graduationYear: 2027,
    createdAt: days(280),
  },
  {
    id: 'u_burak',
    type: 'student',
    username: 'burakaydin',
    displayName: 'Burak Aydın',
    avatarUrl: av(51),
    bio: 'İTÜ Rover Team · otonom sistemler 🛰️',
    careerHeadline: 'Uçak-Uzay Müh. · Rover Team',
    accountVisibility: 'public',
    isVerifiedStudent: true,
    isVerifiedOrg: false,
    followerCount: 2010,
    followingCount: 180,
    connectionCount: 295,
    postCount: 0,
    faculty: 'Uçak ve Uzay Bilimleri Fakültesi',
    department: 'Uzay Mühendisliği',
    classYear: 4,
    gpa: 3.34,
    graduationYear: 2026,
    createdAt: days(640),
  },
  {
    id: 'u_selin',
    type: 'student',
    username: 'selinarslan',
    displayName: 'Selin Arslan',
    avatarUrl: av(20),
    bio: 'İTÜ Girişimcilik · startup tutkunu 🚀',
    careerHeadline: 'İşletme Müh. Öğrencisi',
    accountVisibility: 'public',
    isVerifiedStudent: true,
    isVerifiedOrg: false,
    followerCount: 1670,
    followingCount: 620,
    connectionCount: 380,
    postCount: 0,
    faculty: 'İşletme Fakültesi',
    department: 'İşletme Mühendisliği',
    classYear: 2,
    gpa: 3.48,
    graduationYear: 2028,
    createdAt: days(250),
  },
  {
    id: 'u_deniz',
    type: 'student',
    username: 'denizkoc',
    displayName: 'Deniz Koç',
    avatarUrl: av(60),
    bio: 'Tuzla kampüsü · yelken & gemi tasarımı ⛵',
    careerHeadline: 'Gemi İnşaatı ve Gemi Makineleri Müh.',
    accountVisibility: 'public',
    isVerifiedStudent: true,
    isVerifiedOrg: false,
    followerCount: 720,
    followingCount: 210,
    connectionCount: 130,
    postCount: 0,
    faculty: 'Gemi İnşaatı ve Deniz Bilimleri Fakültesi',
    department: 'Gemi İnşaatı ve Gemi Makineleri Mühendisliği',
    classYear: 3,
    gpa: 2.95,
    graduationYear: 2027,
    createdAt: days(390),
  },
  {
    id: 'u_ece',
    type: 'student',
    username: 'eceyilmaz',
    displayName: 'Ece Yılmaz',
    avatarUrl: av(24),
    bio: 'Kuantum meraklısı · 1. sınıf · her şeye açığım ✨',
    careerHeadline: 'Fizik Mühendisliği',
    accountVisibility: 'public',
    isVerifiedStudent: true,
    isVerifiedOrg: false,
    followerCount: 410,
    followingCount: 340,
    connectionCount: 60,
    postCount: 0,
    faculty: 'Fen-Edebiyat Fakültesi',
    department: 'Fizik Mühendisliği',
    classYear: 1,
    gpa: 3.20,
    graduationYear: 2029,
    createdAt: days(120),
  },
  {
    id: 'u_kerem',
    type: 'student',
    username: 'keremoz',
    displayName: 'Kerem Öz',
    avatarUrl: av(56),
    bio: 'Dağcılık & kamp · İTÜDAK · zirve peşinde 🏔️',
    careerHeadline: 'İnşaat Mühendisliği',
    accountVisibility: 'public',
    isVerifiedStudent: true,
    isVerifiedOrg: false,
    followerCount: 1260,
    followingCount: 430,
    connectionCount: 205,
    postCount: 0,
    faculty: 'İnşaat Fakültesi',
    department: 'İnşaat Mühendisliği',
    classYear: 4,
    gpa: 3.05,
    graduationYear: 2026,
    createdAt: days(560),
  },
  {
    id: 'u_irem',
    type: 'student',
    username: 'iremcetin',
    displayName: 'İrem Çetin',
    avatarUrl: av(32),
    bio: 'Fotoğraf & video · İTÜ Fotoğrafçılık 📷',
    careerHeadline: 'Moleküler Biyoloji ve Genetik',
    accountVisibility: 'public',
    isVerifiedStudent: true,
    isVerifiedOrg: false,
    followerCount: 3340,
    followingCount: 280,
    connectionCount: 150,
    postCount: 0,
    faculty: 'Fen-Edebiyat Fakültesi',
    department: 'Moleküler Biyoloji ve Genetik',
    classYear: 2,
    gpa: 3.61,
    graduationYear: 2028,
    createdAt: days(300),
  },
  // ---- Kulüp / topluluk hesapları ----
  {
    id: 'org_acm',
    type: 'club',
    username: 'ituacm',
    displayName: 'İTÜ ACM',
    avatarUrl: av(68),
    bio: 'İTÜ Bilgisayar Mühendisliği Kulübü · yazılım, hackathon, kariyer',
    careerHeadline: 'Öğrenci Kulübü',
    accountVisibility: 'public',
    isVerifiedStudent: false,
    isVerifiedOrg: true,
    followerCount: 9800,
    followingCount: 40,
    connectionCount: 0,
    postCount: 0,
    createdAt: days(900),
  },
  {
    id: 'org_kariyer',
    type: 'club',
    username: 'itukariyer',
    displayName: 'İTÜ Kariyer Merkezi',
    avatarUrl: av(15),
    bio: 'Staj, iş, kariyer günleri ve mentorluk · resmi hesap',
    careerHeadline: 'Kariyer & Mezun İlişkileri',
    accountVisibility: 'public',
    isVerifiedStudent: false,
    isVerifiedOrg: true,
    followerCount: 14200,
    followingCount: 12,
    connectionCount: 0,
    postCount: 0,
    createdAt: days(1100),
  },
  {
    id: 'org_ituro',
    type: 'club',
    username: 'ituro',
    displayName: 'İTÜ Robot Topluluğu',
    avatarUrl: av(50),
    bio: 'İTÜRO · robotik, otonom araçlar, Teknofest',
    careerHeadline: 'Öğrenci Topluluğu',
    accountVisibility: 'public',
    isVerifiedStudent: false,
    isVerifiedOrg: true,
    followerCount: 7600,
    followingCount: 30,
    connectionCount: 0,
    postCount: 0,
    createdAt: days(820),
  },
];

// ---- Post fabrikaları ----
let pseq = 0;
const pid = () => `p${++pseq}`;

function media(items: Array<Partial<MediaItem> & { url: string }>): MediaItem[] {
  return items.map((m) => ({ type: m.type ?? 'image', url: m.url, poster: m.poster, durationSec: m.durationSec }));
}

interface MkPost {
  author: string;
  content?: string;
  media?: MediaItem[];
  type?: Post['type'];
  poll?: PollData;
  event?: EventData;
  location?: string;
  likeCount: number;
  commentCount: number;
  likedByMe?: boolean;
  savedByMe?: boolean;
  createdAt: string;
}

function mkPost(p: MkPost): Post {
  const mediaUrls = (p.media ?? []).map((m) => m.poster ?? m.url);
  return {
    id: pid(),
    universityId: UNIVERSITY_ID,
    authorId: p.author,
    type: p.type ?? (p.poll ? 'poll' : p.event ? 'event' : 'post'),
    contentDomain: 'social',
    content: p.content,
    mediaUrls,
    media: p.media,
    visibility: 'public',
    likeCount: p.likeCount,
    commentCount: p.commentCount,
    likedByMe: p.likedByMe ?? false,
    savedByMe: p.savedByMe ?? false,
    poll: p.poll,
    event: p.event,
    location: p.location,
    createdAt: p.createdAt,
  };
}

const poll = (
  id: string,
  question: string,
  opts: Array<[string, number]>,
  endsAt: string,
  myVotes: string[] = [],
): PollData => ({
  id,
  question,
  options: opts.map(([text, voteCount], i) => ({ id: `${id}_o${i}`, text, voteCount })),
  totalVotes: opts.reduce((s, [, v]) => s + v, 0),
  multiChoice: false,
  isAnonymous: true,
  endsAt,
  myVotes,
});

const attendeesFrom = (...ids: string[]): EventData['attendees'] =>
  ids
    .map((id) => USERS.find((u) => u.id === id))
    .filter((u): u is MockUser => !!u)
    .map((u) => ({ id: u.id, displayName: u.displayName, username: u.username, avatarUrl: u.avatarUrl }));

const event = (
  id: string,
  startsAt: string,
  locationText: string,
  participantCount: number,
  capacity: number | undefined,
  opts: Partial<EventData> = {},
): EventData => ({
  id,
  title: opts.title,
  startsAt,
  endsAt: undefined,
  locationText,
  capacity,
  participantCount,
  isPaid: opts.isPaid ?? false,
  price: opts.price,
  participationType: opts.participationType ?? 'open',
  scope: opts.scope ?? 'club',
  myStatus: opts.myStatus ?? null,
  attendees: opts.attendees,
  attendeesVisible: opts.attendeesVisible ?? true,
});

// ---- Akış gönderileri (yeni → eski) ----
export const POSTS: Post[] = [
  mkPost({
    author: 'u_zeynep',
    content:
      'İTÜ Hackathon başvuruları açıldı! 48 saat, sınırsız kahve, jüri önünde demo. Takım arıyorsan yorumlara yaz 👇 #hackathon #İTÜ',
    media: media([{ url: IMG.hackathon }, { url: IMG.codeScreen }]),
    location: 'İTÜ Ayazağa Kampüsü',
    likeCount: 412,
    commentCount: 63,
    createdAt: min(18),
  }),
  mkPost({
    author: 'u_irem',
    content: 'Maslak\'ta gün batımı bu ara efsane. Telefon kamerası bile yetiyor 🌇',
    media: media([{ url: IMG.sunset }, { url: IMG.istanbul }, { url: IMG.cityNight }]),
    location: 'İTÜ Ayazağa',
    likeCount: 1284,
    commentCount: 88,
    likedByMe: true,
    createdAt: min(54),
  }),
  mkPost({
    author: 'org_ituro',
    content:
      'Teknofest otonom araç finallerinde 2. olduk! 🥈 Bütün ekibe ve destekleyen herkese teşekkürler. Demo videosu profilde 🤖',
    media: media([
      { type: 'video', url: VID.joy, poster: IMG.robot, durationSec: 42 },
      { url: IMG.circuit },
    ]),
    likeCount: 2940,
    commentCount: 211,
    createdAt: hrs(2),
  }),
  mkPost({
    author: 'u_can',
    content:
      'ARIBA güneş arabasının yeni aero kaputu tezgahtan çıktı. Rüzgar tüneli testleri haftaya. Bu yıl Avrupa\'da iddialıyız ☀️🏎️',
    media: media([{ url: IMG.racecar }, { url: IMG.drone }]),
    location: 'Makine Fakültesi Atölye',
    likeCount: 876,
    commentCount: 41,
    createdAt: hrs(3),
  }),
  mkPost({
    author: 'u_mert',
    type: 'poll',
    content: 'Vize haftası kütüphane savaşları başladı. Sizce en iyi çalışma noktası?',
    poll: poll(
      'poll1',
      'En iyi çalışma noktası neresi?',
      [
        ['Merkez Kütüphane', 540],
        ['Bilgisayar Müh. lab', 210],
        ['Gümüş kafeterya', 175],
        ['KYK / ev', 390],
      ],
      inHrs(20),
    ),
    likeCount: 233,
    commentCount: 57,
    createdAt: hrs(4),
  }),
  mkPost({
    author: 'org_acm',
    type: 'event',
    content:
      'Google\'dan konuk konuşmacı! "Büyük ölçekli sistemler nasıl tasarlanır?" Etkinlik sonrası networking + pizza 🍕',
    event: event('ev1', inDays(3), 'SDKM Mavi Salon', 312, 400, {
      participationType: 'open',
      title: 'Google Tech Talk · Büyük Ölçekli Sistemler',
      attendees: attendeesFrom('u_zeynep', 'u_mert', 'u_ada', 'u_can', 'u_selin'),
    }),
    media: media([{ url: IMG.presentation }]),
    likeCount: 521,
    commentCount: 34,
    createdAt: hrs(5),
  }),
  mkPost({
    author: 'u_kerem',
    content:
      'İTÜDAK ile Aladağlar kampı dönüşü. 3000m\'de gün doğumu tarif edilmez. Bir sonraki rota Kaçkarlar 🏔️',
    media: media([{ url: IMG.mountain }, { url: IMG.camp }, { url: IMG.sunset }]),
    location: 'Aladağlar',
    likeCount: 1543,
    commentCount: 96,
    createdAt: hrs(7),
  }),
  mkPost({
    author: 'u_elif',
    content: 'Stüdyo final maketi bitti! 3 gece uykusuz ama değdi. Taşkışla\'nın ışığı maketlere çok yakışıyor 🏛️✏️',
    media: media([{ url: IMG.art }, { url: IMG.theater }]),
    location: 'İTÜ Taşkışla',
    likeCount: 998,
    commentCount: 72,
    createdAt: hrs(9),
  }),
  mkPost({
    author: 'u_ada',
    content: 'Kampüs kedileri yine sınav stresimizi alıyor 🐈 Gümüş\'ün patronu bugün de masamıza kuruldu.',
    media: media([{ url: IMG.cat }, { url: IMG.cat2 }]),
    location: 'Gümüş Kafeterya',
    likeCount: 2210,
    commentCount: 134,
    likedByMe: true,
    createdAt: hrs(11),
  }),
  mkPost({
    author: 'u_deniz',
    content: 'Yelken antrenmanı için bugün Boğaz harikaydı. Tuzla ekibi olarak kupaya hazırız ⛵',
    media: media([
      { type: 'video', url: VID.escapes, poster: IMG.sailing, durationSec: 28 },
      { url: IMG.sea },
    ]),
    location: 'İTÜ Tuzla',
    likeCount: 645,
    commentCount: 29,
    createdAt: hrs(13),
  }),
  mkPost({
    author: 'org_kariyer',
    type: 'event',
    content:
      'İTÜ Kariyer Günleri 2026 yaklaşıyor! 80+ firma, teknik atölyeler, CV kliniği ve mülakat simülasyonları. Kayıt zorunlu.',
    event: event('ev2', inDays(10), 'İTÜ Süleyman Demirel KM', 1840, 3000, {
      participationType: 'open',
      title: 'İTÜ Kariyer Günleri 2026',
      myStatus: 'joined',
      attendees: attendeesFrom('u_ada', 'u_selin', 'u_irem', 'u_burak', 'u_elif', 'u_can'),
    }),
    media: media([{ url: IMG.grad }]),
    likeCount: 1320,
    commentCount: 47,
    createdAt: hrs(16),
  }),
  mkPost({
    author: 'u_selin',
    content:
      'Girişimcilik kulübü demo gecesinde 6 takım fikrini sundu. Yatırımcı ağıyla tanışmak inanılmazdı. Bir sonraki batch başvuruları açık 🚀',
    media: media([{ url: IMG.party }, { url: IMG.presentation }]),
    likeCount: 487,
    commentCount: 23,
    createdAt: hrs(20),
  }),
  mkPost({
    author: 'u_zeynep',
    type: 'event',
    content:
      'AI Club · LLM Fine-tuning Workshop! Kendi modelini eğit, demo gecesinde sun. Laptop yeterli, sınırlı kontenjan 🤖',
    event: event('ev3', inDays(5), 'İTÜ Bilgisayar Müh. Lab 2', 86, 120, {
      participationType: 'open',
      title: 'AI Club · LLM Fine-tuning Workshop',
      attendees: attendeesFrom('u_ada', 'u_mert', 'u_selin'),
    }),
    media: media([{ url: IMG.codeScreen }]),
    location: 'İTÜ Ayazağa',
    likeCount: 642,
    commentCount: 51,
    createdAt: hrs(18),
  }),
  mkPost({
    author: 'u_can',
    type: 'event',
    content:
      'İTÜ Racing pist günü! Yeni elektrikli aracımızı test ediyoruz, tribün herkese açık. Gel, takımı yakından tanı 🏎️⚡',
    event: event('ev4', inDays(7), 'İstanbul Park Pisti', 240, 500, {
      participationType: 'open',
      title: 'İTÜ Racing · Pist Test Günü',
      attendees: attendeesFrom('u_mert', 'u_burak', 'u_kerem', 'u_deniz'),
    }),
    media: media([{ url: IMG.racecar }]),
    likeCount: 815,
    commentCount: 42,
    createdAt: hrs(21),
  }),
  mkPost({
    author: 'u_ece',
    content: '1. sınıf olarak ilk fizik lab raporumu teslim ettim ve hata payım %2 çıktı 🥹 küçük zaferler!',
    likeCount: 356,
    commentCount: 44,
    createdAt: hrs(23),
  }),
  mkPost({
    author: 'u_zeynep',
    content:
      'Bitirme projem için RAG tabanlı bir ders asistanı yapıyorum. Ninova duyurularını otomatik özetliyor 😎 Beta\'yı denemek isteyen DM.',
    media: media([{ url: IMG.laptopCode }]),
    likeCount: 712,
    commentCount: 58,
    savedByMe: true,
    createdAt: days(1),
  }),
  mkPost({
    author: 'u_irem',
    content: 'İTÜ Caz Kulübü gecesinden kareler 🎷 Akustik o kadar iyiydi ki...',
    media: media([
      { url: IMG.concert },
      { type: 'video', url: VID.fun, poster: IMG.guitar, durationSec: 35 },
      { url: IMG.festival },
    ]),
    location: 'Maçka Kampüsü',
    likeCount: 1890,
    commentCount: 77,
    createdAt: days(1),
  }),
  mkPost({
    author: 'u_burak',
    content:
      'Rover Team olarak çöl test sahasında otonom navigasyon %100 başarı 🛰️ ABD\'deki yarışmaya bir adım daha.',
    media: media([{ url: IMG.drone }, { url: IMG.circuit }]),
    likeCount: 933,
    commentCount: 38,
    createdAt: days(2),
  }),
  mkPost({
    author: 'u_ada',
    type: 'poll',
    content: 'Bahar şenliğinde hangi grup sahne alsın? Oylar konuşsun 🎤',
    poll: poll(
      'poll2',
      'Bahar şenliği ana sahne?',
      [
        ['Duman', 820],
        ['Mabel Matiz', 1130],
        ['Motive', 640],
        ['Madrigal', 410],
      ],
      inDays(2),
      ['poll2_o1'],
    ),
    likeCount: 540,
    commentCount: 162,
    likedByMe: true,
    createdAt: days(2),
  }),
  mkPost({
    author: 'u_can',
    content: 'Maslak\'tan Boğaz\'a inen yol akşamları bisikletle bambaşka. Hafta sonu turu olan?',
    media: media([{ url: IMG.istanbul2 }]),
    likeCount: 421,
    commentCount: 31,
    createdAt: days(3),
  }),
  mkPost({
    author: 'org_acm',
    content: 'Git & GitHub atölyemizin kayıtları YouTube\'da. 0\'dan ileri seviyeye, Türkçe. Link bio\'da 💻',
    media: media([{ url: IMG.codeScreen }]),
    likeCount: 388,
    commentCount: 19,
    createdAt: days(3),
  }),
  mkPost({
    author: 'u_kerem',
    content: 'Final programı çıktı ve 3 sınavım aynı gün 🙃 Dayanışma için kim hangi dersten not paylaşıyor?',
    likeCount: 274,
    commentCount: 89,
    createdAt: days(4),
  }),
  mkPost({
    author: 'u_elif',
    content: 'Mimarlık öğrencisinin sabahı: kahve, maket bıçağı ve bitmeyen revizeler ☕📐',
    media: media([{ url: IMG.coffee }, { url: IMG.books }]),
    likeCount: 612,
    commentCount: 26,
    createdAt: days(5),
  }),
];

// ---- Reels (kısa videolar) ----
let rseq = 0;
const reel = (author: string, caption: string, vid: string, poster: string, likeCount: number, commentCount: number, ageHrs: number): Post =>
  mkPost({
    author,
    content: caption,
    type: 'post',
    media: media([{ type: 'video', url: vid, poster, durationSec: 15 + (rseq++ % 4) * 10 }]),
    likeCount,
    commentCount,
    createdAt: hrs(ageHrs),
  });

export const REELS: Post[] = [
  reel('u_irem', 'Kampüste 60 saniyede bir gün 🎥 #İTÜ #maslak', VID.bunny, IMG.istanbul, 5400, 132, 5),
  reel('org_ituro', 'Robot kol 0.4 saniyede küpü çözüyor 🤯', VID.joy, IMG.robot, 8800, 240, 9),
  reel('u_deniz', 'Boğaz\'da gün batımı yelkeni ⛵', VID.escapes, IMG.sailing, 3200, 76, 14),
  reel('u_can', 'ARIBA pist turu — ses açın 🔊🏎️', VID.fun, IMG.racecar, 4100, 91, 20),
  reel('u_kerem', 'Zirvede 360° · Aladağlar', VID.steel, IMG.mountain, 2700, 54, 28),
  reel('u_irem', 'Caz gecesi backstage 🎷', VID.dream, IMG.guitar, 3900, 67, 33),
  reel('u_elif', 'Maket time-lapse · 12 saat → 20 saniye', VID.blazes, IMG.art, 2150, 48, 40),
  reel('u_zeynep', 'Kod yazarken lo-fi playlist\'im 🎧', VID.sintel, IMG.laptopCode, 1980, 39, 50),
];

// ---- Hikayeler ----
let sseq = 0;
const story = (author: string, mediaUrl: string, caption: string | undefined, hoursAgo: number, viewCount?: number): Story => ({
  id: `s${++sseq}`,
  authorId: author,
  mediaUrl,
  caption,
  audience: 'public',
  expiresAt: inHrs(24 - hoursAgo),
  createdAt: hrs(hoursAgo),
  seen: false,
  viewCount,
});

export const STORIES: Story[] = [
  story(ME_ID, IMG.laptopCode, 'Bitirme sunumu provası 💻', 2, 142),
  story(ME_ID, IMG.coffee, 'Yakıt ☕', 1, 98),
  story('u_zeynep', IMG.codeScreen, 'Model eğitiliyor...', 3),
  story('u_irem', IMG.sunset, 'Maslak 🌇', 1),
  story('u_irem', IMG.concert, undefined, 1),
  story('u_can', IMG.racecar, 'Test günü', 4),
  story('u_elif', IMG.art, 'Teslim 🎉', 5),
  story('u_kerem', IMG.mountain, 'Zirve!', 6),
  story('org_acm', IMG.hackathon, 'Hackathon başladı 🚀', 2),
  story('u_deniz', IMG.sailing, undefined, 8),
];

// ---- Topluluklar ----
interface SeedCommunity extends Community {
  channels: CommunityChannel[];
  members: string[];
}

const channel = (cid: string, name: string, isDefault = false): CommunityChannel => ({
  id: `${cid}_${name}`,
  communityId: cid,
  name,
  position: 0,
  isDefault,
  type: 'text',
  writeMinRole: 'member',
  slowModeSeconds: 0,
  createdAt: days(200),
});

function community(
  id: string,
  name: string,
  ownerId: string,
  category: string,
  description: string,
  cover: string,
  avatarUrl: string,
  stats: { members: number; events: number; attendees: number; growth: number; active: number; trend: number },
  joinMode: Community['joinMode'] = 'open',
  members: string[] = [],
): SeedCommunity {
  return {
    id,
    universityId: UNIVERSITY_ID,
    ownerId,
    type: 'group',
    name,
    description,
    coverUrl: cover,
    avatarUrl,
    category,
    visibility: 'public',
    joinMode,
    memberCount: stats.members,
    eventCount: stats.events,
    totalEventAttendees: stats.attendees,
    weeklyGrowth: stats.growth,
    activeMemberCount: stats.active,
    trendingScore: stats.trend,
    createdAt: days(400),
    channels: [channel(id, 'duyurular', true), channel(id, 'sohbet'), channel(id, 'etkinlikler'), channel(id, 'proje')],
    members,
  };
}

export const COMMUNITIES: SeedCommunity[] = [
  community('c_acm', 'İTÜ ACM', 'org_acm', 'Teknoloji', 'Yazılım, algoritma, hackathon ve kariyer. İTÜ\'nün en büyük teknoloji topluluğu.', IMG.codeScreen, av(68), { members: 3240, events: 48, attendees: 9600, growth: 214, active: 540, trend: 98 }, 'open', [ME_ID, 'u_zeynep', 'u_mert', 'u_ada']),
  community('c_kariyer', 'İTÜ Kariyer & Staj', 'org_kariyer', 'Kariyer', 'Staj/iş ilanları, kariyer günleri, mülakat hazırlığı ve mezun mentorluğu.', IMG.grad, av(15), { members: 5210, events: 62, attendees: 18400, growth: 340, active: 720, trend: 100 }, 'open', [ME_ID, 'u_selin', 'u_ada']),
  community('c_ituro', 'İTÜ Robot Topluluğu', 'org_ituro', 'Robotik', 'İTÜRO · robotik projeler, otonom araçlar ve Teknofest takımları.', IMG.robot, av(50), { members: 2680, events: 35, attendees: 7200, growth: 188, active: 410, trend: 92 }, 'request', ['u_mert', 'u_burak']),
  community('c_racing', 'İTÜ Racing', 'u_can', 'Mühendislik', 'Formula Student & elektrikli araç takımı. Tasarımdan piste.', IMG.racecar, av(33), { members: 1820, events: 22, attendees: 4100, growth: 96, active: 260, trend: 80 }, 'request', ['u_can']),
  community('c_dagcilik', 'İTÜ Dağcılık (İTÜDAK)', 'u_kerem', 'Doğa Sporları', 'Tırmanış, kamp, doğa yürüyüşü. Her seviyeye açık eğitimler.', IMG.mountain, av(56), { members: 2120, events: 40, attendees: 5300, growth: 152, active: 300, trend: 86 }, 'open', ['u_kerem', 'u_ece']),
  community('c_foto', 'İTÜ Fotoğrafçılık', 'u_irem', 'Sanat', 'Foto gezileri, karanlık oda, sergi ve video prodüksiyon.', IMG.camera, av(32), { members: 1740, events: 28, attendees: 3900, growth: 174, active: 280, trend: 90 }, 'open', ['u_irem', 'u_elif']),
  community('c_yelken', 'İTÜ Yelken Kulübü', 'u_deniz', 'Spor', 'Tuzla\'da yelken eğitimi, regatta ve tekne çalışmaları.', IMG.sailing, av(60), { members: 1410, events: 18, attendees: 2600, growth: 64, active: 180, trend: 70 }, 'request', ['u_deniz']),
  community('c_giris', 'İTÜ Girişimcilik', 'u_selin', 'Girişimcilik', 'Startup, demo geceleri, yatırımcı ağı ve fikir maratonları.', IMG.presentation, av(20), { members: 2430, events: 30, attendees: 6100, growth: 205, active: 360, trend: 94 }, 'open', ['u_selin', 'u_ada']),
  community('c_caz', 'İTÜ Caz Kulübü', 'u_irem', 'Müzik', 'Canlı sahneler, jam session ve müzik atölyeleri.', IMG.guitar, av(40), { members: 940, events: 24, attendees: 4800, growth: 88, active: 150, trend: 76 }, 'open', []),
  community('c_tiyatro', 'İTÜ Tiyatro Topluluğu', 'u_elif', 'Sanat', 'Sahne sanatları, oyunlar ve doğaçlama atölyeleri.', IMG.theater, av(9), { members: 1120, events: 20, attendees: 3400, growth: 72, active: 160, trend: 68 }, 'open', []),
  community('c_oyun', 'İTÜ Oyun Geliştirme', 'u_zeynep', 'Teknoloji', 'GameLab · game jam, Unity/Unreal atölyeleri ve indie projeler.', IMG.codeScreen, av(5), { members: 1560, events: 16, attendees: 2900, growth: 132, active: 240, trend: 84 }, 'open', ['u_zeynep']),
  community('c_havacilik', 'İTÜ Havacılık Kulübü', 'u_burak', 'Havacılık', 'Model uçak, İHA, drone yarışları ve havacılık söyleşileri.', IMG.plane, av(51), { members: 1310, events: 14, attendees: 2200, growth: 58, active: 140, trend: 64 }, 'open', ['u_burak']),
  community('c_ai', 'İTÜ AI Club', 'u_zeynep', 'Yapay Zekâ', 'LLM, bilgisayarlı görü, makine öğrenmesi çalışma grupları ve demo geceleri.', IMG.codeScreen, av(22), { members: 1980, events: 26, attendees: 5400, growth: 280, active: 420, trend: 96 }, 'open', [ME_ID, 'u_zeynep', 'u_ada']),
  community('c_ieee', 'İTÜ IEEE', 'u_mert', 'Teknoloji', 'Teknik seminerler, proje yarışmaları ve endüstri buluşmaları.', IMG.circuit, av(44), { members: 2890, events: 44, attendees: 8200, growth: 165, active: 380, trend: 88 }, 'open', ['u_mert', 'u_burak']),
  community('c_gdsc', 'GDSC İTÜ', 'u_ada', 'Teknoloji', 'Google Developer Student Club · web, mobil, cloud atölyeleri.', IMG.codeScreen, av(7), { members: 1670, events: 20, attendees: 4100, growth: 142, active: 290, trend: 82 }, 'open', ['u_ada', ME_ID]),
  community('c_blockchain', 'İTÜ Blockchain', 'u_selin', 'Finans', 'Web3, akıllı kontratlar ve kripto ekonomi söyleşileri.', IMG.presentation, av(18), { members: 890, events: 12, attendees: 2100, growth: 98, active: 120, trend: 74 }, 'open', ['u_selin']),
  community('c_erasmus', 'İTÜ Erasmus & Değişim', 'u_ece', 'Uluslararası', 'Değişim programları, yurt dışı staj ve kültür buluşmaları.', IMG.grad, av(61), { members: 1340, events: 16, attendees: 3200, growth: 76, active: 190, trend: 66 }, 'open', ['u_ece']),
  community('c_sustain', 'İTÜ Sürdürülebilirlik', 'u_kerem', 'Çevre', 'Yeşil kampüs, geri dönüşüm ve iklim projeleri.', IMG.mountain, av(48), { members: 760, events: 14, attendees: 1800, growth: 54, active: 95, trend: 58 }, 'open', ['u_kerem']),
];

// Kanal mesajları (varsayılan duyuru kanalı için)
export const CHANNEL_MESSAGES: Record<string, { sender: string; content: string; ageMin: number }[]> = {
  c_acm_duyurular: [
    { sender: 'org_acm', content: 'Hackathon takım kayıtları cuma akşamı kapanıyor, son çağrı! 🚀', ageMin: 120 },
    { sender: 'u_zeynep', content: '3 kişilik takımız, 1 backend\'ci arıyoruz 👀', ageMin: 90 },
    { sender: 'u_mert', content: 'Gömülü tarafına ihtiyaç olursa buradayım', ageMin: 40 },
  ],
  c_acm_sohbet: [
    { sender: 'u_ada', content: 'Algoritma çalışma grubu bu akşam lab\'da 20:00', ageMin: 200 },
    { sender: ME_ID, content: 'Geliyorum, leetcode listesi atan oldu mu?', ageMin: 150 },
  ],
  c_ai_duyurular: [
    { sender: 'u_zeynep', content: 'LLM fine-tuning workshop cumartesi 14:00 · Kayıt açık', ageMin: 45 },
    { sender: 'u_ada', content: 'Demo gecesi için proje başvuruları son gün!', ageMin: 20 },
  ],
  c_gdsc_sohbet: [
    { sender: 'u_ada', content: 'Flutter study jam grubu kuruyoruz, katılan?', ageMin: 90 },
    { sender: ME_ID, content: 'Ben varım, RN tarafını da anlatabilirim', ageMin: 60 },
  ],
  c_kariyer_duyurular: [
    { sender: 'org_kariyer', content: 'Kariyer Günleri 2026 firma listesi yayında! 80+ şirket katılıyor 📋', ageMin: 75 },
    { sender: 'u_selin', content: 'CV kliniği randevuları açıldı, kontenjan dolmadan alın', ageMin: 30 },
  ],
  c_kariyer_sohbet: [
    { sender: 'u_ada', content: 'Mülakat simülasyonuna kayıt olan var mı? Birlikte hazırlanalım', ageMin: 50 },
    { sender: ME_ID, content: 'Ben kaydoldum, perşembe 15:00 slotundayım', ageMin: 25 },
  ],
};

// ---- Mesajlaşma (DM + grup) ----
interface SeedMessage {
  sender: string;
  content?: string;
  mediaUrl?: string;
  ageMin: number;
}
interface SeedConversation {
  id: string;
  type: 'dm' | 'group';
  peer?: string;
  title?: string;
  unread: number;
  messages: SeedMessage[];
}

export const CONVERSATIONS: SeedConversation[] = [
  {
    id: 'cv_zeynep',
    type: 'dm',
    peer: 'u_zeynep',
    unread: 2,
    messages: [
      { sender: 'u_zeynep', content: 'Selam! Hackathon takımına katılıyor musun?', ageMin: 220 },
      { sender: ME_ID, content: 'Kesinlikle varım 🙌 Fikir netleşti mi?', ageMin: 210 },
      { sender: 'u_zeynep', content: 'Ninova asistanı üstüne gidiyoruz, RAG mimarisi', ageMin: 30 },
      { sender: 'u_zeynep', content: 'Repo linkini atıyorum birazdan', ageMin: 8 },
    ],
  },
  {
    id: 'cv_acmgroup',
    type: 'group',
    title: 'Hackathon Takımı 🚀',
    unread: 5,
    messages: [
      { sender: 'u_zeynep', content: 'Toplantı yarın 19:00 lab', ageMin: 300 },
      { sender: 'u_mert', content: 'Donanım listesini çıkardım', ageMin: 260 },
      { sender: 'u_ada', content: 'Sunum şablonunu hazırlıyorum', ageMin: 180 },
      { sender: 'u_mert', mediaUrl: IMG.circuit, ageMin: 120 },
      { sender: ME_ID, content: 'Backend iskeleti hazır, demoya yetişiriz', ageMin: 25 },
    ],
  },
  {
    id: 'cv_irem',
    type: 'dm',
    peer: 'u_irem',
    unread: 0,
    messages: [
      { sender: ME_ID, content: 'Caz gecesi fotoğrafları harika olmuş 🔥', ageMin: 600 },
      { sender: 'u_irem', content: 'Teşekkürler! Tam kareleri Drive\'a attım', ageMin: 540 },
      { sender: 'u_irem', mediaUrl: IMG.concert, ageMin: 535 },
      { sender: ME_ID, content: 'Süper, bir tanesini story yapayım 🙏', ageMin: 520 },
    ],
  },
  {
    id: 'cv_can',
    type: 'dm',
    peer: 'u_can',
    unread: 1,
    messages: [
      { sender: 'u_can', content: 'Hafta sonu bisiklet turu yapıyoruz, var mısın?', ageMin: 800 },
      { sender: ME_ID, content: 'Rota neresi?', ageMin: 770 },
      { sender: 'u_can', content: 'Maslak → Sarıyer sahil, sabah 9', ageMin: 60 },
    ],
  },
  {
    id: 'cv_selin',
    type: 'dm',
    peer: 'u_selin',
    unread: 0,
    messages: [
      { sender: 'u_selin', content: 'Girişimcilik demo gecesine geliyor musun?', ageMin: 1400 },
      { sender: ME_ID, content: 'Geldim ya, fikrin çok iyiydi 👏', ageMin: 1380 },
      { sender: 'u_selin', content: 'Çok teşekkürler 🥹 mentor görüşmesi ayarlandı', ageMin: 1350 },
    ],
  },
];

// ---- Kampüs fırsatları (indirimler) ----
export const DEALS: (Deal & { brandName: string; logoUrl: string })[] = [
  { id: 'd1', sponsorId: 'org_kariyer', brandName: 'Nero Cafe Maslak', title: 'Öğrenciye %25 kahve indirimi', description: 'İTÜ kimliğini göster, tüm sıcak içeceklerde %25 indirim kap.', bannerUrl: IMG.coffee, logoUrl: av(45), category: 'Kafe', discountValue: '%25', endsAt: inDays(20) },
  { id: 'd2', sponsorId: 'org_kariyer', brandName: 'Domino\'s Pizza', title: '2. orta pizza bedava', description: 'Maslak şubesinde öğrenciye özel: 1 alana 1 bedava.', bannerUrl: IMG.burger, logoUrl: av(46), category: 'Yemek', discountValue: '1+1', endsAt: inDays(12) },
  { id: 'd3', sponsorId: 'org_kariyer', brandName: 'GitHub Education', title: 'Pro paket ücretsiz', description: '.edu mailinle GitHub Student Pack + Copilot ücretsiz.', bannerUrl: IMG.codeScreen, logoUrl: av(68), category: 'Yazılım', discountValue: 'Ücretsiz', endsAt: inDays(180) },
  { id: 'd4', sponsorId: 'org_kariyer', brandName: 'FitLab Maslak', title: 'Spor salonu %30 öğrenci', description: 'Aylık üyeliklerde öğrenciye özel %30 indirim.', bannerUrl: IMG.gym, logoUrl: av(47), category: 'Spor', discountValue: '%30', endsAt: inDays(30) },
  { id: 'd5', sponsorId: 'org_kariyer', brandName: 'Çınar Kırtasiye', title: 'Maket malzemelerinde %15', description: 'Mimarlık ve tasarım malzemelerinde öğrenci indirimi.', bannerUrl: IMG.art, logoUrl: av(48), category: 'Kırtasiye', discountValue: '%15', endsAt: inDays(45) },
  { id: 'd6', sponsorId: 'org_kariyer', brandName: 'BiTaksi Kampüs', title: 'İlk 5 yolculukta %40', description: 'Gece dersten çıkışta güvenle eve. Kod: ITU40', bannerUrl: IMG.cityNight, logoUrl: av(49), category: 'Ulaşım', discountValue: '%40', endsAt: inDays(15) },
];

// ---- Kariyer: projeler / milestone / fırsatlar ----
export const PROJECTS: Record<string, { id: string; title: string; role: string; description: string; techTags: string[]; githubUrl?: string; demoUrl?: string }[]> = {
  [ME_ID]: [
    { id: 'pr1', title: 'CampusConnect', role: 'Mobil Geliştirici', description: 'İTÜ öğrencileri için etkinlik ve topluluk uygulaması. React Native + Expo.', techTags: ['React Native', 'Expo', 'TypeScript', 'Zustand'], githubUrl: 'https://github.com', demoUrl: 'https://expo.dev' },
    { id: 'pr2', title: 'Ninova Özetleyici', role: 'Backend', description: 'Ders duyurularını LLM ile özetleyen bot.', techTags: ['Python', 'FastAPI', 'OpenAI'], githubUrl: 'https://github.com' },
  ],
  u_zeynep: [
    { id: 'pr3', title: 'RAG Ders Asistanı', role: 'ML Engineer', description: 'Retrieval-augmented generation ile ders sorularını yanıtlayan asistan.', techTags: ['PyTorch', 'LangChain', 'Pinecone'], githubUrl: 'https://github.com' },
  ],
  u_burak: [
    { id: 'pr4', title: 'Otonom Rover Navigasyon', role: 'Robotics', description: 'SLAM tabanlı otonom navigasyon yığını.', techTags: ['ROS2', 'C++', 'SLAM'], githubUrl: 'https://github.com' },
  ],
};

export const MILESTONES: Record<string, { id: string; title: string; description?: string; occurredOn: string; congratsCount: number; congratulatedByMe: boolean }[]> = {
  [ME_ID]: [
    { id: 'm1', title: 'Microsoft staj kabulü 🎉', description: 'Yaz dönemi SWE intern.', occurredOn: days(40), congratsCount: 128, congratulatedByMe: false },
    { id: 'm2', title: 'İTÜ ACM yönetim kuruluna seçildim', occurredOn: days(150), congratsCount: 64, congratulatedByMe: false },
  ],
  u_zeynep: [
    { id: 'm3', title: 'NeurIPS atölye kabulü', description: 'İlk akademik yayın.', occurredOn: days(20), congratsCount: 210, congratulatedByMe: true },
  ],
};

export const OPPORTUNITIES = [
  { id: 'op1', title: 'Yazılım Mühendisliği Stajı (Yaz)', type: 'internship', company: 'Getir', location: 'İstanbul / Hibrit', description: 'Backend ekibinde Node.js & Go ile çalışacak stajyer.', deadline: inDays(14), applyUrl: 'https://example.com' },
  { id: 'op2', title: 'Veri Bilimi Bursu', type: 'scholarship', company: 'Türkiye Açık Kaynak Platformu', location: 'Uzaktan', description: 'Açık kaynak veri projelerine katkı veren öğrencilere burs.', deadline: inDays(30), applyUrl: 'https://example.com' },
  { id: 'op3', title: 'Donanım Tasarım Stajı', type: 'internship', company: 'ASELSAN', location: 'Ankara', description: 'PCB ve gömülü sistemler ekibinde staj imkânı.', deadline: inDays(21), applyUrl: 'https://example.com' },
  { id: 'op4', title: 'Araştırma Asistanlığı', type: 'research', company: 'İTÜ Yapay Zekâ Lab', location: 'Ayazağa', description: 'NLP projesinde part-time araştırma asistanı.', deadline: inDays(10), applyUrl: 'https://example.com' },
];

// ---- Takip istekleri (Instagram tarzı) ----
export const FOLLOW_REQUESTS = [
  { followerId: 'u_elif', createdAt: hrs(2) },
  { followerId: 'u_deniz', createdAt: hrs(5) },
  { followerId: 'u_burak', createdAt: hrs(18) },
];

// ---- Trend konular (hashtag değil) ----
export const TREND_TOPICS = [
  { id: 'tp_vize', title: 'Vize Haftası', description: 'Final öncesi çalışma grupları, not paylaşımları ve moral desteği.', postCount: 4820, participantCount: 12400, icon: 'book' as const },
  { id: 'tp_hack', title: 'Hackathon Sezonu', description: 'Takım kurma, proje fikirleri ve mentor arayanlar.', postCount: 3120, participantCount: 8900, icon: 'rocket' as const },
  { id: 'tp_teknofest', title: 'Teknofest Hazırlığı', description: 'Takım duyuruları, sponsor aramaları ve test günleri.', postCount: 9450, participantCount: 22100, icon: 'airplane' as const },
  { id: 'tp_staj', title: 'Staj & İş İlanları', description: 'Yaz stajı, part-time ve mezuniyet sonrası fırsatlar.', postCount: 2760, participantCount: 6800, icon: 'briefcase' as const },
  { id: 'tp_bahar', title: 'Bahar Şenliği', description: 'Konserler, standlar ve kampüs etkinlikleri.', postCount: 5310, participantCount: 15200, icon: 'musical-notes' as const },
  { id: 'tp_bitirme', title: 'Bitirme Projeleri', description: 'Proje partneri, danışman önerileri ve savunma hazırlığı.', postCount: 1890, participantCount: 4200, icon: 'school' as const },
  { id: 'tp_yurt', title: 'Yurt & Ev Arkadaşı', description: 'Oda arkadaşı arayanlar, yurt tavsiyeleri ve taşınma.', postCount: 1640, participantCount: 3100, icon: 'home' as const },
  { id: 'tp_spor', title: 'Kampüs Sporları', description: 'Halı saha, basketbol maçları ve antrenman grupları.', postCount: 2180, participantCount: 5600, icon: 'football' as const },
];

// ---- Hashtag trendleri ----
export const HASHTAGS = [
  { tag: 'vizeHaftası', usageCount: 4820 },
  { tag: 'İTÜ', usageCount: 18900 },
  { tag: 'hackathon', usageCount: 3120 },
  { tag: 'Teknofest', usageCount: 9450 },
  { tag: 'baharŞenliği', usageCount: 2760 },
  { tag: 'kampüsKedileri', usageCount: 5310 },
  { tag: 'maslak', usageCount: 6140 },
  { tag: 'İTÜRover', usageCount: 1880 },
  { tag: 'ARIBA', usageCount: 1430 },
  { tag: 'mezuniyet2026', usageCount: 2090 },
  { tag: 'Ninova', usageCount: 3680 },
  { tag: 'yelkenKupası', usageCount: 940 },
];

// ---- Yorumlar (öne çıkan gönderiler için) ----
export const COMMENTS: Record<string, { author: string; content: string; ageMin: number; likeCount: number }[]> = {
  p1: [
    { author: 'u_mert', content: 'Gömülü tarafı için varım, takıma yazın!', ageMin: 12, likeCount: 8 },
    { author: 'u_ada', content: 'Sunum/PM rolü lazımsa ben buradayım 🙌', ageMin: 9, likeCount: 5 },
    { author: ME_ID, content: 'Full-stack 1 kişi daha arıyoruz, DM 👀', ageMin: 4, likeCount: 12 },
  ],
  p2: [
    { author: 'u_elif', content: 'Bu kareyi duvar kağıdı yaptım resmen 😍', ageMin: 40, likeCount: 22 },
    { author: 'u_can', content: 'Maslak gün batımı = İstanbul\'un en iyi sırrı', ageMin: 30, likeCount: 14 },
  ],
  p9: [
    { author: 'u_irem', content: 'O kedi resmen kampüsün maskotu 😹', ageMin: 60, likeCount: 33 },
    { author: 'u_ece', content: 'Sınav stresine birebir 🐈', ageMin: 45, likeCount: 9 },
  ],
};

// ---- Bağlantı önerileri ----
export const SUGGESTIONS = [
  { id: 'u_burak', username: 'burakaydin', displayName: 'Burak Aydın', avatarUrl: av(51), careerHeadline: 'Uçak-Uzay Müh. · Rover Team', department: 'Uzay Mühendisliği', mutualCount: 12, reason: 'İTÜ ACM üzerinden' },
  { id: 'u_selin', username: 'selinarslan', displayName: 'Selin Arslan', avatarUrl: av(20), careerHeadline: 'İşletme Müh. Öğrencisi', department: 'İşletme Mühendisliği', mutualCount: 8, reason: '8 ortak bağlantı' },
  { id: 'u_deniz', username: 'denizkoc', displayName: 'Deniz Koç', avatarUrl: av(60), careerHeadline: 'Gemi İnşaatı Müh.', department: 'Gemi İnşaatı', mutualCount: 5, reason: 'Aynı dönem' },
  { id: 'u_ece', username: 'eceyilmaz', displayName: 'Ece Yılmaz', avatarUrl: av(24), careerHeadline: 'Fizik Mühendisliği', department: 'Fizik Mühendisliği', mutualCount: 3, reason: 'Senin gibi yeni' },
];
