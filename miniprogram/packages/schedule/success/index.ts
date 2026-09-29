import { IMAGES } from '../../../constants/assets';
import { definePage } from '../../../core/page';
import { ROUTES, router } from '../../../core/router';
import type { RepeatType } from '../../../models/index';
import { characterService } from '../../../services/index';
import { nextCallText, repeatText } from '../../../utils/format';

definePage({
  data: {
    images: IMAGES,
    name: '',
    time: '',
    label: '',
    repeatText: '',
    nextText: '',
    stars: Array.from({ length: 10 }, (_, i) => ({
      left: 8 + ((i * 37) % 84),
      delay: (i % 5) * 0.35,
      size: 16 + (i % 3) * 8,
    })),
  },

  async onLoad(query: Record<string, string | undefined>) {
    const time = query.time || '07:30';
    const repeat = (query.repeat || 'daily') as RepeatType;
    this.setData({
      time,
      label: query.label || '',
      repeatText: repeatText(repeat),
      nextText: nextCallText(time, repeat),
    });
    const character = await characterService.detail(query.characterId || 'fox');
    this.setData({ name: character.name });
  },

  onDone() {
    router.to(ROUTES.schedule);
  },

  onAgain() {
    router.redirect(ROUTES.scheduleEdit);
  },
});
