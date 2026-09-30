import { logger } from '../../core/logger';
import {
  CtrlSubtype,
  CustomTag,
  DataSubtype,
  DEVICE_NAME_PREFIX,
  DeviceWifi,
  encodeFrames,
  Frame,
  FrameAssembler,
  FrameType,
  parseWifiList,
  utf8Decode,
  utf8Encode,
  WifiState,
  WifiStateValue,
} from './protocol';

export interface FoundDevice {
  deviceId: string;
  name: string;
  rssi: number;
}

export type BlufiEvent =
  | { type: 'wifiState'; state: WifiStateValue }
  | { type: 'wifiList'; list: DeviceWifi[] }
  | { type: 'deviceId'; value: string }
  | { type: 'disconnectReason'; reason: number }
  | { type: 'error'; code: number }
  | { type: 'bleDisconnected' };

type Listener = (e: BlufiEvent) => void;

interface Connection {
  deviceId: string;
  serviceId: string;
  writeId: string;
  noResponse: boolean;
}

const platform = (() => {
  try {
    return wx.getDeviceInfo().platform;
  } catch {
    return '';
  }
})();

export const isAndroid = platform === 'android';

function call<T = unknown>(fn: (opts: any) => unknown, opts: object = {}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    fn({ ...opts, success: resolve, fail: reject });
  });
}

const STANDARD_SERVICES = ['00001800', '00001801'];
const BLUFI_SERVICE = '0000FFFF';

/**
 * BluFi 配网客户端（单例，贯穿搜索 → 配置 → 连接几个页面）
 * 微信开发者工具不支持蓝牙，自动切换为模拟设备，便于调试界面
 */
class BlufiClient {
  readonly mock = platform === 'devtools';
  /** 本次配网过程中设备上报的信息 */
  meta = { deviceId: '', mode: null as number | null, firmware: '' };
  /** 本次配网选择的 Wi-Fi */
  wifi = { ssid: '', password: '' };

  private conn: Connection | null = null;
  private seq = 0;
  private maxFrame = 20;
  private assembler = new FrameAssembler();
  private listeners = new Set<Listener>();

