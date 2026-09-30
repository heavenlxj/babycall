import { IMAGES } from '../../../constants/assets';
import { definePage } from '../../../core/page';
import { logger } from '../../../core/logger';
import { ROUTES, router } from '../../../core/router';
import type { Gender } from '../../../models/index';
import { childService } from '../../../services/index';
import { pad } from '../../../utils/format';

const GENDERS: { key: Gender; label: string }[] = [
  { key: 'male', label: '男孩' },
  { key: 'female', label: '女孩' },
];

const today = new Date();
const TODAY = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

/**
 * 添加 / 编辑孩子
 * mode=create：首次登录引导，保存后进入首页
 * mode=edit：编辑当前孩子，保存后返回
 */
definePage({
  data: {
    images: IMAGES,
    mode: 'create' as 'create' | 'edit',
    genders: GENDERS,
    nickName: '',
    gender: '' as Gender | '',
    birthday: '',
    today: TODAY,
    saving: false,
  },

  onLoad(query: Record<string, string | undefined>) {
    const child = childService.current();
    if (query.mode === 'edit' && child) {
      this.setData({
        mode: 'edit',
        nickName: child.nickName,
        gender: child.gender,
        birthday: child.birthday,
      });
    }
  },

  onName(e: WechatMiniprogram.Input) {
    this.setData({ nickName: e.detail.value });
  },

  onGender(e: WechatMiniprogram.TouchEvent) {
    this.setData({ gender: e.currentTarget.dataset.key as Gender });
  },

  onBirthday(e: WechatMiniprogram.PickerChange) {
    this.setData({ birthday: String(e.detail.value) });
  },

  async onSave() {
    const { mode, nickName, gender, birthday } = this.data;
    const name = nickName.trim();
    if (!name) {
      wx.showToast({ title: '给宝贝起个小名吧', icon: 'none' });
      return;
    }
    if (!gender) {
      wx.showToast({ title: '请选择宝贝的性别', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    try {
      const draft = { nickName: name, gender, birthday };
      if (mode === 'edit') {
        await childService.update(childService.currentId(), draft);
        logger.track('child_update');
        router.back();
      } else {
        await childService.create(draft);
        logger.track('child_create', { gender, hasBirthday: !!birthday });
        router.relaunch(ROUTES.home);
      }
    } catch (e) {
      logger.error('child:save', e);
    } finally {
      this.setData({ saving: false });
    }
  },
});
