import { APP_VERSION, ENV } from '../../config/index';
import { IMAGES } from '../../constants/assets';
import { definePage } from '../../core/page';
import { ROUTES, router } from '../../core/router';
import type { UserProfile } from '../../models/index';
import { childService, contentService, deviceService, userService } from '../../services/index';
import { profileStore } from '../../store/index';
import { ageText } from '../../utils/format';

interface ChildView {
  name: string;
  age: string;
}

function childView(): ChildView | null {
  const child = childService.current();
  return child ? { name: child.nickName, age: ageText(child.birthday) } : null;
}

definePage({
  data: {
    images: IMAGES,
    profile: null as UserProfile | null,
    child: null as ChildView | null,
    unread: 0,
    version: `${APP_VERSION}${ENV === 'release' ? '' : ` · ${ENV}`}`,
  },

  onLoad() {
    this.setData({ profile: profileStore.get() || null, child: childView() });
  },

  async onShow() {
    this.setData({ child: childView() });
    const [profile, notifications] = await Promise.all([userService.getProfile(), contentService.notifications()]);
    profileStore.set(profile);
    this.setData({ profile, unread: notifications.filter((n) => !n.read).length });
  },

  goChild() {
    router.to(ROUTES.childEdit, { mode: childService.current() ? 'edit' : 'create' });
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
});
