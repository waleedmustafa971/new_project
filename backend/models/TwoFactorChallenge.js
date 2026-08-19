// models/TwoFactorChallenge.js

import mongoose from "mongoose";

/*
  The server-side half of a 2FA challenge.

  The challenge token itself is a stateless JWT, which is fine for identity and
  expiry but cannot count anything: a claim inside a signed token cannot be
  incremented, so an attempt counter carried in the token would reset with every
  request and the five-attempt cap would never bite.

  This row is what actually enforces two things a stateless token cannot:

    - attempts, so a six-digit code cannot be brute-forced
    - single use, so a challenge that already produced a session cannot be
      replayed into a second one

  The TTL index clears rows on its own; nothing has to sweep them.
*/

const twoFactorChallengeSchema = new mongoose.Schema({
  jti: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },

  attempts: { type: Number, default: 0 },
  consumedAt: { type: Date, default: null },

  // Matches CHALLENGE_TTL_SECONDS in helpers/twoFactor.js.
  createdAt: { type: Date, default: Date.now, expires: 300 },
});

const TwoFactorChallenge = mongoose.model("twofactorchallenge", twoFactorChallengeSchema);

export default TwoFactorChallenge;
