import { IMAGES } from '../../../constants/assets';
import { definePage } from '../../../core/page';
import { logger } from '../../../core/logger';
import { router } from '../../../core/router';
import type { Character } from '../../../models/index';
import { characterService } from '../../../services/index';
import { clock } from '../../../utils/format';

/** incoming(角色来电) | outgoing(呼叫中) | active(通话中) | ended(已结束) */
type CallPhase = 'incoming' | 'outgoing' | 'active' | 'ended';

let timer: number | null = null;

definePage({
  data: {
    images: IMAGES,
    phase: 'incoming' as CallPhase,
    character: null as Character | null,
    seconds: 0,
    clock: '00:00',
    muted: false,
    speaker: true,
    bars: Array.from({ length: 24 }, (_, i) => ({ delay: ((i * 7) % 10) / 10 })),
  },

  async onLoad(query: Record<string, string | undefined>) {
    wx.setKeepScreenOn({ keepScreenOn: true });
    const phase = (query.mode === 'outgoing' ? 'outgoing' : 'incoming') as CallPhase;
    const character = await characterService.detail(query.id || 'fox');
    this.setData({ character, phase });
    logger.track('call_open', { id: character.id, phase });
    if (phase === 'outgoing') this.dial();
  },

  onUnload() {
    this.stopTimer();
    wx.setKeepScreenOn({ keepScreenOn: false });
  },

  async dial() {
    const c = this.data.character;
    if (!c) return;
    try {
      await characterService.callNow(c.id);
      setTimeout(() => this.data.phase === 'outgoing' && this.onAccept(), 1800);
    } catch (e) {
      logger.error('call:dial', e, { id: c.id });
      this.setData({ phase: 'ended' });
    }
  },

  onAccept() {
    wx.vibrateShort({ type: 'light' });
    this.setData({ phase: 'active', seconds: 0, clock: '00:00' });
    this.stopTimer();
    timer = setInterval(() => {
      const seconds = this.data.seconds + 1;
      this.setData({ seconds, clock: clock(seconds) });
    }, 1000) as unknown as number;
  },

  onDecline() {
    logger.track('call_decline', { id: this.data.character?.id });
    router.back();
  },

  onHangup() {
    this.stopTimer();
    logger.track('call_hangup', { id: this.data.character?.id, duration: this.data.seconds });
    this.setData({ phase: 'ended' });
  },

  toggleMute() {
    this.setData({ muted: !this.data.muted });
  },

  toggleSpeaker() {
    this.setData({ speaker: !this.data.speaker });
  },

  onClose() {
    router.back();
  },

  stopTimer() {
    if (timer !== null) clearInterval(timer);
    timer = null;
  },
});
