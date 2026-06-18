import { formatDate, formatTime, getToday } from './date';

export function getLabel(options, value) {
  return options.find((item) => item.value === value)?.label ?? value;
}

export function getTaskListEmptyText(statusFilter, matrixFilter) {
  if (statusFilter === 'all' && matrixFilter === 'all') {
    return '还没有任务，先在左侧新增一条安排。';
  }

  return '没有符合当前筛选的任务，可以换个状态或程度看看。';
}

export function filterTasks(tasks, statusFilter = 'all', matrixFilter = 'all') {
  return tasks.filter((task) => {
    const matchesStatus =
      (statusFilter === 'all' && task.status !== 'completed') ||
      (statusFilter === 'unfinished' && task.status !== 'completed') ||
      task.status === statusFilter;
    const matchesMatrix = matrixFilter === 'all' || task.matrix_category === matrixFilter;

    return matchesStatus && matchesMatrix;
  });
}

export function isTaskOverdue(task) {
  if (!task.task_date || task.status === 'completed') return false;

  const today = getToday();
  if (task.task_date < today) return true;
  if (task.task_date > today) return false;
  if (!task.task_time) return false;

  return new Date(`${task.task_date}T${task.task_time}`).getTime() < Date.now();
}

export function getTaskTimingInfo(task) {
  const timeText = formatTime(task.task_time);

  if (isTaskOverdue(task)) {
    const dateText = task.task_date === getToday() ? '今天' : formatDate(task.task_date);
    return {
      className: 'tag timing-overdue',
      label: `已逾期 · ${dateText}${timeText ? ` ${timeText}` : ''}`,
    };
  }

  if (task.status !== 'completed' && task.task_date === getToday()) {
    return {
      className: 'tag timing-today',
      label: `今天${timeText ? ` · ${timeText}` : ''}`,
    };
  }

  return {
    className: 'tag',
    label: `${formatDate(task.task_date)} ${timeText}`.trim(),
  };
}

export function sortTasks(a, b) {
  const priorityA = getTaskSortPriority(a);
  const priorityB = getTaskSortPriority(b);
  if (priorityA !== priorityB) return priorityA - priorityB;

  return `${a.task_date}${a.task_time ?? ''}`.localeCompare(`${b.task_date}${b.task_time ?? ''}`);
}

function getTaskSortPriority(task) {
  if (task.status === 'completed') return 4;
  if (isTaskOverdue(task)) return 1;
  if (task.task_date === getToday()) return 2;
  return 3;
}
