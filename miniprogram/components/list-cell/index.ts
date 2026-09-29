export {};

/**
 * 列表行：图标 + 标题/描述 + 右侧值 + 箭头，放在 .card 内组成分组
 * <list-cell icon="bell" tone="orange" title="消息通知" value="2 条未读" bind:tap="…" />
 */
const TONES: Record<string, [string, string]> = {
  orange: ['#FF9B4A', '#FFF1E3'],
  sky: ['#4FA6EC', '#E8F4FD'],
  mint: ['#3DB587', '#EAF7F1'],
  lavender: ['#9A7FD6', '#F3EEFB'],
  pink: ['#E57F9B', '#FDEDF1'],
  gray: ['#7A8494', '#F3F1ED'],
};

Component({
  options: { virtualHost: true },
  properties: {
    icon: { type: String, value: '' },
    tone: { type: String, value: 'orange' },
    title: { type: String, value: '' },
    desc: { type: String, value: '' },
    value: { type: String, value: '' },
    arrow: { type: Boolean, value: true },
    border: { type: Boolean, value: true },
    badge: { type: Boolean, value: false },
  },
  data: { color: TONES.orange[0], bg: TONES.orange[1] },
  observers: {
    tone(tone: string) {
      const [color, bg] = TONES[tone] || TONES.orange;
      this.setData({ color, bg });
    },
  },
  methods: {
    onTap() {
      this.triggerEvent('tap');
    },
  },
});
