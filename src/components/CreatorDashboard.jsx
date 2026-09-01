import React from 'react';
import { BarChart3, Check, ChevronRight, Copy, Film, Flame, LibraryBig, Plus, Sparkles, Target, Trash2 } from 'lucide-react';
import './CreatorDashboard.css';

const STORAGE_KEY = 'creator-growth-dashboard-v1';
const BREAKDOWN_ARCHIVE_KEY = 'script-breakdown-archives-v1';
const TYPES = [
  { id: 'script', label: '写脚本', short: '脚本', color: 'var(--creator-script)' },
  { id: 'storyboard', label: '做分镜', short: '分镜', color: 'var(--creator-storyboard)' },
  { id: 'video', label: '出成片', short: '成片', color: 'var(--creator-video)' },
];
const DEFAULT_TASKS = [
  { title: '完成选题', type: 'general' },
  { title: '完成脚本', type: 'script' },
  { title: '完成分镜', type: 'storyboard' },
  { title: '生成画面与视频素材', type: 'general' },
  { title: '剪辑并导出成片', type: 'video' },
  { title: '发布作品', type: 'general' },
  { title: '完成复盘', type: 'general' },
];

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const dateKey = (value = new Date()) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
};
const periodStart = (kind) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  if (kind === 'week') {
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  } else if (kind === 'month') {
    date.setDate(1);
  } else {
    date.setMonth(Math.floor(date.getMonth() / 3) * 3, 1);
  }
  return dateKey(date);
};
const formatDay = (value) => new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(new Date(value));
const blankGoals = () => ({ week: { script: 2, storyboard: 2, video: 1 }, month: { script: 8, storyboard: 8, video: 4 }, quarter: { script: 24, storyboard: 24, video: 12 } });
const emptyData = () => ({ goals: blankGoals(), projects: [], prompts: [], events: [], milestones: [] });

function loadData() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    return { ...emptyData(), ...saved, goals: { ...blankGoals(), ...(saved?.goals || {}) }, projects: Array.isArray(saved?.projects) ? saved.projects : [], prompts: Array.isArray(saved?.prompts) ? saved.prompts : [], events: Array.isArray(saved?.events) ? saved.events : [], milestones: Array.isArray(saved?.milestones) ? saved.milestones : [] };
  } catch {
    return emptyData();
  }
}

function loadArchives() {
  try { return JSON.parse(window.localStorage.getItem(BREAKDOWN_ARCHIVE_KEY) || '[]'); } catch { return []; }
}

function getCounts(events, period) {
  const start = periodStart(period);
  return TYPES.reduce((result, type) => ({ ...result, [type.id]: events.filter((event) => event.type === type.id && event.date >= start).length }), {});
}

function metricForDay(events, date) {
  const types = events.filter((event) => event.date === date).map((event) => event.type);
  return types.includes('video') ? 'video' : types.includes('storyboard') ? 'storyboard' : types.includes('script') ? 'script' : 'none';
}

function copyText(text) {
  return navigator.clipboard?.writeText(text);
}

