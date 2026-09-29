export {};

const TABS = [
  { path: 'pages/home/index', text: '首页', icon: 'home' },
  { path: 'pages/characters/index', text: '角色', icon: 'star' },
  { path: 'pages/schedule/index', text: '定时', icon: 'clock' },
  { path: 'pages/device/index', text: '设备', icon: 'device' },
  { path: 'pages/mine/index', text: '我的', icon: 'user' },
];

/** 每个 tab 页有独立的 tabBar 实例，挂载时根据当前页面路由确定选中项 */
Component({
  data: { tabs: TABS, active: 0 },
  lifetimes: {
    attached() {
      this.syncActive();
    },
  },
  pageLifetimes: {
    show() {
      this.syncActive();
    },
  },
  methods: {
    syncActive() {
      const pages = getCurrentPages();
      const route = pages.length ? pages[pages.length - 1].route : '';
      const active = TABS.findIndex((t) => t.path === route);
      if (active >= 0 && active !== this.data.active) this.setData({ active });
    },
    onSwitch(e: WechatMiniprogram.TouchEvent) {
      const index = e.currentTarget.dataset.index as number;
      if (index === this.data.active) return;
      wx.switchTab({ url: `/${TABS[index].path}` });
    },
  },
});
