import { definePage } from '../../../core/page';
import { logger } from '../../../core/logger';
import { ROUTES, router } from '../../../core/router';
import type { Memory } from '../../../models/index';
import { characterService, contentService } from '../../../services/index';
import { CallRecordView, CharacterMap, toCallRecordView, toMap } from '../../../utils/view';

let characterMap: CharacterMap = {};

definePage({
  data: {
    tabs: [{ key: 'all', label: '全部' }] as { key: string; label: string }[],
    active: 'all',
    list: [] as CallRecordView[],
    memory: null as (Memory & { characterName: string; image: string }) | null,
    loading: true,
    error: false,
  },

  async onLoad(query: Record<string, string | undefined>) {
    try {
      const characters = await characterService.mine();
      characterMap = toMap(characters);
      this.setData({
        tabs: [{ key: 'all', label: '全部' }, ...characters.map((c) => ({ key: c.id, label: c.name }))],
        active: query.characterId || 'all',
      });
      await this.load();
    } catch (e) {
      logger.error('records:init', e);
      this.setData({ error: true, loading: false });
    }
  },

  async load() {
    const { active } = this.data;
    this.setData({ loading: true });
    try {
      const records = await contentService.callRecords(active === 'all' ? undefined : active);
      const list = records.map((r) => toCallRecordView(r, characterMap));
      this.setData({ list, error: false });
      this.loadMemory(list[0] ? list[0].characterId : '');
    } catch (e) {
      logger.error('records:load', e);
      this.setData({ error: true });
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadMemory(characterId: string) {
    if (!characterId) return this.setData({ memory: null });
    const memories = await characterService.memories(characterId);
    const c = characterMap[characterId];
    this.setData({ memory: memories[0] && c ? { ...memories[0], characterName: c.name, image: c.image } : null });
  },

  onTab(e: WechatMiniprogram.CustomEvent<{ key: string }>) {
    this.setData({ active: e.detail.key });
    this.load();
  },

  onRecord(e: WechatMiniprogram.TouchEvent) {
    router.to(ROUTES.characterDetail, { id: e.currentTarget.dataset.id as string });
  },

  goMemory() {
    const m = this.data.memory;
    if (m) router.to(ROUTES.characterMemory, { id: m.characterId });
  },
});