export function CreatorDashboard({ view = 'overview' }) {
  const [data, setData] = React.useState(loadData);
  const [archives, setArchives] = React.useState(loadArchives);
  const [notice, setNotice] = React.useState('');
  const [projectDraft, setProjectDraft] = React.useState('');
  const [promptDraft, setPromptDraft] = React.useState({ category: '未分类', tags: '', body: '', reference: '', projectId: '' });
  const [customMilestone, setCustomMilestone] = React.useState('');
  const [goalPeriod, setGoalPeriod] = React.useState('week');

  React.useEffect(() => { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data]);
  React.useEffect(() => {
    const refreshArchives = () => setArchives(loadArchives());
    window.addEventListener('storage', refreshArchives);
    window.addEventListener('focus', refreshArchives);
    return () => { window.removeEventListener('storage', refreshArchives); window.removeEventListener('focus', refreshArchives); };
  }, []);
  React.useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const updateData = (updater) => setData((current) => typeof updater === 'function' ? updater(current) : updater);
  const weekly = getCounts(data.events, 'week');
  const month = getCounts(data.events, 'month');
  const currentTasks = data.projects.flatMap((project) => project.tasks.filter((task) => !task.done).map((task) => ({ ...task, project })));
  const structureCounts = archives.reduce((counts, archive) => { const key = archive.videoType || '未标记'; counts[key] = (counts[key] || 0) + 1; return counts; }, {});

  const addProject = (event) => {
    event.preventDefault();
    const title = projectDraft.trim();
    if (!title) return;
    updateData((current) => ({ ...current, projects: [{ id: uid(), title, status: '构思中', tasks: DEFAULT_TASKS.map((task) => ({ id: uid(), ...task, done: false })), createdAt: new Date().toISOString() }, ...current.projects] }));
    setProjectDraft('');
    setNotice('视频已录入。完成项目待办后，数据会自动统计。');
  };

  const toggleTask = (projectId, taskId) => {
    updateData((current) => {
      let eventToAdd = null;
      let eventToRemove = null;
      const projects = current.projects.map((project) => {
        if (project.id !== projectId) return project;
        const tasks = project.tasks.map((task) => {
          if (task.id !== taskId) return task;
          const done = !task.done;
          if (task.type !== 'general') {
            if (done) eventToAdd = { id: uid(), projectId, taskId, type: task.type, date: dateKey(), createdAt: new Date().toISOString() };
            else eventToRemove = { projectId, taskId };
          }
          return { ...task, done };
        });
        const hasVideo = tasks.some((task) => task.type === 'video' && task.done);
        return { ...project, tasks, status: hasVideo ? '已导出成片' : project.status };
      });
      const events = eventToAdd ? [...current.events.filter((item) => !(item.projectId === projectId && item.taskId === taskId)), eventToAdd] : eventToRemove ? current.events.filter((item) => !(item.projectId === eventToRemove.projectId && item.taskId === eventToRemove.taskId)) : current.events;
      return { ...current, projects, events };
    });
  };

  const addTask = (projectId, title, type) => {
    const value = title.trim();
    if (!value) return;
    updateData((current) => ({
      ...current,
      projects: current.projects.map((project) => project.id === projectId
        ? { ...project, tasks: [...project.tasks, { id: uid(), title: value, type, done: false }] }
        : project),
    }));
  };
  const updateTaskTitle = (projectId, taskId, title) => updateData((current) => ({
    ...current,
    projects: current.projects.map((project) => project.id === projectId
      ? { ...project, tasks: project.tasks.map((task) => task.id === taskId && title.trim() ? { ...task, title: title.trim() } : task) }
      : project),
  }));
  const removeTask = (projectId, taskId) => updateData((current) => ({
    ...current,
    projects: current.projects.map((project) => project.id === projectId
      ? { ...project, tasks: project.tasks.filter((task) => task.id !== taskId) }
      : project),
    events: current.events.filter((event) => !(event.projectId === projectId && event.taskId === taskId)),
  }));
  const updateProjectRecord = (projectId, record) => updateData((current) => ({
    ...current,
    projects: current.projects.map((project) => project.id === projectId ? { ...project, record: { ...project.record, ...record } } : project),
  }));

  const addPrompt = (event) => {
    event.preventDefault();
    if (!promptDraft.body.trim()) return;
    updateData((current) => ({ ...current, prompts: [{ id: uid(), ...promptDraft, tags: promptDraft.tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean), createdAt: new Date().toISOString() }, ...current.prompts] }));
    setPromptDraft({ category: '未分类', tags: '', body: '', reference: '', projectId: '' });
    setNotice('提示词已保存到素材库。');
  };
  const addManualActivity = (type) => {
    const today = dateKey();
    const todayCount = data.events.filter((event) => event.type === type && event.date === today).length;
    if (todayCount >= 5) {
      setNotice(type === 'input' ? '今天已记录 5 次有效输入。' : '今天已记录 5 次复盘沉淀。');
      return;
    }
    updateData((current) => ({ ...current, events: [...current.events, { id: uid(), type, date: today, createdAt: new Date().toISOString() }] }));
    setNotice(type === 'input' ? '已记录一次有效输入。' : '已记录一次复盘沉淀。');
  };
  const addMilestone = (event) => {
    event.preventDefault();
    if (!customMilestone.trim()) return;
    updateData((current) => ({ ...current, milestones: [{ id: uid(), title: customMilestone.trim(), done: false, custom: true }, ...current.milestones] }));
    setCustomMilestone('');
  };
  const toggleMilestone = (id) => updateData((current) => ({ ...current, milestones: current.milestones.map((item) => item.id === id ? { ...item, done: !item.done } : item) }));
  const copyProjectMarkdown = async (project) => {
    const linkedPrompts = data.prompts.filter((prompt) => prompt.projectId === project.id);
    const text = [
      `# ${project.title}`,
      '',
      `状态：${project.status}`,
      '',
      '## 创作进度',
      ...project.tasks.map((task) => `- [${task.done ? 'x' : ' '}] ${task.title}`),
      ...(project.record ? ['', '## 创作记录', '', `- 镜数：${project.record.shots || '未填写'}`, `- 时长：${project.record.duration || '未填写'}`, `- 使用工具：${project.record.tools || '未填写'}`, '', '### 遇到的问题', '', project.record.problems || '未填写', '', '### 心得笔记', '', project.record.notes || '未填写'] : []),
      ...(linkedPrompts.length ? ['', '## 关联提示词', ...linkedPrompts.map((prompt) => `### ${prompt.category}\n\n${prompt.body}`)] : []),
    ].join('\n');
    try { await copyText(text); setNotice('项目 Markdown 已复制，可直接粘贴到 Obsidian。'); } catch { setNotice('复制失败，请允许浏览器访问剪贴板。'); }
  };

  const showOverview = view === 'overview';
  const showProjects = view === 'projects';
  const showMaterials = view === 'materials';
  const showReview = view === 'review';

  return (
    <section className="creator-dashboard" aria-label="AI 视频创作数据">
      {notice && <p className="creator-notice" role="status">{notice}</p>}

      {showOverview && <section className="creator-page-stack">
        <section className="creator-top-grid">
          <section className="creator-goals" aria-label="创作概览"><GoalCard period={goalPeriod} counts={goalPeriod === 'week' ? weekly : goalPeriod === 'month' ? month : getCounts(data.events, 'quarter')} onPeriodChange={setGoalPeriod} /></section>
          <article className="creator-card creator-chart-card"><div className="creator-card-head"><div><h3>本周推进</h3><p>由项目待办的完成动作自动记录。</p></div><BarChart3 size={19} /></div><WeeklyBars events={data.events} /></article>
        </section>
        <article className="creator-card creator-today"><h3>当前下一步</h3>{currentTasks.length ? <div><b>{currentTasks[0].title}</b><p>{currentTasks[0].project.title}</p><ChevronRight size={17} /></div> : <p>暂无项目待办，可先在“项目”中录入一支正在制作的视频。</p>}</article>
      </section>}

      {showProjects && <section className="creator-single-column"><article className="creator-card"><div className="creator-card-head"><div><h3>视频项目与待办</h3><p>勾选完成后，脚本、分镜、成片会自动进入创作记录。</p></div><Film size={19} /></div><form className="creator-add-row" onSubmit={addProject}><input value={projectDraft} onChange={(event) => setProjectDraft(event.target.value)} placeholder="录入一支正在制作的视频" maxLength="80" /><button type="submit"><Plus size={16} />录入</button></form><div className="creator-project-list">{data.projects.length ? data.projects.map((project) => <ProjectCard key={project.id} project={project} onToggle={toggleTask} onAddTask={addTask} onUpdateTask={updateTaskTitle} onRemoveTask={removeTask} onUpdateRecord={updateProjectRecord} onCopy={() => copyProjectMarkdown(project)} />) : <Empty copy="从一支正在做的视频开始。之后你只需完成待办，创作记录会自己更新。" />}</div></article></section>}

      {showMaterials && <section className="creator-single-column"><article className="creator-card"><div className="creator-card-head"><div><h3>提示词素材库</h3><p>分类、标签、复用，并可关联作品。</p></div><LibraryBig size={19} /></div><form className="creator-prompt-form" onSubmit={addPrompt}><div className="creator-input-grid"><input value={promptDraft.category} onChange={(event) => setPromptDraft({ ...promptDraft, category: event.target.value })} placeholder="分类：教室题材、奇幻剧情…" /><input value={promptDraft.tags} onChange={(event) => setPromptDraft({ ...promptDraft, tags: event.target.value })} placeholder="标签，用逗号分隔" /><select value={promptDraft.projectId} onChange={(event) => setPromptDraft({ ...promptDraft, projectId: event.target.value })}><option value="">不关联作品</option>{data.projects.map((project) => <option value={project.id} key={project.id}>{project.title}</option>)}</select><input value={promptDraft.reference} onChange={(event) => setPromptDraft({ ...promptDraft, reference: event.target.value })} placeholder="可选：参考图或视频链接" /></div><textarea value={promptDraft.body} onChange={(event) => setPromptDraft({ ...promptDraft, body: event.target.value })} placeholder="保存可直接复用的 AI 绘图 / AI 视频提示词" required /><button className="creator-save-prompt" type="submit"><Sparkles size={16} />保存提示词</button></form><div className="creator-prompt-list">{data.prompts.length ? data.prompts.map((prompt) => <PromptCard prompt={prompt} projects={data.projects} key={prompt.id} onDelete={() => updateData((current) => ({ ...current, prompts: current.prompts.filter((item) => item.id !== prompt.id) }))} onCopy={async () => { try { await copyText(prompt.body); setNotice('提示词已复制。'); } catch { setNotice('复制失败，请允许浏览器访问剪贴板。'); } }} />) : <Empty copy="把你想反复使用的生成指令放在这里。" />}</div></article></section>}

      {showReview && <section className="creator-page-stack">
        <section className="creator-insight-grid"><article className="creator-card creator-heat-card"><div className="creator-card-head"><div><h3>最近 30 天</h3><p>记录输入、视频生产与复盘沉淀。</p></div><Flame size={19} /></div><div className="creator-heat-radar-layout"><div><Heatmap events={data.events} /></div><ActivityRadar events={data.events} onAddActivity={addManualActivity} /></div></article></section>
        <section className="creator-review-grid"><article className="creator-card"><div className="creator-card-head"><div><h3>创作里程碑</h3><p>每完成一个阶段，都值得被点亮。</p></div><Target size={19} /></div><Milestones data={data} weekly={weekly} onToggle={toggleMilestone} /><form className="creator-add-row compact" onSubmit={addMilestone}><input value={customMilestone} onChange={(event) => setCustomMilestone(event.target.value)} placeholder="添加自己的里程碑" maxLength="60" /><button type="submit" aria-label="添加里程碑"><Plus size={16} /></button></form></article><article className="creator-card"><div className="creator-card-head"><div><h3>拆解积累</h3><p>来自“拆解学习”中的完成并归档。</p></div><Sparkles size={19} /></div><div className="creator-breakdown-total"><b>{archives.length}</b><span>条已归档拆解</span></div><h4>叙事类型分布</h4>{Object.keys(structureCounts).length ? <div className="creator-structure-list">{Object.entries(structureCounts).sort((a, b) => b[1] - a[1]).map(([label, count]) => <div key={label}><span>{label}</span><b>{count}</b></div>)}</div> : <Empty copy="归档一条拆解后，这里会显示你常研究的叙事类型。" />}</article></section>
      </section>}
    </section>
  );
}

