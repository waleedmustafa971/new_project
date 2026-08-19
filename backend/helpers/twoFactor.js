// helpers/twoFactor.js

/*
  Two-Factor Authentication (extra login security).

  TOTP via an authenticator app, chosen because this server has no delivery
  channel: no mail sender, no SMS gateway, and push is disabled for want of
  Firebase credentials. A TOTP secret is exchanged once at enrolment, so the
  factor works offline and can be tested without standing up a third party.

  This module owns the primitives — codes, recovery codes and the short-lived
  challenge token that stands between a correct password and a real session.
  Policy (who must present a factor, and where) lives in helpers/session.js.
*/

import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
// otplib 13 is a rewrite: no `authenticator` object and no default export, so
// the functions are imported by name.
import { generateSecret as otpGenerateSecret, generateSync, verifySync, generateURI } from "otplib";

import TwoFactorChallenge from "../models/TwoFactorChallenge.js";

export const TOTP_STEP_SECONDS = 30;

/*
  One step of drift either side.

  otplib expresses this in *seconds*, not steps (`epochTolerance`), so 30 is one
  step. One step covers a phone with a slightly wrong clock; widening it buys
  nothing, since a user further out than that will keep failing anyway, and it
  multiplies the codes a guesser gets to hit.
*/
const EPOCH_TOLERANCE_SECONDS = TOTP_STEP_SECONDS;

// How long the holder of a correct password has to present their second factor.
export const CHALLENGE_TTL_SECONDS = 5 * 60;

// Wrong codes allowed against one challenge before it is burned. Six digits is
// a million combinations; unlimited attempts makes the factor decorative.
export const MAX_CHALLENGE_ATTEMPTS = 5;

export const RECOVERY_CODE_COUNT = 10;

/*
  The challenge token is signed with its own secret, derived from the refresh
  secret rather than sharing SECRET_KEY. A challenge that verified against
  SECRET_KEY would be accepted by authMiddleware as an access token — the
  half-authenticated state would become a full session.
*/
const CHALLENGE_SECRET = () =>
  crypto.createHash("sha256")
    .update(String(process.env.JWT_REFRESH_SECRET || "") + "|2fa-challenge")
    .digest("hex");

/* ------------------------------------------------------------------ */
/* secrets and codes                                                   */
/* ------------------------------------------------------------------ */

export const generateSecret = () => otpGenerateSecret();

/*
  The otpauth:// URI an authenticator app scans. Returned to the client so the
  app can render the QR itself — rendering it server-side would mean shipping
  the secret as an image and pulling in another dependency for nothing.
*/
export const otpauthUri = (accountName, secret, issuer = "Super App") =>
  generateURI({ secret, label: accountName || "user", issuer });

/*
  Verify a code against a secret.

  `afterStep` is the last step this account already spent, and otplib enforces
  it natively: a token whose step is not strictly greater is rejected. That is
  the replay guard — without it the same six digits work twice inside the ~30s
  the code stays live, which is exactly the window someone reading them over a
  shoulder has.

  Returns the accepted step so the caller can persist it as the new floor.
*/
export const verifyCode = (code, secret, afterStep = null) => {
  const clean = String(code || "").replace(/\D/g, "");
  if (clean.length !== 6 || !secret) return { valid: false, step: null };

  const opts = { secret, token: clean, epochTolerance: EPOCH_TOLERANCE_SECONDS };
  // otplib throws if afterTimeStep is negative or ahead of the current window,
  // so a stale or nonsense floor must not be passed through blindly.
  if (Number.isInteger(afterStep) && afterStep >= 0) opts.afterTimeStep = afterStep;

  try {
    const result = verifySync(opts);
    return { valid: !!result.valid, step: result.valid ? result.timeStep : null };
  } catch {
    // A malformed token or out-of-range floor is a failed verification, not a
    // 500 — this path is reachable from unauthenticated input.
    return { valid: false, step: null };
  }
};

/* Generate a code for a secret — used by the test suite to act as the app. */
export const currentCode = (secret) => generateSync({ secret });

/* ------------------------------------------------------------------ */
/* recovery codes                                                      */
/* ------------------------------------------------------------------ */

/*
  Ten single-use codes, shown once at enrolment and never again. Stored bcrypt-
  hashed like passwords, so a database dump does not hand over the fallbacks
  that bypass the factor.
*/
export const generateRecoveryCodes = async (count = RECOVERY_CODE_COUNT) => {
  const plain = [];
  for (let i = 0; i < count; i++) {
    // 10 hex characters, formatted in two groups so it is readable off paper.
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase();
    plain.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  const hashed = await Promise.all(
    plain.map(async (c) => ({ codeHash: await bcrypt.hash(c, 10), usedAt: null }))
  );
  return { plain, hashed };
};

/*
  Match a recovery code against the unused hashes.

  Every unused hash is compared even after a match is found — returning early
  would make the response time reveal roughly how far down the list a code sat.
*/
export const matchRecoveryCode = async (code, rows = []) => {
  const clean = String(code || "").trim().toUpperCase();
  if (!clean) return -1;

  let found = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].usedAt) continue;
    const hit = await bcrypt.compare(clean, rows[i].codeHash);
    if (hit && found === -1) found = i;
  }
  return found;
};

/* ------------------------------------------------------------------ */
/* the challenge token                                                 */
/* ------------------------------------------------------------------ */

/*
  Issued in place of a session when the password was right but the second
  factor is still outstanding. It carries no authority of its own: `typ` marks
  it, and verifyChallenge refuses anything without that marker, so a token from
  elsewhere cannot be presented here and vice versa.
*/
export const signChallenge = async (userId) => {
  const jti = crypto.randomUUID();
  await TwoFactorChallenge.create({ jti, user: userId });
  return jwt.sign(
    { userId: String(userId), typ: "2fa_challenge", jti },
    CHALLENGE_SECRET(),
    { expiresIn: CHALLENGE_TTL_SECONDS }
  );
};

export const verifyChallenge = (token) => {
  try {
    const decoded = jwt.verify(String(token || ""), CHALLENGE_SECRET());
    if (decoded.typ !== "2fa_challenge") return null;
    return decoded;
  } catch {
    return null;
  }
};

/*
  Load the challenge's server-side state and say whether it may still be used.

  Both failure modes are deliberate and distinct: `consumed` means this exact
  challenge already produced a session, `exhausted` means too many wrong codes
  were tried against it.
*/
export const loadChallenge = async (jti) => {
  if (!jti) return null;
  const row = await TwoFactorChallenge.findOne({ jti }).lean();
  if (!row) return null;
  return {
    ...row,
    consumed: !!row.consumedAt,
    exhausted: row.attempts >= MAX_CHALLENGE_ATTEMPTS,
    attemptsLeft: Math.max(MAX_CHALLENGE_ATTEMPTS - row.attempts, 0),
  };
};

/* A wrong code. Returns how many tries are left, for the caller's message. */
export const recordFailedAttempt = async (jti) => {
  const row = await TwoFactorChallenge.findOneAndUpdate(
    { jti },
    { $inc: { attempts: 1 } },
    { new: true }
  ).lean();
  return Math.max(MAX_CHALLENGE_ATTEMPTS - (row?.attempts ?? MAX_CHALLENGE_ATTEMPTS), 0);
};

/*
  Spend the challenge. Conditional on it not already being consumed, so two
  requests racing with the same valid code cannot both mint a session.
*/
export const consumeChallenge = async (jti) => {
  const row = await TwoFactorChallenge.findOneAndUpdate(
    { jti, consumedAt: null },
    { $set: { consumedAt: new Date() } },
    { new: true }
  ).lean();
  return !!row;
};
