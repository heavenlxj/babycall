import { definePage } from '../../../core/page';
import { logger } from '../../../core/logger';
import type { AppNotification, NotificationType } from '../../../models/index';
import { contentService } from '../../../services/index';
import { dayTime } from '../../../utils/format';

const TYPE_STYLE: Record<NotificationType, { icon: string; color: string; bg: string }> = {
  schedule: { icon: 'clock', color: '#FF9B4A', bg: '#FFF1E3' },
  content: { icon: 'book', color: '#9A7FD6', bg: '#F3EEFB' },
  device: { icon: 'battery', color: '#3DB587', bg: '#EAF7F1' },
  system: { icon: 'sparkle', color: '#4FA6EC', bg: '#E8F4FD' },
};

type NotificationView = AppNotification & { icon: string; color: string; bg: string; timeText: string };

definePage({
  data: {
    list: [] as NotificationView[],
    unread: 0,
    loading: true,
    error: false,
  },

  onLoad() {
    this.load();
  },

  async load() {
    try {
      const list = await contentService.notifications();
      this.setData({
        list: list.map((n) => ({ ...n, ...TYPE_STYLE[n.type], timeText: dayTime(n.createdAt) })),
        unread: list.filter((n) => !n.read).length,
        error: false,
      });
    } catch (e) {
      logger.error('notifications:load', e);
      this.setData({ error: true });
    } finally {
      this.setData({ loading: false });
    }
  },

  async onReadAll() {
    if (!this.data.unread) return;
    await contentService.readAllNotifications();
    this.setData({ list: this.data.list.map((n) => ({ ...n, read: true })), unread: 0 });
    wx.showToast({ title: '已全部标为已读', icon: 'none' });
  },
});
