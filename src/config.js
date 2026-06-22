export const pages = {
  home: 'home',
  login: 'login',
  register: 'register',
  workspace: 'workspace',
  publicNotes: 'publicNotes',
};

export const tabs = {
  dashboard: 'dashboard',
  notes: 'notes',
  tasks: 'tasks',
  calendar: 'calendar',
  matrix: 'matrix',
  profile: 'profile',
};

export const taskViews = {
  list: 'list',
  calendar: 'calendar',
  matrix: 'matrix',
  longTerm: 'long-term',
};

export const matrixOptions = [
  { value: 'important_urgent', label: '重要紧急', hint: '马上处理' },
  { value: 'important_not_urgent', label: '重要不紧急', hint: '计划推进' },
  { value: 'urgent_not_important', label: '紧急不重要', hint: '尽量压缩' },
  { value: 'not_urgent_not_important', label: '不紧急不重要', hint: '有空再做' },
];

export const statusOptions = [
  { value: 'not_started', label: '待开始' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'stalled', label: '已停滞' },
];
