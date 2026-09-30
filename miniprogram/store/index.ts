import { defineItem, storage } from '../core/storage';
import type { Child, Device, TokenInfo, UserProfile } from '../models/index';

/**
 * 业务存储项统一在此声明，页面/服务只通过这些对象读写本地缓存。
 * 底层 key 已按环境隔离（见 core/storage）。
 */
export const tokenStore = defineItem<TokenInfo>('auth.token');
export const profileStore = defineItem<UserProfile>('user.profile');
/** 当前选中的孩子，定时来电 / 设备等接口都以它为维度 */
export const childStore = defineItem<Child>('child.current');
export const deviceStore = defineItem<Device>('device.current');
/** 配网用过的 Wi-Fi 及密码（仅存本机），最近使用的在前 */
export const wifiStore = defineItem<{ ssid: string; password: string }[]>('device.wifiHistory');
/** 日志上报失败时的待重发队列 */
export const logQueueStore = defineItem<object[]>('log.pending');
/** 匿名设备标识，用于日志关联 */
export const installIdStore = defineItem<string>('app.installId');

/** 注销账号：清空当前环境全部数据 */
export function clearAllData() {
  storage.clear();
}
