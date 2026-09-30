import { IMAGES } from '../../../constants/assets';
import { definePage } from '../../../core/page';
import { logger } from '../../../core/logger';
import { ROUTES, router } from '../../../core/router';
import { blufi, isAndroid } from '../../../services/blufi/client';
import { PAIRING_STEPS } from '../steps';

type CheckKey = 'auth' | 'bluetooth' | 'location';
type CheckStatus = 'checking' | 'ok' | 'fail';

interface CheckItem {
  key: CheckKey;
  icon: string;
  title: string;
  desc: string;
  status: CheckStatus;
}

const ITEMS: CheckItem[] = [
  { key: 'auth', icon: 'bluetooth', title: '允许微信使用蓝牙', desc: '用于发现并连接童话电话', status: 'checking' },
  { key: 'bluetooth', icon: 'bluetooth', title: '打开手机蓝牙', desc: '配网全程需要保持开启', status: 'checking' },
  { key: 'location', icon: 'location', title: '打开定位服务', desc: '安卓系统搜索蓝牙设备需要定位权限', status: 'checking' },
];

function getSetting(): Promise<WechatMiniprogram.GetSettingSuccessCallbackResult> {
  return new Promise((resolve, reject) => wx.getSetting({ success: resolve, fail: reject }));
}

async function checkBluetoothScope(): Promise<boolean> {
  const { authSetting } = await getSetting();
  if (authSetting['scope.bluetooth'] === false) return false;
  if (authSetting['scope.bluetooth']) return true;
  return new Promise((resolve) => wx.authorize({ scope: 'scope.bluetooth', success: () => resolve(true), fail: () => resolve(false) }));
}

async function runChecks(): Promise<Record<CheckKey, boolean>> {
  if (blufi.mock) return { auth: true, bluetooth: true, location: true };
  const app = wx.getAppAuthorizeSetting();
  const sys = wx.getSystemSetting();
  const scopeOk = await checkBluetoothScope().catch(() => false);
  return {
    auth: scopeOk && app.bluetoothAuthorized !== 'denied',
    bluetooth: sys.bluetoothEnabled,
    location: !isAndroid || (sys.locationEnabled && app.locationAuthorized === 'authorized'),
  };
}

/** 配网第 1 步：权限检查 */
definePage({
  data: {
    images: IMAGES,
    steps: PAIRING_STEPS,
    items: ITEMS.filter((i) => isAndroid || i.key !== 'location'),
    allOk: false,
    checking: true,
    showHelp: false,
  },

  onLoad(query: Record<string, string | undefined>) {
    this.setData({ showHelp: !!query.help });
    logger.track('pairing_start');
  },

  /** 从系统设置返回时自动重新检测 */
  onShow() {
    this.check();
  },

  async check() {
    this.setData({ checking: true, items: this.data.items.map((i) => ({ ...i, status: 'checking' as CheckStatus })) });
    const result = await runChecks();
    const items = this.data.items.map((i) => ({ ...i, status: (result[i.key] ? 'ok' : 'fail') as CheckStatus }));
    const allOk = items.every((i) => i.status === 'ok');
    this.setData({ items, allOk, checking: false });
    if (!allOk) logger.info('pairing', 'permission missing', result);
  },

  onFix(e: WechatMiniprogram.TouchEvent) {
    const key = e.currentTarget.dataset.key as CheckKey;
    if (key === 'auth') {
      const app = wx.getAppAuthorizeSetting();
      if (app.bluetoothAuthorized === 'denied') wx.openAppAuthorizeSetting({});
      else wx.openSetting({});
    } else if (key === 'bluetooth') {
      if (isAndroid) wx.openSystemBluetoothSetting({});
      else wx.showModal({ title: '打开手机蓝牙', content: '请从屏幕右上角下滑打开控制中心，或在「设置」中开启蓝牙', showCancel: false });
    } else if (!wx.getSystemSetting().locationEnabled) {
      wx.showModal({ title: '打开定位服务', content: '请下拉手机通知栏，开启「位置信息 / 定位」开关', showCancel: false });
    } else {
      wx.openAppAuthorizeSetting({});
    }
  },

  toggleHelp() {
    this.setData({ showHelp: !this.data.showHelp });
  },

  onNext() {
    if (!this.data.allOk) {
      this.check();
      return;
    }
    router.to(ROUTES.deviceSearch);
  },
});
