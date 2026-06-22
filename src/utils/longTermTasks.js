export const LONG_TERM_PREFIX = '[[LONG_TERM_V1]]';

export function isLongTermTask(task) {
  return typeof task?.description === 'string' && task.description.startsWith(LONG_TERM_PREFIX);
}

export function parseLongTermTask(task) {
  if (!isLongTermTask(task)) return null;
  try {
    return JSON.parse(task.description.slice(LONG_TERM_PREFIX.length));
  } catch {
    return null;
  }
}

export function serializeLongTermTask(metadata) {
  return `${LONG_TERM_PREFIX}${JSON.stringify(metadata)}`;
}

export function makeLongTermId(prefix = 'item') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getLongTermDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isLongTermTaskDue(metadata, dateText = getLongTermDate()) {
  if (!metadata || metadata.lifecycle !== 'active') return false;
  if (metadata.startDate && dateText < metadata.startDate) return false;
  if (metadata.endDate && dateText > metadata.endDate) return false;

  const date = new Date(`${dateText}T12:00:00`);
  const schedule = metadata.schedule ?? { type: 'daily' };
  if (schedule.type === 'daily') return true;

  if (schedule.type === 'interval') {
    const start = new Date(`${metadata.startDate || dateText}T12:00:00`);
    const days = Math.round((date.getTime() - start.getTime()) / 86400000);
    return days >= 0 && days % Math.max(1, Number(schedule.intervalDays) || 1) === 0;
  }

  if (schedule.type === 'weekly') {
    return (schedule.weekdays ?? []).includes(date.getDay());
  }

  if (schedule.type === 'monthly') {
    return (schedule.monthDays ?? []).includes(date.getDate());
  }

  return false;
}

export function getLongTermScheduleLabel(metadata) {
  const schedule = metadata?.schedule ?? { type: 'daily' };
  if (schedule.type === 'daily') return '每天';
  if (schedule.type === 'interval') return `每隔 ${schedule.intervalDays || 1} 天`;
  if (schedule.type === 'weekly') {
    const labels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return (schedule.weekdays ?? []).map((day) => labels[day]).join('、') || '每周';
  }
  if (schedule.type === 'monthly') return `每月 ${(schedule.monthDays ?? []).join('、')} 日`;
  return '自定义周期';
}

export function getAccountDayStatus(metadata, dateText = getLongTermDate()) {
  const log = metadata?.checkins?.[dateText] ?? {};
  if (log.state === 'skipped') return { state: 'skipped', completed: 0, total: 0, log };

  const accounts = metadata?.accounts ?? [];
  const counts = log.accountCounts ?? {};
  let completed = 0;
  let total = 0;
  let hasAny = false;

  accounts.forEach((account) => {
    const count = Number(counts[account.id]) || 0;
    const target = account.unlimited ? 1 : Math.max(1, Number(account.targetCount) || 1);
    total += target;
    completed += Math.min(count, target);
    if (count > 0) hasAny = true;
  });

  return {
    state: total > 0 && completed >= total ? 'complete' : hasAny ? 'partial' : 'pending',
    completed,
    total,
    log,
  };
}

export function getAccountTaskStats(metadata, todayText = getLongTermDate()) {
  const entries = Object.entries(metadata?.checkins ?? {})
    .filter(([, log]) => log.state === 'complete')
    .map(([date]) => date)
    .sort();
  const completedSet = new Set(entries);
  const cumulativeDays = entries.length;

  let cursor = new Date(`${todayText}T12:00:00`);
  let streakDays = 0;
  let foundFirstDueDate = false;
  for (let checkedDays = 0; checkedDays < 3660; checkedDays += 1) {
    const cursorText = getLongTermDate(cursor);
    if (isLongTermTaskDue(metadata, cursorText)) {
      if (completedSet.has(cursorText)) {
        streakDays += 1;
        foundFirstDueDate = true;
      } else if (cursorText === todayText && !foundFirstDueDate) {
        // Today's open task does not end the streak until the day is over.
      } else {
        break;
      }
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  const monthPrefix = todayText.slice(0, 7);
  const monthCompleted = entries.filter((date) => date.startsWith(monthPrefix)).length;
  const totalActions = Object.values(metadata?.checkins ?? {}).reduce((sum, log) => (
    sum + Object.values(log.accountCounts ?? {}).reduce((count, value) => count + (Number(value) || 0), 0)
  ), 0);

  return { cumulativeDays, streakDays, monthCompleted, totalActions };
}
