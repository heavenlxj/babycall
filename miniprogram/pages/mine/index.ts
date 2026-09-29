import { APP_VERSION, ENV } from '../../config/index';
import { IMAGES } from '../../constants/assets';
import { auth } from '../../core/auth';
import { definePage } from '../../core/page';
import { ROUTES, router } from '../../core/router';
import type { UserProfile } from '../../models/index';
import { contentService, deviceService, userService } from '../../services/index';
import { profileStore } from '../../store/index';

definePage({
  data: {
    images: IMAGES,
    profile: null as UserProfile | null,
    unread: 0,
    version: `${APP_VERSION}${ENV === 'release' ? '' : ` · ${ENV}`}`,
    showLogout: false,
  },

  onLoad() {
    this.setData({ profile: profileStore.get() || null });
  },

  async onShow() {
    const [profile, notifications] = await Promise.all([userService.getProfile(), contentService.notifications()]);
    profileStore.set(profile);
    this.setData({ profile, unread: notifications.filter((n) => !n.read).length });
  },

  goParent() {
    router.to(ROUTES.parentCenter);
  },

  goNotifications() {
    router.to(ROUTES.notifications);
  },

  goRecords() {
    router.to(ROUTES.callRecords);
  },

  goDevice() {
    router.to(deviceService.cached() ? ROUTES.deviceManage : ROUTES.device);
  },

  onSubscribe() {
    wx.showToast({ title: '会员订阅即将开放', icon: 'none' });
  },

  onTodo() {
    wx.showToast({ title: '功能即将开放', icon: 'none' });
  },

  onLogout() {
    this.setData({ showLogout: true });
  },

  onCancelLogout() {
    this.setData({ showLogout: false });
  },

  onConfirmLogout() {
    auth.logout();
    router.relaunch(ROUTES.launch);
  },
});
