import { userService } from '../services/user';
import { clearUserData, profileStore, tokenStore } from '../store/index';
import type { TokenInfo } from '../models/index';
import { logger } from './logger';
import { registerRefresher } from './request';

function wxLoginCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => (res.code ? resolve(res.code) : reject(new Error('wx.login 未返回 code'))),
      fail: reject,
    });
  });
}

async function afterLogin(token: TokenInfo) {
  tokenStore.set(token);
  const profile = await userService.getProfile();
  profileStore.set(profile);
  logger.setContext({ userId: profile.userId });
  logger.track('login_success');
}

export const auth = {
  isLoggedIn(): boolean {
    return !!tokenStore.get()?.accessToken;
  },

  /** 微信一键登录 */
  async loginWithWechat() {
    const code = await wxLoginCode();
    await afterLogin(await userService.loginByCode(code));
  },

  /** 手机号登录：phoneCode 来自 button open-type="getPhoneNumber" */
  async loginWithPhone(phoneCode: string) {
    const code = await wxLoginCode();
    await afterLogin(await userService.loginByPhone(code, phoneCode));
  },

  logout() {
    logger.track('logout');
    clearUserData();
    logger.setContext({ userId: '', deviceId: '' });
  },
};

registerRefresher(async () => {
  const refresh = tokenStore.get()?.refreshToken;
  try {
    if (!refresh) throw new Error('no refresh token');
    const token = await userService.refreshToken(refresh);
    tokenStore.set(token);
    return token.accessToken;
  } catch (e) {
    logger.warn('auth', 'refresh token failed, relogin', { reason: String(e) });
    const token = await userService.loginByCode(await wxLoginCode());
    tokenStore.set(token);
    return token.accessToken;
  }
});
