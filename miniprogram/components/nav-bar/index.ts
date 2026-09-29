import { router } from '../../core/router';

let layout: { statusBar: number; navHeight: number; capsuleWidth: number } | null = null;

function getLayout() {
  if (layout) return layout;
  const win = wx.getWindowInfo();
  const statusBar = win.statusBarHeight || 20;
  let navHeight = 44;
  let capsuleWidth = 96;
  try {
    const menu = wx.getMenuButtonBoundingClientRect();
    navHeight = (menu.top - statusBar) * 2 + menu.height;
    capsuleWidth = win.windowWidth - menu.left;
  } catch (e) {
    // 使用默认值
  }
  layout = { statusBar, navHeight, capsuleWidth };
  return layout;
}

Component({
  options: { multipleSlots: true },
  properties: {
    title: { type: String, value: '' },
    back: { type: Boolean, value: true },
    /** 文字/图标颜色 */
    color: { type: String, value: '#293548' },
    background: { type: String, value: 'transparent' },
    /** 占位，避免内容被固定导航遮挡 */
    placeholder: { type: Boolean, value: true },
  },
  data: { statusBar: 20, navHeight: 44, capsuleWidth: 96 },
  lifetimes: {
    attached() {
      this.setData(getLayout());
    },
  },
  methods: {
    onBack() {
      this.triggerEvent('back');
      router.back();
    },
  },
});
