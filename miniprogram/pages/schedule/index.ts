import { IMAGES } from '../../constants/assets';
import { definePage } from '../../core/page';
import { logger } from '../../core/logger';
import { ROUTES, router } from '../../core/router';
import { characterService, scheduleService } from '../../services/index';
import { ScheduleView, toMap, toScheduleView } from '../../utils/view';

definePage({
  data: {
    images: IMAGES,
    list: [] as ScheduleView[],
    loading: true,
    error: false,
    removing: null as ScheduleView | null,
    removeLoading: false,
  },

  onShow() {
    this.load();
  },

  async load() {
    try {
      const [schedules, characters] = await Promise.all([scheduleService.list(), characterService.list()]);
      const map = toMap(characters);
      this.setData({ list: schedules.map((s) => toScheduleView(s, map)), error: false });
    } catch (e) {
      logger.error('schedule:load', e);
      this.setData({ error: true });
    } finally {
      this.setData({ loading: false });
    }
  },

  async onToggle(e: WechatMiniprogram.CustomEvent<{ id: string; enabled: boolean }>) {
    const { id, enabled } = e.detail;
    const index = this.data.list.findIndex((s) => s.id === id);
    this.setData({ [`list[${index}].enabled`]: enabled });
    try {
      await scheduleService.toggle(id, enabled);
      logger.track('schedule_toggle', { id, enabled });
      wx.showToast({ title: enabled ? '定时来电已开启' : '已暂停这个来电', icon: 'none' });
    } catch (err) {
      this.setData({ [`list[${index}].enabled`]: !enabled });
    }
  },

  onSelect(e: WechatMiniprogram.CustomEvent<{ id: string }>) {
    this.setData({ removing: this.data.list.find((s) => s.id === e.detail.id) || null });
  },

  onCancelRemove() {
    this.setData({ removing: null });
  },

  async onConfirmRemove() {
    const target = this.data.removing;
    if (!target) return;
    this.setData({ removeLoading: true });
    try {
      await scheduleService.remove(target.id);
      logger.track('schedule_remove', { id: target.id });
      this.setData({ list: this.data.list.filter((s) => s.id !== target.id), removing: null });
    } finally {
      this.setData({ removeLoading: false });
    }
  },

  onAdd() {
    router.to(ROUTES.scheduleEdit);
  },
});
