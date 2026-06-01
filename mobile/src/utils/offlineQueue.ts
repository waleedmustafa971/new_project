import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "offline_messages_queue";

// Save message
export const addToQueue = async (message: any) => {
  try {
    const existing = await AsyncStorage.getItem(QUEUE_KEY);
    const queue = existing ? JSON.parse(existing) : [];
    queue.push(message);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.log("Queue save error", e);
  }
};

// Get all queued messages
export const getQueue = async () => {
  const data = await AsyncStorage.getItem(QUEUE_KEY);
  return data ? JSON.parse(data) : [];
};

// Clear queue
export const clearQueue = async () => {
  await AsyncStorage.removeItem(QUEUE_KEY);
};