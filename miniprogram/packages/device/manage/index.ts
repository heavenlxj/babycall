import { IMAGES } from '../../../constants/assets';
import { definePage } from '../../../core/page';
import { logger } from '../../../core/logger';
import { ROUTES, router } from '../../../core/router';
import type { Device } from '../../../models/index';
import { deviceService } from '../../../services/index';

definePage({
  data: {
    images: IMAGES,
    device: null as Device | null,
    error: false,
    showUnbind: false,
    unbinding: false,
  },

  onLoad() {
    this.setData({ device: deviceService.cached() });
  },

  onShow() {
    this.load();
  },

  async load() {
    try {
      const device = await deviceService.current();
      if (!device) {
        router.redirect(ROUTES.device);
        return;
      }
      this.setData({ device, error: false });
    } catch (e) {
      logger.error('device:manage', e);
      this.setData({ error: true });
    }
  },

  async onVolume(e: WechatMiniprogram.SliderChange) {
    const volume = e.detail.value;
    const device = this.data.device;
    if (!device) return;
    await deviceService.setVolume(device.deviceId, volume);
    logger.track('device_volume', { volume });
  },

  goRecords() {
    router.to(ROUTES.callRecords);
  },

  goWifi() {
    router.to(ROUTES.devicePairing);
  },

  onUnbind() {
    this.setData({ showUnbind: true });
  },

  onCancelUnbind() {
    this.setData({ showUnbind: false });
  },

  async onConfirmUnbind() {
    const device = this.data.device;
    if (!device) return;
    this.setData({ unbinding: true });
    try {
      await deviceService.unbind(device.deviceId);
      logger.track('device_unbind');
      await deviceService.current();
      router.relaunch(ROUTES.device);
    } finally {
      this.setData({ unbinding: false });
    }
  },
});
