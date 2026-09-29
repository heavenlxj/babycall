export {};

/**
 * 品牌按钮
 * type: primary(橙) | sky(蓝) | call(通话绿) | secondary(白底描边) | soft(浅橙) | ghost(文字)
 * size: lg | md | sm
 * 用法：<btn type="primary" block bindtap="onSave">保存</btn>
 */
Component({
  options: { virtualHost: true },
  properties: {
    type: { type: String, value: 'primary' },
    size: { type: String, value: 'lg' },
    block: { type: Boolean, value: false },
    disabled: { type: Boolean, value: false },
    loading: { type: Boolean, value: false },
    icon: { type: String, value: '' },
    openType: { type: String, value: '' },
  },
  data: { iconColor: '#FFFFFF' },
  observers: {
    type(type: string) {
      const map: Record<string, string> = { secondary: '#293548', soft: '#F5832B', ghost: '#7A8494' };
      this.setData({ iconColor: map[type] || '#FFFFFF' });
    },
  },
  methods: {
    onTap() {
      if (this.data.disabled || this.data.loading) return;
      this.triggerEvent('tap');
    },
    onGetPhoneNumber(e: WechatMiniprogram.CustomEvent) {
      this.triggerEvent('getphonenumber', e.detail);
    },
  },
});
