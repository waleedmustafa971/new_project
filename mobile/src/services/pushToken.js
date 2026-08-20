import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import api from '../component/api';
import * as base from '../component/global';

/*
  Device-token registration.

  The server side of push has been finished and waiting for a while; this is the
  piece that was missing. App.tsx fetched an FCM token and stored it, but
  `sendTokenToServer` was a console.log, so no device token ever reached
  POST /apis/notification/register-token and no push could be addressed to
  anyone.

  The ordering is the awkward part, and it is why registration lives here rather
  than inline in App.tsx:

    - initApp() runs at mount, before anyone has signed in. There is no userId to
      attach a token to at that point, so registering there cannot work.
    - Sign-up already sends `fcmtoken` inside its own payload, so a brand-new
      account is covered.
    - Sign-in did not send one at all. An existing user on a new phone therefore
      never registered that phone, which is the common case this fixes.

  So: register on every successful sign-in, and again whenever FCM hands us a new
  token while somebody is signed in. Both paths land here.

  The endpoint uses $addToSet, so repeating a registration is harmless — but the
  last-registered marker means the usual app start makes no network call at all.
*/

const MARKER = 'fcmtoken:registered';

const userIdFromStorage = async () => {
  const raw = await AsyncStorage.getItem('userdata');
  if (!raw) return null;
  try {
    const u = JSON.parse(raw);
    return u?._id || u?.id || u?.userId || null;
  } catch {
    return null;
  }
};

/*
  Register this device against the signed-in account.

  Returns false rather than throwing when there is nobody signed in — that is the
  normal state at app start, not an error. A failed request is also swallowed:
  push is a convenience, and it must never be the reason a sign-in appears to
  fail.
*/
export const registerPushToken = async (tokenArg) => {
  try {
    const userId = await userIdFromStorage();
    if (!userId) return false; // not signed in yet — login will call this again

    const fcmtoken =
      tokenArg ||
      (await AsyncStorage.getItem('fcmtoken')) ||
      (await messaging().getToken());

    if (!fcmtoken) return false;

    // Keyed on both, so a second account signing in on this handset registers
    // too instead of being skipped as "already done".
    const mark = `${userId}:${fcmtoken}`;
    if ((await AsyncStorage.getItem(MARKER)) === mark) return true;

    await api.post('/apis/notification/register-token', { userId, fcmtoken });
    await AsyncStorage.setItem(MARKER, mark);
    await AsyncStorage.setItem('fcmtoken', fcmtoken);

    console.log('[push] device registered for', userId);
    return true;
  } catch (error) {
    console.log('[push] register failed:', error?.response?.data?.message || error?.message);
    return false;
  }
};

/*
  Drop this device from the account being signed out of.

  Without it, the tokens pile up on the first account and whoever signs in next
  on the same handset keeps receiving the previous user's notifications.

  The storage read is issued before anything else and the auth token is passed
  explicitly rather than left to the axios interceptor, because the caller is a
  logout path that is clearing exactly those keys — by the time the interceptor
  ran, the token would already be gone.
*/
export const unregisterPushToken = async () => {
  try {
    const [[, userdata], [, authToken], [, fcmtoken]] = await AsyncStorage.multiGet([
      'userdata',
      'token',
      'fcmtoken',
    ]);

    await AsyncStorage.removeItem(MARKER);
    if (!userdata || !fcmtoken) return false;

    let userId = null;
    try {
      const u = JSON.parse(userdata);
      userId = u?._id || u?.id || u?.userId || null;
    } catch {
      return false;
    }
    if (!userId) return false;

    await fetch(`${base.BASE_URL}/apis/notification/unregister-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ userId, fcmtoken }),
    });

    console.log('[push] device unregistered');
    return true;
  } catch (error) {
    console.log('[push] unregister failed:', error?.message);
    return false;
  }
};
