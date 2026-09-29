import { base64 } from '../../utils/base64';
import { ICON_PATHS } from './paths';

const cache: Record<string, string> = {};

function toDataUri(name: string, color: string, fill: boolean, stroke: number): string {
  const key = `${name}|${color}|${fill}|${stroke}`;
  if (cache[key]) return cache[key];
  const body = (ICON_PATHS[name] || '')
    .replace(/fill="\{\{f\}\}"/g, fill ? `fill="${color}" fill-opacity="0.22"` : 'fill="none"')
    .replace(/\{\{c\}\}/g, color);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" ` +
    `stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  cache[key] = `data:image/svg+xml;base64,${base64(svg)}`;
  return cache[key];
}

Component({
  options: { virtualHost: true },
  properties: {
    name: { type: String, value: '' },
    color: { type: String, value: '#293548' },
    /** 单位 rpx */
    size: { type: Number, value: 40 },
    /** 浅色填充（用于选中态） */
    fill: { type: Boolean, value: false },
    stroke: { type: Number, value: 2 },
    customStyle: { type: String, value: '' },
  },
  data: { src: '' },
  lifetimes: {
    attached() {
      this.update();
    },
  },
  observers: {
    'name, color, fill, stroke'() {
      this.update();
    },
  },
  methods: {
    update() {
      const { name, color, fill, stroke } = this.data;
      this.setData({ src: name ? toDataUri(name, color, fill, stroke) : '' });
    },
  },
});
