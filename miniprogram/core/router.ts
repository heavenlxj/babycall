export const ROUTES = {
  launch: '/pages/launch/index',
  home: '/pages/home/index',
  characters: '/pages/characters/index',
  schedule: '/pages/schedule/index',
  device: '/pages/device/index',
  mine: '/pages/mine/index',

  characterDetail: '/packages/character/detail/index',
  characterMemory: '/packages/character/memory/index',
  characterTask: '/packages/character/task/index',

  scheduleEdit: '/packages/schedule/edit/index',
  scheduleSuccess: '/packages/schedule/success/index',

  devicePairing: '/packages/device/pairing/index',
  deviceSearch: '/packages/device/search/index',
  deviceWifi: '/packages/device/wifi/index',
  deviceConnect: '/packages/device/connect/index',
  deviceManage: '/packages/device/manage/index',

  call: '/packages/call/call/index',
  callRecords: '/packages/call/records/index',

  notifications: '/packages/mine/notifications/index',
  parentCenter: '/packages/mine/parent/index',
  childEdit: '/packages/mine/child/index',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

const TAB_PAGES: string[] = [ROUTES.home, ROUTES.characters, ROUTES.schedule, ROUTES.device, ROUTES.mine];
const MAX_STACK = 10;

type Query = Record<string, string | number | boolean | undefined>;

function withQuery(url: string, query?: Query): string {
  if (!query) return url;
  const qs = Object.keys(query)
    .filter((k) => query[k] !== undefined)
    .map((k) => `${k}=${encodeURIComponent(String(query[k]))}`)
    .join('&');
  return qs ? `${url}?${qs}` : url;
}

export const router = {
  isTab(url: string) {
    return TAB_PAGES.includes(url.split('?')[0]);
  },

  /** 自动区分 tab 页；页面栈满时降级为 redirect */
  to(url: string, query?: Query) {
    const path = url.split('?')[0];
    if (this.isTab(path)) return wx.switchTab({ url: path });
    const full = withQuery(url, query);
    if (getCurrentPages().length >= MAX_STACK) return wx.redirectTo({ url: full });
    return wx.navigateTo({ url: full });
  },

  redirect(url: string, query?: Query) {
    if (this.isTab(url)) return wx.switchTab({ url });
    return wx.redirectTo({ url: withQuery(url, query) });
  },

  relaunch(url: string, query?: Query) {
    return wx.reLaunch({ url: withQuery(url, query) });
  },

  /** 无上一页时回到首页 */
  back(delta = 1) {
    if (getCurrentPages().length > delta) return wx.navigateBack({ delta });
    return wx.switchTab({ url: ROUTES.home });
  },
};