  get connected() {
    return !!this.conn;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(e: BlufiEvent) {
    this.listeners.forEach((fn) => fn(e));
  }

  async openAdapter() {
    if (this.mock) return;
    try {
      await call(wx.openBluetoothAdapter);
    } catch (e) {
      if (!/already opened/.test((e as WechatMiniprogram.BluetoothError).errMsg || '')) throw e;
    }
  }

  /** 重置蓝牙适配器，清理上一次残留的连接和搜索状态 */
  async resetAdapter() {
    this.close();
    if (this.mock) return;
    await call(wx.closeBluetoothAdapter).catch(() => undefined);
    await this.openAdapter();
  }

  /** 搜索设备，返回停止函数；到达超时时间后自动停止并回调 onTimeout */
  async discover(onFound: (d: FoundDevice) => void, timeout: number, onTimeout: () => void): Promise<() => void> {
    let timer = 0;
    if (this.mock) {
      const found = setTimeout(() => onFound({ deviceId: 'mock-device', name: `${DEVICE_NAME_PREFIX}-PALLY-A1`, rssi: -48 }), 1800);
      timer = setTimeout(onTimeout, timeout);
      return () => {
        clearTimeout(found);
        clearTimeout(timer);
      };
    }

    const onDevice: WechatMiniprogram.OnBluetoothDeviceFoundCallback = ({ devices }) => {
      devices.forEach((d) => {
        const name = d.localName || d.name;
        if (name && name.startsWith(DEVICE_NAME_PREFIX)) onFound({ deviceId: d.deviceId, name, rssi: d.RSSI });
      });
    };
    const stop = () => {
      clearTimeout(timer);
      wx.offBluetoothDeviceFound();
      wx.stopBluetoothDevicesDiscovery({ fail: () => undefined });
    };
    wx.onBluetoothDeviceFound(onDevice);
    await call(wx.startBluetoothDevicesDiscovery, { allowDuplicatesKey: true, interval: 0 });
    timer = setTimeout(() => {
      stop();
      onTimeout();
    }, timeout);
    return stop;
  }

  async connect(deviceId: string) {
    this.close();
    this.meta = { deviceId: '', mode: null, firmware: '' };
    this.seq = 0;
    this.assembler.reset();

    if (this.mock) {
      await new Promise((r) => setTimeout(r, 800));
      this.conn = { deviceId, serviceId: 'mock', writeId: 'mock', noResponse: false };
      return;
    }

    await this.openAdapter();
    await call(wx.createBLEConnection, { deviceId, timeout: 10000 });
    try {
      this.maxFrame = await this.negotiateMtu(deviceId);
      const conn = await this.findChannel(deviceId);
      wx.onBLECharacteristicValueChange(this.onValue);
      wx.onBLEConnectionStateChange(this.onState);
      this.conn = conn;
      logger.info('blufi', 'connected', { deviceId, serviceId: conn.serviceId, maxFrame: this.maxFrame });
    } catch (e) {
      wx.closeBLEConnection({ deviceId, fail: () => undefined });
      throw e;
    }
  }

  /** 安卓默认 MTU 23，主动协商更大值以减少分片；iOS 由系统自动协商 */
  private async negotiateMtu(deviceId: string): Promise<number> {
    if (!isAndroid) return 180;
    try {
      const res = await call<WechatMiniprogram.SetBLEMTUSuccessCallbackResult>(wx.setBLEMTU, { deviceId, mtu: 185 });
      return (res.mtu || 185) - 3;
    } catch {
      return 20;
    }
  }

  /** 选取同时具备写入和通知能力的自定义服务，并开启通知 */
  private async findChannel(deviceId: string): Promise<Connection> {
    const { services } = await call<WechatMiniprogram.GetBLEDeviceServicesSuccessCallbackResult>(wx.getBLEDeviceServices, { deviceId });
    const candidates = services
      .filter((s) => !STANDARD_SERVICES.some((p) => s.uuid.toUpperCase().startsWith(p)))
      .sort((a, b) => Number(b.uuid.toUpperCase().startsWith(BLUFI_SERVICE)) - Number(a.uuid.toUpperCase().startsWith(BLUFI_SERVICE)));

    for (const service of candidates) {
      const { characteristics } = await call<WechatMiniprogram.GetBLEDeviceCharacteristicsSuccessCallbackResult>(
        wx.getBLEDeviceCharacteristics,
        { deviceId, serviceId: service.uuid },
      ).catch(() => ({ characteristics: [] as WechatMiniprogram.BLECharacteristic[] }));
      const write = characteristics.find((c) => c.properties.write) || characteristics.find((c) => c.properties.writeNoResponse);
      const notify = characteristics.find((c) => c.properties.notify || c.properties.indicate);
      if (!write || !notify) continue;

      await call(wx.notifyBLECharacteristicValueChange, { deviceId, serviceId: service.uuid, characteristicId: notify.uuid, state: true });
      return { deviceId, serviceId: service.uuid, writeId: write.uuid, noResponse: !write.properties.write };
    }
    throw new Error('未找到可用的蓝牙服务');
  }

  close() {
    const conn = this.conn;
    this.conn = null;
    if (!conn || this.mock) return;
    wx.offBLECharacteristicValueChange();
    wx.offBLEConnectionStateChange(this.onState);
    wx.closeBLEConnection({ deviceId: conn.deviceId, fail: () => undefined });
  }

  /** 让设备扫描附近的 Wi-Fi，结果通过 wifiList 事件返回 */
  requestWifiList() {
    return this.send(FrameType.CTRL, CtrlSubtype.GET_WIFI_LIST, new Uint8Array(0));
  }

  /** 下发 Wi-Fi 名称、密码并让设备发起连接，进度通过 wifiState 等事件返回 */
  async connectWifi(ssid: string, password: string) {
    await this.send(FrameType.DATA, DataSubtype.STA_SSID, utf8Encode(ssid));
    await this.send(FrameType.DATA, DataSubtype.STA_PASSWORD, utf8Encode(password));
    await this.send(FrameType.CTRL, CtrlSubtype.CONNECT_WIFI, new Uint8Array(0));
  }

  private async send(frameType: number, subtype: number, payload: Uint8Array) {
    const conn = this.conn;
    if (!conn) throw new Error('蓝牙未连接');
    if (this.mock) return this.mockReply(frameType, subtype, payload);

    const nextSeq = () => {
      const s = this.seq;
      this.seq = (s + 1) % 256;
      return s;
    };
    for (const value of encodeFrames(frameType, subtype, payload, nextSeq, this.maxFrame)) {
      await call(wx.writeBLECharacteristicValue, {
        deviceId: conn.deviceId,
        serviceId: conn.serviceId,
        characteristicId: conn.writeId,
        value,
        ...(conn.noResponse ? { writeType: 'writeNoResponse' } : {}),
      });
    }
  }

  private onValue = (res: WechatMiniprogram.OnBLECharacteristicValueChangeListenerResult) => {
    if (!this.conn || res.deviceId !== this.conn.deviceId) return;
    const frame = this.assembler.push(res.value);
    if (frame) this.dispatch(frame);
  };

  private onState = (res: WechatMiniprogram.OnBLEConnectionStateChangeListenerResult) => {
    if (!this.conn || res.deviceId !== this.conn.deviceId || res.connected) return;
    logger.warn('blufi', 'ble disconnected', { deviceId: res.deviceId });
    this.close();
    this.emit({ type: 'bleDisconnected' });
  };

  private dispatch({ subtype, data }: Frame) {
    switch (subtype) {
      case DataSubtype.WIFI_REPORT:
        if (data.length >= 2) this.emit({ type: 'wifiState', state: data[1] as WifiStateValue });
        break;
      case DataSubtype.WIFI_LIST:
        this.emit({ type: 'wifiList', list: parseWifiList(data) });
        break;
      case DataSubtype.ERROR_INFO:
        logger.warn('blufi', 'device error', { code: data[0] });
        this.emit({ type: 'error', code: data[0] });
        break;
      case DataSubtype.CUSTOM_DATA:
        this.dispatchCustom(data[0], data.slice(2, 2 + data[1]));
        break;
      default:
        break;
    }
  }

  private dispatchCustom(tag: number, value: Uint8Array) {
    switch (tag) {
      case CustomTag.DEVICE_ID:
        this.meta.deviceId = utf8Decode(value).trim();
        this.emit({ type: 'deviceId', value: this.meta.deviceId });
        break;
      case CustomTag.WIFI_DISCONNECT_REASON:
        this.emit({ type: 'disconnectReason', reason: value[0] });
        break;
      case CustomTag.DEVICE_MODE:
        this.meta.mode = value[0];
        break;
      case CustomTag.DEVICE_VERSION:
        this.meta.firmware = utf8Decode(value).trim();
        break;
      default:
        break;
    }
  }

  /** 开发者工具模拟：密码为 00000000 时模拟密码错误 */
  private mockPassword = '';

  private mockReply(frameType: number, subtype: number, payload: Uint8Array) {
    const later = (ms: number, e: BlufiEvent) => setTimeout(() => this.conn && this.emit(e), ms);
    if (frameType === FrameType.DATA && subtype === DataSubtype.STA_PASSWORD) this.mockPassword = utf8Decode(payload);
    if (frameType !== FrameType.CTRL) return;

    if (subtype === CtrlSubtype.GET_WIFI_LIST) {
      later(1500, {
        type: 'wifiList',
        list: [
          { ssid: 'PallyHome', rssi: -46 },
          { ssid: 'ChinaNet-8F2A', rssi: -63 },
          { ssid: 'TP-LINK_503', rssi: -71 },
          { ssid: 'Guest', rssi: -82 },
        ],
      });
    } else if (subtype === CtrlSubtype.CONNECT_WIFI) {
      this.meta = { deviceId: 'MOCK0000000001', mode: 1, firmware: 'v1.0.0-mock' };
      later(600, { type: 'wifiState', state: WifiState.CONNECTING });
      if (this.mockPassword === '00000000') {
        later(3000, { type: 'disconnectReason', reason: 202 });
        later(3100, { type: 'wifiState', state: WifiState.FAIL });
        return;
      }
      later(2200, { type: 'wifiState', state: WifiState.NO_IP });
      later(2800, { type: 'deviceId', value: this.meta.deviceId });
      later(3600, { type: 'wifiState', state: WifiState.SUCCESS });
    }
  }
}

export const blufi = new BlufiClient();
