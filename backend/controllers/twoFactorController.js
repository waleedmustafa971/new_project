/*
  Two-Factor Authentication (extra login security) — User Account & Profile.

  Enrolment, the login challenge, and the recovery path.

  TOTP via an authenticator app, because this server has no way to deliver a
  code: no mail sender, no SMS gateway, and push is disabled for want of
  Firebase credentials. The secret is exchanged once, at enrolment, over the
  authenticated setup call.

  The gate itself is not here — it is in helpers/session.js, which every
  session-minting path in controllers/auth.js runs through. This file only
  decides whether a presented code is good.
*/

import bcrypt from "bcryptjs";

import User from "../models/users.js";
import { issueSession } from "../helpers/session.js";
import {
  generateSecret, otpauthUri, verifyCode,
  generateRecoveryCodes, matchRecoveryCode,
  verifyChallenge, loadChallenge, recordFailedAttempt, consumeChallenge,
  RECOVERY_CODE_COUNT, MAX_CHALLENGE_ATTEMPTS,
} from "../helpers/twoFactor.js";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const ok = (res, data = {}) => res.json({ success: true, ...data });
const fail = (res, code, message, extra = {}) =>
  res.status(code).json({ success: false, message, ...extra });

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("[2fa]", req.method, req.originalUrl, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/*
  These endpoints sit behind authMiddleware, so the actor is the token holder
  and nothing else. Deliberately not the `actorId(req)` pattern the social
  controllers use, which also reads a body or query field: on 2FA that would
  let anyone enrol, disable or re-key a factor on someone else's account just
  by naming them.
*/
const authedId = (req) => req.user?.userId || req.user?._id;

/* The live secret needs an explicit select — it is `select: false` so that the
   login handler, which returns the whole user document, cannot leak it. */
const withSecrets = (id) =>
  User.findById(id).select("+twoFactor.secret +twoFactor.pendingSecret +twoFactor.lastUsedStep +twoFactor.recoveryCodes");

/* ------------------------------------------------------------------ */
/* 1. Enrolment                                                        */
/* ------------------------------------------------------------------ */

export const status = wrap(async (req, res) => {
  const userId = authedId(req);
  if (!userId) return fail(res, 401, "Sign in first");

  const user = await User.findById(userId).select("+twoFactor.recoveryCodes").lean();
  if (!user) return fail(res, 404, "User not found");

  const codes = user.twoFactor?.recoveryCodes || [];
  ok(res, {
    enabled: !!user.twoFactor?.enabled,
    method: user.twoFactor?.method || "totp",
    enabledAt: user.twoFactor?.enabledAt || null,
    recoveryCodesRemaining: codes.filter((c) => !c.usedAt).length,
  });
});

/*
  Stage a secret and hand back the URI the authenticator app scans.

  Staged as `pendingSecret`, never written over the live one. Someone with 2FA
  already on who starts a fresh enrolment and abandons it halfway must still be
  able to log in with the authenticator they already have — overwriting the live
  secret here would lock them out of their own account with no way back.
*/
export const setup = wrap(async (req, res) => {
  const userId = authedId(req);
  if (!userId) return fail(res, 401, "Sign in first");

  const user = await User.findById(userId).select("name email mobileno twoFactor.enabled");
  if (!user) return fail(res, 404, "User not found");

  const secret = generateSecret();
  await User.updateOne({ _id: userId }, { $set: { "twoFactor.pendingSecret": secret } });

  const label = user.email || user.mobileno || String(user._id);
  ok(res, {
    message: "Scan this in your authenticator app, then confirm with a code",
    secret,
    otpauthUrl: otpauthUri(label, secret),
    alreadyEnabled: !!user.twoFactor?.enabled,
  });
});

/*
  Confirm the staged secret with a real code, and switch the factor on.

  Enabling only ever happens after a code has verified. Turning it on straight
  from /setup would lock out anyone whose device clock is off or who mis-scanned
  the QR, and they would have no second factor to authenticate the fix with.

  Returns a fresh token pair: enabling 2FA invalidates every session that
  predates it (see refreshPredatesTwoFactor), which would otherwise log the
  enrolling user out of the device they are standing at.
*/
export const enable = wrap(async (req, res) => {
  const userId = authedId(req);
  if (!userId) return fail(res, 401, "Sign in first");

  const { code } = req.body || {};
  if (!code) return fail(res, 400, "A code from your authenticator app is required");

  const user = await withSecrets(userId);
  if (!user) return fail(res, 404, "User not found");
  if (user.twoFactor?.enabled) return fail(res, 409, "Two-factor authentication is already on");

  const pending = user.twoFactor?.pendingSecret;
  if (!pending) return fail(res, 409, "Start with /2fa/setup — there is no secret to confirm");

  const { valid, step } = verifyCode(code, pending);
  if (!valid) return fail(res, 401, "That code is not right. Check your app and try again.");

  const { plain, hashed } = await generateRecoveryCodes();

  await User.updateOne({ _id: userId }, {
    $set: {
      "twoFactor.enabled": true,
      "twoFactor.method": "totp",
      "twoFactor.secret": pending,
      "twoFactor.pendingSecret": null,
      "twoFactor.enabledAt": new Date(),
      "twoFactor.lastUsedStep": step,
      "twoFactor.recoveryCodes": hashed,
    },
  });

  const session = await issueSession(user, {
    payload: { userId: user._id, email: user.email },
    expiresIn: "10m",
    mfaSatisfied: true,
  });

  ok(res, {
    message: "Two-factor authentication is on",
    /*
      Shown exactly once. They are stored hashed, so the server genuinely
      cannot show them again — regenerating is the only way to get a new set.
    */
    recoveryCodes: plain,
    recoveryCodesNote: `Save these ${RECOVERY_CODE_COUNT} codes somewhere safe. They are shown once and each works once.`,
    token: session.token,
    refreshToken: session.refreshToken,
  });
});

/*
  Turn it off. Requires the password *and* a current code: someone who has
  walked up to an unlocked phone holding a live session should not be able to
  strip the factor off the account.
*/
export const disable = wrap(async (req, res) => {
  const userId = authedId(req);
  if (!userId) return fail(res, 401, "Sign in first");

  const { password, code } = req.body || {};
  if (!password || !code) return fail(res, 400, "Your password and a current code are both required");

  // `password` is not select:false on the model, so withSecrets already has it.
  const user = await withSecrets(userId);
  if (!user) return fail(res, 404, "User not found");
  if (!user.twoFactor?.enabled) return fail(res, 409, "Two-factor authentication is not on");

  const passwordOk = await bcrypt.compare(password, user.password || "");
  if (!passwordOk) return fail(res, 401, "That password is not right");

  const { valid } = verifyCode(code, user.twoFactor.secret, user.twoFactor.lastUsedStep);
  if (!valid) return fail(res, 401, "That code is not right");

  await User.updateOne({ _id: userId }, {
    $set: {
      "twoFactor.enabled": false,
      "twoFactor.secret": null,
      "twoFactor.pendingSecret": null,
      "twoFactor.enabledAt": null,
      "twoFactor.lastUsedStep": null,
      "twoFactor.recoveryCodes": [],
    },
  });

  ok(res, { message: "Two-factor authentication is off" });
});

/* A fresh set of recovery codes, replacing whatever is left of the old one. */
export const regenerateRecoveryCodes = wrap(async (req, res) => {
  const userId = authedId(req);
  if (!userId) return fail(res, 401, "Sign in first");

  const { code } = req.body || {};
  if (!code) return fail(res, 400, "A code from your authenticator app is required");

  const user = await withSecrets(userId);
  if (!user) return fail(res, 404, "User not found");
  if (!user.twoFactor?.enabled) return fail(res, 409, "Two-factor authentication is not on");

  const { valid, step } = verifyCode(code, user.twoFactor.secret, user.twoFactor.lastUsedStep);
  if (!valid) return fail(res, 401, "That code is not right");

  const { plain, hashed } = await generateRecoveryCodes();
  await User.updateOne({ _id: userId }, {
    $set: { "twoFactor.recoveryCodes": hashed, "twoFactor.lastUsedStep": step },
  });

  ok(res, {
    message: "New recovery codes generated — the old ones no longer work",
    recoveryCodes: plain,
  });
});

/* ------------------------------------------------------------------ */
/* 2. The login challenge                                              */
/* ------------------------------------------------------------------ */

/*
  Exchange a challenge token plus a code for a real session.

  This is the only endpoint that may set `mfaSatisfied`, and it is deliberately
  unauthenticated: the caller has no session yet, which is the entire point. The
  challenge token is what stands in for one, and it carries no other authority.

  Accepts either a TOTP code or a recovery code, because someone who has lost
  their phone has no other way back in.
*/
export const verify = wrap(async (req, res) => {
  const { challengeToken, code } = req.body || {};
  if (!challengeToken || !code) {
    return fail(res, 400, "The challenge token and a code are both required");
  }

  const decoded = verifyChallenge(challengeToken);
  if (!decoded) return fail(res, 401, "That sign-in attempt has expired. Start again.");

  const challenge = await loadChallenge(decoded.jti);
  if (!challenge) return fail(res, 401, "That sign-in attempt has expired. Start again.");
  if (challenge.consumed) return fail(res, 409, "That sign-in attempt has already been used");
  if (challenge.exhausted) {
    return fail(res, 429, "Too many incorrect codes. Sign in again to get a new attempt.");
  }

  const user = await withSecrets(decoded.userId);
  if (!user || !user.twoFactor?.enabled) {
    return fail(res, 401, "That sign-in attempt is no longer valid");
  }

  const totp = verifyCode(code, user.twoFactor.secret, user.twoFactor.lastUsedStep);
  let usedRecoveryCode = false;
  let recoveryIndex = -1;

  if (!totp.valid) {
    recoveryIndex = await matchRecoveryCode(code, user.twoFactor.recoveryCodes || []);
    usedRecoveryCode = recoveryIndex >= 0;
  }

  if (!totp.valid && !usedRecoveryCode) {
    const left = await recordFailedAttempt(decoded.jti);
    return fail(res, 401, "That code is not right", {
      attemptsLeft: left,
      // Named so the client can show "2 tries left" rather than a bare failure.
      maxAttempts: MAX_CHALLENGE_ATTEMPTS,
    });
  }

  /*
    Spend the challenge before minting anything. If two requests race with the
    same valid code, only the one that flips `consumedAt` proceeds — otherwise
    a replayed request produces a second session.
  */
  const spent = await consumeChallenge(decoded.jti);
  if (!spent) return fail(res, 409, "That sign-in attempt has already been used");

  const set = {};
  if (usedRecoveryCode) {
    // Single use: burn the code that just worked.
    set[`twoFactor.recoveryCodes.${recoveryIndex}.usedAt`] = new Date();
  } else {
    // Raise the replay floor so this code cannot be used again in its window.
    set["twoFactor.lastUsedStep"] = totp.step;
  }
  await User.updateOne({ _id: user._id }, { $set: set });

  const session = await issueSession(user, {
    payload: { userId: user._id, email: user.email },
    expiresIn: "10m",
    mfaSatisfied: true,
  });

  const remaining = (user.twoFactor.recoveryCodes || [])
    .filter((c, i) => !c.usedAt && i !== recoveryIndex).length;

  ok(res, {
    message: "Login successful",
    token: session.token,
    refreshToken: session.refreshToken,
    usedRecoveryCode,
    recoveryCodesRemaining: remaining,
    usersdata: await User.findById(user._id).lean(),
  });
});
