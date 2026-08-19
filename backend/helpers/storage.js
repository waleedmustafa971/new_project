// helpers/storage.js

/*
  Cloud storage (AWS S3), with local disk as the fallback.

  The codebase already talks to S3 in several places — `controllers/auth.js`,
  the gallery and vendor upload helpers each construct their own `S3Client` from
  the same four environment variables, and each decides for itself what a stored
  file's URL looks like. That is why this row sat at 60&nbsp;%: the capability
  exists, but there is no single answer to "where does a file live and what is
  its address", so a bucket change means finding every copy.

  This is that single answer. Nothing here rewrites the existing controllers —
  they keep working exactly as they are, per the additive rule — but everything
  new goes through here, and the old ones can be moved over one at a time.

  Two things worth being plain about:

  * **No bucket is configured on this server.** `S3_BUCKET_NAME` is unset, which
    is why the boot log says `Bucket Name: undefined`. So the code below reports
    `configured: false` and every caller falls back to local disk rather than
    failing. That is a deployment gap, not a missing feature, and it means the
    S3 path here has never moved a real byte.

  * **Uploads are presigned rather than proxied.** A 100 MB video sent through
    the API occupies a Node process for the whole transfer and is then written
    out a second time; a presigned PUT lets the device send it straight to S3
    and the server only records the result. The local fallback keeps the same
    two-step shape so the client has one flow, not two.
*/

import crypto from "crypto";
import path from "path";

const BUCKET = process.env.S3_BUCKET_NAME || "";
const REGION = process.env.AWS_REGION || process.env.S3_REGION || "us-east-1";
const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID || "";
const SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";

/* A public base for local files, so a URL is absolute wherever it is rendered. */
const PUBLIC_BASE = (process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");

export const isS3Configured = () => Boolean(BUCKET && ACCESS_KEY && SECRET_KEY);

/* How long a presigned URL stays usable. Long enough for a big upload on a
   slow connection, short enough that a leaked URL is not a standing grant. */
export const UPLOAD_URL_TTL_SECONDS = 15 * 60;

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;   // matches multerConfig

const EXT_TYPE = {
  ".jpg": "image", ".jpeg": "image", ".png": "image", ".webp": "image", ".gif": "image",
  ".mp4": "video", ".mov": "video", ".webm": "video", ".m4v": "video",
  ".mp3": "audio", ".m4a": "audio", ".wav": "audio", ".aac": "audio",
};

export const ALLOWED_KINDS = ["image", "video", "audio"];

export const kindOf = (filename = "", mimetype = "") => {
  const byMime = String(mimetype).split("/")[0];
  if (ALLOWED_KINDS.includes(byMime)) return byMime;
  return EXT_TYPE[path.extname(String(filename)).toLowerCase()] || null;
};

/*
  Where a file lives inside the bucket.

  Sharded by date and given a random name rather than keeping the one the device
  sent. Two people uploading `IMG_0001.jpg` must not collide, and an original
  filename is a small privacy leak of its own — phones name files after the
  moment they were taken.
*/
export const buildKey = ({ userId, filename, folder = "uploads" }) => {
  const ext = path.extname(String(filename || "")).toLowerCase().slice(0, 10);
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const rand = crypto.randomBytes(12).toString("hex");
  const who = String(userId || "anon").slice(-8);
  return `${folder}/${yyyy}/${mm}/${who}-${rand}${ext}`;
};

/* The address a client should use to read a stored object back. */
export const publicUrl = (key) => {
  if (!key) return null;
  if (/^https?:\/\//i.test(key)) return key;             // already absolute
  if (isS3Configured()) {
    return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key.replace(/^\/+/, "")}`;
  }
  const local = `/${String(key).replace(/^\/+/, "")}`;
  return PUBLIC_BASE ? `${PUBLIC_BASE}${local}` : local;
};

/*
  What the deployment can actually do right now.

  Reported to the client rather than assumed, so an app can show "uploads are
  running locally" instead of discovering it from a URL that only works on one
  host. Credentials are never echoed — only whether they are present.
*/
export const storageStatus = () => ({
  driver: isS3Configured() ? "s3" : "local",
  configured: isS3Configured(),
  bucket: isS3Configured() ? BUCKET : null,
  region: isS3Configured() ? REGION : null,
  hasCredentials: Boolean(ACCESS_KEY && SECRET_KEY),
  hasBucket: Boolean(BUCKET),
  maxUploadBytes: MAX_UPLOAD_BYTES,
  allowedKinds: ALLOWED_KINDS,
  urlTtlSeconds: UPLOAD_URL_TTL_SECONDS,
  // Says out loud what the boot warning only hints at.
  note: isS3Configured()
    ? "Uploads go straight to S3 with a presigned PUT."
    : "No S3 bucket configured — uploads fall back to local disk via /apis/posting/media/upload.",
});

/*
  A presigned PUT the device can upload to directly.

  Imported lazily: @aws-sdk/client-s3 and its signer are several megabytes, and
  on a server with no bucket configured this function is never reached. Paying
  that cost at boot for a code path that cannot run is the kind of import that
  makes a process slow for no reason.
*/
export const presignUpload = async ({ userId, filename, contentType, folder }) => {
  const key = buildKey({ userId, filename, folder });

  if (!isS3Configured()) {
    return {
      driver: "local",
      key,
      uploadUrl: null,
      publicUrl: null,
      expiresIn: null,
      // The client is told what to do instead, rather than being handed a null
      // URL and left to work it out.
      fallback: {
        method: "POST",
        url: "/apis/posting/media/upload",
        field: "file",
        note: "S3 is not configured on this server; upload through the API instead.",
      },
    };
  }

  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

  const client = new S3Client({
    region: REGION,
    credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
  });

  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType || "application/octet-stream" }),
    { expiresIn: UPLOAD_URL_TTL_SECONDS }
  );

  return {
    driver: "s3",
    key,
    uploadUrl,
    publicUrl: publicUrl(key),
    expiresIn: UPLOAD_URL_TTL_SECONDS,
    fallback: null,
  };
};

export default { isS3Configured, storageStatus, presignUpload, publicUrl, buildKey, kindOf };
