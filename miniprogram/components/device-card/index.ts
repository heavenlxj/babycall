import { IMAGES } from '../../constants/assets';
import type { Device } from '../../models/index';

/**
 * 设备状态卡：未绑定 / 离线 / 在线 / 低电量
 * device 传 null 或空对象表示未绑定；compact 为首页精简版
 * 事件：bind:select（点击卡片）
 */
Component({
  options: { virtualHost: true, multipleSlots: true },
  properties: {
    device: { type: Object, value: {} },
    compact: { type: Boolean, value: false },
  },
  data: {
    image: IMAGES.devicePhone,
    bound: false,
    state: 'unbound',
    statusText: '尚未连接',
  },
  observers: {
    device(device: Partial<Device> | null) {
      const bound = !!(device && device.deviceId);
      let state = 'unbound';
      let statusText = '尚未连接';
      if (bound && device!.status === 'online') {
        const battery = device!.battery;
        const low = battery !== null && battery !== undefined && battery <= 20;
        state = low ? 'low' : 'online';
        statusText = low ? '电量低' : '已连接';
      } else if (bound) {
        state = 'offline';
        statusText = '设备离线';
      }
      this.setData({ bound, state, statusText });
    },
  },
  methods: {
    onTap() {
      this.triggerEvent('select');
    },
  },
});
