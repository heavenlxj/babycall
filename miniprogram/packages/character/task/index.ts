import { definePage } from '../../../core/page';
import { logger } from '../../../core/logger';
import { ROUTES, router } from '../../../core/router';
import type { Character, DailyTask } from '../../../models/index';
import { characterService } from '../../../services/index';

definePage({
  data: {
    character: null as Character | null,
    task: null as DailyTask | null,
    doneCount: 0,
    loading: true,
    error: false,
  },

  onLoad(query: Record<string, string | undefined>) {
    this.load(query.id || 'fox');
  },

  async load(id: string) {
    try {
      const [character, task] = await Promise.all([characterService.detail(id), characterService.todayTask(id)]);
      this.setData({ character, task, doneCount: task ? task.steps.filter((s) => s.done).length : 0, error: false });
    } catch (e) {
      logger.error('character:task', e, { id });
      this.setData({ error: true });
    } finally {
      this.setData({ loading: false });
    }
  },

  onRetry() {
    this.load(this.data.character ? this.data.character.id : 'fox');
  },

  onStart() {
    const c = this.data.character;
    if (!c) return;
    logger.track('task_start', { characterId: c.id, taskId: this.data.task?.id });
    router.to(ROUTES.call, { id: c.id, mode: 'outgoing' });
  },
});
