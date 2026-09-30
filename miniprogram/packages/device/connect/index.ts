import { IMAGES } from '../../../constants/assets';
import { definePage } from '../../../core/page';
import { logger } from '../../../core/logger';
import { ROUTES, router } from '../../../core/router';
import type { Device } from '../../../models/index';
import { blufi, BlufiEvent } from '../../../services/blufi/client';
import { FAIL, FailInfo, GENERIC_WIFI_FAIL, wifiReasonInfo } from '../../../services/blufi/errors';
import { WifiState } from '../../../services/blufi/protocol';
import { childService, deviceService } from '../../../services/index';
import { PAIRING_STEPS } from '../steps';

type StageKey = 'send' | 'wifi' | 'ip' | 'bind';
type StageState = 'wait' | 'doing' | 'done' | 'fail';

const STAGES: { key: StageKey; title: string }[] = [
  { key: 'send', title: '发送网络信息' },
  { key: 'wifi', title: '童话电话连接 Wi-Fi' },
  { key: 'ip', title: '获取网络地址' },
  { key: 'bind', title: '绑定到宝贝' },
];
const ORDER: StageKey[] = STAGES.map((s) => s.key);
/** 各阶段进度条可到达的上限（%） */
const PROGRESS_CAP: Record<StageKey, number> = { send: 20, wifi: 60, ip: 85, bind: 97 };

const CONNECT_TIMEOUT = 45000;
const IP_TIMEOUT = 20000;
const DEVICE_ID_WAIT = 5000;

