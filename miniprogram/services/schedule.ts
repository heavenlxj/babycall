import { http } from '../core/request';
import type { RepeatType, Schedule, ScheduleDraft } from '../models/index';
import { childService } from './child';

/**
 * 后端 child_alarm：repeat 为 1-7（周一…周日），[] 表示仅一次；
 * 前端以 repeat 类型 + weekdays（0=周日）表达，这里做双向转换。
 */
interface AlarmDTO {
  id: number;
  character_id: string | null;
  time: string;
  repeat: number[];
  theme: string | null;
  remind_before: number;
  enabled: boolean;
}

const DAILY = [1, 2, 3, 4, 5, 6, 7];
const WORKDAY = [1, 2, 3, 4, 5];
const WEEKEND = [6, 7];

const sameDays = (a: number[], b: number[]) => a.length === b.length && a.every((d, i) => d === b[i]);

function toRepeatDays(repeat: RepeatType, weekdays: number[]): number[] {
  if (repeat === 'daily') return DAILY;
  if (repeat === 'workday') return WORKDAY;
  if (repeat === 'weekend') return WEEKEND;
  return weekdays.map((d) => (d === 0 ? 7 : d)).sort((a, b) => a - b);
}

function fromRepeatDays(days: number[]): Pick<Schedule, 'repeat' | 'weekdays'> {
  const sorted = days.slice().sort((a, b) => a - b);
  if (!sorted.length || sameDays(sorted, DAILY)) return { repeat: 'daily', weekdays: [] };
  if (sameDays(sorted, WORKDAY)) return { repeat: 'workday', weekdays: [] };
  if (sameDays(sorted, WEEKEND)) return { repeat: 'weekend', weekdays: [] };
  return { repeat: 'custom', weekdays: sorted.map((d) => (d === 7 ? 0 : d)) };
}

const toSchedule = (a: AlarmDTO): Schedule => ({
  id: String(a.id),
  characterId: a.character_id || '',
  time: a.time,
  ...fromRepeatDays(a.repeat),
  label: a.theme || '',
  remindBefore: a.remind_before,
  enabled: a.enabled,
});

const base = () => `/child/${childService.currentId()}/alarms`;

export const scheduleService = {
  async list(): Promise<Schedule[]> {
    if (!childService.current()) return [];
    const res = await http.get<{ alarms: AlarmDTO[] }>(base());
    return res.alarms.map(toSchedule);
  },

  async create(draft: ScheduleDraft): Promise<Schedule> {
    const res = await http.post<AlarmDTO>(base(), {
      time: draft.time,
      repeat: toRepeatDays(draft.repeat, draft.weekdays),
      theme: draft.label,
      character_id: draft.characterId,
      remind_before: draft.remindBefore,
    });
    return toSchedule(res);
  },

  toggle: (id: string, enabled: boolean) => http.put<AlarmDTO>(`${base()}/${id}`, { enabled }),

  remove: (id: string) => http.del<null>(`${base()}/${id}`),
};
