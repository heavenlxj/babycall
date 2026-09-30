import { IMAGES } from '../../../constants/assets';
import { definePage } from '../../../core/page';
import { logger } from '../../../core/logger';
import { ROUTES, router } from '../../../core/router';
import { blufi, FoundDevice } from '../../../services/blufi/client';
import { PAIRING_STEPS } from '../steps';

const SEARCH_TIMEOUT = 15000;

interface DeviceView extends FoundDevice {
  icon: string;
}

const signalIcon = (rssi: number) => `wifi${rssi >= -60 ? 3 : rssi >= -80 ? 2 : 1}`;

/** 配网第 2 步：搜索附近处于配网模式的童话电话 */
definePage({
  data: {
    images: IMAGES,
    steps: PAIRING_STEPS,
    phase: 'searching' as 'searching' | 'timeout',
    devices: [] as DeviceView[],
    connectingId: '',
  },

  stopDiscover: null as (() => void) | null,
  shown: false,

  onLoad() {
    this.start();
  },

  /** 从 Wi-Fi 配置页返回时蓝牙已断开，重新搜索 */
  onShow() {
    if (this.shown && !this.data.connectingId) this.start();
    this.shown = true;
  },

  onHide() {
    this.stop();
  },

  onUnload() {
    this.stop();
  },

  stop() {
    if (this.stopDiscover) this.stopDiscover();
    this.stopDiscover = null;
  },

  async start() {
    this.stop();
    this.setData({ phase: 'searching', devices: [], connectingId: '' });
    try {
      await blufi.resetAdapter();
      this.stopDiscover = await blufi.discover(
        (d) => this.onFound(d),
        SEARCH_TIMEOUT,
        () => {
          this.stopDiscover = null;
          if (!this.data.devices.length) {
            this.setData({ phase: 'timeout' });
            logger.track('pairing_search_timeout');
          }
        },
      );
    } catch (e) {
      logger.error('pairing:discover', e);
      wx.showModal({
        title: '蓝牙不可用',
        content: '请确认手机蓝牙已打开，并允许微信使用蓝牙',
        confirmText: '去检查',
        showCancel: false,
        success: () => router.back(),
      });
    }
  },

  onFound(d: FoundDevice) {
    if (!this.data.devices.length) logger.track('pairing_device_found');
    const others = this.data.devices.filter((x) => x.deviceId !== d.deviceId);
    const devices = [...others, { ...d, icon: signalIcon(d.rssi) }].sort((a, b) => b.rssi - a.rssi);
    this.setData({ devices });
  },

  async onConnect(e: WechatMiniprogram.TouchEvent) {
    if (this.data.connectingId) return;
    const deviceId = e.currentTarget.dataset.id as string;
    this.stop();
    this.setData({ connectingId: deviceId });
    try {
      await blufi.connect(deviceId);
      logger.track('pairing_ble_connected');
      router.to(ROUTES.deviceWifi);
      this.setData({ connectingId: '' });
    } catch (err) {
      logger.error('pairing:connect', err, { deviceId });
      this.setData({ connectingId: '' });
      wx.showToast({ title: '连接失败，请靠近童话电话再试', icon: 'none' });
    }
  },

  onRetry() {
    this.start();
  },
});
