export type EnvName = 'develop' | 'trial' | 'release';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface EnvConfig {
  apiBaseUrl: string;
  /** 日志/埋点上报地址 */
  logUrl: string;
  /** OSS 存储根地址，素材路径见 constants/assets */
  ossBaseUrl: string;
  /** 使用本地 mock 数据（无后端联调时） */
  useMock: boolean;
  /** 控制台最低输出级别 */
  logLevel: LogLevel;
  /** 是否开启远程日志上报 */
  remoteLog: boolean;
  timeout: {
    request: number;
    upload: number;
  };
}

const CONFIGS: Record<EnvName, EnvConfig> = {
  develop: {
    apiBaseUrl: 'https://dev-api.pallycall.com/app',
    logUrl: 'https://dev-api.pallycall.com/log',
    ossBaseUrl: 'https://kidopally-app-test.oss-cn-beijing.aliyuncs.com',
    useMock: true,
    logLevel: 'debug',
    remoteLog: false,
    timeout: { request: 8000, upload: 20000 },
  },
  trial: {
    apiBaseUrl: 'https://test-api.pallycall.com/app',
    logUrl: 'https://test-api.pallycall.com/log',
    ossBaseUrl: 'https://kidopally-app-test.oss-cn-beijing.aliyuncs.com',
    useMock: true,
    logLevel: 'info',
    remoteLog: true,
    timeout: { request: 8000, upload: 20000 },
  },
  release: {
    apiBaseUrl: 'https://api.pallycall.com/app',
    logUrl: 'https://api.pallycall.com/log',
    ossBaseUrl: 'https://kidopally-app.oss-cn-beijing.aliyuncs.com',
    useMock: false,
    logLevel: 'warn',
    remoteLog: true,
    timeout: { request: 8000, upload: 20000 },
  },
};

function detectEnv(): EnvName {
  let env: EnvName = 'develop';
  try {
    env = wx.getAccountInfoSync().miniProgram.envVersion as EnvName;
  } catch (e) {
    env = 'develop';
  }
  // 真机调试（非开发者工具）视为 trial，便于连接测试服
  if (env === 'develop' && wx.getDeviceInfo().platform !== 'devtools') {
    env = 'trial';
  }
  return env;
}

export const ENV: EnvName = detectEnv();
export const APP_VERSION: string = (() => {
  try {
    return wx.getAccountInfoSync().miniProgram.version || 'dev';
  } catch (e) {
    return 'dev';
  }
})();

const config: EnvConfig = CONFIGS[ENV];
export default config;