function GoalCard({ period, counts, onPeriodChange }) {
  return <article className="creator-goal-card"><div className="creator-goal-heading"><div><h3>创作成果</h3></div><div className="creator-goal-tabs" role="tablist" aria-label="目标周期">{[['week', '本周'], ['month', '本月'], ['quarter', '本季度']].map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={period === value} className={period === value ? 'active' : ''} onClick={() => onPeriodChange(value)}>{label}</button>)}</div></div><div className="creator-goal-stat-grid">{TYPES.map((type) => <section className={`creator-goal-stat ${type.id}`} key={type.id}><span>{type.short}</span><b>{counts[type.id]}</b></section>)}</div></article>;
}

function WeeklyBars({ events }) {
  const today = new Date();
  const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7)); monday.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(monday); date.setDate(monday.getDate() + index); return date; });
  const dayCounts = days.map((day) => TYPES.reduce((counts, type) => ({ ...counts, [type.id]: events.filter((event) => event.date === dateKey(day) && event.type === type.id).length }), {}));
  const max = Math.max(1, ...dayCounts.map((counts) => TYPES.reduce((sum, type) => sum + counts[type.id], 0)));
  return <><div className="creator-bars">{days.map((day, index) => { const counts = dayCounts[index]; const total = TYPES.reduce((sum, type) => sum + counts[type.id], 0); return <div className="creator-bar-column" key={dateKey(day)}><span className="creator-bar-count">{total || ''}</span><div className="creator-bar-track">{TYPES.map((type) => counts[type.id] ? <i key={type.id} style={{ height: `${Math.max(8, counts[type.id] / max * 100)}%`, background: type.color }} /> : null)}</div><small>周{['一','二','三','四','五','六','日'][index]}</small></div>; })}</div><div className="creator-chart-legend">{TYPES.map((type) => <span key={type.id}><i style={{ background: type.color }} />{type.label}</span>)}</div></>;
}

