import type { RepeatType } from '../models/index';

export const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 6) return '夜深了';
  if (h < 11) return '早上好';
  if (h < 13) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function repeatText(repeat: RepeatType, weekdays: number[] = []): string {
  switch (repeat) {
    case 'daily':
      return '每天';
    case 'workday':
      return '工作日';
    case 'weekend':
      return '周末';
    default:
      return weekdays.length ? weekdays.map((d) => WEEK[d]).join('、') : '自定义';
  }
}

/** 今天 08:00 / 昨天 16:20 / 4月20日 12:30 */
export function dayTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (ts >= startOfToday) return `今天 ${hm}`;
  if (ts >= startOfToday - 86400000) return `昨天 ${hm}`;
  return `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`;
}

export function fullDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 3 分 12 秒 */
export function durationText(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m} 分 ${s} 秒` : `${s} 秒`;
}

/** 02:18 */
export function clock(seconds: number): string {
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
}

/** 根据时间和重复规则计算下一次来电描述：今天 07:30 / 明天 07:30 / 周六 07:30 */
export function nextCallText(time: string, repeat: RepeatType, weekdays: number[] = []): string {
  const [h, m] = time.split(':').map(Number);
  const now = new Date();
  const allow = (day: number) => {
    if (repeat === 'daily') return true;
    if (repeat === 'workday') return day >= 1 && day <= 5;
    if (repeat === 'weekend') return day === 0 || day === 6;
    return weekdays.includes(day);
  };
  for (let i = 0; i < 8; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, h, m);
    if (d.getTime() > now.getTime() && allow(d.getDay())) {
      const prefix = i === 0 ? '今天' : i === 1 ? '明天' : WEEK[d.getDay()];
      return `${prefix} ${time}`;
    }
  }
  return time;
}
