/*
  Social Feed (Timeline) — every endpoint under /apis/feed.

  Covers: home feed, For You, trending, stories, hashtags, check-ins and
  nearby, recommendations, tagging, polls, carousels and content search.
*/

import { get, getRaw, post, put, getCurrentUserId } from './client';
import type {
  FeedItem, Paged, StoryRing, TrendingResponse, RecommendedUser,
  MediaItem, Place, PostType,
} from './types';

const BASE = '/apis/feed';

/* ---------------- feeds ---------------- */

/** Chronological feed of accounts the user follows (plus their own). */
export const homeFeed = (opts: { page?: number; limit?: number; type?: 'post' | 'reel' | 'story' } = {}) =>
  get<Paged<FeedItem>>(`${BASE}/home`, opts);

/** Personalised, ranked. Each item carries `score` and `reasons`. */
export const forYou = (opts: { page?: number; limit?: number } = {}) =>
  get<Paged<FeedItem> & { personalised: boolean; strategy: string }>(`${BASE}/foryou`, opts);

/** Trending posts, hashtags and creators. `hours` sets the window. */
export const trending = (opts: { limit?: number; hours?: number } = {}) =>
  get<TrendingResponse>(`${BASE}/trending`, opts);

/* ---------------- stories ---------------- */

/** 24-hour stories grouped into per-author rings, mine first then unseen. */
export const stories = () =>
  get<{ success: boolean; rings: StoryRing[]; totalStories: number }>(`${BASE}/stories`);

/** Mark a story (or any post) as seen. Safe to call repeatedly. */
export const markViewed = (contentId: string) =>
  post<{ success: boolean; viewed: boolean; views: number; counted: boolean }>(
    `${BASE}/content/${contentId}/view`
  );

/** Author-only: who watched this story. */
export const storyViewers = (storyId: string) =>
  get<{ success: boolean; views: number; viewers: any[] }>(`${BASE}/stories/${storyId}/viewers`);

/* ---------------- hashtags ---------------- */

export const hashtagFeed = (tag: string, opts: { page?: number; limit?: number; sort?: 'recent' | 'top' } = {}) =>
  get<Paged<FeedItem> & { tag: string; isTrending: boolean }>(
    `${BASE}/hashtag/${encodeURIComponent(tag.replace(/^#/, ''))}`,
    opts
  );

export const searchHashtags = (q: string, limit = 20) =>
  getRaw<{ success: boolean; rows: { tag: string; posts: number; isTrending: boolean }[]; total: number }>(
    `${BASE}/hashtags/search`, { q, limit }
  );

/* ---------------- check-ins, places, nearby ---------------- */

/** Places already used in check-ins — powers the location picker. */
export const searchPlaces = (q = '', limit = 20) =>
  getRaw<{ success: boolean; rows: any[]; total: number }>(`${BASE}/places/search`, { q, limit });

/** Everything checked in at one place. */
export const placeFeed = (name: string, opts: { page?: number; limit?: number } = {}) =>
  get<Paged<FeedItem> & { place: Place }>(`${BASE}/place`, { name, ...opts });

/** Location-based discovery. Items carry `distanceKm`. */
export const nearby = (lng: number, lat: number, opts: { radiusKm?: number; limit?: number } = {}) =>
  get<{ success: boolean; center: any; radiusKm: number; total: number; items: FeedItem[] }>(
    `${BASE}/nearby`, { lng, lat, ...opts }
  );

/* ---------------- recommendations ---------------- */

/** Who to follow, each with the reasons it was suggested. */
export const recommendedUsers = (limit = 10) =>
  get<{ success: boolean; rows: RecommendedUser[]; total: number }>(
    `${BASE}/recommendations/users`, { limit }
  );

/** Good content from accounts the user does not follow yet. */
export const recommendedPosts = (limit = 12) =>
  get<{ success: boolean; total: number; items: FeedItem[] }>(
    `${BASE}/recommendations/posts`, { limit }
  );

/* ---------------- tagging ---------------- */

/** Posts a user is tagged in. Defaults to the signed-in user. */
export const taggedFeed = async (userId?: string, opts: { page?: number; limit?: number } = {}) => {
  // The route is /tagged/:userId, so an empty segment would 404 — resolve first.
  const target = userId ?? (await getCurrentUserId());
  if (!target) throw new Error('No user to look up tags for');
  return get<Paged<FeedItem>>(`${BASE}/tagged/${target}`, opts);
};

/** People the current user is allowed to tag. */
export const taggableUsers = (q = '', limit = 20) =>
  get<{ success: boolean; rows: any[]; total: number }>(`${BASE}/taggable`, { q, limit });

/** action: 'set' | 'remove' (author) or 'removeMe' (the tagged person). */
export const updateTags = (
  postId: string,
  body: { action: 'set' | 'remove' | 'removeMe'; targetId?: string; taggedUsers?: any[] }
) => post<{ success: boolean; message: string; taggedUsers?: any[] }>(`${BASE}/posts/${postId}/tags`, body);

/* ---------------- posts ---------------- */

export interface CreatePostInput {
  caption?: string;
  posttype?: PostType;
  posttypechild?: string;
  /** Already-uploaded media. Up to 10 items makes a carousel. */
  media?: Partial<MediaItem>[];
  poll?: { question: string; options: ({ text: string } | string)[]; multiple?: boolean; endsAt?: string };
  place?: Partial<Place> & { lng?: number; lat?: number };
  taggedUsers?: ({ user: string; x?: number; y?: number; mediaIndex?: number } | string)[];
  sound?: any;
  videosound?: string;
  /** Text/status post styling */
  xbackgroundcolor?: string;
  xfontstyle?: string;
  xfontsize?: string;
  xtextalign?: string;
  status_draft_publish?: 'Draft' | 'Publish';
  sharegroup?: any;
}

/**
 * One create endpoint for every post type.
 * Text posts need no media; stories get a 24h expiry automatically.
 */
export const createPost = (input: CreatePostInput) =>
  post<{ success: boolean; message: string; item: FeedItem }>(`${BASE}/posts`, input);

export const updatePost = (
  postId: string,
  input: Partial<Pick<CreatePostInput, 'caption' | 'place' | 'taggedUsers' | 'media' | 'status_draft_publish'>>
) => put<{ success: boolean; message: string; item: FeedItem }>(`${BASE}/posts/${postId}`, input);

export const getPost = (postId: string) =>
  get<{ success: boolean; item: FeedItem }>(`${BASE}/posts/${postId}`);

/* ---------------- polls ---------------- */

/** Pass one option id, or several when the poll allows multiple. */
export const votePoll = (postId: string, optionIds: string | string[]) =>
  post<{ success: boolean; message: string; poll: any }>(`${BASE}/posts/${postId}/poll/vote`, {
    optionIds: Array.isArray(optionIds) ? optionIds : [optionIds],
  });

export const closePoll = (postId: string) =>
  post<{ success: boolean; message: string; poll: any }>(`${BASE}/posts/${postId}/poll/close`);

/* ---------------- search ---------------- */

export const searchContent = (q: string, opts: { page?: number; limit?: number; type?: string } = {}) =>
  get<Paged<FeedItem> & { query: string }>(`${BASE}/search`, { q, ...opts });
