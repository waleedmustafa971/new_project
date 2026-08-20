import NetInfo from "@react-native-community/netinfo";
import { getPendingMessages, updateMessageStatus } from "../../../utils/dbService";
import * as base from '../../../component/global'
//
export const sendLocaltoCloud = async (): Promise<void> => {
  console.log('background task is started')
  //first check internet connection when connected internet then process will start
  const net = await NetInfo.fetch();
  const isOnline = net.isConnected;
  if (!isOnline) return;

  const pending = await getPendingMessages();
  if (!pending.length) return;
  console.log('...background message sending to cloud...', JSON.stringify(pending))
  for (const msg of pending) {
    let audioUrl = msg.audioUrl;
    let imageUrl = msg.imageUrl;
    // console.log('audio local path ',msg.audioUrl) // why its showing console undefine
    console.log('imageUrl local path ', msg.imageUrl) // why its showing console undefine
    // ✅ If audio message, upload first
    if (msg.messagetype === "audio") {
      try {
        //file://///
        audioUrl = await uploadVoiceFile(msg.audioUrl);
        console.log("✅ Audio uploaded:", audioUrl);
      } catch (error) {
        console.log("❌ Upload failed, skipping message");
        continue; // skip this message
      }
    }

    if (msg.messagetype === "image") {
      try {
        const uploadResponse = await pushingPendingimage(msg.imageUrl);
        imageUrl = uploadResponse.map((file: any) => base.BASE_URL + file.url);
        console.log("✅ Clean imageUrl array:", imageUrl);
      } catch (error) {
        console.log("❌ Upload failed, skipping message");
        continue; // skip this message
      }
    }
    const payload = {
      _id: String(msg.id),
      sender: msg.sender,
      receiver: msg.receiver,
      text: msg.text,
      imageUrl: imageUrl,
      videoUrl: msg.videoUrl,
      audioUrl: audioUrl, // ✅ server URL now
      type: msg.type,
      createdAt: msg.createdAt,
      messagetype: msg.messagetype
    };
    //  socket.current.emit("sendMessage", payload)
    await fetch(base.BASE_URL + "/apis/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        payload
      })
    });
    const updatedatastatus = await updateMessageStatus(msg.id, "sent"); // updateMessageStatus why this is not updateing
    console.log('background update send status', updatedatastatus)

  }
};

export const uploadVoiceFile = async (audioUri: string) => {
  /*
    react-native-audio-recorder-player hands back "file:////data/..." on Android
    — four slashes, one too many. React Native cannot open that path, so the
    multipart body arrived with no file attached, the server answered
    "No file uploaded", and the caller logged "Upload failed, skipping message"
    and dropped the voice note. Collapsing the slashes is the whole fix.
  */
  const uri = String(audioUri || "").replace(/^file:\/{2,}/, "file:///");
  if (!uri) throw new Error("No audio file to upload");

  const formData = new FormData();
  formData.append("file", {
    uri,
    type: "audio/mp4", // adjust if needed
    name: "voice.mp4",
  } as any);
  const response = await fetch(base.BASE_URL + "/apis/voice/addvoice", {
    method: "POST",
    body: formData,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Upload failed");
  }
  return data.url; // ✅ return server URL
};

export const pushingPendingimage = async (imageUrl: any) => {
  console.log('pushingPendingimage start...', JSON.stringify(imageUrl));
  const formData = new FormData();
  const uris = typeof imageUrl === 'string'
    ? JSON.parse(imageUrl)
    : imageUrl;

  uris.forEach((uri: string, index: number) => {
    const fileName = uri.split('/').pop();
    const mimeType = mime.getType(uri) || 'image/jpeg';

    formData.append('files', {
      uri: uri,
      type: mimeType,
      name: fileName || `image_${index}.jpg`,
    } as any);
  });

  try {
    const response = await fetch(
      base.BASE_URL + '/apis/voice/addimages',
      {
        method: 'POST',
        body: formData,
        // ❌ REMOVE HEADERS COMPLETELY
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Upload failed");
    }

    return data.data; // ✅ correct field
  } catch (err) {
    console.error('Multi-upload error:', err);
  }
};

export const downLoadcloudtolocal = async () : Promise<void> => {

}

