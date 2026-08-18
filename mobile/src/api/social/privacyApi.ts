/*
  Privacy Settings — every endpoint under /apis/privacy.

  Public / private / custom modes, the follow-request queue a private
  account needs, and the close-friends allow list.
*/

import { get, post } from './client';
import type { Audience, PrivacyMode, PrivacySettings, Visibility, MiniUser, ApiResult } from './types';

const BASE = '/apis/privacy';

export interface SettingsResponse extends ApiResult {
  privacy: PrivacyMode;
  /** What is actually in force right now — preset or custom. */
  effective: PrivacySettings;
  /** Saved custom choices, kept even while in public/private mode. */
  custom: Partial<PrivacySettings>;
  closeFriendsCount: number;
  pendingFollowRequests: number;
  options: {
    areas: (keyof PrivacySettings)[];
    audiences: Audience[];
    modes: PrivacyMode[];
  };
}

export const getSettings = () => get<SettingsResponse>(`${BASE}/settings`);

/**
 * Change the mode, the per-area controls, or both.
 * Only recognised keys are written, so a stray field can't widen access.
 */
export const updateSettings = (body: {
  privacy?: PrivacyMode;
  settings?: Partial<PrivacySettings>;
}) => post<SettingsResponse>(`${BASE}/settings`, body);

/* ---------------- visibility ---------------- */

/** What may the current user see of this profile? Call before rendering. */
export const getVisibility = (targetId: string) =>
  get<Visibility & ApiResult>(`${BASE}/visibility`, { targetId, viewerId: undefined });

/** Profile with the privacy mask already applied — safe to render directly. */
export const getMaskedProfile = (targetId: string) =>
  get<ApiResult & { user: any; visibility: Visibility; needsApproval: boolean }>(
    `${BASE}/profile`, { targetId }
  );

/* ---------------- follow requests ---------------- */

/**
 * Follow that respects privacy: public accounts follow instantly, private
 * ones get a pending request. Returns the resulting status.
 */
export const follow = (targetId: string) =>
  post<ApiResult & { status: 'following' | 'requested' }>(`${BASE}/follow`, { targetId });

export const cancelFollowRequest = (targetId: string) =>
  post<ApiResult & { status: 'none' }>(`${BASE}/follow/cancel`, { targetId });

/** Requests waiting on the current user's approval. */
export const followRequests = () =>
  get<ApiResult & { rows: MiniUser[]; total: number }>(`${BASE}/follow-requests`);

/** Requests the current user has sent that are still pending. */
export const sentFollowRequests = () =>
  get<ApiResult & { rows: MiniUser[]; total: number }>(`${BASE}/follow-requests/sent`);

export const respondFollowRequest = (requesterId: string, action: 'accept' | 'reject') =>
  post<ApiResult>(`${BASE}/follow-requests/respond`, { requesterId, action });

/* ---------------- close friends ---------------- */

export const closeFriends = () =>
  get<ApiResult & { rows: MiniUser[]; total: number }>(`${BASE}/close-friends`);

export const updateCloseFriends = (targetId: string, action: 'add' | 'remove') =>
  post<ApiResult>(`${BASE}/close-friends`, { targetId, action });
