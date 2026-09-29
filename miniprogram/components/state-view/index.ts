import { IMAGES } from '../../constants/assets';

type StateType = 'empty' | 'error' | 'loading';

const PRESET: Record<StateType, { image: string; title: string; desc: string }> = {
  empty: { image: IMAGES.fox, title: '这里还空空的', desc: '' },
  error: { image: IMAGES.offline, title: '好像没连上', desc: '我们再试一次吧' },
  loading: { image: IMAGES.foxPhone, title: '正在准备……', desc: '' },
};

/**
 * 统一的空状态 / 错误 / 加载视图（插画 + 标题 + 描述 + 操作）
 * <state-view type="empty" title="还没有定时来电" desc="…" action="添加定时来电" bind:action="onAdd" />
 */
Component({
  properties: {
    type: { type: String, value: 'empty' },
    image: { type: String, value: '' },
    title: { type: String, value: '' },
    desc: { type: String, value: '' },
    action: { type: String, value: '' },
    /** 紧凑模式：用于卡片内 */
    compact: { type: Boolean, value: false },
  },
  data: { img: '', heading: '', text: '' },
  observers: {
    'type, image, title, desc'() {
      this.sync();
    },
  },
  lifetimes: {
    attached() {
      this.sync();
    },
  },
  methods: {
    sync() {
      const { type, image, title, desc } = this.data;
      const preset = PRESET[type as StateType] || PRESET.empty;
      this.setData({ img: image || preset.image, heading: title || preset.title, text: desc || preset.desc });
    },
    onAction() {
      this.triggerEvent('action');
    },
  },
});
