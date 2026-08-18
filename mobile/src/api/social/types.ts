/*
  Shared types for the Social Media module API.
  Mirrors what the backend returns from /apis/feed, /apis/privacy,
  /apis/safety and /apis/verification.
*/

export type Audience = 'everyone' | 'followers' | 'closeFriends' | 'nobody';
export type PrivacyMode = 'public' | 'private' | 'custom';
export type AccountType = 'personal' | 'creator' | 'business';
export type PostType = 'Post' | 'Reel' | 'Story';

export type Relationship = 'self' | 'blocked' | 'follower' | 'requested' | 'stranger';

export interface ApiResult {
  success: boolean;
  message?: string;
}

export interface MiniUser {
  _id: string;
  name?: string;
  image?: string | null;
  verifiedBadge?: boolean;
}

export interface AuthorInfo {
  userid: string;
  name?: string;
  email?: string;
  image?: string | null;
  bio?: string | null;
  gender?: string;
  nationality?: string;
  verifiedBadge?: boolean;
  accountType?: AccountType;
}

export interface MediaItem {
  url: string;
  type: 'image' | 'video';
  thumbnail?: string;
  width?: number;
  height?: number;
  duration?: number;
  altText?: string;
  order?: number;
}

export interface PollOption {
  id: string;
  text: string;
  /** null until the viewer has voted or the poll has closed */
  votes: number | null;
  percent: number | null;
}

export interface Poll {
  question: string;
  multiple: boolean;
  endsAt: string | null;
  closed: boolean;
  totalVotes: number;
  hasVoted: boolean;
  myVotes: string[];
  options: PollOption[];
}

export interface Place {
  name: string;
  address?: string;
  city?: string;
  country?: string;
  placeId?: string;
  location?: { type: 'Point'; coordinates: [number, number] };
}

export interface TaggedUser {
  user: MiniUser | string;
  x?: number;
  y?: number;
  mediaIndex?: number;
}

/** One item in any feed. Legacy fields are kept for older screens. */
export interface FeedItem {
  _id: string;
  posttype: PostType | string;
  posttypechild?: string;

  // legacy shape the existing screens already read
  videoUrl?: any;
  videoTitle?: string;
  sound?: any;
  videosound?: string;
  username: string;
  xtime: string;

  // current shape
  caption: string;
  media: MediaItem[];
  isCarousel: boolean;
  mediaCount: number;
  poll: Poll | null;
  place: Place | null;
  hashtags: string[];
  taggedUsers: TaggedUser[];
  mentions: string[];
  expiresAt: string | null;

  likes: number;
  dislikes: number;
  comments: number;
  favorites: number;
  shares: number;
  saves: number;
  stars: number;
  views: number;
  commentsdetails: any[];

  isLiked: boolean;
  isSaved: boolean;
  isViewed: boolean;
  isMine: boolean;
  followStatus: 'follow' | 'not follow';

  userInfo: AuthorInfo | null;

  // present on ranked feeds
  score?: number;
  reasons?: string[];
  heat?: number;
  engagement?: number;
  distanceKm?: number;
}

export interface Paged<T> {
  success: boolean;
  page?: number;
  limit?: number;
  total: number;
  totalPages?: number;
  hasMore?: boolean;
  items: T[];
}

export interface StoryRing {
  user: MiniUser;
  isMine: boolean;
  items: FeedItem[];
  total: number;
  unseen: number;
  allSeen: boolean;
  latestAt: string;
}

export interface PrivacySettings {
  posts: Audience;
  stories: Audience;
  reels: Audience;
  followersList: Audience;
  profilePhoto: Audience;
  bio: Audience;
  onlineStatus: Audience;
  messages: Audience;
  comments: Audience;
  tagging: Audience;
  mentions: Audience;
  discoverable: boolean;
  readReceipts: boolean;
}

export interface Visibility {
  relationship: Relationship;
  mode: PrivacyMode;
  discoverable: boolean;
  permissions: Record<string, boolean>;
  needsApproval?: boolean;
}

export interface RecommendedUser extends MiniUser {
  bio?: string;
  accountType?: AccountType;
  followers: number;
  mutuals: number;
  isPrivate: boolean;
  score: number;
  reasons: string[];
}

export interface TrendingResponse {
  success: boolean;
  windowHours: number;
  posts: FeedItem[];
  hashtags: { tag: string; posts: number; score: number | null; pinned: boolean }[];
  creators: {
    _id: string; name?: string; image?: string | null; verifiedBadge?: boolean;
    posts: number; heat: number; engagement: number; isFollowing: boolean;
  }[];
}

export interface BadgeStatus {
  success: boolean;
  verified: boolean;
  accountType: AccountType;
  status: 'none' | 'pending' | 'approved' | 'rejected';
  canApply: boolean;
  reviewNote: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  request: any;
  categories: string[];
}

export interface ReportReason {
  id: string;
  label: string;
}
