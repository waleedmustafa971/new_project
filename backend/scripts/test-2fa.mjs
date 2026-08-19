/*
  End-to-end HTTP suite for Two-Factor Authentication (/apis/auth/2fa).

  Covers enrolment, the login challenge, replay and brute-force protection,
  recovery codes, disabling — and, most of the point of the feature, the other
  session-minting endpoints that must not hand out a token pair while a second
  factor is outstanding.

  Runs against a purpose-made account rather than the demo users: the login
  paths need a password this suite knows, and the demo accounts' credentials
  are not ours to change. The account is deleted at the end.

  Run from the backend directory, with the server already up:
    node scripts/test-2fa.mjs
*/

const ROOT = process.env.BASE || "http://localhost:5000/apis/auth";

let pass = 0, failed = 0;
const failures = [];

const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else {
    failed++; failures.push(name);
    console.log(`  FAIL  ${name}${detail ? `  — ${detail}` : ""}`);
  }
};

const call = async (method, path, { body, token } = {}) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(ROOT + path, {
    method,
    headers,
    body: ["GET", "HEAD"].includes(method) ? undefined : JSON.stringify(body || {}),
  });
  let json = null;
  try { json = await res.json(); } catch { json = { parseError: true }; }
  // `_http` and not `status`: some responses carry their own `status` field.
  return { ...json, _http: res.status };
};

const section = (t) => console.log(`\n${"=".repeat(66)}\n${t}\n${"=".repeat(66)}`);

/* Run from backend/, so resolve the project's own dependencies. */
const require = (await import("node:module")).createRequire(`${process.cwd()}/package.json`);
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();
await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection;

// The suite acts as the authenticator app, so it needs the same code generator
// the server verifies against.
const { currentCode } = await import("../helpers/twoFactor.js");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stepNow = () => Math.floor(Date.now() / 1000 / 30);

/*
  A code from a time step this account has not already spent.

  The server raises a replay floor every time a code verifies, so the code that
  enabled 2FA cannot then be used to log in — correct behaviour, and something a
  real user never notices because they are not enrolling and signing in inside
  the same thirty seconds. A suite doing exactly that has to wait for the step
  to roll over, or it is testing the replay guard rather than the login.
*/
let lastSpentStep = null;
const freshCode = async (secret) => {
  while (lastSpentStep !== null && stepNow() <= lastSpentStep) await sleep(500);
  const step = stepNow();
  const code = currentCode(secret);
  lastSpentStep = step;
  return code;
};

const EMAIL = "2fa-suite@test.local";
const PASSWORD = "TestPassw0rd!";
const MOBILE = "9995550042";

const sweep = async () => {
  const stale = await db.collection("users").find({ email: EMAIL }).toArray();
  for (const u of stale) {
    await db.collection("twofactorchallenges").deleteMany({ user: u._id });
  }
  const r = await db.collection("users").deleteMany({ email: EMAIL });
  await db.collection("otptbls").deleteMany({ mobileno: MOBILE });
  return r.deletedCount;
};

const swept = await sweep();
if (swept) console.log(`  (swept ${swept} leftover test account from a previous run)`);

const baseline = {
  users: await db.collection("users").countDocuments({}),
  challenges: await db.collection("twofactorchallenges").countDocuments({}),
  otps: await db.collection("otptbls").countDocuments({}),
};
console.log(`  baseline: ${baseline.users} users, ${baseline.challenges} challenges, ${baseline.otps} otps`);

/*
  referralCode is uniquely indexed on a nullable field, so only one document in
  the whole collection may hold null — a user created without one collides with
  whichever account already has it.
*/
const inserted = await db.collection("users").insertOne({
  name: "TwoFactor Suite",
  email: EMAIL,
  password: await bcrypt.hash(PASSWORD, 10),
  mobileno: MOBILE,
  referralCode: `TFA${Date.now().toString(36).toUpperCase()}`,
  accountStatus: "active",
  emailverify: "Verify",
  mobileverify: "Verify",
  followers: [], following: [], coins: 0,
});
const UID = inserted.insertedId;
console.log(`  created test account ${UID}`);

let secret = null;
let recoveryCodes = [];

/* ================================================================== */
section("1. Enrolment");

const preLogin = await call("POST", "/login", { body: { email: EMAIL, password: PASSWORD } });
check("a user without 2FA logs straight in", preLogin.token && !preLogin.twoFactorRequired,
  JSON.stringify(preLogin).slice(0, 140));
