import { IMAGES } from '../../../constants/assets';
import { definePage } from '../../../core/page';
import { logger } from '../../../core/logger';
import { ROUTES, router } from '../../../core/router';
import { deviceService } from '../../../services/index';
import { wifiStore } from '../../../store/index';

/** intro → device(确认开机) → wifi(填写网络) → connecting → success | fail */
type Phase = 'intro' | 'device' | 'wifi' | 'connecting' | 'success' | 'fail';

const STEP_INDEX: Record<Phase, number> = { intro: 0, device: 0, wifi: 1, connecting: 2, success: 2, fail: 1 };

function connectedWifi(): Promise<string> {
  return new Promise((resolve) => {
    wx.startWifi({
      success: () =>
        wx.getConnectedWifi({
          success: (res) => resolve(res.wifi.SSID || ''),
          fail: () => resolve(''),
        }),
      fail: () => resolve(''),
    });
  });
}

definePage({
  data: {
    images: IMAGES,
    steps: ['连接设备', '配置网络', '完成'],
    phase: 'intro' as Phase,
    step: 0,
    showHelp: false,
    ssid: '',
    password: '',
    showPwd: false,
    startedAt: 0,
  },

  onLoad(query: Record<string, string | undefined>) {
    this.setData({ showHelp: !!query.help, ssid: wifiStore.get() || '' });
  },

  go(phase: Phase) {
    this.setData({ phase, step: STEP_INDEX[phase] });
  },

  onStart() {
    logger.track('pairing_start');
    this.setData({ startedAt: Date.now() });
    this.go('device');
  },

  async onDeviceReady() {
    this.go('wifi');
    if (!this.data.ssid) {
      const ssid = await connectedWifi();
      if (ssid) this.setData({ ssid });
    }
  },

  onSsid(e: WechatMiniprogram.Input) {
    this.setData({ ssid: e.detail.value });
  },

  onPwd(e: WechatMiniprogram.Input) {
    this.setData({ password: e.detail.value });
  },

  togglePwd() {
    this.setData({ showPwd: !this.data.showPwd });
  },

  async onConnect() {
    const { ssid, password } = this.data;
    if (!ssid) {
      wx.showToast({ title: '请填写 Wi-Fi 名称', icon: 'none' });
      return;
    }
    wifiStore.set(ssid);
    this.go('connecting');
    try {
      // TODO: 接入实际配网协议（BLE / SoftAP），此处拿到设备 ID 后调用绑定
      await new Promise((resolve) => setTimeout(resolve, 2400));
      const device = await deviceService.bind('1234567890', ssid);
      logger.track('pairing_success', { cost: Date.now() - this.data.startedAt, hasPwd: !!password });
      logger.setContext({ deviceId: device.deviceId });
      this.go('success');
    } catch (e) {
      logger.error('pairing', e, { ssid });
      logger.track('pairing_fail');
      this.go('fail');
    }
  },

  onRetry() {
    this.go('device');
  },

  toggleHelp() {
    this.setData({ showHelp: !this.data.showHelp });
  },

  onDone() {
    router.relaunch(ROUTES.device);
  },

  onSchedule() {
    router.redirect(ROUTES.scheduleEdit);
  },
});
