import { IMAGES } from '../../constants/assets';
import { definePage } from '../../core/page';
import { logger } from '../../core/logger';
import { ROUTES, router } from '../../core/router';
import type { Device } from '../../models/index';
import { deviceService } from '../../services/index';

definePage({
  data: {
    images: IMAGES,
    device: null as Device | null,
    loading: true,
    error: false,
  },

  onLoad() {
    this.setData({ device: deviceService.cached() });
  },

  onShow() {
    this.load();
  },

  async load() {
    try {
      this.setData({ device: await deviceService.current(), error: false });
    } catch (e) {
      logger.error('device:load', e);
      this.setData({ error: true });
    } finally {
      this.setData({ loading: false });
    }
  },

  onPair() {
    logger.track('device_pair_start', { from: 'device_tab' });
    router.to(ROUTES.devicePairing);
  },

  onManage() {
    router.to(ROUTES.deviceManage);
  },

  onHelp() {
    router.to(ROUTES.devicePairing, { help: 1 });
  },

  onRecords() {
    router.to(ROUTES.callRecords);
  },
});
