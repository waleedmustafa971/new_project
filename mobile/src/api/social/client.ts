/*
  Thin wrapper over the shared axios instance for the Social Media module.

  Everything here goes through src/component/api.js, so the existing auth
  header, token refresh and logout behaviour apply unchanged.

  The backend accepts the acting user as a `userId` query/body field on the
  social endpoints, so we attach the signed-in user automatically. That means
  screens can call `feedApi.forYou()` without threading the id through by hand.
*/

import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../component/api';

/** Cached so we don't hit AsyncStorage on every request. */
let cachedUserId: string | null = null;

export const setCurrentUserId = (id: string | null) => {
  cachedUserId = id;
};

export const getCurrentUserId = async (): Promise<string | null> => {
  if (cachedUserId) return cachedUserId;
  try {
    const raw = await AsyncStorage.getItem('userdata');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    cachedUserId = parsed?._id ?? null;
    return cachedUserId;
  } catch {
    return null;
  }
};

/** Clear on logout so the next user doesn't inherit the previous id. */
export const clearCurrentUserId = () => {
  cachedUserId = null;
};

const withUser = async (params: Record<string, any> = {}) => {
  if (params.userId) return params;
  const id = await getCurrentUserId();
  return id ? { ...params, userId: id } : params;
};

/** Strip undefined/null so they don't become the string "undefined". */
const clean = (obj: Record<string, any> = {}) => {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  }
  return out;
};

export async function get<T = any>(path: string, params: Record<string, any> = {}): Promise<T> {
  const res = await api.get(path, { params: clean(await withUser(params)) });
  return res.data as T;
}

/** GET without automatically attaching the current user. */
export async function getRaw<T = any>(path: string, params: Record<string, any> = {}): Promise<T> {
  const res = await api.get(path, { params: clean(params) });
  return res.data as T;
}

export async function post<T = any>(path: string, body: Record<string, any> = {}): Promise<T> {
  const res = await api.post(path, await withUser(body));
  return res.data as T;
}

export async function put<T = any>(path: string, body: Record<string, any> = {}): Promise<T> {
  const res = await api.put(path, await withUser(body));
  return res.data as T;
}

/**
 * Turn an axios error into the backend's own message.
 * The social endpoints always answer { success, message }.
 */
export const errorMessage = (err: any): string =>
  err?.response?.data?.message || err?.message || 'Something went wrong';
