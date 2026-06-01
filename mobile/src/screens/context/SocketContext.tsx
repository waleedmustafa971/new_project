import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import * as base from '../../component/global';
import { useUser } from './UserContext';

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const { user } = useUser();   // 👈 get user from UserContext
  console.log('...context socket user info : ', user) /// its printing
  const userId = user?._id; // its comming here

  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);

  useEffect(() => {

    console.log('🔌 Socket Provider loaded');
    const userId = user?._id;
    if (!user?._id) { // why its not getting here
      console.log('❌ No userId yet');
      return;
    }

    console.log('🔌 Connecting to:', base.SOCKET_URL, 'User:', userId);

    const socket = io(base.SOCKET_URL, {
      query: { userId },
      transports: ['websocket'],
      forceNew: true
    });

    socket.on('connect', () => {
      console.log('✅ Socket Connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.log('❌ Socket error:', err.message);
    });

    setSocketInstance(socket);

    return () => {
      socket.disconnect();
      setSocketInstance(null);
    };

  }, [userId]);

  return (
    <SocketContext.Provider value={{ socket: socketInstance }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);