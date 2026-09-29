import { definePage } from '../../core/page';
import { logger } from '../../core/logger';
import { ROUTES, router } from '../../core/router';
import type { Character, CharacterCategory } from '../../models/index';
import { characterService } from '../../services/index';

type TabKey = 'all' | CharacterCategory;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'hot', label: '热门' },
  { key: 'adventure', label: '冒险' },
  { key: 'warm', label: '温暖' },
  { key: 'knowledge', label: '知识' },
  { key: 'game', label: '游戏' },
];

let all: Character[] = [];

definePage({
  data: {
    tabs: TABS,
    active: 'all' as TabKey,
    list: [] as Character[],
    loading: true,
    error: false,
  },

  onLoad() {
    this.load();
  },

  async load() {
    this.setData({ loading: true, error: false });
    try {
      all = await characterService.list();
      this.filter();
    } catch (e) {
      logger.error('characters:load', e);
      this.setData({ error: true });
    } finally {
      this.setData({ loading: false });
    }
  },

  filter() {
    const { active } = this.data;
    this.setData({ list: active === 'all' ? all : all.filter((c) => c.categories.includes(active)) });
  },

  onTab(e: WechatMiniprogram.CustomEvent<{ key: TabKey }>) {
    this.setData({ active: e.detail.key });
    this.filter();
    logger.track('characters_tab', { key: e.detail.key });
  },

  onSelect(e: WechatMiniprogram.CustomEvent<{ id: string }>) {
    router.to(ROUTES.characterDetail, { id: e.detail.id });
  },
});
