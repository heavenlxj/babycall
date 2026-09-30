import config, { ENV } from './config/index';
import { logger } from './core/logger';
import { auth } from './core/auth';
import { profileStore } from './store/index';

App<IAppOption>({
  globalData: {},

  onLaunch(options) {
    logger.init();
    const profile = profileStore.get();
    if (profile) logger.setContext({ userId: profile.userId });
    logger.info('app', 'launch', { env: ENV, mock: config.useMock, scene: options.scene, path: options.path });
    auth.init();
    this.checkUpdate();
  },

  onHide() {
    logger.flush();
  },

  onError(error) {
    logger.error('app:onError', error);
  },

  onUnhandledRejection(res) {
    logger.error('app:unhandledRejection', res.reason);
  },

  onPageNotFound(res) {
    logger.warn('app', 'page not found', { path: res.path });
    wx.switchTab({ url: '/pages/home/index' });
  },

  checkUpdate() {
    if (!wx.canIUse('getUpdateManager')) return;
    const manager = wx.getUpdateManager();
    manager.onUpdateReady(() => {
      wx.showModal({
        title: '发现新版本',
        content: '新版本已经准备好，重启一下就能体验啦',
        confirmText: '立即重启',
        confirmColor: '#FF9B4A',
        success: (res) => res.confirm && manager.applyUpdate(),
      });
    });
    manager.onUpdateFailed(() => logger.warn('app', 'update failed'));
  },
});
