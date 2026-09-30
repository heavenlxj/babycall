import { http } from '../core/request';
import { logger } from '../core/logger';
import { deviceStore } from '../store/index';
import type { Device } from '../models/index';
import { childService } from './child';

interface DeviceDTO {
  device_id: string;
  device_name: string | null;
  wifi_name: string | null;
  volume: number;
  firmware: string | null;
}

// 后端暂无设备实时状态来源：已绑定即视为在线，电量未上报
const toDevice = (d: DeviceDTO): Device => ({
  deviceId: d.device_id,
  name: d.device_name || '童话电话',
  status: 'online',
  battery: null,
  wifiName: d.wifi_name || '',
  firmware: d.firmware || '',
  volume: d.volume,
});

export const deviceService = {
  /** 当前孩子绑定的设备，未绑定返回 null；结果会缓存到本地供首屏快速展示 */
  async current(): Promise<Device | null> {
    const child = childService.current();
    let device: Device | null = null;
    if (child) {
      const res = await http.get<{ devices: DeviceDTO[] }>(`/child/devices/${child.childId}`);
      device = res.devices.length ? toDevice(res.devices[0]) : null;
    }
    device ? deviceStore.set(device) : deviceStore.remove();
    logger.setContext({ deviceId: device ? device.deviceId : '' });
    return device;
  },

  /** 本地缓存的设备信息 */
  cached(): Device | null {
    return deviceStore.get() || null;
  },

  /** 配网完成后绑定到当前孩子 */
  async bind(deviceId: string, wifiName: string): Promise<Device> {
    const res = await http.post<DeviceDTO>('/child/devices/bind', {
      child_id: childService.currentId(),
      device_id: deviceId,
      wifi_name: wifiName,
    });
    const device = toDevice(res);
    deviceStore.set(device);
    return device;
  },

  async unbind(deviceId: string): Promise<void> {
    await http.post<null>('/device/unbind', { child_id: childService.currentId(), device_id: deviceId });
    deviceStore.remove();
  },

  setVolume: (deviceId: string, volume: number) => http.put<DeviceDTO>(`/device/${deviceId}`, { volume }),
};
