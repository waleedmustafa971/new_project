import { Server } from "socket.io";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // restrict in production
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("Live Socket connected:", socket.id);
    // Join user personal room
    socket.on("join-user-room", (userId) => {
      socket.join(userId.toString());
      console.log(`User joined room: ${userId}`);
    });
    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });

  return io;
};

/*
  index.js builds its own Server instance rather than calling initSocket, so
  getIO() had nothing to return and every REST-side emit threw. Registering the
  live instance here is what lets the REST controllers reach the same sockets
  the chat handlers already use.
*/
export const setIO = (instance) => {
  io = instance;
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};
