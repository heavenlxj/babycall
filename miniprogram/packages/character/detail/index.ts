import { definePage } from '../../../core/page';
import { logger } from '../../../core/logger';
import { ROUTES, router } from '../../../core/router';
import type { Character, Memory } from '../../../models/index';
import { characterService, scheduleService } from '../../../services/index';
import { nextCallText } from '../../../utils/format';

definePage({
  data: {
    id: '',
    character: null as Character | null,
    memory: null as Memory | null,
    nextCall: '',
    favored: false,
    error: false,
  },

  onLoad(query: Record<string, string | undefined>) {
    this.setData({ id: query.id || 'fox' });
    this.load();
  },

  async load() {
    const { id } = this.data;
    try {
      const [character, memories, schedules] = await Promise.all([
        characterService.detail(id),
        characterService.memories(id),
        scheduleService.list(),
      ]);
      const next = schedules.find((s) => s.characterId === id && s.enabled);
      this.setData({
        character,
        memory: memories[0] || null,
        nextCall: next ? nextCallText(next.time, next.repeat, next.weekdays) : '',
        error: false,
      });
    } catch (e) {
      logger.error('character:detail', e, { id });
      this.setData({ error: true });
    }
  },

  onFavor() {
    this.setData({ favored: !this.data.favored });
    logger.track('character_favor', { id: this.data.id, favored: this.data.favored });
  },

  onCall() {
    const c = this.data.character;
    if (!c) return;
    if (c.locked) {
      wx.showToast({ title: '加入 Character Club 即可解锁', icon: 'none' });
      return;
    }
    logger.track('character_call_click', { id: c.id });
    router.to(ROUTES.call, { id: c.id, mode: 'outgoing' });
  },

  onSchedule() {
    router.to(ROUTES.scheduleEdit, { characterId: this.data.id });
  },

  goTask() {
    router.to(ROUTES.characterTask, { id: this.data.id });
  },

  goMemory() {
    router.to(ROUTES.characterMemory, { id: this.data.id });
  },

  goRecords() {
    router.to(ROUTES.callRecords, { characterId: this.data.id });
  },

  goSchedule() {
    this.data.nextCall ? router.to(ROUTES.schedule) : this.onSchedule();
  },
});
