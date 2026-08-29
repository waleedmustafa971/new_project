import AsyncStorage from '@react-native-async-storage/async-storage';
import * as base from './global';

/*
  The socket handshake now has to prove who it is.

  The server used to take `userId` from the query string, which meant any client
  could connect as anyone; it now verifies the same JWT the HTTP side does and
  ignores the query identity unless it matches.

  socket.io invokes this on every connect AND every reconnect, which is the
  reason it is a callback rather than a value: reading storage once at mount
  would keep re-presenting a token that has since been refreshed.
*/
export const socketAuth = cb => {
  AsyncStorage.getItem('token')
    .then(token => cb({ token: token || '' }))
    .catch(() => cb({ token: '' }));
};

/*
  Access tokens last 15 minutes and the socket is long-lived, so the interesting
  case is not the first connect but every one after it. axios recovers from a
  401 through its response interceptor; a socket has no equivalent, so without
  this a rejected handshake would retry the same dead token forever and chat,
  presence, calls and live would go quiet 15 minutes after login with nothing in
  the UI to explain it.

  Deliberately one attempt per socket: if the refresh succeeds and the server
  still says no, the session is genuinely gone and retrying would spin.
*/
export const refreshAccessToken = async () => {
  try {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    const res = await fetch(`${base.BASE_URL}/apis/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;

    const data = await res.json();
    if (!data?.token) return false;

    await AsyncStorage.setItem('token', data.token);
    return true;
  } catch {
    return false;
  }
};

/*
  Wires the recovery above onto a socket. Call it once, right after io(...).
  Only reacts to the server's "unauthorized: ..." handshake errors -- a network
  drop is socket.io's own business and it already retries those itself.
*/
export const attachAuthRecovery = socket => {
  let retried = false;

  socket.on('connect_error', async err => {
    const message = String(err?.message || '');
    if (!message.startsWith('unauthorized') || retried) return;

    retried = true;
    if (await refreshAccessToken()) {
      socket.connect();          // socketAuth re-reads storage on the way back in
    }
  });

  socket.on('connect', () => {
    retried = false;             // a good connection re-arms the one retry
  });

  return socket;
};

export default socketAuth;
