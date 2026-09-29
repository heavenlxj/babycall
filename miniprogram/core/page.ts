import { logger } from './logger';

type PageInstance = WechatMiniprogram.Page.TrivialInstance;
type Hook = (this: PageInstance, ...args: any[]) => unknown;

/**
 * Page 的轻量包装：自动上报 page_view / page_leave（含停留时长），
 * 并记录 onLoad 中的同步异常。用法与 Page 完全一致。
 */
export function definePage<TData extends WechatMiniprogram.Page.DataOption, TCustom extends WechatMiniprogram.Page.CustomOption>(
  options: WechatMiniprogram.Page.Options<TData, TCustom>,
) {
  const opts = options as unknown as Record<string, Hook | undefined>;
  const { onLoad, onShow, onHide, onUnload } = opts;
  let enterAt = 0;

  function leave(this: PageInstance) {
    if (enterAt) logger.track('page_leave', { route: this.route, stay: Date.now() - enterAt });
    enterAt = 0;
  }

  opts.onLoad = function (this: PageInstance, query: Record<string, string>) {
    try {
      return onLoad && onLoad.call(this, query);
    } catch (e) {
      logger.error('page:onLoad', e, { route: this.route, query });
      throw e;
    }
  };
  opts.onShow = function (this: PageInstance) {
    enterAt = Date.now();
    logger.track('page_view', { route: this.route, query: this.options });
    return onShow && onShow.call(this);
  };
  opts.onHide = function (this: PageInstance) {
    leave.call(this);
    return onHide && onHide.call(this);
  };
  opts.onUnload = function (this: PageInstance) {
    leave.call(this);
    return onUnload && onUnload.call(this);
  };

  Page(options);
}
