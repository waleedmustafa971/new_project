import { useEffect, useRef } from "react";
import { useSocket } from "../context/SocketContext";
import { navigationRef } from "../../navigation/RootNavigation";

/*
  Listens for a call wherever you happen to be in the app.

  The server rings every callee over their own socket room the moment a call
  starts, and nothing was listening — so a call could be placed and never
  arrive. This has no UI of its own: it sits under the socket provider for the
  life of the app and pushes the call screen when one comes in, which is why it
  works from the feed, a profile or a completely unrelated module rather than
  only inside a chat.

  It renders nothing, so it is mounted once next to the navigator rather than
  wrapped around anything.
*/

const IncomingCallListener = () => {
  const { socket } = useSocket();
  /* One ring at a time. A second incoming call while the screen is already up
     would otherwise push a second call screen on top of the first, and hanging
     up would only reveal the one underneath. */
  const activeRef = useRef<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    const onIncoming = (payload: any) => {
      const callId = String(payload?.callId || "");
      if (!callId || activeRef.current === callId) return;

      /* The navigator may not be ready during a cold start — the ring is
         dropped rather than crashing, and the push notification the server
         also sends is what covers that case. */
      if (!navigationRef.isReady?.()) return;

      activeRef.current = callId;
      navigationRef.navigate("CallScreen", {
        callId,
        channelName: payload?.channelName,
        kind: payload?.kind || "audio",
        peer: payload?.from || {},
        incoming: true,
      });
    };

    const onOver = (payload: any) => {
      if (!payload?.callId || String(payload.callId) === activeRef.current) {
        activeRef.current = null;
      }
    };

    socket.on("incomingCall", onIncoming);
    socket.on("callEnded", onOver);
    socket.on("callMissed", onOver);

    return () => {
      socket.off("incomingCall", onIncoming);
      socket.off("callEnded", onOver);
      socket.off("callMissed", onOver);
    };
  }, [socket]);

  return null;
};

export default IncomingCallListener;
