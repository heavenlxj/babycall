export {};

/**
 * 定时来电卡片，数据为 ScheduleView（见 utils/view.ts）
 * 事件：bind:toggle { id, enabled }   bind:select { id }
 */
Component({
  options: { virtualHost: true },
  properties: {
    item: { type: Object, value: {} },
  },
  methods: {
    onSwitch(e: WechatMiniprogram.SwitchChange) {
      this.triggerEvent('toggle', { id: (this.data.item as { id: string }).id, enabled: e.detail.value });
    },
    onTap() {
      this.triggerEvent('select', { id: (this.data.item as { id: string }).id });
    },
    noop() {},
  },
});
