import { IMAGES } from '../../../constants/assets';
import { definePage } from '../../../core/page';
import { logger } from '../../../core/logger';
import { ROUTES, router } from '../../../core/router';
import type { Character, Device, RepeatType } from '../../../models/index';
import { characterService, deviceService, scheduleService } from '../../../services/index';
import { pad, repeatText } from '../../../utils/format';

const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 12 }, (_, i) => pad(i * 5));

const REPEATS: { key: RepeatType; label: string }[] = [
  { key: 'daily', label: '每天' },
  { key: 'workday', label: '工作日' },
  { key: 'weekend', label: '周末' },
  { key: 'custom', label: '自定义' },
];
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0].map((d) => ({ day: d, label: '日一二三四五六'[d] }));
const LABELS = ['早安电话', '午间问候', '冒险任务', '睡前故事', '晚安电话'];
const REMINDS = [
  { value: 0, label: '不提醒' },
  { value: 5, label: '5 分钟' },
  { value: 10, label: '10 分钟' },
];

definePage({
  data: {
    steps: ['选择角色', '设置时间', '确认'],
    step: 0,
    characters: [] as Character[],
    characterId: '',
    character: null as Character | null,
    hours: HOURS,
    minutes: MINUTES,
    pickerValue: [7, 6],
    time: '07:30',
    repeats: REPEATS,
    repeat: 'daily' as RepeatType,
    weekdays: WEEKDAYS,
    selectedDays: [] as number[],
    dayMap: {} as Record<number, boolean>,
    labels: LABELS,
    label: '早安电话',
    reminds: REMINDS,
    remindBefore: 0,
    repeatText: '每天',
    device: null as Device | null,
    deviceImage: IMAGES.devicePhone,
    saving: false,
  },

  onLoad(query: Record<string, string | undefined>) {
    this.setData({ characterId: query.characterId || '' });
    this.load();
  },

  async load() {
    const [characters, device] = await Promise.all([characterService.list(), deviceService.current()]);
    const available = characters.filter((c) => !c.locked);
    this.setData({ characters: available, device });
    if (this.data.characterId) this.pick(this.data.characterId);
  },

  pick(id: string) {
    this.setData({ characterId: id, character: this.data.characters.find((c) => c.id === id) || null });
  },

  onSelect(e: WechatMiniprogram.CustomEvent<{ id: string }>) {
    this.pick(e.detail.id);
  },

  onTimeChange(e: WechatMiniprogram.PickerViewChange) {
    const [h, m] = e.detail.value;
    this.setData({ pickerValue: [h, m], time: `${HOURS[h]}:${MINUTES[m]}` });
  },

  onRepeat(e: WechatMiniprogram.TouchEvent) {
    this.setData({ repeat: e.currentTarget.dataset.key as RepeatType });
    this.syncRepeatText();
  },

  onDay(e: WechatMiniprogram.TouchEvent) {
    const day = e.currentTarget.dataset.day as number;
    const dayMap = { ...this.data.dayMap, [day]: !this.data.dayMap[day] };
    const selectedDays = Object.keys(dayMap).map(Number).filter((d) => dayMap[d]);
    this.setData({ dayMap, selectedDays });
    this.syncRepeatText();
  },

  syncRepeatText() {
    this.setData({ repeatText: repeatText(this.data.repeat, this.data.selectedDays) });
  },

  onLabel(e: WechatMiniprogram.TouchEvent) {
    this.setData({ label: e.currentTarget.dataset.label as string });
  },

  onRemind(e: WechatMiniprogram.TouchEvent) {
    this.setData({ remindBefore: e.currentTarget.dataset.value as number });
  },

  onPrev() {
    this.setData({ step: this.data.step - 1 });
  },

  onNext() {
    const { step, characterId, repeat, selectedDays } = this.data;
    if (step === 0 && !characterId) {
      wx.showToast({ title: '先选一个角色吧', icon: 'none' });
      return;
    }
    if (step === 1 && repeat === 'custom' && !selectedDays.length) {
      wx.showToast({ title: '请选择重复的日子', icon: 'none' });
      return;
    }
    this.setData({ step: step + 1 });
  },

  async onSave() {
    const { characterId, time, repeat, selectedDays, label, remindBefore } = this.data;
    this.setData({ saving: true });
    try {
      const schedule = await scheduleService.create({
        characterId,
        time,
        repeat,
        weekdays: repeat === 'custom' ? selectedDays : [],
        label,
        remindBefore,
      });
      logger.track('schedule_create', { characterId, time, repeat });
      router.redirect(ROUTES.scheduleSuccess, { id: schedule.id, characterId, time, repeat, label });
    } catch (e) {
      logger.error('schedule:create', e);
    } finally {
      this.setData({ saving: false });
    }
  },

  goPair() {
    if (!this.data.device) router.to(ROUTES.devicePairing);
  },
});