function Heatmap({ events }) {
  const days = Array.from({ length: 30 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - (29 - index)); return dateKey(date); });
  const firstDay = new Date(`${days[0]}T00:00:00`).getDay();
  const leadingBlanks = (firstDay + 6) % 7;
  return <div className="creator-heat-main"><div className="creator-heat-calendar"><div className="creator-heat-weekdays" aria-hidden="true">{['一', '二', '三', '四', '五', '六', '日'].map((day) => <span key={day}>{day}</span>)}</div><div className="creator-heatmap">{Array.from({ length: leadingBlanks }, (_, index) => <span className="creator-heat blank" key={`blank-${index}`} />)}{days.map((day) => <span className={`creator-heat ${metricForDay(events, day)}`} key={day} title={`${formatDay(day)} · ${metricForDay(events, day) === 'none' ? '无创作' : TYPES.find((type) => type.id === metricForDay(events, day))?.label}`} />)}</div></div><div className="creator-heat-legend"><span><i className="none" />无创作</span>{TYPES.map((type) => <span key={type.id}><i className={type.id} />{type.label}</span>)}</div></div>;
}

function ActivityRadar({ events, onAddActivity }) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  const start = dateKey(thirtyDaysAgo);
  const count = (type) => events.filter((event) => event.type === type && event.date >= start).length;
  const values = [
    { key: 'input', label: '输入', value: count('input'), target: 30 },
    { key: 'video', label: '视频生产', value: count('video'), target: 4 },
    { key: 'retrospective', label: '复盘沉淀', value: count('retrospective'), target: 8 },
  ].map((item) => ({ ...item, score: Math.min(1, item.value / item.target) }));
  const center = { x: 100, y: 90 };
  const radius = 76;
  const point = (index, scale) => {
    const angle = -Math.PI / 2 + index * (Math.PI * 2 / 3);
    return `${center.x + Math.cos(angle) * radius * scale},${center.y + Math.sin(angle) * radius * scale}`;
  };
  const polygon = (scale) => values.map((_, index) => point(index, scale)).join(' ');
  const dataPolygon = values.map((item, index) => point(index, item.score)).join(' ');
  return <section className="creator-radar" aria-label="30 天创作能力雷达图"><svg viewBox="0 0 200 176" role="img" aria-label="输入、视频生产、复盘沉淀的三轴雷达图"><polygon className="creator-radar-grid" points={polygon(1)} /><polygon className="creator-radar-grid" points={polygon(.66)} /><polygon className="creator-radar-grid" points={polygon(.33)} />{values.map((_, index) => <line className="creator-radar-axis" key={index} x1={center.x} y1={center.y} x2={point(index, 1).split(',')[0]} y2={point(index, 1).split(',')[1]} />)}<polygon className="creator-radar-data" points={dataPolygon} />{values.map((item, index) => { const [x, y] = point(index, item.score).split(','); return <circle className="creator-radar-dot" key={item.key} cx={x} cy={y} r="3" />; })}<text x="100" y="10" textAnchor="middle">输入</text><text x="178" y="166" textAnchor="middle">视频生产</text><text x="22" y="166" textAnchor="middle">复盘沉淀</text></svg><aside className="creator-radar-side"><div className="creator-radar-values">{values.map((item) => <span key={item.key}>{item.label}<b>{item.value}</b></span>)}</div><div className="creator-radar-actions"><button type="button" onClick={() => onAddActivity('input')}>＋ 记录输入</button><button type="button" onClick={() => onAddActivity('retrospective')}>＋ 记录复盘</button></div></aside></section>;
}

