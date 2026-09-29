export {};

/**
 * 角色头像：统一比例裁切到头部，浅色底 + 圆角
 * size 建议取 64 / 80 / 112 / 160 / 240（rpx）
 */
Component({
  options: { virtualHost: true },
  properties: {
    src: { type: String, value: '' },
    bg: { type: String, value: '#FFF1E3' },
    size: { type: Number, value: 112 },
    round: { type: Boolean, value: false },
    /** 在线状态点：'' 不显示 | on | off */
    status: { type: String, value: '' },
    /** 是否聚焦头部（全身插画放大裁切） */
    crop: { type: Boolean, value: true },
  },
});
