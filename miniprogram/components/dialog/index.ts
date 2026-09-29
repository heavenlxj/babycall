export {};

/**
 * 品牌弹窗（替代系统 showModal）：删除定时来电 / 解除设备 / 退出账号等
 * <dialog show="{{show}}" title="…" content="…" bind:confirm="…" bind:cancel="…" />
 */
Component({
  properties: {
    show: { type: Boolean, value: false },
    title: { type: String, value: '' },
    content: { type: String, value: '' },
    image: { type: String, value: '' },
    confirmText: { type: String, value: '确定' },
    cancelText: { type: String, value: '再想想' },
    loading: { type: Boolean, value: false },
  },
  methods: {
    onConfirm() {
      this.triggerEvent('confirm');
    },
    onCancel() {
      if (!this.data.loading) this.triggerEvent('cancel');
    },
    noop() {},
  },
});
