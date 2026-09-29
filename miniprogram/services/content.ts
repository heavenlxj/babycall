import { http } from '../core/request';
import * as db from '../mock/db';
import type { AppNotification, Banner, CallRecord, DailyReport } from '../models/index';

export const contentService = {
  /** 运营 Banner：服务端按时间窗口与排序下发，客户端再兜底过滤一次 */
  async banners(position = 'home'): Promise<Banner[]> {
    const list = await http.get<Banner[]>('/v1/banners', { position }, { mock: () => db.banners.slice() });
    const now = Date.now();
    return list.filter((b) => b.startAt <= now && b.endAt >= now).sort((a, b) => a.sort - b.sort);
  },

  notifications: () =>
    http.get<AppNotification[]>('/v1/notifications', undefined, { mock: () => db.notifications.map((n) => ({ ...n })) }),

  readAllNotifications: () =>
    http.post<null>('/v1/notifications/read', undefined, {
      mock: () => {
        db.notifications.forEach((n) => (n.read = true));
        return null;
      },
    }),

  callRecords: (characterId?: string) =>
    http.get<CallRecord[]>('/v1/calls', characterId ? { characterId } : undefined, {
      mock: () => db.callRecords.filter((r) => !characterId || r.characterId === characterId),
    }),

  todayReport: () => http.get<DailyReport>('/v1/reports/today', undefined, { mock: () => ({ ...db.report }) }),
};
