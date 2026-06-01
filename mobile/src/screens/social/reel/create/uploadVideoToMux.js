import RNFS from "react-native-fs";
import axios from "axios";

export const uploadVideoToMux = async ({
  videoUri,
  userid,
  caption,
  baseUrl,
}) => {
  try {
    console.log("📤 Requesting Mux upload URL...");

    // 1️⃣ Get DIRECT upload URL (NO videoUrl)
    const { data } = await axios.post(
      `${baseUrl}/apis/reel/generate-upload-url`,
      {
        userId: userid,
        prompt: caption,
      }
    );

    const { uploadUrl, uploadId } = data;

    if (!uploadUrl) {
      throw new Error("No upload URL received");
    }

    console.log("✅ Upload URL received");

    // 2️⃣ Remove file:// for RNFS
    const cleanPath = videoUri.startsWith("file://")
      ? videoUri.replace("file://", "")
      : videoUri;

    console.log("📤 Uploading file:", cleanPath);

    // 3️⃣ Upload RAW binary to Mux
    const upload = RNFS.uploadFiles({
      toUrl: uploadUrl,
      method: "PUT",
      files: [
        {
          name: "file",
          filename: "video.mov",
          filepath: cleanPath,
          filetype: "video/quicktime",
        },
      ],
      headers: {
        "Content-Type": "video/quicktime",
      },
      progress: (res) => {
        const percent =
          res.totalBytesSent / res.totalBytesExpectedToSend;
        console.log("⬆️ Upload progress:", Math.round(percent * 100), "%");
      },
    });

    const result = await upload.promise;

    if (result.statusCode !== 200) {
      throw new Error("Mux upload failed");
    }

    console.log("🎉 Upload complete");

    return { success: true, uploadId };
  } catch (error) {
    console.error("❌ Upload failed:", error);
    return { success: false, error };
  }
};
