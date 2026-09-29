export {};

const TONES: Record<string, { bg: string; icon: string; iconBg: string }> = {
  orange: { bg: 'linear-gradient(135deg,#FFF3E6 0%,#FFE6CF 100%)', icon: '#FF9B4A', iconBg: '#FFFFFF' },
  mint: { bg: 'linear-gradient(135deg,#EFFAF4 0%,#DDF3E8 100%)', icon: '#3DB587', iconBg: '#FFFFFF' },
  sky: { bg: 'linear-gradient(135deg,#EFF7FE 0%,#DDEEFC 100%)', icon: '#4FA6EC', iconBg: '#FFFFFF' },
  lavender: { bg: 'linear-gradient(135deg,#F6F1FD 0%,#EAE1F8 100%)', icon: '#9A7FD6', iconBg: '#FFFFFF' },
  pink: { bg: 'linear-gradient(135deg,#FEF2F5 0%,#FBE2E9 100%)', icon: '#E57F9B', iconBg: '#FFFFFF' },
  white: { bg: '#FFFFFF', icon: '#FF9B4A', iconBg: '#FFF1E3' },
};

/**
 * 功能卡片：图标 + 标题 + 描述 + 右侧 slot/箭头
 * tone: orange | mint | sky | lavender | pink | white
 */
Component({
  options: { virtualHost: true, multipleSlots: true },
  properties: {
    tone: { type: String, value: 'orange' },
    icon: { type: String, value: '' },
    title: { type: String, value: '' },
    desc: { type: String, value: '' },
    arrow: { type: Boolean, value: true },
    /** 竖向布局（宫格） */
    vertical: { type: Boolean, value: false },
  },
  data: { palette: TONES.orange },
  observers: {
    tone(tone: string) {
      this.setData({ palette: TONES[tone] || TONES.orange });
    },
  },
  methods: {
    onTap() {
      this.triggerEvent('tap');
    },
  },
});
