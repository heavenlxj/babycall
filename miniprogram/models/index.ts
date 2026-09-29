/** 后端统一响应结构 */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface TokenInfo {
  accessToken: string;
  refreshToken: string;
  /** access token 过期秒数 */
  expiresIn: number;
}

export interface UserProfile {
  userId: string;
  nickname: string;
  avatar: string;
  phone: string;
  childName: string;
  childAge: string;
  isMember: boolean;
}

export type CharacterCategory = 'hot' | 'adventure' | 'warm' | 'knowledge' | 'game';

export interface Character {
  id: string;
  name: string;
  /** 性格短语，如「勇敢 · 爱冒险」 */
  personality: string;
  tags: string[];
  categories: CharacterCategory[];
  intro: string;
  /** 全身插画 */
  image: string;
  /** 主题色 / 浅色卡片底色 */
  color: string;
  bgColor: string;
  /** 角色世界背景 */
  world: string;
  online: boolean;
  locked: boolean;
  isNew?: boolean;
  /** 是否已添加到「我的角色」 */
  owned: boolean;
}

export interface Banner {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  cta: string;
  /** 小程序页面路径 */
  link: string;
  params?: Record<string, string>;
  startAt: number;
  endAt: number;
  sort: number;
  /** 文字主题：浅底深字 / 深底浅字 */
  theme: 'light' | 'dark';
}

export type RepeatType = 'daily' | 'workday' | 'weekend' | 'custom';

export interface Schedule {
  id: string;
  characterId: string;
  /** HH:mm */
  time: string;
  repeat: RepeatType;
  /** repeat=custom 时生效，0=周日 */
  weekdays: number[];
  label: string;
  /** 提前提醒分钟数，0 为不提醒 */
  remindBefore: number;
  enabled: boolean;
}

export type ScheduleDraft = Omit<Schedule, 'id' | 'enabled'>;

export type DeviceStatus = 'online' | 'offline' | 'unbound';

export interface Device {
  deviceId: string;
  name: string;
  status: DeviceStatus;
  battery: number;
  wifiName: string;
  firmware: string;
  volume: number;
}

export interface CallRecord {
  id: string;
  characterId: string;
  startAt: number;
  /** 通话秒数 */
  duration: number;
  direction: 'incoming' | 'outgoing' | 'scheduled';
}

export interface Memory {
  id: string;
  characterId: string;
  content: string;
  createdAt: number;
}

export interface TaskStep {
  text: string;
  done: boolean;
}

export interface DailyTask {
  id: string;
  characterId: string;
  title: string;
  greeting: string;
  steps: TaskStep[];
  reward: number;
}

export type NotificationType = 'schedule' | 'content' | 'device' | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  createdAt: number;
  read: boolean;
}

export interface DailyReport {
  callCount: number;
  callMinutes: number;
  favoriteCharacterId: string;
  topics: string[];
  taskDone: number;
  taskTotal: number;
}