const preToken = preLogin.token;
const preRefresh = preLogin.refreshToken;

const statusOff = await call("GET", "/2fa/status", { token: preToken });
check("status reports 2FA off", statusOff.enabled === false);

const noAuthStatus = await call("GET", "/2fa/status");
check("status needs a session", noAuthStatus._http === 401);

const noAuthSetup = await call("POST", "/2fa/setup");
check("setup needs a session", noAuthSetup._http === 401);

const setup = await call("POST", "/2fa/setup", { token: preToken });
check("setup returns a secret", typeof setup.secret === "string" && setup.secret.length > 15);
check("setup returns a scannable otpauth URI", String(setup.otpauthUrl || "").startsWith("otpauth://totp/"));
secret = setup.secret;

const stillOff = await call("GET", "/2fa/status", { token: preToken });
check("staging a secret does not turn 2FA on by itself", stillOff.enabled === false);

const enableWrong = await call("POST", "/2fa/enable", { token: preToken, body: { code: "000000" } });
check("enabling with a wrong code is refused", enableWrong._http === 401);

const stillOffAfterWrong = await call("GET", "/2fa/status", { token: preToken });
check("a failed confirmation leaves 2FA off", stillOffAfterWrong.enabled === false);

const enabled = await call("POST", "/2fa/enable", { token: preToken, body: { code: await freshCode(secret) } });
check("a correct code turns 2FA on", enabled.success === true);
check("enabling hands back 10 recovery codes", (enabled.recoveryCodes || []).length === 10);
check("enabling returns a fresh session so the user is not logged out", !!enabled.token);
recoveryCodes = enabled.recoveryCodes || [];

const statusOn = await call("GET", "/2fa/status", { token: enabled.token });
check("status now reports 2FA on", statusOn.enabled === true);
check("status counts the unused recovery codes", statusOn.recoveryCodesRemaining === 10);

const enableTwice = await call("POST", "/2fa/enable", { token: enabled.token, body: { code: currentCode(secret) } });
check("enabling twice is a 409", enableTwice._http === 409);

/* The secret must never travel back in an ordinary user payload. */
const leaked = JSON.stringify(await call("GET", "/2fa/status", { token: enabled.token }));
check("the status payload does not carry the secret", !leaked.includes(secret));

/* ================================================================== */
section("2. Login now demands the second factor");

const login2fa = await call("POST", "/login", { body: { email: EMAIL, password: PASSWORD } });
check("login answers with a challenge, not a session", login2fa.twoFactorRequired === true);
check("login withholds the access token", !login2fa.token, `token=${login2fa.token}`);
check("login withholds the refresh token", !login2fa.refreshToken);
check("login returns a challenge token", typeof login2fa.challengeToken === "string");

const challengeAsBearer = await call("GET", "/2fa/status", { token: login2fa.challengeToken });
check("the challenge token is not usable as an access token", challengeAsBearer._http === 401);

const wrongPassword = await call("POST", "/login", { body: { email: EMAIL, password: "wrong" } });
check("a wrong password gets no challenge at all", wrongPassword._http === 401 && !wrongPassword.challengeToken);

const verifyWrong = await call("POST", "/2fa/verify",
  { body: { challengeToken: login2fa.challengeToken, code: "000000" } });
check("a wrong code is refused", verifyWrong._http === 401);
check("the refusal says how many tries are left", verifyWrong.attemptsLeft === 4,
  `attemptsLeft=${verifyWrong.attemptsLeft}`);

const code1 = await freshCode(secret);
const verified = await call("POST", "/2fa/verify",
  { body: { challengeToken: login2fa.challengeToken, code: code1 } });
check("a correct code completes the login", verified.success === true && !!verified.token);
check("completing the login returns a refresh token", !!verified.refreshToken);
const fullToken = verified.token;
const fullRefresh = verified.refreshToken;

const sessionWorks = await call("GET", "/2fa/status", { token: fullToken });
check("the session from a completed challenge works", sessionWorks.enabled === true);

const reuseChallenge = await call("POST", "/2fa/verify",
  { body: { challengeToken: login2fa.challengeToken, code: currentCode(secret) } });
check("a spent challenge cannot be used twice", reuseChallenge._http === 409);

const noSuchChallenge = await call("POST", "/2fa/verify",
  { body: { challengeToken: "not-a-token", code: currentCode(secret) } });
