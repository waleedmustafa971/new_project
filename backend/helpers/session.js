// helpers/session.js

/*
  The single place a login session is minted.

  Before this existed, `controllers/auth.js` signed session tokens in 23 places
  across nine functions — login, both Google paths, four registration variants,
  mobile verification and a date-of-birth update. Any second factor bolted onto
  `login` alone would have been decorative: the same account can be handed a
  full token pair through `/google-login` or `/verify_mobile` without ever
  presenting a code.

  So the gate lives here, and every one of those call sites routes through it.
  Each keeps its own token payload and expiry — the mobile app depends on those
  exact shapes, and this is deliberately not the change that normalises them.
*/

import jwt from "jsonwebtoken";

import User from "../models/users.js";
import LoginEvent from "../models/LoginEvent.js";
import { signChallenge } from "./twoFactor.js";
import { fingerprintOf } from "./safety.js";
import { notify } from "../services/notificationService.js";

const SECRET_KEY = () => process.env.SECRET_KEY;
const REFRESH_SECRET = () => process.env.JWT_REFRESH_SECRET;

/*
  Record a sign-in, and alert on a device this account has not used before.

  It hangs off issueSession for the same reason the two-factor gate does: this
  is the one place a session is minted, so a login that is not recorded here is
  a login that happened without anyone being told. A registration path passes no
  request and logs nothing — the first sign-in on a brand-new account is not an
  event worth alerting anybody about.

  Failures are swallowed. An alert is a courtesy; it must never be the reason a
  legitimate sign-in fails.
*/
export const recordLogin = async (userId, req, method = "password") => {
  try {
    if (!req) return null;

    const headers = req.headers || {};
    const device = {
      deviceId: req.body?.deviceId || headers["x-device-id"] || "",
      userAgent: headers["user-agent"] || "",
      platform: req.body?.platform || headers["x-platform"] || "",
    };
    const fingerprint = fingerprintOf(device);

    const seen = await LoginEvent.findOne({ user: userId, fingerprint })
      .select("trusted").lean();
    const isNewDevice = !seen;

    const event = await LoginEvent.create({
      user: userId,
      fingerprint,
      deviceId: device.deviceId,
      deviceName: req.body?.deviceName || "",
      platform: device.platform,
      userAgent: device.userAgent,
      // Behind a proxy the first x-forwarded-for entry is the real client.
      ip: String(headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || "",
      method,
      isNewDevice,
      alerted: isNewDevice,
      trusted: !!seen?.trusted,
    });

    /*
      Only a new, untrusted device is worth an alert. Alerting on every sign-in
      trains people to ignore the notification, which is worse than not sending
      it — the one that matters then arrives among a hundred that did not.
    */
    if (isNewDevice) {
      await notify({
        recipient: userId, actor: userId, type: "login_alert",
        preview: device.platform || device.userAgent || "a new device",
      });
    }

    return event;
  } catch (err) {
    console.error("[login-alert]", err.message);
    return null;
  }
};

/*
  Issue a session, or refuse and demand a second factor.

  Returns one of:
    { twoFactorRequired: true, challengeToken }   password was right, code owed
    { token, refreshToken }                       a real session

  `mfaSatisfied` is set only by the 2FA verify endpoint, which has already
  checked a code. Nothing else may set it.

  The 2FA state is re-read from the database by id rather than trusted from the
  `user` object the caller happens to be holding. Several of these call sites
  pass a document fetched with a narrowed `.select(...)`, where `twoFactor`
  would be absent and read as "not enabled" — a silent bypass that would look
  exactly like working code.
*/
export const issueSession = async (user, {
  payload,
  expiresIn = "1h",
  refreshExpiresIn = "7d",
  refresh = true,
  mfaSatisfied = false,
  req = null,
  method = "password",
} = {}) => {
  const userId = user?._id || user?.id;
  if (!userId) throw new Error("issueSession requires a user with an _id");

  const body = payload || { userId, email: user.email };

  if (!mfaSatisfied) {
    const current = await User.findById(userId).select("twoFactor.enabled").lean();
    if (current?.twoFactor?.enabled) {
      return { twoFactorRequired: true, challengeToken: await signChallenge(userId) };
    }
  }

  /*
    `mfa` records how this session was obtained. It is context for the client
    and for auditing — the refresh gate below deliberately does not rely on it,
    because a token minted before enrolment would carry no such claim and there
    would be no way to tell it apart from one that skipped the factor.
  */
  const token = jwt.sign({ ...body, mfa: !!mfaSatisfied }, SECRET_KEY(), { expiresIn });

  // Only real sign-ins pass `req`; registration paths do not, so creating an
  // account does not alert its own owner about the device they just used.
  if (req) await recordLogin(userId, req, method);

  if (!refresh) return { token };

  const refreshToken = jwt.sign(
    { ...body, mfa: !!mfaSatisfied },
    REFRESH_SECRET(),
    { expiresIn: refreshExpiresIn }
  );
  return { token, refreshToken };
};

/*
  The response body for a session that is owed a second factor.

  200, not 401: the password was correct, and the client is being asked to
  continue rather than told it failed. `twoFactorRequired` is the flag the app
  branches on, and no access or refresh token is present to be used.
*/
export const twoFactorPending = (res, challengeToken, message = "Two-factor authentication required") =>
  res.status(200).json({
    success: true,
    twoFactorRequired: true,
    challengeToken,
    message,
  });

/*
  Whether a refresh token predates the account's 2FA enrolment.

  This is what stops the refresh endpoint being the way around the whole
  feature. A refresh token lives for seven days; without this check, one issued
  the day before 2FA was switched on keeps minting fresh access tokens for a
  week, and switching 2FA on protects nothing until it expires.

  Turning 2FA on therefore ends every session that predates it. The enable
  endpoint hands back a new token pair in the same response, so the person doing
  the enrolling is not logged out of the device they are standing at.
*/
export const refreshPredatesTwoFactor = (decoded, user) => {
  if (!user?.twoFactor?.enabled) return false;
  const enabledAt = user.twoFactor.enabledAt;
  if (!enabledAt) return false;
  if (!decoded?.iat) return true;
  return decoded.iat * 1000 < new Date(enabledAt).getTime();
};
