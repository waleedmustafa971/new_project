/*
  Social Media module API.

  Usage:
    import { feedApi, privacyApi, safetyApi, verificationApi } from '../../api/social';

    const feed = await feedApi.forYou({ limit: 10 });
    await safetyApi.block(userId);

  The signed-in user is attached automatically — see client.ts. Call
  setCurrentUserId() after login and clearCurrentUserId() on logout.

  Future modules (shop, food, property…) should sit alongside this folder
  as src/api/<module>/ rather than being added here.
*/

import * as feedApi from './feedApi';
import * as privacyApi from './privacyApi';
import * as safetyApi from './safetyApi';
import * as verificationApi from './verificationApi';

export { feedApi, privacyApi, safetyApi, verificationApi };

export * from './types';
export {
  setCurrentUserId,
  getCurrentUserId,
  clearCurrentUserId,
  errorMessage,
} from './client';
