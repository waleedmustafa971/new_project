// helpers/presence.js

/*
  Who is currently connected.

  The set used to live as a local `const onlineUsers = new Set()` inside
  index.js, which meant nothing outside that file could ask the one question
  that matters for message notifications: is this person actually here right
  now? Moving it here changes no behaviour — index.js still owns adding and
  removing on connect and disconnect — but makes the answer reachable.

  This is process-local, and deliberately so at this size. Across several
  server instances it would need Redis or the socket adapter's own presence;
  the consequence today is that a push could be skipped for someone connected
  to a different instance, which is a problem worth having only once there is
  more than one.

  ----------------------------------------------------------------------------
  One account, several sockets.

  It was a flat Set of user ids, which assumed one socket per person. The app
  opens more than that: SocketContext holds the chat socket for the whole
  session, and CreateStream, Interactive and InteractiveRoom each open their
  own when a live screen mounts. Closing any one of them called markOffline and
  deleted the id outright, so leaving a live stream reported you offline to
  every chat you had open while your chat socket was still very much connected
  — and messageNotify then sent a push to someone sitting in the app.

  So each user maps to the set of sockets they currently hold, and they only
  leave the roster when the last one goes. Membership is what "online" means;
  the socket ids exist to count.
*/

const sockets = new Map(); // userId -> Set<socketId>

export const markOnline = (userId, socketId) => {
  if (!userId) return;
  const key = String(userId);
  let held = sockets.get(key);
  if (!held) {
    held = new Set();
    sockets.set(key, held);
  }
  /*
    A caller with no socket id gets one synthetic entry standing for "connected
    somehow". Without it the set would be empty and the user absent from the
    roster despite having just been marked online.
  */
  held.add(socketId ? String(socketId) : `anon:${key}`);
};

export const markOffline = (userId, socketId) => {
  if (!userId) return;
  const key = String(userId);
  const held = sockets.get(key);
  if (!held) return;

  // No socket id means "drop this user entirely", which is the old behaviour
  // and still what a forced sign-out wants.
  if (socketId) held.delete(String(socketId));
  else held.clear();

  if (held.size === 0) sockets.delete(key);
};

export const isOnline = (userId) => !!userId && sockets.has(String(userId));

export const onlineList = () => Array.from(sockets.keys());

/* How many sockets this account currently holds. Diagnostics only. */
export const socketCount = (userId) =>
  (sockets.get(String(userId)) || new Set()).size;

export default sockets;
