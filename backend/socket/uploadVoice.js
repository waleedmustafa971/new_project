import path from "path";
import crypto from "crypto";
import fs from "fs";

export const saveBase64Audio = async (base64Data) => {
  if (!base64Data) return null;

  const uploadDir = "uploads/chat/";

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Extract MIME type
  const mimeMatch = base64Data.match(/^data:(audio\/\w+);base64,/);
  if (!mimeMatch) {
    console.log("❌ Invalid base64 audio format");
    return null;
  }

  const mimeType = mimeMatch[1]; // audio/mp4
  const extension = mimeType.split("/")[1]; // mp4

  const fileName =
    Date.now() + "-" + crypto.randomBytes(6).toString("hex") + "." + extension;

  const filePath = path.join(uploadDir, fileName);

  // Remove base64 header
  const base64Audio = base64Data.replace(/^data:audio\/\w+;base64,/, "");

  await fs.promises.writeFile(filePath, base64Audio, "base64");

  return fileName;
};