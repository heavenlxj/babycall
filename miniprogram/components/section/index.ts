export {};

Component({
  options: { virtualHost: true },
  properties: {
    title: { type: String, value: '' },
    /** 右侧链接文字，为空不显示 */
    more: { type: String, value: '' },
  },
  methods: {
    onMore() {
      this.triggerEvent('more');
    },
  },
});
