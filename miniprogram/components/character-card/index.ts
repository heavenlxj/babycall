export {};

/**
 * 角色卡片
 * variant: mini(首页横滑) | grid(角色列表两列) | select(选择角色三列，可选中)
 * 事件：bind:select  detail = { id }
 */
Component({
  options: { virtualHost: true },
  properties: {
    character: { type: Object, value: {} },
    variant: { type: String, value: 'grid' },
    selected: { type: Boolean, value: false },
  },
  methods: {
    onTap() {
      const c = this.data.character as { id?: string };
      if (c.id) this.triggerEvent('select', { id: c.id });
    },
  },
});
