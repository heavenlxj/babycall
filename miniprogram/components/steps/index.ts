export {};

/** 步骤条：<steps items="{{['选择角色','设置时间','确认']}}" current="{{1}}" /> */
Component({
  options: { virtualHost: true },
  properties: {
    items: { type: Array, value: [] },
    current: { type: Number, value: 0 },
  },
});
