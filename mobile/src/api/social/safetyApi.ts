/*
  Block & Report — every endpoint under /apis/safety.

  Blocking is symmetric: once either side blocks, neither sees the other
  anywhere in the app, and any follow relationship is torn down.
*/

import { get, getRaw, post } from './client';
import type { ApiResult, MiniUser, ReportReason } from './types';

const BASE = '/apis/safety';

/* ---------------- blocking ---------------- */

export const block = (targetId: string) =>
  post<ApiResult & { blocked: true }>(`${BASE}/block`, { targetId });

export const unblock = (targetId: string) =>
  post<ApiResult & { blocked: false }>(`${BASE}/unblock`, { targetId });

export const blockedList = () =>
  get<ApiResult & { rows: MiniUser[]; total: number }>(`${BASE}/blocked`);

/**
 * Which way round the block runs matters to the UI:
 *   iBlockedThem  -> show an Unblock button
 *   theyBlockedMe -> show nothing at all
 */
export const blockStatus = (targetId: string) =>
  get<ApiResult & {
    iBlockedThem: boolean;
    theyBlockedMe: boolean;
    blocked: boolean;
    canInteract: boolean;
  }>(`${BASE}/block-status`, { targetId });

/** Every user id to filter out of locally cached lists. */
export const blockedIds = () =>
  get<ApiResult & { ids: string[]; total: number }>(`${BASE}/blocked-ids`);

/* ---------------- reporting ---------------- */

export type ReportTarget =
  | 'post' | 'reel' | 'story' | 'comment' | 'user' | 'group' | 'livestream' | 'message';

/** The reason list to show in the report sheet. Not user-specific. */
export const reportReasons = () =>
  getRaw<ApiResult & { reasons: ReportReason[]; targetTypes: ReportTarget[] }>(
    `${BASE}/report-reasons`
  );

/**
 * File a report. Set `block: true` for the usual
 * "also block this person" checkbox.
 * Repeat reports on the same item collapse instead of flooding the queue.
 */
export const report = (body: {
  targetType: ReportTarget;
  targetId: string;
  reason: string;
  details?: string;
  block?: boolean;
}) => post<ApiResult & { report: any; blocked: boolean; duplicate?: boolean }>(`${BASE}/report`, body);

export const myReports = (opts: { page?: number; limit?: number } = {}) =>
  get<ApiResult & { rows: any[]; total: number }>(`${BASE}/my-reports`, opts);

/** Has the user already reported this item? Lets the UI grey out the button. */
export const reportStatus = (targetId: string) =>
  get<ApiResult & { reported: boolean; status: string | null; reportedAt: string | null }>(
    `${BASE}/report-status`, { targetId }
  );
