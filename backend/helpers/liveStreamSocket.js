import { emitToUser } from "./socketHelper.js";

export const notifyHostCohostRequest = (hostId, streamId, fromUserId, channelName) => {
  emitToUser(hostId, "cohost-request", {
    type: "COHOST_REQUEST",
    streamId: streamId,
    channelName: channelName,
    fromUserId,
    message: "New co-host request"
  });
};
