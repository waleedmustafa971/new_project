import BackgroundFetch, {
  HeadlessEvent
} from "react-native-background-fetch";

import { sendLocaltoCloud, downLoadcloudtolocal } from "./services/syncService";
import NetInfo from "@react-native-community/netinfo";

const backgroundSync = async (event: HeadlessEvent): Promise<void> => {
  console.log("[BackgroundFetch] Headless task start:", event.taskId);

  try {
  //first check internet connection when connected internet then process will start
  const net = await NetInfo.fetch();
  const isOnline = net.isConnected;
  if (!isOnline) return;
    await sendLocaltoCloud();
    await downLoadcloudtolocal();
  } catch (error) {
    console.log("Background sync error:", error);
  }

  BackgroundFetch.finish(event.taskId);
};

export default backgroundSync;