check("a bogus challenge token is refused", noSuchChallenge._http === 401);

/* ================================================================== */
section("3. Replay and brute force");

/*
  The same code inside its own 30-second window must not work twice. `code1`
  was just spent above, so a fresh challenge answered with it has to fail even
  though the code is still live.
*/
const replayLogin = await call("POST", "/login", { body: { email: EMAIL, password: PASSWORD } });
const replay = await call("POST", "/2fa/verify",
  { body: { challengeToken: replayLogin.challengeToken, code: code1 } });
check("a code already used cannot be replayed in its window", replay._http === 401,
  `got ${replay._http}`);

const burnLogin = await call("POST", "/login", { body: { email: EMAIL, password: PASSWORD } });
let lastAttempt = null;
for (let i = 0; i < 5; i++) {
  lastAttempt = await call("POST", "/2fa/verify",
    { body: { challengeToken: burnLogin.challengeToken, code: "111111" } });
}
check("the fifth wrong code leaves no attempts", lastAttempt.attemptsLeft === 0,
  `attemptsLeft=${lastAttempt.attemptsLeft}`);

const afterBurn = await call("POST", "/2fa/verify",
  { body: { challengeToken: burnLogin.challengeToken, code: currentCode(secret) } });
check("a burned challenge refuses even a correct code", afterBurn._http === 429,
  `got ${afterBurn._http}`);

/* ================================================================== */
section("4. Recovery codes");

const recLogin = await call("POST", "/login", { body: { email: EMAIL, password: PASSWORD } });
const usedCode = recoveryCodes[3];
const byRecovery = await call("POST", "/2fa/verify",
  { body: { challengeToken: recLogin.challengeToken, code: usedCode } });
check("a recovery code completes a login", byRecovery.success === true && !!byRecovery.token);
check("the response says a recovery code was used", byRecovery.usedRecoveryCode === true);
check("the used code is deducted from the remaining count", byRecovery.recoveryCodesRemaining === 9,
  `remaining=${byRecovery.recoveryCodesRemaining}`);

const reuseLogin = await call("POST", "/login", { body: { email: EMAIL, password: PASSWORD } });
const reuseRecovery = await call("POST", "/2fa/verify",
  { body: { challengeToken: reuseLogin.challengeToken, code: usedCode } });
check("a recovery code works only once", reuseRecovery._http === 401);

const regenWrong = await call("POST", "/2fa/recovery-codes", { token: fullToken, body: { code: "000000" } });
check("regenerating needs a valid code", regenWrong._http === 401);

const regen = await call("POST", "/2fa/recovery-codes", { token: fullToken, body: { code: await freshCode(secret) } });
check("recovery codes can be regenerated", (regen.recoveryCodes || []).length === 10);

const oldRecoveryLogin = await call("POST", "/login", { body: { email: EMAIL, password: PASSWORD } });
const oldRecovery = await call("POST", "/2fa/verify",
  { body: { challengeToken: oldRecoveryLogin.challengeToken, code: recoveryCodes[7] } });
check("regenerating kills the previous set", oldRecovery._http === 401);
recoveryCodes = regen.recoveryCodes || [];

/* ================================================================== */
section("5. The other ways in must not bypass the factor");

/*
  This is the part the whole design turns on. Before the refactor, sessions were
  minted in nine other functions; each of these would have handed out a full
  token pair without ever asking for a code.
*/
const googleCheck = await call("POST", "/googlelogincheck", { body: { email: EMAIL } });
check("Google sign-in check cannot skip the factor",
  googleCheck.twoFactorRequired === true && !googleCheck.token,
  `http=${googleCheck._http} token=${googleCheck.token}`);

const googleSignin = await call("POST", "/google-login",
  { body: { email: EMAIL, name: "TwoFactor Suite", password: PASSWORD } });
check("Google sign-in cannot skip the factor",
  googleSignin.twoFactorRequired === true && !googleSignin.token,
  `http=${googleSignin._http} token=${googleSignin.token}`);

/* Mobile verification hands back a session for an existing account too. */
await db.collection("otptbls").insertOne({
  mobileno: MOBILE, otp: "654321", status: "Not Verify", datetime: new Date(),
});
const mobileVerify = await call("POST", "/verify_mobile", { body: { mobileno: MOBILE, otpcode: "654321" } });
check("mobile verification cannot skip the factor",
  mobileVerify.twoFactorRequired === true && !mobileVerify.token,
  `http=${mobileVerify._http} token=${mobileVerify.token}`);

