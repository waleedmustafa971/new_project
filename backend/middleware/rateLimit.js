import rateLimit from "express-rate-limit";

/*
  Rate limiting.

  There was none anywhere, which meant /api/adminpanel/login and every sign-in
  route could be guessed at indefinitely. bcrypt makes each attempt slow, but
  slow is not the same as bounded.

  The auth limiters count *failures only* (`skipSuccessfulRequests`). That is
  deliberate and it is what makes them safe to turn on here: a brute-force run
  is nothing but failures and trips the limit quickly, while a person getting
  their password right — or a test suite logging in a hundred times — is never
  counted at all. Limiting successful logins would punish the legitimate case
  to slow down the illegitimate one.

  Everything is keyed on the client IP. Behind a proxy that needs
  `app.set("trust proxy", 1)` or every request arrives wearing the proxy's
  address and the limits become global rather than per-client.
*/

const message = (what) => ({
  success: false,
  message: `Too many ${what}. Wait a few minutes and try again.`,
});

/*
  Failed sign-in attempts, per IP.

  Mounted on the whole /apis/auth tree, so it also counts validation failures
  on registration — which is why the number is 50 rather than something
  tighter. At bcrypt speed that is still nowhere near enough attempts to guess
  a password, and it leaves room for a test suite that asserts on rejections.
*/
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: message("sign-in attempts"),
});

/* The admin panel is a smaller, more valuable target, so it gets a tighter one. */
export const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: message("admin sign-in attempts"),
});

/*
  A backstop for everything else.

  Set high enough that no real client — or test suite — will ever reach it, and
  low enough to stop somebody enumerating the API. This is a ceiling, not a
  throttle: if a legitimate feature ever trips it, the feature is wrong, not
  the limit.
*/
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 1000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: message("requests"),
});