function ProjectCard({ project, onToggle, onAddTask, onUpdateTask, onRemoveTask, onUpdateRecord, onCopy }) {
  const [taskDraft, setTaskDraft] = React.useState('');
  const [taskType, setTaskType] = React.useState('general');
  const [recordOpen, setRecordOpen] = React.useState(false);
  const done = project.tasks.filter((task) => task.done).length;
  const percent = project.tasks.length ? Math.round(done / project.tasks.length * 100) : 0;
  const updateRecord = (name, value) => onUpdateRecord(project.id, { [name]: value });
  return <article className="creator-project"><div className="creator-project-title"><div><h4>{project.title}</h4><span>{project.status}</span></div><button type="button" title="复制项目 Markdown" onClick={onCopy}><Copy size={15} /></button></div><div className="creator-project-progress"><span><i style={{ width: `${percent}%` }} /></span><b>{percent}%</b></div><div className="creator-task-list">{project.tasks.map((task) => <div key={task.id} className={task.done ? 'done' : ''}><label><input type="checkbox" checked={task.done} onChange={() => onToggle(project.id, task.id)} /><input value={task.title} onChange={(event) => onUpdateTask(project.id, task.id, event.target.value)} aria-label="待办内容" />{task.type !== 'general' && <em>{TYPES.find((type) => type.id === task.type)?.short}</em>}</label><button className="creator-task-delete" type="button" aria-label={`删除 ${task.title}`} onClick={() => onRemoveTask(project.id, task.id)}>×</button></div>)}</div><form className="creator-inline-task" onSubmit={(event) => { event.preventDefault(); onAddTask(project.id, taskDraft, taskType); setTaskDraft(''); }}><input value={taskDraft} onChange={(event) => setTaskDraft(event.target.value)} placeholder="添加待办" /><select value={taskType} onChange={(event) => setTaskType(event.target.value)}><option value="general">普通待办</option>{TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}（自动统计）</option>)}</select><button type="submit"><Plus size={13} /></button></form><button className="creator-record-toggle" type="button" onClick={() => setRecordOpen(!recordOpen)}>创作记录台账 {recordOpen ? '收起' : '展开'}</button>{recordOpen && <div className="creator-record-grid"><input value={project.record?.shots || ''} onChange={(event) => updateRecord('shots', event.target.value)} placeholder="镜数，例如 10 镜" /><input value={project.record?.duration || ''} onChange={(event) => updateRecord('duration', event.target.value)} placeholder="时长，例如 15s" /><input value={project.record?.tools || ''} onChange={(event) => updateRecord('tools', event.target.value)} placeholder="使用工具" /><textarea value={project.record?.problems || ''} onChange={(event) => updateRecord('problems', event.target.value)} placeholder="遇到的问题" /><textarea value={project.record?.notes || ''} onChange={(event) => updateRecord('notes', event.target.value)} placeholder="心得笔记" /></div>}</article>;
}

