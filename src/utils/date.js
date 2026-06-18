export function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export function getRelativeDate(offsetDays) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function formatDate(dateString) {
  if (!dateString) return '未设置';
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(timeString) {
  if (!timeString) return '';
  return timeString.slice(0, 5);
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 12) return '早上好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

export function formatFullDate() {
  const date = new Date();
  const monthDay = new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
  }).format(date);
  const weekday = new Intl.DateTimeFormat('zh-CN', { weekday: 'long' }).format(date);
  return `${monthDay}，${weekday}`;
}

export function getMonthDays(currentDate) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const start = new Date(firstDay);
  const weekday = firstDay.getDay() || 7;
  start.setDate(firstDay.getDate() - weekday + 1);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return {
      date: day.toISOString().slice(0, 10),
      dayNumber: day.getDate(),
      isCurrentMonth: day.getMonth() === month,
    };
  });
}
