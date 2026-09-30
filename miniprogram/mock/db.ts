import { IMAGES } from '../constants/assets';
import { ROUTES } from '../core/router';
import type {
  AppNotification,
  Banner,
  CallRecord,
  Character,
  DailyReport,
  DailyTask,
  Memory,
} from '../models/index';

const now = Date.now();
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

export const characters: Character[] = [
  {
    id: 'fox', name: '小狐', personality: '勇敢 · 爱冒险', tags: ['勇敢', '冒险', '爱讲故事'],
    categories: ['hot', 'adventure'], intro: '我是小狐！我最喜欢和你一起探索森林里的秘密。',
    image: IMAGES.fox, color: '#FF9B4A', bgColor: '#FFF1E3', world: IMAGES.worldForest,
    online: true, locked: false, owned: true,
  },
  {
    id: 'dino', name: '小恐龙', personality: '调皮 · 好奇', tags: ['调皮', '好奇', '爱提问'],
    categories: ['hot', 'game'], intro: '嗷呜～我是小恐龙，我们一起去发现世界上最奇妙的东西吧！',
    image: IMAGES.dino, color: '#63B77A', bgColor: '#E9F6EC', world: IMAGES.worldForest,
    online: true, locked: false, owned: true,
  },
  {
    id: 'bunny', name: '小兔', personality: '温柔 · 贴心', tags: ['温柔', '贴心', '睡前故事'],
    categories: ['warm'], intro: '你好呀，我是小兔。每天晚上，我都想给你讲一个温柔的故事。',
    image: IMAGES.bunny, color: '#EE8FA8', bgColor: '#FDEDF1', world: IMAGES.bannerStory,
    online: true, locked: false, owned: true,
  },
  {
    id: 'robot', name: '小机器人', personality: '聪明 · 陪伴', tags: ['聪明', '知识', '太空'],
    categories: ['knowledge', 'hot'], intro: '哔哔！我是小机器人，你想知道的问题，我们一起来找答案。',
    image: IMAGES.robot, color: '#67B7F5', bgColor: '#E8F4FD', world: IMAGES.bannerSpace,
    online: false, locked: false, isNew: true, owned: true,
  },
  {
    id: 'bear', name: '小熊', personality: '憨厚 · 暖心', tags: ['暖心', '拥抱', '好朋友'],
    categories: ['warm'], intro: '我是小熊，不开心的时候就来找我吧，我会给你一个大大的拥抱。',
    image: IMAGES.bear, color: '#C98B55', bgColor: '#F8EEE4', world: IMAGES.worldForest,
    online: true, locked: false, owned: false,
  },
  {
    id: 'penguin', name: '小企鹅', personality: '活泼 · 乐观', tags: ['活泼', '游戏', '冰雪'],
    categories: ['game', 'adventure'], intro: '嘿嘿，我是小企鹅！冰雪王国里有好多好玩的游戏等着你。',
    image: IMAGES.penguin, color: '#5C7FB8', bgColor: '#E7EEF9', world: IMAGES.bannerSpace,
    online: true, locked: true, owned: false,
  },
];

export const banners: Banner[] = [
  {
    id: 'b1', image: IMAGES.bannerCall, title: '今天谁会给你打电话？', subtitle: '让喜欢的角色，在约定时间主动联系你',
    cta: '去设置', link: ROUTES.scheduleEdit, startAt: now - DAY, endAt: now + 30 * DAY, sort: 1, theme: 'light',
  },
  {
    id: 'b2', image: IMAGES.bannerSpace, title: '新角色上线\n太空探险家', subtitle: '和小机器人一起飞向星星',
    cta: '立即查看', link: ROUTES.characterDetail, params: { id: 'robot' }, startAt: now - DAY, endAt: now + 30 * DAY, sort: 2, theme: 'dark',
  },
  {
    id: 'b3', image: IMAGES.bannerStory, title: '睡前故事时间', subtitle: '小兔每晚为你讲一个新故事',
    cta: '去听听', link: ROUTES.characterDetail, params: { id: 'bunny' }, startAt: now - DAY, endAt: now + 30 * DAY, sort: 3, theme: 'dark',
  },
];

export const callRecords: CallRecord[] = [
  { id: 'c1', characterId: 'fox', startAt: now - 2 * HOUR, duration: 192, direction: 'scheduled' },
  { id: 'c2', characterId: 'dino', startAt: now - DAY - 3 * HOUR, duration: 348, direction: 'outgoing' },
  { id: 'c3', characterId: 'bunny', startAt: now - DAY - 7 * HOUR, duration: 137, direction: 'incoming' },
  { id: 'c4', characterId: 'fox', startAt: now - 2 * DAY, duration: 256, direction: 'scheduled' },
];

export const memories: Memory[] = [
  { id: 'm1', characterId: 'fox', content: '你最喜欢的动物是恐龙。', createdAt: now - DAY },
  { id: 'm2', characterId: 'fox', content: '你说这个周末要和爸爸妈妈去公园。', createdAt: now - DAY },
  { id: 'm3', characterId: 'fox', content: '你喜欢听冒险故事，特别是森林探险。', createdAt: now - 2 * DAY },
  { id: 'm4', characterId: 'dino', content: '你问过我：恐龙为什么会消失？', createdAt: now - DAY },
  { id: 'm5', characterId: 'bunny', content: '你睡觉前喜欢抱着小熊玩偶。', createdAt: now - 3 * DAY },
];

export const tasks: DailyTask[] = [
  {
    id: 't1', characterId: 'fox', title: '和小狐一起森林探险', greeting: '今天和我一起完成一个小冒险吧！',
    steps: [
      { text: '找到家里 3 个圆形物品', done: true },
      { text: '告诉小狐你最喜欢哪一个', done: false },
      { text: '完成后回来告诉我', done: false },
    ],
    reward: 10,
  },
];

export const notifications: AppNotification[] = [
  { id: 'n1', type: 'schedule', title: '定时来电提醒', content: '小狐明天 07:30 会给孩子打电话。', createdAt: now - HOUR, read: false },
  { id: 'n2', type: 'content', title: '新故事上线', content: '新的冒险故事「星星森林」已经上线啦。', createdAt: now - 5 * HOUR, read: false },
  { id: 'n3', type: 'device', title: '设备电量提醒', content: '儿童电话电量低于 20%，记得充电哦。', createdAt: now - DAY, read: true },
  { id: 'n4', type: 'system', title: '欢迎加入 PallyCall', content: '让喜欢的角色，随时陪在孩子身边。', createdAt: now - 3 * DAY, read: true },
];

export const report: DailyReport = {
  callCount: 3, callMinutes: 18, favoriteCharacterId: 'fox',
  topics: ['恐龙', '森林探险', '公园', '星星'], taskDone: 1, taskTotal: 3,
};
