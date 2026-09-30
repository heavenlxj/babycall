export {};

const TABS = [
  { path: 'pages/home/index', text: '首页', icon: 'home' },
  { path: 'pages/characters/index', text: '角色', icon: 'star' },
  { path: 'pages/schedule/index', text: '定时', icon: 'clock' },
  { path: 'pages/device/index', text: '设备', icon: 'device' },
  { path: 'pages/mine/index', text: '我的', icon: 'user' },
];

/**
 * 每个 tab 页有独立的 tabBar 实例。挂载时 getCurrentPages() 可能还是上一个页面，
 * 所以选中项由所属页面在 onShow 时调用 setActive 同步（见 core/page.ts）
 */
Component({
  data: { tabs: TABS, active: -1 },
  methods: {
    setActive(route: string) {
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
