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
*/

const onlineUsers = new Set();

export const markOnline = (userId) => {
  if (userId) onlineUsers.add(String(userId));
};

export const markOffline = (userId) => {
  if (userId) onlineUsers.delete(String(userId));
};

export const isOnline = (userId) => !!userId && onlineUsers.has(String(userId));

export const onlineList = () => Array.from(onlineUsers);

export default onlineUsers;
