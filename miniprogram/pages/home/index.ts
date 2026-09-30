import { IMAGES } from '../../constants/assets';
import { definePage } from '../../core/page';
import { logger } from '../../core/logger';
import { ROUTES, router } from '../../core/router';
import type { Banner, Character, Device, Memory } from '../../models/index';
import { characterService, childService, contentService, deviceService, scheduleService } from '../../services/index';
import { greeting } from '../../utils/format';
import { CallRecordView, ScheduleView, toCallRecordView, toMap, toScheduleView } from '../../utils/view';

definePage({
  data: {
    images: IMAGES,
    greeting: '',
    childName: '宝贝',
    unread: 0,
    banners: [] as Banner[],
    characters: [] as Character[],
    nextSchedule: null as ScheduleView | null,
    device: null as Device | null,
    lastCall: null as CallRecordView | null,
    memory: null as (Memory & { characterName: string }) | null,
    loading: true,
    error: false,
  },

  onLoad() {
    const child = childService.current();
    this.setData({
      greeting: greeting(),
      childName: child ? child.nickName : '宝贝',
      device: deviceService.cached(),
    });
    this.load();
  },

  onShow() {
    if (!this.data.loading) this.refreshDynamic();
  },

  async onPullDownRefresh() {
    await this.load();
    wx.stopPullDownRefresh();
  },

  async load() {
    try {
      const [banners, characters] = await Promise.all([contentService.banners(), characterService.list()]);
      this.setData({ banners, characters: characters.filter((c) => c.owned), error: false });
      await this.refreshDynamic(characters);
    } catch (e) {
      logger.error('home:load', e);
      this.setData({ error: true });
    } finally {
      this.setData({ loading: false });
    }
  },

  /** 定时、设备、通话记录会在其它页面被修改，回到首页时刷新 */
  async refreshDynamic(all?: Character[]) {
    const characters = all || (await characterService.list());
    const map = toMap(characters);
    const [schedules, device, records, notifications] = await Promise.all([
      scheduleService.list(),
      deviceService.current(),
      contentService.callRecords(),
      contentService.notifications(),
    ]);
    const enabled = schedules.filter((s) => s.enabled);
    const lastRecord = records[0];
    let memory = null;
    if (lastRecord) {
      const memories = await characterService.memories(lastRecord.characterId);
      if (memories[0]) memory = { ...memories[0], characterName: map[lastRecord.characterId]?.name || '' };
    }
    this.setData({
      nextSchedule: enabled.length ? toScheduleView(enabled[0], map) : null,
      device,
      lastCall: lastRecord ? toCallRecordView(lastRecord, map) : null,
      memory,
      unread: notifications.filter((n) => !n.read).length,
    });
  },

  goNotifications() {
    router.to(ROUTES.notifications);
  },

  goCharacters() {
    router.to(ROUTES.characters);
  },

  onCharacter(e: WechatMiniprogram.CustomEvent<{ id: string }>) {
    logger.track('home_character_click', { id: e.detail.id });
    router.to(ROUTES.characterDetail, { id: e.detail.id });
  },

  onSchedule() {
    this.data.nextSchedule ? router.to(ROUTES.schedule) : router.to(ROUTES.scheduleEdit);
  },

  onDevice() {
    this.data.device ? router.to(ROUTES.deviceManage) : router.to(ROUTES.devicePairing);
  },

  goRecords() {
    router.to(ROUTES.callRecords);
  },

  goMemory() {
    const m = this.data.memory;
    if (m) router.to(ROUTES.characterMemory, { id: m.characterId });
  },
});
