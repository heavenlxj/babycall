import { childService } from '../services/child';
import { userService } from '../services/user';
import { profileStore, tokenStore } from '../store/index';
import type { Child } from '../models/index';
import { logger } from './logger';
import { registerAuthReady, registerRefresher } from './request';

function wxLoginCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => (res.code ? resolve(res.code) : reject(new Error('wx.login 未返回 code'))),
      fail: reject,
    });
  });
}

async function loginByWechat(): Promise<string> {
  const token = await userService.loginByCode(await wxLoginCode());
  tokenStore.set(token);
  return token.accessToken;
}

let loginTask: Promise<void> | null = null;

/**
 * 无感登录：启动时静默 wx.login 换 token，不需要用户操作。
 * 需要鉴权的请求会先等待登录完成；登录失败不阻塞，后续请求 401 时会再次登录。
 */
export const auth = {
  init(): Promise<void> {
    loginTask = loginByWechat().then(
      () => logger.track('login_success'),
      (e) => logger.warn('auth', 'silent login failed', { reason: String(e) }),
    );
    return loginTask;
  },

  ready(): Promise<void> {
    return loginTask || Promise.resolve();
  },

  /** 登录完成后同步用户资料与当前孩子，返回当前孩子（没有则需要引导创建） */
  async bootstrap(): Promise<Child | null> {
    await auth.ready();
    const [profile, child] = await Promise.all([userService.getProfile(), childService.sync()]);
    profileStore.set(profile);
    logger.setContext({ userId: profile.userId });
    return child;
  },
};

registerAuthReady(() => auth.ready());

registerRefresher(async () => {
  const refresh = tokenStore.get()?.refreshToken;
  try {
    if (!refresh) throw new Error('no refresh token');
    const token = await userService.refreshToken(refresh);
    tokenStore.set(token);
    return token.accessToken;
  } catch (e) {
    logger.warn('auth', 'refresh token failed, relogin', { reason: String(e) });
    return loginByWechat();
  }
});
