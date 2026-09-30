import { IMAGES } from '../../constants/assets';
import { auth } from '../../core/auth';
import { definePage } from '../../core/page';
import { logger } from '../../core/logger';
import { ROUTES, router } from '../../core/router';

const MIN_SPLASH_MS = 800;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

definePage({
  data: {
    images: IMAGES,
    failed: false,
  },

  onLoad() {
    this.start();
  },

  /** 静默登录完成后分流：有孩子进首页，没有则引导添加 */
  async start() {
    this.setData({ failed: false });
    try {
      const [child] = await Promise.all([auth.bootstrap(), delay(MIN_SPLASH_MS)]);
      router.relaunch(child ? ROUTES.home : ROUTES.childEdit);
    } catch (e) {
      logger.error('launch:bootstrap', e);
      this.setData({ failed: true });
    }
  },

  onRetry() {
    auth.init();
    this.start();
  },
});
