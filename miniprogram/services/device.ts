import { http } from '../core/request';
import { logger } from '../core/logger';
import * as db from '../mock/db';
import { deviceStore } from '../store/index';
import type { Device } from '../models/index';

let mockBound = true;

export const deviceService = {
  /** 当前绑定设备，未绑定返回 null；结果会缓存到本地供首屏快速展示 */
  async current(): Promise<Device | null> {
    const device = await http.get<Device | null>('/v1/devices/current', undefined, {
      mock: () => (mockBound ? { ...db.device } : null),
    });
    device ? deviceStore.set(device) : deviceStore.remove();
    logger.setContext({ deviceId: device ? device.deviceId : '' });
    return device;
  },

  /** 本地缓存的设备信息 */
  cached(): Device | null {
    return deviceStore.get() || null;
  },

  /** 配网完成后绑定设备 */
  bind: (deviceId: string, wifiName: string) =>
    http.post<Device>('/v1/devices/bind', { deviceId, wifiName }, {
      mock: () => {
        mockBound = true;
        return { ...db.device, deviceId, wifiName };
      },
    }),

  unbind: (deviceId: string) =>
    http.post<null>('/v1/devices/unbind', { deviceId }, {
      mock: () => {
        mockBound = false;
        return null;
      },
    }),

  setVolume: (deviceId: string, volume: number) =>
    http.put<null>(`/v1/devices/${deviceId}`, { volume }, {
      mock: () => {
        db.device.volume = volume;
        return null;
      },
    }),
};
