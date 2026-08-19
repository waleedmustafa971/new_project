/* ================================================================
   Cloud Storage Integration (AWS).
   (Advanced / Optional Features)

   The capability was already here — `controllers/auth.js`, the gallery and the
   vendor helpers each build their own S3 client from the same four environment
   variables — which is why the row sat at 60 %. What was missing is a single
   answer to "where does a file live, and what is its address", and a way to
   upload without pushing a 100 MB video through the API process.

   See helpers/storage.js. The existing controllers are left exactly as they
   are, per the additive rule; they can move over one at a time.

   **No bucket is configured on this server**, so every endpoint below reports
   the local-disk fallback rather than pretending. That is a deployment gap, and
   it means the S3 path has never moved a real byte.
   ================================================================ */

import mongoose from "mongoose";
import {
  storageStatus, presignUpload, publicUrl, isS3Configured,
  kindOf, ALLOWED_KINDS, MAX_UPLOAD_BYTES,
} from "../helpers/storage.js";

const ok = (res, data = {}) => res.json({ success: true, ...data });
const fail = (res, code, message) => res.status(code).json({ success: false, message });
const isId = (v) => mongoose.Types.ObjectId.isValid(v);
const who = (req) =>
  req.user?.userId || req.user?._id || req.body?.userId || req.query?.userId || req.query?.userid;

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("[storage]", req.method, req.originalUrl, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/*
  What this deployment can actually do.

  Reported rather than assumed so the app can say "uploads are running locally"
  instead of discovering it from a URL that only resolves on one host. No
  credential is ever echoed — only whether one is present.
*/
export const status = wrap(async (req, res) => {
  ok(res, { storage: storageStatus() });
});

/*
  Ask for a direct upload.

  A presigned PUT lets the device send the bytes straight to S3: proxying a
  100 MB video through Node occupies a process for the whole transfer and then
  writes the file out a second time. When there is no bucket, the response says
  so and names the API upload endpoint instead of returning a null URL and
  leaving the client to work it out.
*/
export const requestUpload = wrap(async (req, res) => {
  const userId = who(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const filename = String(req.body?.filename || "").trim();
  if (!filename) return fail(res, 400, "filename is required");
  if (filename.length > 260) return fail(res, 400, "filename is too long");

  const contentType = String(req.body?.contentType || "").trim();
  const kind = kindOf(filename, contentType);
  if (!kind) {
    return fail(res, 422, `Unsupported file type. Allowed: ${ALLOWED_KINDS.join(", ")}`);
  }

  /*
    The declared size is checked before a URL is issued rather than after the
    upload. A presigned PUT is signed for a key, not a size — once the URL is
    out, the only place left to refuse an oversized file is a bucket policy.
  */
  const size = req.body?.sizeBytes === undefined ? null : Number(req.body.sizeBytes);
  if (size !== null) {
    if (!Number.isFinite(size) || size <= 0) return fail(res, 422, "sizeBytes must be a positive number");
    if (size > MAX_UPLOAD_BYTES) {
      return fail(res, 413, `File is too large (max ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB)`);
    }
  }

  const folder = ["uploads", "avatars", "covers", "chat", "music"].includes(String(req.body?.folder))
    ? String(req.body.folder)
    : "uploads";

  const presigned = await presignUpload({ userId, filename, contentType, folder });
  ok(res, { kind, ...presigned });
});

/*
  Turn a stored key into the address a client should read it from.

  Exposed because the answer depends on deployment, not on the file: the same
  key is an S3 URL on a configured server and a local path here, and a client
  that builds the URL itself gets it wrong the day a bucket is added.
*/
export const resolve = wrap(async (req, res) => {
  const key = String(req.body?.key ?? req.query?.key ?? "").trim();
  if (!key) return fail(res, 400, "key is required");
  ok(res, { key, url: publicUrl(key), driver: isS3Configured() ? "s3" : "local" });
});

export default { status, requestUpload, resolve };
