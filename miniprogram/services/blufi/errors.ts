export interface FailInfo {
  title: string;
  tips: string[];
  /** 建议的恢复方式：重新输入 Wi-Fi 信息、回到设备搜索，或仅重试绑定 */
  retry: 'wifi' | 'search' | 'bind';
  code?: number;
}

const PASSWORD_TIPS = ['检查 Wi-Fi 密码是否正确，注意大小写和空格', '确认路由器加密方式为 WPA2-PSK', '让童话电话靠近路由器后再试'];

/** 设备回报的 Wi-Fi 断开原因（ESP-IDF wifi_err_reason_t） */
const WIFI_REASON: Record<number, Omit<FailInfo, 'retry' | 'code'>> = {
  200: { title: 'Wi-Fi 信号太弱', tips: ['把童话电话拿到离路由器近一点的地方', '检查路由器天线，尽量减少墙体遮挡'] },
  201: {
    title: '找不到这个 Wi-Fi',
    tips: ['确认路由器已开启', '核对 Wi-Fi 名称（大小写、字母 O 与数字 0、空格）', '童话电话仅支持 2.4GHz，请勿选择 5G 网络'],
  },
  202: { title: 'Wi-Fi 密码不正确', tips: PASSWORD_TIPS },
  203: {
    title: '路由器拒绝了连接',
    tips: ['重启路由器后再试', '路由器连接设备可能已满，断开一些不用的设备', '检查路由器是否开启了 MAC 地址过滤'],
  },
  204: { title: '安全验证超时', tips: PASSWORD_TIPS },
  205: { title: '安全验证超时', tips: PASSWORD_TIPS },
  15: { title: '安全验证超时', tips: PASSWORD_TIPS },
};

export function wifiReasonInfo(reason: number): FailInfo {
  const hit = WIFI_REASON[reason];
  if (hit) return { ...hit, retry: 'wifi', code: reason };
  return { ...GENERIC_WIFI_FAIL, code: reason };
}

export const GENERIC_WIFI_FAIL: FailInfo = {
  title: '童话电话没能连上 Wi-Fi',
  tips: ['核对 Wi-Fi 名称和密码', '确认是 2.4GHz 网络，暂不支持 5GHz', '暂时关闭路由器的上网管控、MAC 过滤等功能', '重启路由器后再试'],
  retry: 'wifi',
};

export const FAIL = {
  noIp: {
    title: '路由器没有分配网络地址',
    tips: ['重启路由器', '检查路由器是否限制了新设备接入', '重启童话电话后重新配网'],
    retry: 'wifi',
  } as FailInfo,
  bleDisconnected: {
    title: '与童话电话的蓝牙连接断开了',
    tips: ['确认童话电话仍处于配网模式', '手机保持在童话电话 1 米以内', '重新搜索设备后再试'],
    retry: 'search',
  } as FailInfo,
  noDeviceId: {
    title: '没有收到童话电话的设备编号',
    tips: ['重启童话电话后重新配网', '如果多次失败，请联系客服'],
    retry: 'search',
  } as FailInfo,
  protocol: {
    title: '蓝牙通信出了点问题',
    tips: ['手机靠近童话电话（1 米以内）', '关闭手机蓝牙后重新打开', '重启童话电话后重新搜索'],
    retry: 'search',
  } as FailInfo,
};

/** 设备回报的 BluFi 协议错误码 */
export function blufiErrorInfo(code: number): FailInfo {
  return { ...FAIL.protocol, code };
}
