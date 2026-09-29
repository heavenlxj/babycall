import { definePage } from '../../../core/page';
import { logger } from '../../../core/logger';
import { ROUTES, router } from '../../../core/router';
import type { Character, DailyReport } from '../../../models/index';
import { characterService, contentService } from '../../../services/index';

definePage({
  data: {
    report: null as DailyReport | null,
    favorite: null as Character | null,
    taskPercent: 0,
    growth: [
      { icon: 'message', tone: 'orange', title: '互动记录', desc: '今天主动聊了 3 次' },
      { icon: 'sparkle', tone: 'lavender', title: '兴趣变化', desc: '最近对恐龙更感兴趣' },
      { icon: 'book', tone: 'sky', title: '故事互动', desc: '听完 2 个冒险故事' },
      { icon: 'task', tone: 'mint', title: '任务完成', desc: '完成 1 个小冒险' },
    ],
    error: false,
  },

  onLoad() {
    this.load();
  },

  async load() {
    try {
      const report = await contentService.todayReport();
      const favorite = await characterService.detail(report.favoriteCharacterId);
      this.setData({
        report,
        favorite,
        taskPercent: report.taskTotal ? Math.round((report.taskDone / report.taskTotal) * 100) : 0,
        error: false,
      });
    } catch (e) {
      logger.error('parent:load', e);
      this.setData({ error: true });
    }
  },

  goRecords() {
    router.to(ROUTES.callRecords);
  },

  goFavorite() {
    const f = this.data.favorite;
    if (f) router.to(ROUTES.characterDetail, { id: f.id });
  },

  onTodo() {
    wx.showToast({ title: '功能即将开放', icon: 'none' });
  },
});
