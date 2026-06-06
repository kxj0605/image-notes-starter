import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  CalendarDays,
  CheckCircle2,
  Database,
  Github,
  LayoutDashboard,
  ListTodo,
  LogIn,
  LogOut,
  NotebookPen,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from './supabaseClient';
import './styles.css';

const pages = {
  home: 'home',
  login: 'login',
  register: 'register',
  workspace: 'workspace',
  publicNotes: 'publicNotes',
};

const tabs = {
  dashboard: 'dashboard',
  notes: 'notes',
  tasks: 'tasks',
  calendar: 'calendar',
  matrix: 'matrix',
  profile: 'profile',
};

const matrixOptions = [
  { value: 'important_urgent', label: '重要紧急', hint: '马上处理' },
  { value: 'important_not_urgent', label: '重要不紧急', hint: '计划推进' },
  { value: 'urgent_not_important', label: '紧急不重要', hint: '尽量压缩' },
  { value: 'not_urgent_not_important', label: '不紧急不重要', hint: '有空再做' },
];

const statusOptions = [
  { value: 'not_started', label: '待开始' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'stalled', label: '已停滞' },
];

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getRelativeDate(offsetDays) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function makeNickname(email = '') {
  const prefix = email.split('@')[0] || '用户';
  const number = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${number}`;
}

function formatDate(dateString) {
  if (!dateString) return '未设置';
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(timeString) {
  if (!timeString) return '';
  return timeString.slice(0, 5);
}

function getLabel(options, value) {
  return options.find((item) => item.value === value)?.label ?? value;
}

function App() {
  const [currentPage, setCurrentPage] = React.useState(pages.home);
  const [workspaceTab, setWorkspaceTab] = React.useState(tabs.dashboard);
  const [session, setSession] = React.useState(null);
  const [profile, setProfile] = React.useState(null);
  const [authReady, setAuthReady] = React.useState(false);

  React.useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return undefined;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) setCurrentPage(pages.workspace);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  React.useEffect(() => {
    async function loadProfile() {
      if (!session || !supabase) {
        setProfile(null);
        return;
      }

      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
      if (data) {
        setProfile(data);
        return;
      }

      const nickname = makeNickname(session.user.email);
      const { data: createdProfile } = await supabase
        .from('profiles')
        .insert({ id: session.user.id, nickname })
        .select('*')
        .single();
      setProfile(createdProfile ?? { id: session.user.id, nickname });
    }

    loadProfile();
  }, [session]);

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setCurrentPage(pages.home);
  }

  return (
    <main className="app-shell">
      <nav className="top-nav" aria-label="主导航">
        <button className="brand" onClick={() => setCurrentPage(pages.home)}>
          <span className="brand-mark">
            <NotebookPen size={20} />
          </span>
          <span>日程笔记</span>
        </button>

        <div className="nav-actions">
          {currentPage === pages.publicNotes && session ? (
            <button
              className="text-button"
              onClick={() => {
                setWorkspaceTab(tabs.dashboard);
                setCurrentPage(pages.workspace);
              }}
            >
              返回私人工作台
            </button>
          ) : (
            <button className="text-button" onClick={() => setCurrentPage(pages.publicNotes)}>
              公开笔记
            </button>
          )}
          <a
            className="icon-button"
            href="https://github.com/kxj0605/image-notes-starter"
            aria-label="GitHub 代码"
            target="_blank"
            rel="noreferrer"
          >
            <Github size={18} />
          </a>

          {session ? (
            <>
              <button
                className="text-button user-pill"
                onClick={() => {
                  setWorkspaceTab(tabs.profile);
                  setCurrentPage(pages.workspace);
                }}
              >
                {profile?.nickname ?? session.user.email}
              </button>
              <button className="primary-button" onClick={handleSignOut}>
                <LogOut size={17} />
                退出
              </button>
            </>
          ) : (
            <>
              <button className="text-button" onClick={() => setCurrentPage(pages.login)}>
                <LogIn size={17} />
                登录
              </button>
              <button className="primary-button" onClick={() => setCurrentPage(pages.register)}>
                <UserPlus size={17} />
                注册
              </button>
            </>
          )}
        </div>
      </nav>

      {currentPage === pages.home && (
        <HomePage
          authReady={authReady}
          session={session}
          onLogin={() => setCurrentPage(pages.login)}
          onRegister={() => setCurrentPage(pages.register)}
          onWorkspace={() => {
            setWorkspaceTab(tabs.dashboard);
            setCurrentPage(pages.workspace);
          }}
          onPublicNotes={() => setCurrentPage(pages.publicNotes)}
        />
      )}
      {currentPage === pages.login && (
        <LoginPage
          onRegister={() => setCurrentPage(pages.register)}
          onDone={() => {
            setWorkspaceTab(tabs.dashboard);
            setCurrentPage(pages.workspace);
          }}
        />
      )}
      {currentPage === pages.register && (
        <RegisterPage
          onLogin={() => setCurrentPage(pages.login)}
          onDone={() => {
            setWorkspaceTab(tabs.dashboard);
            setCurrentPage(pages.workspace);
          }}
        />
      )}
      {currentPage === pages.publicNotes && <PublicNotesPage session={session} profile={profile} onLogin={() => setCurrentPage(pages.login)} />}
      {currentPage === pages.workspace && (
        <WorkspacePage
          session={session}
          profile={profile}
          initialTab={workspaceTab}
          onProfileChange={setProfile}
          onLogin={() => setCurrentPage(pages.login)}
        />
      )}
    </main>
  );
}

function HomePage({ authReady, session, onLogin, onRegister, onWorkspace, onPublicNotes }) {
  return (
    <section className="home-grid">
      <div className="hero-copy">
        <p className="eyebrow">个人记录与任务管理工具</p>
        <h1>把笔记、任务和日程放在同一个地方</h1>
        <p className="hero-text">
          写下想法，安排每天要做的事；任务可以按四象限管理，笔记可以私密保存或公开分享。
        </p>

        <div className="privacy-note">
          <ShieldCheck size={18} />
          <span>私密笔记和任务只有你自己能看到，公开笔记会显示在公开笔记页。</span>
        </div>

        <div className="hero-actions">
          {session ? (
            <button className="primary-button large" onClick={onWorkspace}>
              <LayoutDashboard size={18} />
              进入我的工作台
            </button>
          ) : (
            <button className="primary-button large" onClick={onRegister}>
              <UserPlus size={18} />
              注册账号
            </button>
          )}
          <button className="text-button large" onClick={session ? onPublicNotes : onLogin}>
            {session ? '查看公开笔记' : '登录'}
          </button>
        </div>

        <p className="auth-state">{authReady ? (session ? '当前已登录' : '当前未登录') : '正在检查登录状态...'}</p>
      </div>

      <div className="tool-preview" aria-label="工具预览">
        <div className="preview-card note-preview">
          <span className="tag">私密</span>
          <h2>今天的想法</h2>
          <p>把资料、灵感和日常记录在一个地方。</p>
        </div>
        <div className="mini-calendar">
          {['一', '二', '三', '四', '五', '六', '日'].map((day) => (
            <span className="calendar-head" key={day}>
              {day}
            </span>
          ))}
          {Array.from({ length: 14 }, (_, index) => (
            <span className={index === 8 ? 'calendar-day active' : 'calendar-day'} key={index}>
              {index + 1}
            </span>
          ))}
        </div>
        <div className="matrix-preview">
          {matrixOptions.map((item) => (
            <div key={item.value}>
              <strong>{item.label}</strong>
              <span>{item.hint}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LoginPage({ onRegister, onDone }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');

    if (!isSupabaseConfigured) {
      setMessage('Supabase 还没有配置好。');
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);

    if (error) {
      setMessage('邮箱或密码不正确，请检查后再试。');
      return;
    }

    onDone();
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">登录</p>
        <h1>登录日程笔记</h1>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label htmlFor="login-email">邮箱</label>
          <input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <label htmlFor="login-password">密码</label>
          <input
            id="login-password"
            type="password"
            placeholder="请输入密码"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button className="primary-button large" type="submit" disabled={isLoading}>
            <LogIn size={18} />
            {isLoading ? '登录中...' : '登录'}
          </button>
        </form>
        {message && <p className="form-message">{message}</p>}
        <button className="link-button" onClick={onRegister}>
          还没有账号，去注册
        </button>
      </div>
    </section>
  );
}

function RegisterPage({ onLogin, onDone }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');

    if (!isSupabaseConfigured) {
      setMessage('Supabase 还没有配置好。');
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setIsLoading(false);

    if (error) {
      setMessage(`注册失败：${error.message}`);
      return;
    }

    if (data.session) {
      onDone();
      return;
    }

    setMessage('注册成功。请去邮箱确认账号，然后回来登录。');
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">注册</p>
        <h1>创建账号</h1>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label htmlFor="register-email">邮箱</label>
          <input
            id="register-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <label htmlFor="register-password">密码</label>
          <input
            id="register-password"
            type="password"
            placeholder="至少 6 位"
            value={password}
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button className="primary-button large" type="submit" disabled={isLoading}>
            <UserPlus size={18} />
            {isLoading ? '注册中...' : '注册'}
          </button>
        </form>
        {message && <p className="form-message">{message}</p>}
        <button className="link-button" onClick={onLogin}>
          已经有账号，去登录
        </button>
      </div>
    </section>
  );
}

function WorkspacePage({ session, profile, initialTab, onProfileChange, onLogin }) {
  const [activeTab, setActiveTab] = React.useState(initialTab);
  const [notes, setNotes] = React.useState([]);
  const [tasks, setTasks] = React.useState([]);
  const [message, setMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const loadData = React.useCallback(async () => {
    if (!session || !supabase) return;

    setIsLoading(true);
    const [{ data: noteData, error: noteError }, { data: taskData, error: taskError }] = await Promise.all([
      supabase.from('notes').select('id, user_id, title, content, visibility, created_at').order('created_at', {
        ascending: false,
      }),
      supabase.from('tasks').select('*').order('task_date', { ascending: true }).order('created_at', { ascending: true }),
    ]);
    setIsLoading(false);

    if (noteError || taskError) {
      setMessage(`读取数据失败：${noteError?.message ?? taskError?.message}`);
      return;
    }

    setNotes(noteData ?? []);
    setTasks((taskData ?? []).sort(sortTasks));
  }, [session]);

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  if (!session) {
    return (
      <section className="auth-page">
        <div className="auth-card">
          <p className="eyebrow">需要登录</p>
          <h1>先登录，再进入工作台</h1>
          <p className="form-message">工作台会保存你的笔记和任务。</p>
          <button className="primary-button large" onClick={onLogin}>
            <LogIn size={18} />
            去登录
          </button>
        </div>
      </section>
    );
  }

  const today = getToday();
  const todayTasks = tasks.filter((task) => task.task_date === today);
  const overdueTasks = tasks.filter(isTaskOverdue);
  const unfinishedTasks = tasks.filter((task) => task.status !== 'completed');

  return (
    <section className="workspace-page">
      <div className="workspace-heading">
        <div>
          <div className="workspace-kicker">
            <p className="workspace-private-label">
              <span className="workspace-private-title">私人工作台</span>
              <span className="workspace-private-desc">：仅自己可见，只有公开笔记是对外展示。</span>
            </p>
          </div>
          <h1>你好，{profile?.nickname ?? session.user.email}</h1>
          <p className="auth-state">今日 {todayTasks.length} 项，已逾期 {overdueTasks.length} 项，未完成 {unfinishedTasks.length} 项</p>
        </div>
        <div className="metric-row">
          <Metric label="笔记" value={notes.length} />
          <Metric label="任务" value={tasks.length} />
          <Metric label="公开笔记" value={notes.filter((note) => note.visibility === 'public').length} />
        </div>
      </div>

      <div className="tab-bar">
        <TabButton icon={LayoutDashboard} label="仪表盘" value={tabs.dashboard} activeTab={activeTab} onClick={setActiveTab} />
        <TabButton icon={NotebookPen} label="笔记" value={tabs.notes} activeTab={activeTab} onClick={setActiveTab} />
        <TabButton icon={ListTodo} label="任务" value={tabs.tasks} activeTab={activeTab} onClick={setActiveTab} />
        <TabButton icon={CalendarDays} label="日历" value={tabs.calendar} activeTab={activeTab} onClick={setActiveTab} />
        <TabButton icon={Database} label="四象限" value={tabs.matrix} activeTab={activeTab} onClick={setActiveTab} />
      </div>

      {message && <p className="form-message global-message">{message}</p>}
      {isLoading && <p className="form-message global-message">正在读取数据...</p>}

      {activeTab === tabs.dashboard && <Dashboard notes={notes} tasks={tasks} />}
      {activeTab === tabs.notes && (
        <NotesPanel session={session} notes={notes} setNotes={setNotes} setMessage={setMessage} />
      )}
      {activeTab === tabs.tasks && (
        <TasksPanel session={session} tasks={tasks} setTasks={setTasks} setMessage={setMessage} />
      )}
      {activeTab === tabs.calendar && (
        <CalendarPanel tasks={tasks} onStatusChange={(task, status) => updateTaskStatus(task, status, setTasks, setMessage)} />
      )}
      {activeTab === tabs.matrix && (
        <MatrixPanel tasks={tasks} setTasks={setTasks} setMessage={setMessage} />
      )}
      {activeTab === tabs.profile && (
        <ProfilePanel session={session} profile={profile} onProfileChange={onProfileChange} setMessage={setMessage} />
      )}
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function TabButton({ icon: Icon, label, value, activeTab, onClick }) {
  return (
    <button className={activeTab === value ? 'tab-button active' : 'tab-button'} onClick={() => onClick(value)}>
      <Icon size={17} />
      {label}
    </button>
  );
}

function Dashboard({ notes, tasks }) {
  const today = getToday();
  const todayTasks = tasks.filter((task) => task.task_date === today);
  const overdueTasks = tasks.filter(isTaskOverdue);
  const importantUrgent = tasks.filter((task) => task.matrix_category === 'important_urgent');
  const stalledImportant = tasks.filter(
    (task) => task.matrix_category === 'important_urgent' && task.status === 'stalled',
  );

  return (
    <div className="dashboard-grid">
      <InfoCard title="今日安排" items={todayTasks} emptyText="今天还没有任务，可以先添加一个今天要做的事。" />
      <InfoCard title="已逾期" items={overdueTasks} emptyText="没有逾期任务，状态不错。" />
      <InfoCard title="重点任务" items={importantUrgent} emptyText="暂时没有重要紧急任务，可以先安心处理计划内的事。" />
      <div className="panel-card">
        <h2>进展概览</h2>
        {statusOptions.map((status) => (
          <ProgressRow
            key={status.value}
            label={status.label}
            value={tasks.filter((task) => task.status === status.value).length}
            total={Math.max(tasks.length, 1)}
          />
        ))}
      </div>
      <div className="panel-card">
        <h2>概览</h2>
        <div className="summary-list">
          <span>我的笔记：{notes.length}</span>
          <span>公开笔记：{notes.filter((note) => note.visibility === 'public').length}</span>
          <span>已逾期任务：{overdueTasks.length}</span>
          <span>高风险任务：{stalledImportant.length}</span>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, items, emptyText }) {
  return (
    <div className="panel-card">
      <h2>{title}</h2>
      {items.length === 0 ? (
        <p className="muted-text">{emptyText}</p>
      ) : (
        <div className="compact-list">
          {items.slice(0, 5).map((task) => (
            <span key={task.id}>
              {task.title}
              <small className={isTaskOverdue(task) ? 'text-overdue' : ''}>{getTaskTimingInfo(task).label}</small>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ProgressRow({ label, value, total }) {
  return (
    <div className="progress-row">
      <span>
        {label}
        <strong>{value}</strong>
      </span>
      <div className="progress-track">
        <div style={{ width: `${Math.min(100, (value / total) * 100)}%` }} />
      </div>
    </div>
  );
}

function NotesPanel({ session, notes, setNotes, setMessage }) {
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [visibility, setVisibility] = React.useState('private');
  const [editingNoteId, setEditingNoteId] = React.useState(null);
  const [confirmingDeleteNoteId, setConfirmingDeleteNoteId] = React.useState(null);
  const [editForm, setEditForm] = React.useState({ title: '', content: '', visibility: 'private' });
  const [isSaving, setIsSaving] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);

  function startEditNote(note) {
    setEditingNoteId(note.id);
    setConfirmingDeleteNoteId(null);
    setEditForm({
      title: note.title,
      content: note.content ?? '',
      visibility: note.visibility,
    });
    setMessage('');
  }

  function cancelEditNote() {
    setEditingNoteId(null);
    setEditForm({ title: '', content: '', visibility: 'private' });
  }

  function updateEditForm(key, value) {
    setEditForm((currentForm) => ({ ...currentForm, [key]: value }));
  }

  async function handleCreateNote(event) {
    event.preventDefault();
    setMessage('');

    if (!title.trim() && !content.trim()) {
      setMessage('标题和正文不能同时为空。');
      return;
    }

    setIsSaving(true);
    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: session.user.id,
        title: title.trim() || '未命名笔记',
        content,
        visibility,
      })
      .select('id, user_id, title, content, visibility, created_at')
      .single();
    setIsSaving(false);

    if (error) {
      setMessage(`保存笔记失败：${error.message}`);
      return;
    }

    setNotes((currentNotes) => [data, ...currentNotes]);
    setTitle('');
    setContent('');
    setVisibility('private');
    setMessage('笔记已保存。');
  }

  async function handleDeleteNote(note) {
    const { error } = await supabase.from('notes').delete().eq('id', note.id);
    if (error) {
      setMessage(`删除笔记失败：${error.message}`);
      return;
    }
    setNotes((currentNotes) => currentNotes.filter((item) => item.id !== note.id));
    setConfirmingDeleteNoteId(null);
    setMessage('笔记已删除。');
  }

  async function handleUpdateNote(event, note) {
    event.preventDefault();
    setMessage('');

    if (!editForm.title.trim() && !editForm.content.trim()) {
      setMessage('标题和正文不能同时为空。');
      return;
    }

    setIsUpdating(true);
    const { data, error } = await supabase
      .from('notes')
      .update({
        title: editForm.title.trim() || '未命名笔记',
        content: editForm.content,
        visibility: editForm.visibility,
      })
      .eq('id', note.id)
      .select('id, user_id, title, content, visibility, created_at')
      .single();
    setIsUpdating(false);

    if (error) {
      setMessage(`更新笔记失败：${error.message}`);
      return;
    }

    setNotes((currentNotes) => currentNotes.map((item) => (item.id === note.id ? data : item)));
    cancelEditNote();
    setMessage('笔记已更新。');
  }

  return (
    <div className="two-column-layout">
      <form className="panel-card form-stack" onSubmit={handleCreateNote}>
        <h2>新增笔记</h2>
        <label htmlFor="note-title">标题</label>
        <input id="note-title" value={title} onChange={(event) => setTitle(event.target.value)} />
        <label htmlFor="note-content">正文</label>
        <textarea id="note-content" rows={7} value={content} onChange={(event) => setContent(event.target.value)} />
        <label htmlFor="note-visibility">可见性</label>
        <select id="note-visibility" value={visibility} onChange={(event) => setVisibility(event.target.value)}>
          <option value="private">私密</option>
          <option value="public">公开</option>
        </select>
        <p className="field-help">
          私密笔记只在你的工作台显示；公开笔记会显示在公开笔记页，别人也能看到。
        </p>
        <button className="primary-button large" disabled={isSaving}>
          <Plus size={18} />
          {isSaving ? '保存中...' : '保存笔记'}
        </button>
      </form>

      <section className="panel-card">
        <h2>我的笔记</h2>
        {notes.length === 0 ? (
          <EmptyState text="还没有笔记，可以先写一个想法或记录。" />
        ) : (
          <div className="card-list">
            {notes.map((note) => (
              <article className="item-card" key={note.id}>
                {editingNoteId === note.id ? (
                  <form className="form-stack edit-note-form" onSubmit={(event) => handleUpdateNote(event, note)}>
                    <label htmlFor={`edit-note-title-${note.id}`}>标题</label>
                    <input
                      id={`edit-note-title-${note.id}`}
                      value={editForm.title}
                      onChange={(event) => updateEditForm('title', event.target.value)}
                    />
                    <label htmlFor={`edit-note-content-${note.id}`}>正文</label>
                    <textarea
                      id={`edit-note-content-${note.id}`}
                      rows={5}
                      value={editForm.content}
                      onChange={(event) => updateEditForm('content', event.target.value)}
                    />
                    <label htmlFor={`edit-note-visibility-${note.id}`}>可见性</label>
                    <select
                      id={`edit-note-visibility-${note.id}`}
                      value={editForm.visibility}
                      onChange={(event) => updateEditForm('visibility', event.target.value)}
                    >
                      <option value="private">私密</option>
                      <option value="public">公开</option>
                    </select>
                    <div className="form-actions">
                      <button className="primary-button" type="submit" disabled={isUpdating}>
                        <Pencil size={16} />
                        {isUpdating ? '保存中...' : '保存修改'}
                      </button>
                      <button className="text-button" type="button" onClick={cancelEditNote} disabled={isUpdating}>
                        取消
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="item-top">
                      <h3>{note.title}</h3>
                      {confirmingDeleteNoteId === note.id ? (
                        <div className="confirm-delete">
                          <span>确认删除吗？</span>
                          <button className="danger-confirm-button" onClick={() => handleDeleteNote(note)}>
                            删除
                          </button>
                          <button className="cancel-confirm-button" onClick={() => setConfirmingDeleteNoteId(null)}>
                            取消
                          </button>
                        </div>
                      ) : (
                        <div className="item-actions">
                          <button className="small-action-button" onClick={() => startEditNote(note)} aria-label="编辑笔记" title="编辑笔记">
                            <Pencil size={15} />
                          </button>
                          <button className="delete-button" onClick={() => setConfirmingDeleteNoteId(note.id)} aria-label="删除笔记" title="删除笔记">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                    {note.content && <p>{note.content}</p>}
                    <div className="tag-row">
                      <span className={note.visibility === 'public' ? 'tag public' : 'tag'}>{note.visibility === 'public' ? '公开' : '私密'}</span>
                      <span>{new Date(note.created_at).toLocaleString('zh-CN')}</span>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TasksPanel({ session, tasks, setTasks, setMessage }) {
  const [form, setForm] = React.useState({
    title: '',
    description: '',
    task_date: getToday(),
    task_time: '',
    matrix_category: 'important_not_urgent',
    status: 'not_started',
  });
  const [filter, setFilter] = React.useState('all');
  const [isSaving, setIsSaving] = React.useState(false);

  function updateForm(key, value) {
    setForm((currentForm) => ({ ...currentForm, [key]: value }));
  }

  async function handleCreateTask(event) {
    event.preventDefault();
    setMessage('');
    setIsSaving(true);
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...form,
        task_time: form.task_time || null,
        user_id: session.user.id,
      })
      .select('*')
      .single();
    setIsSaving(false);

    if (error) {
      setMessage(`保存任务失败：${error.message}`);
      return;
    }

    setTasks((currentTasks) => [...currentTasks, data].sort(sortTasks));
    setForm({
      title: '',
      description: '',
      task_date: getToday(),
      task_time: '',
      matrix_category: 'important_not_urgent',
      status: 'not_started',
    });
    setMessage('任务已保存。');
  }

  const visibleTasks = filterTasks(tasks, filter);

  return (
    <div className="two-column-layout">
      <form className="panel-card form-stack" onSubmit={handleCreateTask}>
        <h2>新增任务</h2>
        <label htmlFor="task-title">任务标题</label>
        <input id="task-title" value={form.title} onChange={(event) => updateForm('title', event.target.value)} required />
        <label htmlFor="task-description">备注</label>
        <textarea
          id="task-description"
          rows={4}
          value={form.description}
          onChange={(event) => updateForm('description', event.target.value)}
        />
        <div className="form-grid">
          <label>
            重要紧急程度
            <select id="task-matrix" value={form.matrix_category} onChange={(event) => updateForm('matrix_category', event.target.value)}>
              {matrixOptions.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            进展状态
            <select id="task-status" value={form.status} onChange={(event) => updateForm('status', event.target.value)}>
              {statusOptions.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-grid">
          <label>
            日期
            <input type="date" value={form.task_date} onChange={(event) => updateForm('task_date', event.target.value)} required />
          </label>
          <label>
            时间
            <input type="time" value={form.task_time} onChange={(event) => updateForm('task_time', event.target.value)} />
          </label>
        </div>
        <div className="quick-date-row" aria-label="快捷日期">
          <button type="button" onClick={() => updateForm('task_date', getRelativeDate(0))}>
            今天
          </button>
          <button type="button" onClick={() => updateForm('task_date', getRelativeDate(1))}>
            明天
          </button>
          <button type="button" onClick={() => updateForm('task_date', getRelativeDate(2))}>
            后天
          </button>
        </div>
        <button className="primary-button large" disabled={isSaving}>
          <Plus size={18} />
          {isSaving ? '保存中...' : '保存任务'}
        </button>
      </form>

      <section className="panel-card">
        <div className="panel-heading-row">
          <h2>任务列表</h2>
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">全部</option>
            <option value="today">今日</option>
            <option value="overdue">已逾期</option>
            <option value="unfinished">未完成</option>
            <option value="completed">已完成</option>
            <option value="in_progress">进行中</option>
            <option value="not_started">待开始</option>
            <option value="stalled">已停滞</option>
            <option value="important_urgent">重要紧急</option>
          </select>
        </div>
        <TaskList tasks={visibleTasks} setTasks={setTasks} setMessage={setMessage} />
      </section>
    </div>
  );
}

function TaskList({ tasks, setTasks, setMessage }) {
  if (tasks.length === 0) return <EmptyState text="当前筛选下没有任务，可以切换筛选或新增一条任务。" />;

  return (
    <div className="card-list">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} setTasks={setTasks} setMessage={setMessage} />
      ))}
    </div>
  );
}

function TaskCard({ task, setTasks, setMessage, compact = false }) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
    title: task.title,
    description: task.description ?? '',
    task_date: task.task_date,
    task_time: task.task_time ?? '',
    matrix_category: task.matrix_category,
    status: task.status,
  });
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);

  React.useEffect(() => {
    if (!isEditing) {
      setEditForm({
        title: task.title,
        description: task.description ?? '',
        task_date: task.task_date,
        task_time: task.task_time ?? '',
        matrix_category: task.matrix_category,
        status: task.status,
      });
    }
  }, [isEditing, task]);

  function updateEditForm(key, value) {
    setEditForm((currentForm) => ({ ...currentForm, [key]: value }));
  }

  function cancelEditTask() {
    setIsEditing(false);
    setEditForm({
      title: task.title,
      description: task.description ?? '',
      task_date: task.task_date,
      task_time: task.task_time ?? '',
      matrix_category: task.matrix_category,
      status: task.status,
    });
  }

  async function handleStatusChange(status) {
    await updateTaskStatus(task, status, setTasks, setMessage);
  }

  async function handleMatrixChange(matrixCategory) {
    const { error } = await supabase.from('tasks').update({ matrix_category: matrixCategory }).eq('id', task.id);
    if (error) {
      setMessage?.(`更新任务失败：${error.message}`);
      return;
    }
    setTasks?.((currentTasks) =>
      currentTasks.map((item) => (item.id === task.id ? { ...item, matrix_category: matrixCategory } : item)),
    );
    setMessage?.('任务分类已更新。');
  }

  async function handleDeleteTask() {
    const { error } = await supabase.from('tasks').delete().eq('id', task.id);
    if (error) {
      setMessage?.(`删除任务失败：${error.message}`);
      return;
    }
    setTasks?.((currentTasks) => currentTasks.filter((item) => item.id !== task.id));
    setMessage?.('任务已删除。');
  }

  async function handleUpdateTask(event) {
    event.preventDefault();
    setMessage?.('');

    if (!editForm.title.trim()) {
      setMessage?.('任务标题不能为空。');
      return;
    }

    setIsUpdating(true);
    const { data, error } = await supabase
      .from('tasks')
      .update({
        ...editForm,
        title: editForm.title.trim(),
        task_time: editForm.task_time || null,
      })
      .eq('id', task.id)
      .select('*')
      .single();
    setIsUpdating(false);

    if (error) {
      setMessage?.(`更新任务失败：${error.message}`);
      return;
    }

    setTasks?.((currentTasks) =>
      currentTasks.map((item) => (item.id === task.id ? data : item)).sort(sortTasks),
    );
    setIsEditing(false);
    setMessage?.('任务已更新。');
  }

  const timingInfo = getTaskTimingInfo(task);

  return (
    <article className={[task.status === 'completed' ? 'item-card completed' : 'item-card', isTaskOverdue(task) ? 'task-overdue' : ''].filter(Boolean).join(' ')}>
      {isEditing ? (
        <form className="form-stack edit-task-form" onSubmit={handleUpdateTask}>
          <label htmlFor={`edit-task-title-${task.id}`}>任务标题</label>
          <input
            id={`edit-task-title-${task.id}`}
            value={editForm.title}
            onChange={(event) => updateEditForm('title', event.target.value)}
            required
          />
          <label htmlFor={`edit-task-description-${task.id}`}>备注</label>
          <textarea
            id={`edit-task-description-${task.id}`}
            rows={4}
            value={editForm.description}
            onChange={(event) => updateEditForm('description', event.target.value)}
          />
          <div className="form-grid">
            <label>
              重要紧急程度
              <select
                id={`edit-task-matrix-${task.id}`}
                value={editForm.matrix_category}
                onChange={(event) => updateEditForm('matrix_category', event.target.value)}
              >
                {matrixOptions.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              进展状态
              <select
                id={`edit-task-status-${task.id}`}
                value={editForm.status}
                onChange={(event) => updateEditForm('status', event.target.value)}
              >
                {statusOptions.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-grid">
            <label>
              日期
              <input
                type="date"
                value={editForm.task_date}
                onChange={(event) => updateEditForm('task_date', event.target.value)}
                required
              />
            </label>
            <label>
              时间
              <input type="time" value={editForm.task_time} onChange={(event) => updateEditForm('task_time', event.target.value)} />
            </label>
          </div>
          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={isUpdating}>
              <Pencil size={16} />
              {isUpdating ? '保存中...' : '保存修改'}
            </button>
            <button className="text-button" type="button" onClick={cancelEditTask} disabled={isUpdating}>
              取消
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="item-top">
            <h3>{task.title}</h3>
            {!compact && (
              isConfirmingDelete ? (
                <div className="confirm-delete">
                  <span>确认删除吗？</span>
                  <button className="danger-confirm-button" onClick={handleDeleteTask}>
                    删除
                  </button>
                  <button className="cancel-confirm-button" onClick={() => setIsConfirmingDelete(false)}>
                    取消
                  </button>
                </div>
              ) : (
                <div className="item-actions">
                  <button
                    className="small-action-button"
                    onClick={() => {
                      setIsEditing(true);
                      setIsConfirmingDelete(false);
                    }}
                    aria-label="编辑任务"
                    title="编辑任务"
                  >
                    <Pencil size={15} />
                  </button>
                  <button className="delete-button" onClick={() => setIsConfirmingDelete(true)} aria-label="删除任务" title="删除任务">
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            )}
          </div>
          {task.description && <p>{task.description}</p>}
          <div className="tag-row">
            <span className={timingInfo.className}>{timingInfo.label}</span>
            <span className={`tag matrix-tag matrix-${task.matrix_category}`}>{getLabel(matrixOptions, task.matrix_category)}</span>
            <span className={`tag status-${task.status}`}>{getLabel(statusOptions, task.status)}</span>
          </div>
          {!compact && (
            <div className="inline-controls">
              <select value={task.status} onChange={(event) => handleStatusChange(event.target.value)}>
                {statusOptions.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select value={task.matrix_category} onChange={(event) => handleMatrixChange(event.target.value)}>
                {matrixOptions.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}
    </article>
  );
}

async function updateTaskStatus(task, status, setTasks, setMessage) {
  const { error } = await supabase.from('tasks').update({ status }).eq('id', task.id);
  if (error) {
    setMessage?.(`更新任务失败：${error.message}`);
    return;
  }
  setTasks?.((currentTasks) => currentTasks.map((item) => (item.id === task.id ? { ...item, status } : item)).sort(sortTasks));
  setMessage?.('任务状态已更新。');
}

function CalendarPanel({ tasks, onStatusChange }) {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState(getToday());
  const monthDays = getMonthDays(currentDate);
  const selectedTasks = tasks.filter((task) => task.task_date === selectedDate);

  function shiftMonth(delta) {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  }

  return (
    <div className="calendar-layout">
      <section className="panel-card">
        <div className="panel-heading-row">
          <button className="text-button" onClick={() => shiftMonth(-1)}>上个月</button>
          <h2>{currentDate.getFullYear()} 年 {currentDate.getMonth() + 1} 月</h2>
          <button className="text-button" onClick={() => shiftMonth(1)}>下个月</button>
        </div>
        <div className="calendar-grid">
          {['一', '二', '三', '四', '五', '六', '日'].map((day) => (
            <span className="calendar-head" key={day}>{day}</span>
          ))}
          {monthDays.map((day) => {
            const dayTasks = tasks.filter((task) => task.task_date === day.date);
            return (
              <button
                className={[
                  'calendar-cell',
                  day.isCurrentMonth ? '' : 'muted',
                  day.date === getToday() ? 'today' : '',
                  day.date === selectedDate ? 'selected' : '',
                ].join(' ')}
                key={day.date}
                onClick={() => setSelectedDate(day.date)}
              >
                <strong>{day.dayNumber}</strong>
                {dayTasks.slice(0, 2).map((task) => (
                  <span key={task.id}>{task.title}</span>
                ))}
                {dayTasks.length > 2 && <small>+{dayTasks.length - 2}</small>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel-card">
        <h2>{formatDate(selectedDate)}</h2>
        {selectedTasks.length === 0 ? (
          <EmptyState text="这一天还没有任务，可以回到任务页添加安排。" />
        ) : (
          <div className="card-list">
            {selectedTasks.map((task) => (
              <TaskCard key={task.id} task={task} compact setMessage={() => {}} setTasks={() => {}} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MatrixPanel({ tasks, setTasks, setMessage }) {
  return (
    <div className="matrix-grid">
      {matrixOptions.map((matrix) => {
        const matrixTasks = tasks.filter((task) => task.matrix_category === matrix.value);
        return (
          <section className="panel-card matrix-cell" key={matrix.value}>
            <div className="matrix-heading">
              <div>
                <h2>{matrix.label}</h2>
                <p>{matrix.hint}</p>
              </div>
              <span>{matrixTasks.length}</span>
            </div>
            <TaskList tasks={matrixTasks} setTasks={setTasks} setMessage={setMessage} />
          </section>
        );
      })}
    </div>
  );
}

function ProfilePanel({ session, profile, onProfileChange, setMessage }) {
  const [nickname, setNickname] = React.useState(profile?.nickname ?? '');
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    setNickname(profile?.nickname ?? '');
  }, [profile]);

  async function handleSave(event) {
    event.preventDefault();
    setIsSaving(true);
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: session.user.id, nickname: nickname.trim() || makeNickname(session.user.email) })
      .select('*')
      .single();
    setIsSaving(false);

    if (error) {
      setMessage(`保存昵称失败：${error.message}`);
      return;
    }

    onProfileChange(data);
    setMessage('昵称已更新。');
  }

  return (
    <section className="panel-card profile-panel">
      <h2>个人设置</h2>
      <p className="muted-text">公开笔记会显示昵称，不显示完整邮箱。</p>
      <form className="form-stack" onSubmit={handleSave}>
        <label htmlFor="nickname">昵称</label>
        <input id="nickname" value={nickname} onChange={(event) => setNickname(event.target.value)} />
        <button className="primary-button large" disabled={isSaving}>
          {isSaving ? '保存中...' : '保存昵称'}
        </button>
      </form>
    </section>
  );
}

function PublicNotesPage({ session, profile, onLogin }) {
  const [notes, setNotes] = React.useState([]);
  const [profiles, setProfiles] = React.useState({});
  const [commentsByNote, setCommentsByNote] = React.useState({});
  const [commentsEnabled, setCommentsEnabled] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(true);
  const [message, setMessage] = React.useState('');

  React.useEffect(() => {
    async function loadPublicNotes() {
      if (!supabase) {
        setMessage('Supabase 还没有配置好。');
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('notes')
        .select('id, user_id, title, content, created_at')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });

      if (error) {
        setMessage(`读取公开笔记失败：${error.message}`);
        setIsLoading(false);
        return;
      }

      const publicNotes = data ?? [];
      const noteIds = publicNotes.map((note) => note.id);
      let publicComments = [];

      if (noteIds.length > 0) {
        const { data: commentData, error: commentError } = await supabase
          .from('comments')
          .select('id, note_id, user_id, content, created_at')
          .in('note_id', noteIds)
          .order('created_at', { ascending: true });

        if (commentError) {
          setCommentsEnabled(false);
          setMessage('评论区需要先在 Supabase 创建 comments 表，公开笔记仍然可以正常查看。');
        } else {
          publicComments = commentData ?? [];
          setCommentsEnabled(true);
          setCommentsByNote(
            publicComments.reduce((groups, comment) => {
              groups[comment.note_id] = [...(groups[comment.note_id] ?? []), comment];
              return groups;
            }, {}),
          );
        }
      }

      const userIds = [...new Set([...publicNotes.map((note) => note.user_id), ...publicComments.map((comment) => comment.user_id)])];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase.from('profiles').select('id, nickname').in('id', userIds);
        setProfiles(Object.fromEntries((profileData ?? []).map((profile) => [profile.id, profile.nickname])));
      }

      setNotes(publicNotes);
      setIsLoading(false);
    }

    loadPublicNotes();
  }, []);

  async function handleCreateComment(noteId, content, clearComment) {
    setMessage('');

    if (!session) {
      setMessage('请先登录，再发表评论。');
      return;
    }

    const text = content.trim();
    if (!text) {
      setMessage('评论内容不能为空。');
      return;
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({ note_id: noteId, user_id: session.user.id, content: text })
      .select('id, note_id, user_id, content, created_at')
      .single();

    if (error) {
      setMessage(`发表评论失败：${error.message}`);
      return;
    }

    setProfiles((currentProfiles) => ({
      ...currentProfiles,
      [session.user.id]: profile?.nickname ?? session.user.email,
    }));
    setCommentsByNote((currentComments) => ({
      ...currentComments,
      [noteId]: [...(currentComments[noteId] ?? []), data],
    }));
    clearComment();
    setMessage('评论已发布。');
  }

  async function handleDeleteComment(noteId, commentId) {
    setMessage('');

    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) {
      setMessage(`删除评论失败：${error.message}`);
      return;
    }

    setCommentsByNote((currentComments) => ({
      ...currentComments,
      [noteId]: (currentComments[noteId] ?? []).filter((comment) => comment.id !== commentId),
    }));
    setMessage('评论已删除。');
  }

  async function handleUpdateComment(noteId, commentId, content) {
    setMessage('');

    const text = content.trim();
    if (!text) {
      setMessage('评论内容不能为空。');
      return false;
    }

    const { data, error } = await supabase
      .from('comments')
      .update({ content: text })
      .eq('id', commentId)
      .select('id, note_id, user_id, content, created_at')
      .single();

    if (error) {
      setMessage(`更新评论失败：${error.message}`);
      return false;
    }

    setCommentsByNote((currentComments) => ({
      ...currentComments,
      [noteId]: (currentComments[noteId] ?? []).map((comment) => (comment.id === commentId ? data : comment)),
    }));
    setMessage('评论已更新。');
    return true;
  }

  return (
    <section className="public-page">
      <div className="section-heading">
        <p className="eyebrow">公开笔记</p>
        <h1>大家公开分享的笔记</h1>
      </div>
      {message && <p className="form-message global-message">{message}</p>}
      {isLoading ? (
        <p className="form-message global-message">正在读取公开笔记...</p>
      ) : notes.length === 0 ? (
        <EmptyState text="还没有公开笔记，公开后的笔记会显示在这里。" />
      ) : (
        <div className="public-grid">
          {notes.map((note) => (
            <article className="item-card" key={note.id}>
              <span className="tag public">{profiles[note.user_id] ?? '匿名用户'}</span>
              <h3>{note.title}</h3>
              {note.content && <p>{note.content}</p>}
              <div className="tag-row">
                <span>{new Date(note.created_at).toLocaleString('zh-CN')}</span>
              </div>
              <CommentsSection
                comments={commentsByNote[note.id] ?? []}
                commentsEnabled={commentsEnabled}
                profiles={profiles}
                session={session}
                onLogin={onLogin}
                onCreateComment={(content, clearComment) => handleCreateComment(note.id, content, clearComment)}
                onDeleteComment={(commentId) => handleDeleteComment(note.id, commentId)}
                onUpdateComment={(commentId, content) => handleUpdateComment(note.id, commentId, content)}
              />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function CommentsSection({ comments, commentsEnabled, profiles, session, onLogin, onCreateComment, onDeleteComment, onUpdateComment }) {
  const [draft, setDraft] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [editingCommentId, setEditingCommentId] = React.useState(null);
  const [editDraft, setEditDraft] = React.useState('');
  const [updatingCommentId, setUpdatingCommentId] = React.useState(null);
  const [confirmingDeleteCommentId, setConfirmingDeleteCommentId] = React.useState(null);
  const [deletingCommentId, setDeletingCommentId] = React.useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    await onCreateComment(draft, () => setDraft(''));
    setIsSubmitting(false);
  }

  async function handleDeleteComment(commentId) {
    setDeletingCommentId(commentId);
    await onDeleteComment(commentId);
    setDeletingCommentId(null);
    setConfirmingDeleteCommentId(null);
  }

  function startEditComment(comment) {
    setEditingCommentId(comment.id);
    setEditDraft(comment.content);
    setConfirmingDeleteCommentId(null);
  }

  async function handleUpdateComment(event, commentId) {
    event.preventDefault();
    setUpdatingCommentId(commentId);
    const didUpdate = await onUpdateComment(commentId, editDraft);
    setUpdatingCommentId(null);
    if (didUpdate) {
      setEditingCommentId(null);
      setEditDraft('');
    }
  }

  return (
    <div className="comments-box">
      <div className="comments-heading">
        <strong>评论</strong>
        <span>{comments.length}</span>
      </div>

      {!commentsEnabled ? (
        <p className="muted-text">评论区还没连接数据库。</p>
      ) : comments.length === 0 ? (
        <p className="muted-text">还没有评论，可以留下第一条想法。</p>
      ) : (
        <div className="comment-list">
          {comments.map((comment) => (
            <div className="comment-item" key={comment.id}>
              <div className="comment-meta">
                <div className="comment-author">
                  <strong>{profiles[comment.user_id] ?? '匿名用户'}</strong>
                  <span>{new Date(comment.created_at).toLocaleString('zh-CN')}</span>
                </div>
                {session?.user.id === comment.user_id && (
                  confirmingDeleteCommentId === comment.id ? (
                    <div className="confirm-delete comment-confirm-delete">
                      <span>确认删除吗？</span>
                      <button
                        className="danger-confirm-button"
                        onClick={() => handleDeleteComment(comment.id)}
                        disabled={deletingCommentId === comment.id}
                      >
                        {deletingCommentId === comment.id ? '删除中...' : '删除'}
                      </button>
                      <button className="cancel-confirm-button" onClick={() => setConfirmingDeleteCommentId(null)} disabled={deletingCommentId === comment.id}>
                        取消
                      </button>
                    </div>
                  ) : (
                    <div className="comment-actions">
                      <button className="small-action-button comment-icon-button" onClick={() => startEditComment(comment)} aria-label="编辑评论" title="编辑评论">
                        <Pencil size={14} />
                      </button>
                      <button
                        className="delete-button comment-delete-button"
                        onClick={() => setConfirmingDeleteCommentId(comment.id)}
                        aria-label="删除评论"
                        title="删除评论"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                )}
              </div>
              {editingCommentId === comment.id ? (
                <form className="comment-form comment-edit-form" onSubmit={(event) => handleUpdateComment(event, comment.id)}>
                  <textarea
                    rows={2}
                    value={editDraft}
                    maxLength={500}
                    onChange={(event) => setEditDraft(event.target.value)}
                  />
                  <div className="form-actions">
                    <button className="primary-button" type="submit" disabled={updatingCommentId === comment.id || !editDraft.trim()}>
                      {updatingCommentId === comment.id ? '保存中...' : '保存修改'}
                    </button>
                    <button className="text-button" type="button" onClick={() => setEditingCommentId(null)} disabled={updatingCommentId === comment.id}>
                      取消
                    </button>
                  </div>
                </form>
              ) : (
                <p>{comment.content}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {commentsEnabled && (
        session ? (
          <form className="comment-form" onSubmit={handleSubmit}>
            <textarea
              rows={2}
              value={draft}
              placeholder="写一条评论..."
              maxLength={500}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button className="primary-button" type="submit" disabled={isSubmitting || !draft.trim()}>
              {isSubmitting ? '发布中...' : '发布评论'}
            </button>
          </form>
        ) : (
          <button className="text-button comment-login-button" onClick={onLogin}>
            登录后评论
          </button>
        )
      )}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="empty-state">
      <Database size={22} />
      <p>{text}</p>
    </div>
  );
}

function filterTasks(tasks, filter) {
  const today = getToday();
  if (filter === 'today') return tasks.filter((task) => task.task_date === today);
  if (filter === 'overdue') return tasks.filter(isTaskOverdue);
  if (filter === 'unfinished') return tasks.filter((task) => task.status !== 'completed');
  if (filter === 'completed') return tasks.filter((task) => task.status === 'completed');
  if (filter === 'in_progress') return tasks.filter((task) => task.status === 'in_progress');
  if (filter === 'not_started') return tasks.filter((task) => task.status === 'not_started');
  if (filter === 'stalled') return tasks.filter((task) => task.status === 'stalled');
  if (filter === 'important_urgent') return tasks.filter((task) => task.matrix_category === 'important_urgent');
  return tasks;
}

function isTaskOverdue(task) {
  if (!task.task_date || task.status === 'completed') return false;

  const today = getToday();
  if (task.task_date < today) return true;
  if (task.task_date > today) return false;
  if (!task.task_time) return false;

  return new Date(`${task.task_date}T${task.task_time}`).getTime() < Date.now();
}

function getTaskTimingInfo(task) {
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

function sortTasks(a, b) {
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

function getMonthDays(currentDate) {
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

createRoot(document.getElementById('root')).render(<App />);
