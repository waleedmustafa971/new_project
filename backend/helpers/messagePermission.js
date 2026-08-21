import mongoose from "mongoose";
import User from "../models/users.js";
import { ConversationModel, MessageModel } from "../models/ConversationModel.js";
import { canView, relationship, isId } from "./privacy.js";

/*
  May `senderId` send a direct message to `receiverId`?

  The privacy model has carried a `messages` audience for a while and the app
  has a screen that sets it, but nothing ever asked: every account could message
  every other account regardless, so "Followers" and "No one" were settings that
  did nothing, and a block did not stop a message either.

  One rule bends the audience, and it is the one every messenger has: if the two
  are already in a conversation the recipient has spoken in, the message goes
  through whatever the setting says. Replying to someone is consent, and an
  audience change should not silently cut off a thread that is already running.
  A block is not bent — it is checked first and refuses either direction.
*/
export async function canMessage(senderId, receiverId) {
  if (!isId(senderId) || !isId(receiverId)) {
    return { allowed: false, reason: "Invalid sender or recipient" };
  }
  if (String(senderId) === String(receiverId)) return { allowed: true };

  const receiver = await User.findById(receiverId)
    /* blockedUsers, not "blocked" — this document is handed to relationship()
       as bDoc, so a field missing here reads as an absent block rather than
       being fetched, and the recipient's block would never be seen. */
    .select("name privacy privacySettings followers followRequests closeFriends blockedUsers")
    .lean();
  if (!receiver) return { allowed: false, reason: "That account no longer exists" };

  const rel = await relationship(senderId, receiver);
  if (rel === "blocked") {
    /* Deliberately not "you are blocked" — who blocked whom is not something
       either side gets told. */
    return { allowed: false, reason: "You can't send messages to this account" };
  }

  if (await canView(senderId, receiver, "messages", rel)) return { allowed: true };

  const existing = await ConversationModel.findOne({
    type: "private",
    $or: [
      { sender: senderId, receiver: receiverId },
      { sender: receiverId, receiver: senderId },
    ],
  })
    .select("messages")
    .lean();

  if (existing?.messages?.length) {
    const theyReplied = await MessageModel.exists({
      _id: { $in: existing.messages },
      msgByUserId: new mongoose.Types.ObjectId(String(receiverId)),
    });
    if (theyReplied) return { allowed: true };
  }

  const name = receiver.name || "This account";
  return {
    allowed: false,
    reason: `${name} only accepts messages from people they follow or approve.`,
  };
}

export default canMessage;
