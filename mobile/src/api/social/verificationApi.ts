/*
  Verified Badge (blue tick) — the social endpoints under /apis/verification.

  Applying uploads ID documents, so it goes through multipart/form-data
  rather than the JSON client.
*/

import api from '../../component/api';
import { get, getRaw, post, getCurrentUserId } from './client';
import type { ApiResult, BadgeStatus } from './types';

const BASE = '/apis/verification';

export type BadgeCategory =
  | 'creator' | 'public_figure' | 'business' | 'news' | 'sports' | 'entertainment' | 'other';

export type IdDocumentType =
  | 'passport' | 'national_id' | 'driving_licence' | 'trade_licence' | 'other';

export interface ApplyInput {
  fullName: string;
  knownAs?: string;
  category: BadgeCategory;
  country?: string;
  idDocumentType?: IdDocumentType;
  notes?: string;
  referenceLinks?: string[];
  /** Local files from the image picker: { uri, name, type } */
  documents?: { uri: string; name?: string; type?: string }[];
}

/**
 * Submit or resubmit a blue-tick application.
 * A rejected application can be resubmitted in place; a pending one cannot.
 */
export async function apply(input: ApplyInput) {
  const userid = await getCurrentUserId();
  const form = new FormData();

  form.append('userid', String(userid ?? ''));
  form.append('fullName', input.fullName);
  form.append('category', input.category);
  if (input.knownAs) form.append('knownAs', input.knownAs);
  if (input.country) form.append('country', input.country);
  if (input.idDocumentType) form.append('idDocumentType', input.idDocumentType);
  if (input.notes) form.append('notes', input.notes);
  if (input.referenceLinks?.length) {
    form.append('referenceLinks', JSON.stringify(input.referenceLinks));
  }

  (input.documents ?? []).forEach((doc, i) => {
    form.append('images', {
      uri: doc.uri,
      name: doc.name ?? `document_${i}.jpg`,
      type: doc.type ?? 'image/jpeg',
    } as any);
  });

  const res = await api.post(`${BASE}/apply`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data as ApiResult & { request: any };
}

/** What the Verification screen shows: current state and whether they can apply. */
export async function status() {
  const userid = await getCurrentUserId();
  return getRaw<BadgeStatus>(`${BASE}/my-status`, { userid });
}

export async function withdraw() {
  const userid = await getCurrentUserId();
  return post<ApiResult>(`${BASE}/withdraw`, { userid });
}

/**
 * Bulk badge lookup so a feed or comment list can render ticks in one call
 * instead of one request per author.
 */
export const badges = (userIds: string[]) =>
  getRaw<ApiResult & { badges: Record<string, { verified: boolean; accountType: string }> }>(
    `${BASE}/badge`, { userIds: userIds.join(',') }
  );
