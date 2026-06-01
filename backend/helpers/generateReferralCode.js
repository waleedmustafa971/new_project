import crypto from 'crypto';

export const generateReferralCode = () =>
  crypto.randomBytes(4).toString('hex').toUpperCase();
