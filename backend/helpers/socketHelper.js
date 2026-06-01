import { getIO } from "../socket/socket.js";

/**
 * Emit a socket event to a specific user
 * @param {String|ObjectId} userId - MongoDB user ID
 * @param {String} event - socket event name
 * @param {Object} payload - data to send
 */
export const emitToUser = (userId, event, payload = {}) => {
  try {
    const io = getIO();

    if (!userId) {
      console.warn("emitToUser: userId missing");
      return;
    }

    io.to(userId.toString()).emit(event, payload);

  } catch (error) {
    console.error("emitToUser error:", error.message);
  }
};
