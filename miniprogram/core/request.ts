import config from '../config/index';
import type { ApiResponse } from '../models/index';
import { tokenStore } from '../store/index';
import { logger } from './logger';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface RequestOptions<T> {
  url: string;
  method?: Method;
  data?: Record<string, unknown> | unknown[];
  header?: Record<string, string>;
  /** 是否携带 token，默认 true */
  auth?: boolean;
  timeout?: number;
  baseUrl?: string;
  /** mock 模式下的返回值（config.useMock 为 true 时生效） */
  mock?: () => T;
  /** 失败时不弹 toast */
  silent?: boolean;
}

export class ApiError extends Error {
  code: number;
  status: number;
  url: string;

  constructor(message: string, code: number, status: number, url: string) {
    super(message);
    this.code = code;
    this.status = status;
    this.url = url;
  }
}

/** 由 auth 模块注入：刷新 token 并返回新的 access token */
type Refresher = () => Promise<string>;
let refresher: Refresher | null = null;
let refreshing: Promise<string> | null = null;

export function registerRefresher(fn: Refresher) {
  refresher = fn;
}

/** 由 auth 模块注入：启动静默登录完成前，需要鉴权的请求先等待 */
let authReady: (() => Promise<void>) | null = null;

export function registerAuthReady(fn: () => Promise<void>) {
  authReady = fn;
}

/** 并发请求同时 401 时只刷新一次 */
function refreshToken(): Promise<string> {
  if (!refresher) return Promise.reject(new ApiError('未登录', 401, 401, ''));
  if (!refreshing) {
    refreshing = refresher().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

const FRIENDLY_MESSAGE = '网络好像不太顺畅，我们再试一次吧';

function send<T>(opts: RequestOptions<T>, token?: string): Promise<{ status: number; body: ApiResponse<T> }> {
  const header: Record<string, string> = { 'Content-Type': 'application/json', ...opts.header };
  if (token) header.Authorization = `Bearer ${token}`;
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${opts.baseUrl || config.apiBaseUrl}${opts.url}`,
      method: opts.method || 'GET',
      data: opts.data,
      header,
      timeout: opts.timeout || config.timeout.request,
      success: (res) => resolve({ status: res.statusCode, body: res.data as ApiResponse<T> }),
      fail: (err) => reject(new ApiError(err.errMsg || FRIENDLY_MESSAGE, -1, 0, opts.url)),
    });
  });
}

function mockDelay<T>(factory: () => T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(factory()), 200 + Math.random() * 300));
}

export async function request<T>(opts: RequestOptions<T>): Promise<T> {
  if (config.useMock && opts.mock) {
    logger.debug('http:mock', `${opts.method || 'GET'} ${opts.url}`, opts.data ? { data: opts.data } : undefined);
    return mockDelay(opts.mock);
  }

  const needAuth = opts.auth !== false;
  const started = Date.now();
  try {
    if (needAuth && authReady) await authReady();
    let res = await send<T>(opts, needAuth ? tokenStore.get()?.accessToken : undefined);
    if (res.status === 401 && needAuth) {
      const token = await refreshToken();
      res = await send<T>(opts, token);
    }
    const { status, body } = res;
    if (status < 200 || status >= 300 || !body || body.code !== 0) {
      throw new ApiError(body?.message || FRIENDLY_MESSAGE, body?.code ?? status, status, opts.url);
    }
    logger.debug('http', `${opts.method || 'GET'} ${opts.url} ${Date.now() - started}ms`);
    return body.data;
  } catch (e) {
    const err = e instanceof ApiError ? e : new ApiError(FRIENDLY_MESSAGE, -1, 0, opts.url);
    logger.error('http', err, { url: opts.url, method: opts.method || 'GET', code: err.code, status: err.status, cost: Date.now() - started });
    if (!opts.silent) wx.showToast({ title: err.code === -1 ? FRIENDLY_MESSAGE : err.message, icon: 'none' });
    throw err;
  }
}

export const http = {
  get: <T>(url: string, data?: Record<string, unknown>, extra?: Partial<RequestOptions<T>>) =>
    request<T>({ ...extra, url, data, method: 'GET' }),
  post: <T>(url: string, data?: Record<string, unknown> | unknown[], extra?: Partial<RequestOptions<T>>) =>
    request<T>({ ...extra, url, data, method: 'POST' }),
  put: <T>(url: string, data?: Record<string, unknown>, extra?: Partial<RequestOptions<T>>) =>
    request<T>({ ...extra, url, data, method: 'PUT' }),
  del: <T>(url: string, data?: Record<string, unknown>, extra?: Partial<RequestOptions<T>>) =>
    request<T>({ ...extra, url, data, method: 'DELETE' }),
};

/** 上传文件，返回后端 data 字段 */
export function upload<T>(url: string, filePath: string, formData?: Record<string, string>): Promise<T> {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${config.apiBaseUrl}${url}`,
      filePath,
      name: 'file',
      formData,
      header: { Authorization: `Bearer ${tokenStore.get()?.accessToken || ''}` },
      timeout: config.timeout.upload,
      success: (res) => {
        try {
          const body = JSON.parse(res.data) as ApiResponse<T>;
          if (res.statusCode === 200 && body.code === 0) return resolve(body.data);
          reject(new ApiError(body.message || FRIENDLY_MESSAGE, body.code, res.statusCode, url));
        } catch (e) {
          reject(new ApiError(FRIENDLY_MESSAGE, -1, res.statusCode, url));
        }
      },
      fail: (err) => {
        logger.error('upload', err, { url });
        reject(new ApiError(FRIENDLY_MESSAGE, -1, 0, url));
      },
    });
  });
}
