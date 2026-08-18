import User from "../models/users.js";

/*
  Account-status enforcement.

  Moderation actions were being written to the user document but never read
  anywhere, so a banned account could carry on logging in as normal. This is
  the single place that turns `accountStatus` into something with teeth, and
  every entry point that issues or accepts a session calls it.

  It also expires suspensions: a 7-day suspension is set once and would
  otherwise last forever, because nothing ever moved the account back. Rather
  than run a scheduled job, the check lapses it on the next attempt — the only
  moment the answer actually matters.
*/

export const statusOf = async (userOrId) => {
  const user = typeof userOrId === "object" && userOrId?.accountStatus !== undefined
    ? userOrId
    : await User.findById(userOrId).select("accountStatus suspendedUntil moderationNote").lean();

  if (!user) return { allowed: false, code: 404, reason: "Account not found" };

  const status = user.accountStatus || "active";

  // A soft-deleted account must not authenticate either. It is reversible from
  // the admin panel, but until it is restored it behaves like a closed account.
  if (status === "deleted") {
    return {
      allowed: false,
      code: 403,
      status: "deleted",
      reason: "This account has been closed",
    };
  }

  if (status === "banned") {
    return {
      allowed: false,
      code: 403,
      status: "banned",
      reason: user.moderationNote
        ? `This account is banned: ${user.moderationNote}`
        : "This account has been banned",
    };
  }

  if (status === "suspended") {
    const until = user.suspendedUntil ? new Date(user.suspendedUntil) : null;

    // Lapsed: restore the account and let the request through.
    if (until && until.getTime() <= Date.now()) {
      await User.updateOne(
        { _id: user._id },
        { $set: { accountStatus: "active", suspendedUntil: null } }
      );
      return { allowed: true, status: "active", reinstated: true };
    }

    return {
      allowed: false,
      code: 403,
      status: "suspended",
      suspendedUntil: until,
      reason: until
        ? `This account is suspended until ${until.toISOString().slice(0, 10)}`
        : "This account is suspended",
    };
  }

  return { allowed: true, status };
};

/* Express guard for routes that must reject a moderated account. */
export const requireActiveAccount = async (req, res, next) => {
  const id = req.user?.userId || req.user?._id || req.body?.userId || req.query?.userId;
  if (!id) return next();

  const check = await statusOf(id);
  if (check.allowed) return next();

  return res.status(check.code || 403).json({
    success: false,
    message: check.reason,
    accountStatus: check.status,
    suspendedUntil: check.suspendedUntil,
  });
};
