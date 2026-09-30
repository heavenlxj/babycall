import type { Banner } from '../../models/index';
import { logger } from '../../core/logger';
import { router } from '../../core/router';

/**
 * 运营 Banner 轮播：数据由服务端配置（图片/标题/副标题/CTA/跳转/时间窗/排序）
 * 默认点击按 link + params 跳转，并上报点击
 */
Component({
  properties: {
    list: { type: Array, value: [] },
    autoplay: { type: Boolean, value: true },
  },
  data: { current: 0 },
  methods: {
    onChange(e: WechatMiniprogram.SwiperChange) {
      this.setData({ current: e.detail.current });
    },
    onTap(e: WechatMiniprogram.TouchEvent) {
      const index = e.currentTarget.dataset.index as number;
      const item = (this.data.list as Banner[])[index];
      if (!item) return;
      logger.track('banner_click', { id: item.id, index, link: item.link });
      this.triggerEvent('tap', item);
      if (item.link) router.to(item.link, item.params);
    },
  },
});
