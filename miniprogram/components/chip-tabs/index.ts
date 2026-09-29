export {};

/**
 * 胶囊分类 Tab：items = [{ key, label }]，事件 bind:change { key }
 */
Component({
  options: { virtualHost: true },
  properties: {
    items: { type: Array, value: [] },
    active: { type: String, value: '' },
  },
  methods: {
    onTap(e: WechatMiniprogram.TouchEvent) {
      const key = e.currentTarget.dataset.key as string;
      if (key !== this.data.active) this.triggerEvent('change', { key });
    },
  },
});
