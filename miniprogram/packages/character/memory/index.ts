import { definePage } from '../../../core/page';
import { logger } from '../../../core/logger';
import type { Character, Memory } from '../../../models/index';
import { characterService } from '../../../services/index';
import { fullDate } from '../../../utils/format';

interface MemoryGroup {
  date: string;
  items: Memory[];
}

definePage({
  data: {
    character: null as Character | null,
    groups: [] as MemoryGroup[],
    loading: true,
    error: false,
  },

  onLoad(query: Record<string, string | undefined>) {
    this.load(query.id || 'fox');
  },

  async load(id: string) {
    try {
      const [character, memories] = await Promise.all([characterService.detail(id), characterService.memories(id)]);
      const groups: MemoryGroup[] = [];
      memories.forEach((m) => {
        const date = fullDate(m.createdAt);
        const last = groups[groups.length - 1];
        last && last.date === date ? last.items.push(m) : groups.push({ date, items: [m] });
      });
      this.setData({ character, groups, error: false });
    } catch (e) {
      logger.error('character:memory', e, { id });
      this.setData({ error: true });
    } finally {
      this.setData({ loading: false });
    }
  },

  onRetry() {
    this.load(this.data.character ? this.data.character.id : 'fox');
  },
});
