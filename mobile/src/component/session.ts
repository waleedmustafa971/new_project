import { DeviceEventEmitter } from 'react-native';

/*
  A signal that the stored session changed.

  Every auth path in this app writes the session straight to AsyncStorage --
  `token`, `refreshToken`, `userdata`, `userinfo` -- and AsyncStorage has no
  change notification of its own. UserContext therefore read it once, in a
  mount effect, and never again: signing in populated storage but left
  `UserContext.user` null for the rest of the process's life.

  That is not a cosmetic gap. SocketContext refuses to open a socket without
  `user._id`, so the chat socket never connected, every message failed the
  `socket?.connected` check and stayed "pending", and screens that pass the
  signed-in id down as a route param passed null -- which is what made starting
  a call answer "A valid userId is required". Live streaming was unaffected
  only because those screens read `userdata` from AsyncStorage themselves.

  So the writers announce, and UserContext listens. Keeping this to a signal
  rather than a wrapper around the writes means each auth screen keeps storing
  exactly what it stored before; it just says so afterwards.
*/
export const SESSION_CHANGED = 'session-changed';

export const notifySessionChanged = () => {
  DeviceEventEmitter.emit(SESSION_CHANGED);
};
