import { IMAGES } from '../../constants/assets';
import { auth } from '../../core/auth';
import { definePage } from '../../core/page';
import { logger } from '../../core/logger';
import { ROUTES, router } from '../../core/router';

definePage({
  data: {
    images: IMAGES,
    ready: false,
    agreed: false,
    loading: '' as '' | 'wechat' | 'phone',
    shake: false,
  },

  onLoad() {
    if (auth.isLoggedIn()) {
      setTimeout(() => router.relaunch(ROUTES.home), 900);
      return;
    }
    this.setData({ ready: true });
  },

  toggleAgree() {
    this.setData({ agreed: !this.data.agreed });
  },

  checkAgree(): boolean {
    if (this.data.agreed) return true;
    this.setData({ shake: true });
    setTimeout(() => this.setData({ shake: false }), 500);
    wx.showToast({ title: '请先阅读并同意用户协议', icon: 'none' });
    return false;
  },

  async onWechatLogin() {
    if (!this.checkAgree()) return;
    this.setData({ loading: 'wechat' });
    try {
      await auth.loginWithWechat();
      router.relaunch(ROUTES.home);
    } catch (e) {
      logger.error('login:wechat', e);
    } finally {
      this.setData({ loading: '' });
    }
  },

  async onPhoneLogin(e: WechatMiniprogram.CustomEvent<{ code?: string }>) {
    if (!this.checkAgree()) return;
    const code = e.detail.code;
    if (!code) {
      logger.info('login', 'phone auth canceled');
      return;
    }
    this.setData({ loading: 'phone' });
    try {
      await auth.loginWithPhone(code);
      router.relaunch(ROUTES.home);
    } catch (err) {
      logger.error('login:phone', err);
    } finally {
      this.setData({ loading: '' });
    }
  },

  openAgreement(e: WechatMiniprogram.TouchEvent) {
    const type = e.currentTarget.dataset.type as string;
    logger.track('agreement_open', { type });
    wx.showToast({ title: type === 'privacy' ? '隐私政策' : '用户协议', icon: 'none' });
  },
});