/** 配网第 4 步：下发 Wi-Fi 并等待设备联网，成功后绑定到当前孩子 */
definePage({
  data: {
    images: IMAGES,
    steps: PAIRING_STEPS,
    status: 'connecting' as 'connecting' | 'success' | 'fail',
    stages: STAGES.map((s) => ({ ...s, state: 'wait' as StageState })),
    progress: 0,
    ssid: '',
    childName: '宝贝',
    fail: null as FailInfo | null,
    device: null as Device | null,
  },

  stage: 'send' as StageKey,
  progressValue: 0,
  lastReason: 0,
  startedAt: 0,
  tickTimer: 0,
  overallTimer: 0,
  ipTimer: 0,
  unsubscribe: null as (() => void) | null,
  deviceIdWaiter: null as ((id: string) => void) | null,

  onLoad() {
    const child = childService.current();
    this.setData({ ssid: blufi.wifi.ssid, childName: child ? child.nickName : '宝贝' });
    if (!blufi.connected || !blufi.wifi.ssid) {
      this.fail(FAIL.bleDisconnected);
      return;
    }
    this.unsubscribe = blufi.subscribe((e) => this.onEvent(e));
    this.start();
  },

  onUnload() {
    this.clearTimers();
    if (this.unsubscribe) this.unsubscribe();
  },

  clearTimers() {
    clearInterval(this.tickTimer);
    clearTimeout(this.overallTimer);
    clearTimeout(this.ipTimer);
  },

  async start() {
    this.lastReason = 0;
    this.progressValue = 0;
    this.startedAt = Date.now();
    this.setData({ status: 'connecting', fail: null, progress: 0 });
    this.enter('send');
    this.tickTimer = setInterval(() => this.tick(), 300);
    this.overallTimer = setTimeout(() => this.fail(this.lastReason ? wifiReasonInfo(this.lastReason) : GENERIC_WIFI_FAIL), CONNECT_TIMEOUT);

    try {
      await blufi.connectWifi(blufi.wifi.ssid, blufi.wifi.password);
      if (this.stage === 'send') this.enter('wifi');
    } catch (e) {
      logger.error('pairing:send', e);
      this.fail(FAIL.bleDisconnected);
    }
  },

  enter(key: StageKey) {
    this.stage = key;
    const at = ORDER.indexOf(key);
    const stages = this.data.stages.map((s, i) => ({ ...s, state: (i < at ? 'done' : i === at ? 'doing' : 'wait') as StageState }));
    this.setData({ stages });
  },

  tick() {
    const cap = PROGRESS_CAP[this.stage];
    this.progressValue += (cap - this.progressValue) * 0.08;
    const progress = Math.floor(this.progressValue);
    if (progress !== this.data.progress) this.setData({ progress });
  },

  onEvent(e: BlufiEvent) {
    if (e.type === 'deviceId' && this.deviceIdWaiter) this.deviceIdWaiter(e.value);
    if (this.data.status !== 'connecting') return;

    switch (e.type) {
      case 'wifiState':
        if (e.state === WifiState.CONNECTING && this.stage === 'send') this.enter('wifi');
        else if (e.state === WifiState.NO_IP && this.stage !== 'ip') {
          this.enter('ip');
          this.ipTimer = setTimeout(() => this.fail(FAIL.noIp), IP_TIMEOUT);
        } else if (e.state === WifiState.SUCCESS) this.bind();
        else if (e.state === WifiState.FAIL) this.fail(this.lastReason ? wifiReasonInfo(this.lastReason) : GENERIC_WIFI_FAIL);
        break;
      case 'disconnectReason':
        this.lastReason = e.reason;
        this.fail(wifiReasonInfo(e.reason));
        break;
      case 'bleDisconnected':
        if (this.stage !== 'bind') this.fail(FAIL.bleDisconnected);
        break;
      default:
        break;
    }
  },

  waitDeviceId(): Promise<string> {
    if (blufi.meta.deviceId) return Promise.resolve(blufi.meta.deviceId);
    return new Promise((resolve) => {
      const done = (id: string) => {
        clearTimeout(timer);
        this.deviceIdWaiter = null;
        resolve(id);
      };
      const timer = setTimeout(() => done(''), DEVICE_ID_WAIT);
      this.deviceIdWaiter = done;
    });
  },

  async bind() {
    if (this.stage === 'bind') return;
    clearTimeout(this.overallTimer);
    clearTimeout(this.ipTimer);
    this.enter('bind');
    const deviceId = await this.waitDeviceId();
    if (!deviceId) {
      this.fail(FAIL.noDeviceId);
      return;
    }
    await this.doBind(deviceId);
  },

  async doBind(deviceId: string) {
    try {
      const device = await deviceService.bind({
        deviceId,
        wifiName: blufi.wifi.ssid,
        mode: blufi.meta.mode,
        firmware: blufi.meta.firmware,
      });
      this.succeed(device);
    } catch (e) {
      logger.error('pairing:bind', e, { deviceId });
      this.fail({ title: '绑定没有成功', tips: [(e as Error).message || '网络开小差了', '检查手机网络后点击「重试绑定」'], retry: 'bind' });
    }
  },

  succeed(device: Device) {
    this.clearTimers();
    blufi.close();
    this.setData({
      status: 'success',
      device,
      progress: 100,
      stages: this.data.stages.map((s) => ({ ...s, state: 'done' as StageState })),
    });
    logger.setContext({ deviceId: device.deviceId });
    logger.track('pairing_success', { cost: Date.now() - this.startedAt, firmware: blufi.meta.firmware });
  },

  fail(info: FailInfo) {
    if (this.data.status === 'fail') return;
    this.clearTimers();
    const stages = this.data.stages.map((s) => (s.key === this.stage ? { ...s, state: 'fail' as StageState } : s));
    this.setData({ status: 'fail', fail: info, stages });
    logger.track('pairing_fail', { stage: this.stage, title: info.title, code: info.code });
  },

  onRetryWifi() {
    router.back(1);
  },

  onRetrySearch() {
    router.back(2);
  },

  onRetryBind() {
    this.setData({ status: 'connecting', fail: null });
    this.enter('bind');
    this.doBind(blufi.meta.deviceId);
  },

  onSchedule() {
    router.relaunch(ROUTES.scheduleEdit);
  },

  onDone() {
    router.relaunch(ROUTES.device);
  },
});
