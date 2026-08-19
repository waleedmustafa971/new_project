// helpers/messageNotify.js

/*
  Offline message notifications.

  Hooked at the two places `handleSendMessage` is called rather than inside it:
  the handler has three separate branches for private text, attachments and
  group sends, and a notification added to each would be three chances for the
  next branch to forget one. The call sites are two, and they are the whole
  surface.

  "Offline" is the point. Someone with the app open is already being shown the
  message by the socket that just delivered it; pushing as well means their
  phone buzzes for a conversation they are actively reading. So presence is
  checked first, and a connected recipient gets nothing.
*/

import { ConversationModel } from "../models/ConversationModel.js";
import { isOnline } from "./presence.js";
import { notify } from "../services/notificationService.js";

/* Enough of the message to be recognisable in a notification, and no more. */
const previewOf = (data = {}) => {
  const text = String(data.text || data.message || "").trim();
  if (text) return text.length > 80 ? `${text.slice(0, 77)}…` : text;
  if (data.imageUrl || data.image) return "📷 Photo";
  if (data.videoUrl || data.video) return "🎥 Video";
  if (data.audioUrl || data.audio || data.voice) return "🎤 Voice message";
  if (data.fileUrl || data.file) return "📎 Attachment";
  return "sent you a message";
};

/*
  Notify a recipient who is not connected.

  Failures are swallowed: a message that was delivered must not be reported as
  failed because a notification could not be written.
*/
export const notifyOfflineMessage = async (data = {}) => {
  try {
    const sender = data.sender || data.msgByUserId;
    const receiver = data.receiver;
    if (!sender || !receiver) return null;
    if (String(sender) === String(receiver)) return null;

    // Connected right now — the socket already delivered it.
    if (isOnline(receiver)) return null;

    /*
      A muted conversation stays muted. The per-conversation mute already
      existed for the in-app list; honouring it here is what stops a muted
      thread being the one thing that still reaches the lock screen.
    */
    const convo = await ConversationModel.findOne({
      $or: [
        { sender, receiver },
        { sender: receiver, receiver: sender },
      ],
    }).select("mutedBy").lean();

    if ((convo?.mutedBy || []).some((m) => String(m) === String(receiver))) return null;

    return await notify({
      recipient: receiver,
      actor: sender,
      type: "message",
      preview: previewOf(data),
    });
  } catch (err) {
    console.error("[message-notify]", err.message);
    return null;
  }
};

export default notifyOfflineMessage;
