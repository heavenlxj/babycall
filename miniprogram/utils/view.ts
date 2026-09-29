import type { CallRecord, Character, Schedule } from '../models/index';
import { dayTime, durationText, nextCallText, repeatText } from './format';

export type CharacterMap = Record<string, Character>;

export const toMap = (list: Character[]): CharacterMap =>
  list.reduce((map, c) => ((map[c.id] = c), map), {} as CharacterMap);

export interface ScheduleView extends Schedule {
  characterName: string;
  characterImage: string;
  bgColor: string;
  repeatText: string;
  nextText: string;
}

export function toScheduleView(s: Schedule, map: CharacterMap): ScheduleView {
  const c = map[s.characterId];
  return {
    ...s,
    characterName: c ? c.name : '',
    characterImage: c ? c.image : '',
    bgColor: c ? c.bgColor : '#FFF1E3',
    repeatText: repeatText(s.repeat, s.weekdays),
    nextText: nextCallText(s.time, s.repeat, s.weekdays),
  };
}

export interface CallRecordView extends CallRecord {
  characterName: string;
  characterImage: string;
  bgColor: string;
  timeText: string;
  durationText: string;
}

export function toCallRecordView(r: CallRecord, map: CharacterMap): CallRecordView {
  const c = map[r.characterId];
  return {
    ...r,
    characterName: c ? c.name : '',
    characterImage: c ? c.image : '',
    bgColor: c ? c.bgColor : '#FFF1E3',
    timeText: dayTime(r.startAt),
    durationText: durationText(r.duration),
  };
}
