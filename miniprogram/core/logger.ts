import config, { APP_VERSION, ENV, LogLevel } from '../config/index';
import { installIdStore, logQueueStore } from '../store/index';

/**
 * 日志 & 埋点
 * - 控制台：按 config.logLevel 过滤
 * - 微信实时日志：warn / error 同步写入（小程序后台「实时日志」可查）
 * - 远程上报：info 以上日志和 track 事件批量上报到 config.logUrl，
 *   失败的日志落盘，下次启动重发
 */

type LogKind = 'log' | 'event';

interface LogRecord {
  kind: LogKind;
  level: LogLevel;
  tag: string;
  message: string;
  extra?: Record<string, unknown>;
  route: string;
  ts: number;
}

interface LogContext {
  env: string;
  version: string;
  installId: string;
  sessionId: string;
  userId?: string;
  deviceId?: string;
  system?: Record<string, string>;
  network?: string;
}

const LEVEL_WEIGHT: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const BATCH_SIZE = 20;
const FLUSH_INTERVAL = 10 * 1000;
const MAX_PENDING = 200;

const randomId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function currentRoute(): string {
  const pages = getCurrentPages();
  return pages.length ? pages[pages.length - 1].route : '';
}

function stringifyError(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) return { message: err.message, stack: err.stack };
  if (typeof err === 'string') return { message: err };
  if (err && typeof err === 'object') {
    const obj = err as { message?: string; errMsg?: string };
    if (obj.message || obj.errMsg) return { message: String(obj.message || obj.errMsg) };
    try {
      return { message: JSON.stringify(err) };
    } catch (e) {
      return { message: String(err) };
    }
  }
  return { message: String(err) };
}

class Logger {
  private queue: LogRecord[] = [];
  private timer: number | null = null;
  private flushing = false;
  private realtime = wx.getRealtimeLogManager ? wx.getRealtimeLogManager() : null;
  private context: LogContext = {
    env: ENV,
    version: APP_VERSION,
    installId: '',
    sessionId: randomId(),
  };

  /** App onLaunch 时调用一次 */
  init() {
    let installId = installIdStore.get();
    if (!installId) {
      installId = randomId();
      installIdStore.set(installId);
    }
    this.context.installId = installId;

    try {
      const d = wx.getDeviceInfo();
      const a = wx.getAppBaseInfo();
      this.context.system = {
        brand: d.brand,
        model: d.model,
        system: d.system,
        platform: d.platform,
        wechat: a.version,
        sdk: a.SDKVersion,
      };
    } catch (e) {
      // ignore
    }
    wx.getNetworkType({ success: (res) => (this.context.network = res.networkType) });
    wx.onNetworkStatusChange((res) => (this.context.network = res.networkType));

    const pending = (logQueueStore.get() || []) as LogRecord[];
    if (pending.length) {
      logQueueStore.remove();
      this.queue.push(...pending);
    }
    this.schedule();
  }

  setContext(ctx: Partial<Pick<LogContext, 'userId' | 'deviceId'>>) {
    Object.assign(this.context, ctx);
    if (this.realtime && ctx.userId) this.realtime.setFilterMsg(ctx.userId);
  }

  debug(tag: string, message: string, extra?: Record<string, unknown>) {
    this.log('debug', tag, message, extra);
  }

  info(tag: string, message: string, extra?: Record<string, unknown>) {
    this.log('info', tag, message, extra);
  }

  warn(tag: string, message: string, extra?: Record<string, unknown>) {
    this.log('warn', tag, message, extra);
  }

  error(tag: string, err: unknown, extra?: Record<string, unknown>) {
    const { message, stack } = stringifyError(err);
    this.log('error', tag, message, stack ? { ...extra, stack } : extra);
  }

  /** 业务埋点事件 */
  track(event: string, props?: Record<string, unknown>) {
    if (LEVEL_WEIGHT[config.logLevel] <= LEVEL_WEIGHT.debug) {
      console.log(`[track] ${event}`, props || '');
    }
    this.enqueue({ kind: 'event', level: 'info', tag: 'track', message: event, extra: props, route: currentRoute(), ts: Date.now() });
  }

  /** 立即上报队列（App onHide 时调用） */
  flush() {
    if (!config.remoteLog || this.flushing || !this.queue.length) return;
    const batch = this.queue.splice(0, BATCH_SIZE);
    this.flushing = true;
    wx.request({
      url: `${config.logUrl}/v1/collect`,
      method: 'POST',
      data: { context: this.context, records: batch },
      timeout: 5000,
      success: (res) => {
        if (res.statusCode >= 400) this.persist(batch);
      },
      fail: () => this.persist(batch),
      complete: () => {
        this.flushing = false;
        if (this.queue.length >= BATCH_SIZE) this.flush();
      },
    });
  }

  private log(level: LogLevel, tag: string, message: string, extra?: Record<string, unknown>) {
    if (LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[config.logLevel]) {
      const fn = level === 'debug' ? console.log : console[level];
      extra ? fn(`[${tag}] ${message}`, extra) : fn(`[${tag}] ${message}`);
    }
    if (this.realtime && (level === 'warn' || level === 'error')) {
      this.realtime[level](`[${tag}]`, message, extra || {});
    }
    if (level !== 'debug') {
      this.enqueue({ kind: 'log', level, tag, message, extra, route: currentRoute(), ts: Date.now() });
    }
  }

  private enqueue(record: LogRecord) {
    if (!config.remoteLog) return;
    this.queue.push(record);
    if (this.queue.length > MAX_PENDING) this.queue.splice(0, this.queue.length - MAX_PENDING);
    if (this.queue.length >= BATCH_SIZE || record.level === 'error') this.flush();
  }

  private schedule() {
    if (this.timer !== null || !config.remoteLog) return;
    this.timer = setInterval(() => this.flush(), FLUSH_INTERVAL) as unknown as number;
  }

  private persist(batch: LogRecord[]) {
    const pending = [...batch, ...this.queue].slice(-MAX_PENDING);
    this.queue = [];
    logQueueStore.set(pending);
  }
}

export const logger = new Logger();
