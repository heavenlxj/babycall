import { http } from '../core/request';
import * as db from '../mock/db';
import type { Character, DailyTask, Memory } from '../models/index';

export const characterService = {
  list: () => http.get<Character[]>('/v1/characters', undefined, { mock: () => db.characters.slice() }),

  /** 我的角色（已添加） */
  mine: () =>
    http.get<Character[]>('/v1/characters/mine', undefined, { mock: () => db.characters.filter((c) => c.owned) }),

  detail: (id: string) =>
    http.get<Character>(`/v1/characters/${id}`, undefined, {
      mock: () => db.characters.find((c) => c.id === id) || db.characters[0],
    }),

  memories: (id: string) =>
    http.get<Memory[]>(`/v1/characters/${id}/memories`, undefined, {
      mock: () => db.memories.filter((m) => m.characterId === id),
    }),

  todayTask: (id: string) =>
    http.get<DailyTask | null>(`/v1/characters/${id}/tasks/today`, undefined, {
      mock: () => {
        const task = db.tasks.find((t) => t.characterId === id) || db.tasks[0];
        return { ...task, characterId: id };
      },
    }),

  /** 让角色立即给设备打电话 */
  callNow: (id: string) =>
    http.post<{ callId: string }>(`/v1/characters/${id}/call`, undefined, { mock: () => ({ callId: `call_${Date.now()}` }) }),
};
