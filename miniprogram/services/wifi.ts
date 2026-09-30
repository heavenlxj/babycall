import { wifiStore } from '../store/index';
import type { DeviceWifi } from './blufi/protocol';

export interface NearbyWifi {
  ssid: string;
  /** 信号格数 1~3 */
  level: number;
  is5G: boolean;
  secure: boolean;
}

const HISTORY_LIMIT = 10;

const levelFromDbm = (rssi: number) => (rssi >= -60 ? 3 : rssi >= -75 ? 2 : 1);
/** 手机扫描结果：安卓 0~100 */
const levelFromPercent = (s: number) => (s >= 70 ? 3 : s >= 40 ? 2 : 1);

/** 名称里带 5G 的网络大概率是 5GHz 频段（iOS 拿不到频率时的兜底判断） */
export const looks5G = (ssid: string) => /5g/i.test(ssid);

function sortWifi(list: NearbyWifi[]): NearbyWifi[] {
  return list.sort((a, b) => Number(a.is5G) - Number(b.is5G) || b.level - a.level);
}

function startWifi(): Promise<void> {
  return new Promise((resolve, reject) => wx.startWifi({ success: () => resolve(), fail: reject }));
}

export const wifiService = {
  /** 手机扫描附近 Wi-Fi：仅安卓可用，iOS 系统不向小程序开放列表 */
  async scanByPhone(timeout = 8000): Promise<NearbyWifi[]> {
    await startWifi();
    return new Promise((resolve, reject) => {
      const done = () => {
        clearTimeout(timer);
        wx.offGetWifiList(onList);
      };
      const onList: WechatMiniprogram.OnGetWifiListCallback = (res) => {
        done();
        const map = new Map<string, NearbyWifi>();
        res.wifiList.forEach((w) => {
          const ssid = w.SSID.trim();
          if (!ssid) return;
          const item = { ssid, level: levelFromPercent(w.signalStrength), is5G: w.frequency >= 5000, secure: w.secure !== false };
          const prev = map.get(ssid);
          // 同名双频路由器：优先保留 2.4G
          if (!prev || (prev.is5G && !item.is5G) || (prev.is5G === item.is5G && item.level > prev.level)) map.set(ssid, item);
        });
        resolve(sortWifi(Array.from(map.values())));
      };
      const timer = setTimeout(() => {
        done();
        reject(new Error('scan timeout'));
      }, timeout);
      wx.onGetWifiList(onList);
      wx.getWifiList({
        fail: (e) => {
          done();
          reject(e);
        },
      });
    });
  },

  /** 设备通过蓝牙回传的扫描结果（设备只能扫到 2.4G 网络） */
  fromDevice(list: DeviceWifi[]): NearbyWifi[] {
    const map = new Map<string, NearbyWifi>();
    list.forEach(({ ssid, rssi }) => {
      const level = levelFromDbm(rssi);
      const prev = map.get(ssid);
      if (!prev || level > prev.level) map.set(ssid, { ssid, level, is5G: false, secure: true });
    });
    return sortWifi(Array.from(map.values()));
  },

  /** 手机当前连接的 Wi-Fi，取不到时返回 null */
  async current(): Promise<{ ssid: string; is5G: boolean } | null> {
    try {
      await startWifi();
      const res = await new Promise<WechatMiniprogram.GetConnectedWifiSuccessCallbackResult>((resolve, reject) =>
        wx.getConnectedWifi({ partialInfo: true, success: resolve, fail: reject }),
      );
      const ssid = (res.wifi.SSID || '').trim();
      if (!ssid) return null;
      return { ssid, is5G: res.wifi.frequency ? res.wifi.frequency >= 5000 : looks5G(ssid) };
    } catch {
      return null;
    }
  },

  savedPassword(ssid: string): string {
    return (wifiStore.get() || []).find((w) => w.ssid === ssid)?.password || '';
  },

  remember(ssid: string, password: string) {
    const rest = (wifiStore.get() || []).filter((w) => w.ssid !== ssid);
    wifiStore.set([{ ssid, password }, ...rest].slice(0, HISTORY_LIMIT));
  },
};
