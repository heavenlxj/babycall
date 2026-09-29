import { ENV } from '../config/index';

/**
 * 按环境隔离的本地存储：所有 key 自动加上 `pc_{env}:` 前缀，
 * 开发/体验/正式版数据互不污染；支持可选过期时间。
 */
const PREFIX = `pc_${ENV}:`;

interface Entry<T> {
  v: T;
  /** 过期时间戳（ms），缺省为永久 */
  e?: number;
}

const fullKey = (key: string) => `${PREFIX}${key}`;

export const storage = {
  get<T>(key: string, fallback?: T): T | undefined {
    try {
      const raw = wx.getStorageSync(fullKey(key)) as Entry<T> | '';
      if (!raw || typeof raw !== 'object' || !('v' in raw)) return fallback;
      if (raw.e && raw.e < Date.now()) {
        wx.removeStorageSync(fullKey(key));
        return fallback;
      }
      return raw.v;
    } catch (e) {
      return fallback;
    }
  },

  /** @param ttlSeconds 过期秒数，不传为永久 */
  set<T>(key: string, value: T, ttlSeconds?: number) {
    const entry: Entry<T> = { v: value };
    if (ttlSeconds) entry.e = Date.now() + ttlSeconds * 1000;
    try {
      wx.setStorageSync(fullKey(key), entry);
    } catch (e) {
      console.error('[storage] set failed', key, e);
    }
  },

  remove(key: string) {
    wx.removeStorageSync(fullKey(key));
  },

  /** 仅清空当前环境的数据 */
  clear() {
    const { keys } = wx.getStorageInfoSync();
    keys.filter((k) => k.startsWith(PREFIX)).forEach((k) => wx.removeStorageSync(k));
  },
};

export interface StorageItem<T> {
  get(): T | undefined;
  set(value: T): void;
  remove(): void;
}

/** 声明一个强类型存储项，业务侧只依赖该接口 */
export function defineItem<T>(key: string, ttlSeconds?: number): StorageItem<T> {
  return {
    get: () => storage.get<T>(key),
    set: (value: T) => storage.set(key, value, ttlSeconds),
    remove: () => storage.remove(key),
  };
}
