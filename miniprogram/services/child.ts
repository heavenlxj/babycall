import { http } from '../core/request';
import { childStore } from '../store/index';
import type { Child, ChildDraft, Gender } from '../models/index';

interface ChildDTO {
  child_id: string;
  nick_name: string | null;
  gender: Gender;
  avatar_url: string | null;
  birthday: string | null;
  relationship?: string | null;
  bind_device?: boolean;
}

const toChild = (c: ChildDTO): Child => ({
  childId: c.child_id,
  nickName: c.nick_name || '',
  gender: c.gender,
  avatar: c.avatar_url || '',
  birthday: c.birthday || '',
  relationship: c.relationship || '',
  bindDevice: !!c.bind_device,
});

export const childService = {
  list: async () => (await http.get<ChildDTO[]>('/users/childs')).map(toChild),

  async create(draft: ChildDraft): Promise<Child> {
    const res = await http.post<ChildDTO>('/users/childs', {
      nick_name: draft.nickName,
      gender: draft.gender,
      birthday: draft.birthday || undefined,
      relationship: draft.relationship || undefined,
    });
    const child = { ...toChild(res), relationship: draft.relationship };
    childStore.set(child);
    return child;
  },

  async update(childId: string, draft: Partial<ChildDraft>): Promise<Child> {
    const res = await http.put<ChildDTO>(`/child/${childId}`, {
      nick_name: draft.nickName,
      gender: draft.gender,
      birthday: draft.birthday || undefined,
    });
    const current = childStore.get();
    const child = { ...current, ...toChild(res), bindDevice: current ? current.bindDevice : false };
    childStore.set(child);
    return child;
  },

  /** 当前孩子（本地缓存） */
  current(): Child | null {
    return childStore.get() || null;
  },

  currentId(): string {
    const child = childStore.get();
    if (!child) throw new Error('请先添加孩子');
    return child.childId;
  },

  /** 拉取孩子列表并校准当前孩子：优先保留原选择，否则取第一个；没有孩子返回 null */
  async sync(): Promise<Child | null> {
    const list = await childService.list();
    const selected = childStore.get();
    const child = list.find((c) => selected && c.childId === selected.childId) || list[0] || null;
    child ? childStore.set(child) : childStore.remove();
    return child;
  },
};
