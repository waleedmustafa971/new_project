import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import * as base from '../../component/global';
import { useUser } from './UserContext';
import { socketAuth, attachAuthRecovery } from '../../component/socketAuth';

interface SocketContextType {
  socket: Socket | null;
  /* Ids of everyone currently connected, as the server last reported them. */
  onlineUserIds: string[];
  isUserOnline: (id?: string | null) => boolean;
  /* Unread message counts, keyed by the other party: a partner id for a direct
     chat, a group id for a group one. */
  unreadByPeer: Record<string, number>;
  totalUnread: number;
  clearUnread: (peerId?: string | null) => void;
  /* Which conversation is on screen right now, so its messages are never
     counted as unread. Pass null when leaving the chat. */
  setActiveChat: (peerId?: string | null) => void;
  /* Notifications that have arrived since the list was last opened, newest
     first, plus the count for a badge. */
  liveNotifications: any[];
  unreadNotifications: number;
  clearNotifications: () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  onlineUserIds: [],
  isUserOnline: () => false,
  unreadByPeer: {},
  totalUnread: 0,
  clearUnread: () => {},
  setActiveChat: () => {},
  liveNotifications: [],
  unreadNotifications: 0,
  clearNotifications: () => {},
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const { user } = useUser();   // 👈 get user from UserContext
  const userId = user?._id;

  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [unreadByPeer, setUnreadByPeer] = useState<Record<string, number>>({});
  const [liveNotifications, setLiveNotifications] = useState<any[]>([]);

  /*
    The open conversation, held in a ref rather than state.

    The "receiveMessage" listener is registered once, for the life of the
    socket. Reading a piece of state inside it would capture whatever that
    state was when the listener was created and never see another value; a ref
    is read at call time, which is what a long-lived subscription needs.
  */
  const activeChatRef = useRef<string | null>(null);

  const clearUnread = (peerId?: string | null) => {
    if (!peerId) return;
    setUnreadByPeer((prev) => {
      if (!prev[String(peerId)]) return prev;   // no re-render when nothing changes
      const next = { ...prev };
      delete next[String(peerId)];
      return next;
    });
  };

  const clearNotifications = () => setLiveNotifications([]);

  const setActiveChat = (peerId?: string | null) => {
    activeChatRef.current = peerId ? String(peerId) : null;
    if (peerId) clearUnread(peerId);
  };

  useEffect(() => {

    console.log('🔌 Socket Provider loaded');
    if (!userId) {
      console.log('❌ No userId yet');
      setOnlineUserIds([]);
      setUnreadByPeer({});
      setLiveNotifications([]);
      return;
    }

    console.log('🔌 Connecting to:', base.SOCKET_URL, 'User:', userId);

    const socket = io(base.SOCKET_URL, {
      auth: socketAuth,
      query: { userId },
      transports: ['websocket'],
      forceNew: true
    });
    attachAuthRecovery(socket);

    /*
      The online roster lives here rather than in each screen.

      The server broadcasts "onlineUsers" when somebody connects and when
      somebody disconnects, and never otherwise. Three screens each subscribed
      on mount — ChatScreen, ChatDetails and ChatHeaders — which meant they only
      ever learned the roster if a connection happened to change while they were
      open. Open a chat with both people already connected and no broadcast was
      coming, so the list stayed empty and the header said "Offline" about
      someone who was plainly there.

      One subscription, held for as long as the socket is, and an explicit ask
      on every connect. Screens read the answer instead of racing for it.
    */
    const askForRoster = () => socket.emit('getOnlineUsers');

    socket.on('connect', () => {
      console.log('✅ Socket Connected:', socket.id);
      askForRoster();
    });

    socket.on('onlineUsers', (users: string[]) => {
      setOnlineUserIds(Array.isArray(users) ? users.map(String) : []);
    });

    /*
      Unread counting, app-wide.

      The server already emits "receiveMessage" to the recipient's own room for
      every incoming message, and excludes the sender — so this fires exactly
      once per message that is genuinely for you. Nothing outside the chat
      screens was listening, which is why a message arriving while you were
      anywhere else in the app produced no sign at all until you walked into the
      messages section and the list reloaded. There is no push to fall back on
      either: helpers/messageNotify.js deliberately skips one when the recipient
      is connected, and an open app is connected.

      Counting here, on the socket the whole app shares, is what makes the badge
      possible from any screen.
    */
    socket.on('receiveMessage', (payload: any) => {
      const msg = payload?.messages || payload;
      if (!msg) return;

      const sender = String(msg.msgByUserId?._id || msg.msgByUserId || msg.sender || '');
      if (!sender || sender === String(userId)) return;   // never count your own

      // A group message belongs to the group thread, a direct one to the sender.
      const groupId = msg.group?._id || msg.group || payload?.groupId;
      const peer = String(groupId || sender);

      // The conversation you are looking at is already read.
      if (activeChatRef.current && activeChatRef.current === peer) return;

      setUnreadByPeer((prev) => ({ ...prev, [peer]: (prev[peer] || 0) + 1 }));
    });

    /*
      Notifications, live.

      The server writes the record and attempts a push, and until now that was
      all of delivery — nothing reached an open app, so a follow or a like or a
      story view only showed up when the notification list was opened and
      re-fetched. That is the delay: the record existed immediately and nobody
      was told about it.

      Capped because this is a "since you last looked" buffer for the badge and
      the top of the list, not storage — the list itself pages from the server.
    */
    socket.on('notification', (n: any) => {
      if (!n) return;
      setLiveNotifications((prev) => {
        // The server upserts on (recipient, actor, type, post), so the same
        // notification can be re-sent when it is updated rather than created.
        const withoutDupe = prev.filter((p) => String(p._id) !== String(n._id));
        return [n, ...withoutDupe].slice(0, 50);
      });
    });

    socket.on('connect_error', (err) => {
      console.log('❌ Socket error:', err.message);
    });

    /* The roster is only true while connected; a dropped socket must not leave
       stale green dots behind. Unread counts are not cleared here — they are
       about messages that arrived, not about the connection. */
    socket.on('disconnect', () => setOnlineUserIds([]));

    setSocketInstance(socket);

    return () => {
      socket.disconnect();
      setSocketInstance(null);
      setOnlineUserIds([]);
    };

  }, [userId]);

  const isUserOnline = (id?: string | null) =>
    !!id && onlineUserIds.includes(String(id));

  const totalUnread = Object.values(unreadByPeer).reduce((n, v) => n + v, 0);

  return (
    <SocketContext.Provider
      value={{
        socket: socketInstance,
        onlineUserIds,
        isUserOnline,
        unreadByPeer,
        totalUnread,
        clearUnread,
        setActiveChat,
        liveNotifications,
        unreadNotifications: liveNotifications.length,
        clearNotifications,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