const mobileRegister = await call("POST", "/mobile_register",
  { body: { name: "x", email: EMAIL, password: PASSWORD, mobileno: MOBILE, otpcode: "654321" } });
check("re-registering an existing mobile cannot skip the factor",
  mobileRegister.twoFactorRequired === true && !mobileRegister.token,
  `http=${mobileRegister._http} token=${mobileRegister.token}`);

/* A refresh token older than the enrolment must stop working. */
const staleRefresh = await call("POST", "/refresh-token", { body: { refreshToken: preRefresh } });
check("a refresh token predating enrolment is refused", staleRefresh._http === 401,
  `got ${staleRefresh._http}`);
check("the refusal tells the client to sign in again", staleRefresh.reauthenticate === true);

const goodRefresh = await call("POST", "/refresh-token", { body: { refreshToken: fullRefresh } });
check("a refresh token issued after the factor still works", !!goodRefresh.token);

/* ================================================================== */
section("6. Disabling");

const disableNoAuth = await call("POST", "/2fa/disable", { body: { password: PASSWORD, code: currentCode(secret) } });
check("disabling needs a session", disableNoAuth._http === 401);

const disableWrongPassword = await call("POST", "/2fa/disable",
  { token: fullToken, body: { password: "wrong", code: currentCode(secret) } });
check("disabling needs the right password", disableWrongPassword._http === 401);

const disableWrongCode = await call("POST", "/2fa/disable",
  { token: fullToken, body: { password: PASSWORD, code: "000000" } });
check("disabling needs a current code", disableWrongCode._http === 401);

const stillOn = await call("GET", "/2fa/status", { token: fullToken });
check("failed attempts leave 2FA on", stillOn.enabled === true);

const disabled = await call("POST", "/2fa/disable",
  { token: fullToken, body: { password: PASSWORD, code: await freshCode(secret) } });
check("password plus code turns 2FA off", disabled.success === true, JSON.stringify(disabled).slice(0, 120));

const afterDisable = await call("POST", "/login", { body: { email: EMAIL, password: PASSWORD } });
check("login is back to normal once 2FA is off", !!afterDisable.token && !afterDisable.twoFactorRequired);

const disableTwice = await call("POST", "/2fa/disable",
  { token: afterDisable.token, body: { password: PASSWORD, code: "123456" } });
check("disabling when it is already off is a 409", disableTwice._http === 409);

const secretGone = await db.collection("users").findOne({ _id: UID });
check("the secret is cleared from the record", !secretGone.twoFactor?.secret,
  `secret=${secretGone.twoFactor?.secret}`);
check("the recovery codes are cleared too", (secretGone.twoFactor?.recoveryCodes || []).length === 0);

/* ================================================================== */
section("Cleanup");

const delChallenges = await db.collection("twofactorchallenges").deleteMany({ user: UID });
const delOtps = await db.collection("otptbls").deleteMany({ mobileno: MOBILE });
const delUser = await db.collection("users").deleteMany({ email: EMAIL });
console.log(`  removed ${delUser.deletedCount} test account, ${delChallenges.deletedCount} challenges, ` +
            `${delOtps.deletedCount} otp rows`);

const after = {
  users: await db.collection("users").countDocuments({}),
  challenges: await db.collection("twofactorchallenges").countDocuments({}),
  otps: await db.collection("otptbls").countDocuments({}),
};
for (const key of Object.keys(baseline)) {
  check(`${key} restored to baseline (${baseline[key]})`, after[key] === baseline[key], `now ${after[key]}`);
}

const demoUntouched = await db.collection("users").countDocuments({ twoFactor: { $exists: true, $ne: null } });
check("no demo account was left with 2FA switched on",
  (await db.collection("users").countDocuments({ "twoFactor.enabled": true })) === 0,
  `${demoUntouched} carry a twoFactor object`);

await mongoose.disconnect();

/* ================================================================== */
console.log(`\n${"=".repeat(66)}`);
console.log(`  ${pass} passed, ${failed} failed`);
if (failures.length) console.log(`\n  Failing checks:\n${failures.map((f) => `   - ${f}`).join("\n")}`);
console.log("=".repeat(66));
/*
  exitCode rather than process.exit(): forcing an exit while sockets are still
  closing trips a libuv teardown assertion on Windows.
*/
process.exitCode = failed ? 1 : 0;
