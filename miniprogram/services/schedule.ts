import { http } from '../core/request';
import * as db from '../mock/db';
import type { Schedule, ScheduleDraft } from '../models/index';

export const scheduleService = {
  list: () => http.get<Schedule[]>('/v1/schedules', undefined, { mock: () => db.schedules.map((s) => ({ ...s })) }),

  create: (draft: ScheduleDraft) =>
    http.post<Schedule>('/v1/schedules', { ...draft }, {
      mock: () => {
        const item: Schedule = { ...draft, id: `s_${Date.now()}`, enabled: true };
        db.schedules.unshift(item);
        return item;
      },
    }),

  toggle: (id: string, enabled: boolean) =>
    http.put<null>(`/v1/schedules/${id}`, { enabled }, {
      mock: () => {
        const item = db.schedules.find((s) => s.id === id);
        if (item) item.enabled = enabled;
        return null;
      },
    }),

  remove: (id: string) =>
    http.del<null>(`/v1/schedules/${id}`, undefined, {
      mock: () => {
        const idx = db.schedules.findIndex((s) => s.id === id);
        if (idx >= 0) db.schedules.splice(idx, 1);
        return null;
      },
    }),
};