function PromptCard({ prompt, projects, onCopy, onDelete }) {
  const project = projects.find((item) => item.id === prompt.projectId);
  return <article className="creator-prompt"><div><b>{prompt.category || '未分类'}</b>{(prompt.tags || []).map((tag) => <span key={tag}>#{tag}</span>)}</div><p>{prompt.body}</p>{(project || prompt.reference) && <small>{project ? `关联：${project.title}` : ''}{project && prompt.reference ? ' · ' : ''}{prompt.reference ? '含参考链接' : ''}</small>}<footer><button type="button" onClick={onCopy}><Copy size={14} />复制</button><button type="button" className="delete" onClick={onDelete}><Trash2 size={14} />删除</button></footer></article>;
}

function Milestones({ data, weekly, onToggle }) {
  const automatic = [
    { id: 'first-video', title: '完成第一个 AI 视频成片', done: data.events.some((event) => event.type === 'video') },
    { id: 'five-scripts', title: '完成 5 个脚本', done: data.events.filter((event) => event.type === 'script').length >= 5 },
    { id: 'week-flow', title: '本周完成 3 次创作推进', done: Object.values(weekly).reduce((sum, value) => sum + value, 0) >= 3 },
  ];
  return <div className="creator-milestones">{automatic.concat(data.milestones).map((item) => <button key={item.id} type="button" className={item.done ? 'lit' : ''} onClick={() => item.custom && onToggle(item.id)} title={item.custom ? '点击点亮或取消点亮' : '由创作数据自动点亮'}><span>{item.done ? <Check size={14} /> : '○'}</span>{item.title}</button>)}</div>;
}

function Empty({ copy }) { return <p className="creator-empty">{copy}</p>; }
