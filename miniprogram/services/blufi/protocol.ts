/**
 * ESP BluFi 帧协议（与设备固件 blufi_int.h 对齐）
 * https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/ble/blufi.html
 *
 * 帧结构：[type(6bit subtype | 2bit 帧类型)] [frame control] [sequence] [data length] [data...]
 * 本项目不启用加密和校验，frame control 仅使用分片位。
 */

/** 设备广播名前缀，搜索时按此过滤 */
export const DEVICE_NAME_PREFIX = 'BLU';

export const FrameType = { CTRL: 0x0, DATA: 0x1 } as const;

export const CtrlSubtype = {
  CONNECT_WIFI: 0x03,
  DISCONNECT_WIFI: 0x04,
  GET_WIFI_STATUS: 0x05,
  GET_WIFI_LIST: 0x09,
} as const;

export const DataSubtype = {
  STA_SSID: 0x02,
  STA_PASSWORD: 0x03,
  WIFI_REPORT: 0x0f,
  WIFI_LIST: 0x11,
  ERROR_INFO: 0x12,
  CUSTOM_DATA: 0x13,
} as const;

/** 设备 → 手机 的自定义数据（TLV） */
export const CustomTag = {
  DEVICE_ID: 0x01,
  AGENT_ID: 0x02,
  WIFI_DISCONNECT_REASON: 0x03,
  DEVICE_MODE: 0x04,
  DEVICE_VERSION: 0x05,
} as const;

export const WifiState = {
  SUCCESS: 0x00,
  FAIL: 0x01,
  CONNECTING: 0x02,
  NO_IP: 0x03,
} as const;

export type WifiStateValue = (typeof WifiState)[keyof typeof WifiState];

const FC_FRAG = 0x10;

export function utf8Encode(str: string): Uint8Array {
  const bytes: number[] = [];
  for (const ch of str) {
    const cp = ch.codePointAt(0) as number;
    if (cp < 0x80) bytes.push(cp);
    else if (cp < 0x800) bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    else if (cp < 0x10000) bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    else bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
  }
  return new Uint8Array(bytes);
}

export function utf8Decode(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const c = bytes[i++];
    let cp = c;
    if (c >= 0xf0) cp = ((c & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
    else if (c >= 0xe0) cp = ((c & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
    else if (c >= 0xc0) cp = ((c & 0x1f) << 6) | (bytes[i++] & 0x3f);
    out += String.fromCodePoint(cp);
  }
  return out;
}

/**
 * 编码一条指令，超过单帧容量时按协议分片（分片帧带 2 字节剩余总长度，并各自占用一个序号）
 * @param nextSeq 取下一个发送序号
 * @param maxFrame 单次写入的最大字节数（MTU - 3）
 */
export function encodeFrames(
  frameType: number,
  subtype: number,
  payload: Uint8Array,
  nextSeq: () => number,
  maxFrame: number,
): ArrayBuffer[] {
  const head = (subtype << 2) | frameType;
  // 与现有固件保持一致：单帧末尾预留 2 字节（未启用校验时设备忽略）
  if (payload.length + 6 <= maxFrame) {
    const frame = new Uint8Array(payload.length + 6);
    frame.set([head, 0, nextSeq(), payload.length]);
    frame.set(payload, 4);
    return [frame.buffer];
  }
  const frames: ArrayBuffer[] = [];
  const chunkSize = maxFrame - 6;
  let offset = 0;
  while (offset < payload.length) {
    const remain = payload.length - offset;
    const last = remain <= maxFrame - 4;
    const chunk = payload.subarray(offset, offset + (last ? remain : chunkSize));
    const body = last ? chunk : new Uint8Array([remain & 0xff, remain >> 8, ...chunk]);
    const frame = new Uint8Array(4 + body.length);
    frame.set([head, last ? 0 : FC_FRAG, nextSeq(), body.length]);
    frame.set(body, 4);
    frames.push(frame.buffer);
    offset += chunk.length;
  }
  return frames;
}

export interface Frame {
  subtype: number;
  data: Uint8Array;
}

/** 接收端分片重组：分片帧剥离 2 字节总长度后拼接，最后一片到达时产出完整帧 */
export class FrameAssembler {
  private pending = new Map<number, Uint8Array[]>();

  push(buffer: ArrayBuffer): Frame | null {
    const u8 = new Uint8Array(buffer);
    if (u8.length < 4) return null;
    const subtype = (u8[0] >> 2) & 0x3f;
    const isFrag = (u8[1] & FC_FRAG) !== 0;
    const data = u8.slice(4, 4 + u8[3]);
    const parts = this.pending.get(subtype);

    if (isFrag) {
      const list = parts || [];
      list.push(data.slice(2));
      this.pending.set(subtype, list);
      return null;
    }
    if (!parts) return { subtype, data };

    this.pending.delete(subtype);
    parts.push(data);
    const total = parts.reduce((n, p) => n + p.length, 0);
    const merged = new Uint8Array(total);
    let at = 0;
    parts.forEach((p) => {
      merged.set(p, at);
      at += p.length;
    });
    return { subtype, data: merged };
  }

  reset() {
    this.pending.clear();
  }
}

export interface DeviceWifi {
  ssid: string;
  /** dBm，负数 */
  rssi: number;
}

/** Wi-Fi 列表：重复的 [len(ssid+1)] [rssi] [ssid bytes] */
export function parseWifiList(data: Uint8Array): DeviceWifi[] {
  const list: DeviceWifi[] = [];
  let i = 0;
  while (i + 2 <= data.length) {
    const len = data[i];
    const raw = data[i + 1];
    i += 2;
    if (len < 2 || i + len - 1 > data.length) break;
    const ssid = utf8Decode(data.slice(i, i + len - 1)).replace(/[\x00-\x1F]/g, '').trim();
    i += len - 1;
    const rssi = raw > 127 ? raw - 256 : raw;
    if (ssid && rssi < 0) list.push({ ssid, rssi });
  }
  return list;
}
