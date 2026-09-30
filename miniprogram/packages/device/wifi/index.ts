import { definePage } from '../../../core/page';
import { logger } from '../../../core/logger';
import { ROUTES, router } from '../../../core/router';
import { blufi, isAndroid } from '../../../services/blufi/client';
import { looks5G, NearbyWifi, wifiService } from '../../../services/wifi';
import { PAIRING_STEPS } from '../steps';

const DEVICE_SCAN_TIMEOUT = 10000;

interface WifiView extends NearbyWifi {
  icon: string;
  current: boolean;
}

/** 配网第 3 步：选择 Wi-Fi 并输入密码 */
definePage({
  data: {
    steps: PAIRING_STEPS,
    scanning: true,
    failed: false,
    list: [] as WifiView[],
    currentSsid: '',
    showWhy: false,

    sheet: false,
    manual: false,
    secure: true,
    ssid: '',
    password: '',
    showPwd: false,
    remembered: false,
    warn5G: false,
    pwdSpace: false,
  },

  raw: [] as NearbyWifi[],
  loaded: false,
  visible: true,
  lostShown: false,
  unsubscribe: null as (() => void) | null,
  deviceScanDone: null as ((list: NearbyWifi[]) => void) | null,

  onLoad() {
    if (!blufi.connected) {
      this.lost();
      return;
    }
    this.unsubscribe = blufi.subscribe((e) => {
      if (e.type === 'wifiList' && this.deviceScanDone) this.deviceScanDone(wifiService.fromDevice(e.list));
      if (e.type === 'bleDisconnected' && this.visible) this.lost();
    });
    wifiService.current().then((cur) => {
      if (!cur) return;
      this.setData({ currentSsid: cur.ssid });
      this.render();
    });
    this.loaded = true;
    this.scan();
  },

  /** 从连接页返回时，蓝牙可能已经断开 */
  onShow() {
    this.visible = true;
    if (this.loaded && !blufi.connected) this.lost();
  },

  onHide() {
    this.visible = false;
  },

  onUnload() {
    if (this.unsubscribe) this.unsubscribe();
    blufi.close();
  },

  lost() {
    if (this.lostShown) return;
    this.lostShown = true;
    wx.showModal({
      title: '蓝牙连接已断开',
      content: '请确认童话电话仍处于配网模式，然后重新搜索',
      confirmText: '重新搜索',
      showCancel: false,
      success: () => router.back(),
    });
  },

  async scan() {
    this.setData({ scanning: true, failed: false });
    let list: NearbyWifi[] = [];
    if (isAndroid) list = await wifiService.scanByPhone().catch(() => []);
    for (let i = 0; i < 2 && !list.length && blufi.connected; i++) list = await this.scanByDevice();
    this.raw = list;
    this.setData({ scanning: false, failed: !list.length });
    this.render();
    logger.info('pairing', 'wifi scanned', { count: list.length, byPhone: isAndroid });
  },

  scanByDevice(): Promise<NearbyWifi[]> {
    return new Promise((resolve) => {
      const finish = (list: NearbyWifi[]) => {
        clearTimeout(timer);
        this.deviceScanDone = null;
        resolve(list);
      };
      const timer = setTimeout(() => finish([]), DEVICE_SCAN_TIMEOUT);
      this.deviceScanDone = finish;
      blufi.requestWifiList().catch(() => finish([]));
    });
  },

  /** 手机当前连接的网络置顶 */
  render() {
    const cur = this.data.currentSsid;
    const list = this.raw
      .map((w) => ({ ...w, icon: `wifi${w.level}`, current: w.ssid === cur && !w.is5G }))
      .sort((a, b) => Number(b.current) - Number(a.current));
    this.setData({ list });
  },

  onRescan() {
    if (!this.data.scanning) this.scan();
  },

  toggleWhy() {
    this.setData({ showWhy: !this.data.showWhy });
  },

  onPick(e: WechatMiniprogram.TouchEvent) {
    const item = this.data.list[e.currentTarget.dataset.index as number];
    if (item.is5G) {
      wx.showModal({
        title: '暂不支持 5GHz 网络',
        content: '童话电话只能连接 2.4GHz 的 Wi-Fi。双频路由器请选择名称中不带 5G 的网络。',
        showCancel: false,
        confirmText: '知道了',
      });
      return;
    }
    this.openSheet(item.ssid, item.secure, false);
  },

  onManual() {
    this.openSheet('', true, true);
  },

  openSheet(ssid: string, secure: boolean, manual: boolean) {
    const password = ssid ? wifiService.savedPassword(ssid) : '';
    this.setData({
      sheet: true,
      manual,
      secure,
      ssid,
      password,
      showPwd: false,
      remembered: !!password,
      warn5G: looks5G(ssid),
      pwdSpace: false,
    });
  },

  closeSheet() {
    this.setData({ sheet: false });
  },

  onSsidInput(e: WechatMiniprogram.Input) {
    const ssid = e.detail.value;
    const saved = wifiService.savedPassword(ssid.trim());
    const fill = saved && !this.data.password;
    this.setData({ ssid, warn5G: looks5G(ssid), ...(fill ? { password: saved, remembered: true } : {}) });
  },

  onPwdInput(e: WechatMiniprogram.Input) {
    const password = e.detail.value;
    this.setData({ password, remembered: false, pwdSpace: /^\s|\s$/.test(password) });
  },

  togglePwd() {
    this.setData({ showPwd: !this.data.showPwd });
  },

  onSubmit() {
    const ssid = this.data.ssid.trim();
    const { password, secure, manual } = this.data;
    if (!ssid) {
      wx.showToast({ title: '请输入 Wi-Fi 名称', icon: 'none' });
      return;
    }
    if (secure && !manual && !password) {
      wx.showToast({ title: '请输入 Wi-Fi 密码', icon: 'none' });
      return;
    }
    if (password && password.length < 8) {
      wx.showToast({ title: 'Wi-Fi 密码至少 8 位', icon: 'none' });
      return;
    }
    blufi.wifi = { ssid, password };
    wifiService.remember(ssid, password);
    this.setData({ sheet: false });
    logger.track('pairing_wifi_submit', { manual, hasPwd: !!password });
    router.to(ROUTES.deviceConnect);
  },
});
