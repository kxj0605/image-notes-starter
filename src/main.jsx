import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Database,
  FileText,
  Flame,
  Github,
  House,
  ListTodo,
  LogIn,
  LogOut,
  NotebookPen,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Settings2,
  Sparkles,
  Star,
  Target,
  Trash2,
  UserPlus,
  Zap,
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { matrixOptions, pages, statusOptions, tabs, taskViews } from './config';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { HomePage } from './pages/HomePage';
import {
  formatDate,
  formatFullDate,
  formatTime,
  getGreeting,
  getMonthDays,
  getRelativeDate,
  getToday,
} from './utils/date';
import {
  filterTasks,
  getLabel,
  getTaskListEmptyText,
  getTaskTimingInfo,
  isTaskOverdue,
  sortTasks,
} from './utils/tasks';
import './styles.css';

function makeNickname(email = '') {
  const prefix = email.split('@')[0] || '用户';
  const number = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${number}`;
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
    <main className={
      currentPage === pages.workspace
        ? 'app-shell workspace-app-shell'
        : currentPage === pages.publicNotes
          ? 'app-shell public-app-shell'
          : currentPage === pages.home
            ? 'app-shell home-app-shell'
            : 'app-shell'
    }>
      {currentPage !== pages.workspace && <nav className="top-nav" aria-label="主导航">
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
              {currentPage !== pages.home && (
                <button className="primary-button" onClick={() => setCurrentPage(pages.register)}>
                  <UserPlus size={17} />
                  注册
                </button>
              )}
            </>
          )}
        </div>
      </nav>}

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
          onPublicNotes={() => setCurrentPage(pages.publicNotes)}
          onSignOut={handleSignOut}
        />
      )}
    </main>
  );
}

function WorkspacePage({ session, profile, initialTab, onProfileChange, onLogin, onPublicNotes, onSignOut }) {
  const [activeTab, setActiveTab] = React.useState(
    initialTab === tabs.calendar || initialTab === tabs.matrix ? tabs.tasks : initialTab,
  );
  const [notes, setNotes] = React.useState([]);
  const [tasks, setTasks] = React.useState([]);
  const [message, setMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [theme, setTheme] = React.useState(() => window.localStorage.getItem('workspace-theme') || 'default');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(
    () => window.localStorage.getItem('workspace-sidebar-collapsed') === 'true',
  );

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
    setActiveTab(initialTab === tabs.calendar || initialTab === tabs.matrix ? tabs.tasks : initialTab);
  }, [initialTab]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    window.localStorage.setItem('workspace-theme', theme);
  }, [theme]);

  React.useEffect(() => {
    window.localStorage.setItem('workspace-sidebar-collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

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
  const importantTodayTasks = todayTasks.filter(
    (task) => task.status !== 'completed' && task.matrix_category.startsWith('important_'),
  );

  const displayName = profile?.nickname ?? session.user.email;

  return (
    <section className={`workspace-frame workspace-theme-${theme}${isSidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <aside className="workspace-sidebar">
        <div className="workspace-sidebar-top">
          <button className="workspace-brand" onClick={() => setActiveTab(tabs.dashboard)} title="日程笔记">
            <span className="workspace-brand-mark"><NotebookPen size={21} /></span>
            <span className="workspace-brand-text">日程笔记</span>
          </button>
          <button
            className="sidebar-collapse-button"
            onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
            aria-label={isSidebarCollapsed ? '展开侧栏' : '收起侧栏'}
            title={isSidebarCollapsed ? '展开侧栏' : '收起侧栏'}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <nav className="workspace-nav" aria-label="私人工作台导航">
          <SidebarButton icon={House} label="主页" active={activeTab === tabs.dashboard} onClick={() => setActiveTab(tabs.dashboard)} collapsed={isSidebarCollapsed} />
          <SidebarButton icon={NotebookPen} label="我的笔记" active={activeTab === tabs.notes} onClick={() => setActiveTab(tabs.notes)} collapsed={isSidebarCollapsed} />
          <SidebarButton icon={CheckCircle2} label="任务中心" active={activeTab === tabs.tasks} onClick={() => setActiveTab(tabs.tasks)} collapsed={isSidebarCollapsed} />
          <SidebarButton icon={FileText} label="公开笔记" onClick={onPublicNotes} collapsed={isSidebarCollapsed} />
        </nav>

        <div className="workspace-sidebar-footer">
          <button className={activeTab === tabs.profile ? 'profile-entry active' : 'profile-entry'} onClick={() => setActiveTab(tabs.profile)} title="个人设置与主题">
            <span className="profile-avatar">{displayName.slice(0, 2).toUpperCase()}</span>
            <span className="profile-entry-copy">
              <strong>{displayName}</strong>
              <small><Settings2 size={13} /> 个人设置与主题</small>
            </span>
          </button>
          <button className="sidebar-signout" onClick={onSignOut} title="退出登录" aria-label="退出登录">
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <div className="workspace-content">
        {activeTab === tabs.dashboard && (
          <header className="workspace-heading dashboard-heading">
            <div>
              <h1 className="dashboard-greeting">
                <span>{getGreeting()}</span>
                <span className="greeting-wave" aria-hidden="true">👋</span>
              </h1>
              <p className="auth-state dashboard-date-line">
                今天是 {formatFullDate()}。你今天有 <strong>{importantTodayTasks.length} 个重要任务</strong> 待办。
              </p>
            </div>
          </header>
        )}

        {activeTab !== tabs.dashboard && (
          <header className="workspace-heading compact-heading">
            <div>
              <p className="workspace-eyebrow">私人工作台</p>
              <h1>{activeTab === tabs.notes ? '我的笔记' : activeTab === tabs.tasks ? '任务中心' : '个人设置'}</h1>
              <p className="auth-state">
                {activeTab === tabs.tasks && `今天有 ${todayTasks.length} 项任务，任务列表、日历和四象限都集中在这里。`}
                {activeTab === tabs.notes && `共 ${notes.length} 篇笔记，记录想法并决定内容是私密还是公开。`}
                {activeTab === tabs.profile && '管理昵称与工作台主题。'}
              </p>
            </div>
          </header>
        )}

        {message && <p className="form-message global-message">{message}</p>}
        {isLoading && <p className="form-message global-message">正在读取数据...</p>}

        {activeTab === tabs.dashboard && (
          <Dashboard notes={notes} tasks={tasks} onOpenTasks={() => setActiveTab(tabs.tasks)} onOpenNotes={() => setActiveTab(tabs.notes)} />
        )}
        {activeTab === tabs.notes && (
          <NotesPanel session={session} notes={notes} setNotes={setNotes} setMessage={setMessage} />
        )}
        {activeTab === tabs.tasks && (
          <TasksPanel session={session} tasks={tasks} setTasks={setTasks} setMessage={setMessage} />
        )}
        {activeTab === tabs.profile && (
          <ProfilePanel
            session={session}
            profile={profile}
            onProfileChange={onProfileChange}
            setMessage={setMessage}
            theme={theme}
            setTheme={setTheme}
          />
        )}
      </div>
    </section>
  );
}

function SidebarButton({ icon: Icon, label, active = false, onClick, collapsed = false }) {
  return (
    <button className={active ? 'sidebar-nav-button active' : 'sidebar-nav-button'} onClick={onClick} title={collapsed ? label : undefined} aria-label={label}>
      <Icon size={19} />
      <span>{label}</span>
    </button>
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

function Dashboard({ notes, tasks, onOpenTasks, onOpenNotes }) {
  const today = getToday();
  const todayTasks = tasks.filter((task) => task.task_date === today).sort(sortTasks);
  const longTermTasks = tasks
    .filter((task) => task.task_date > today && task.status !== 'completed')
    .sort(sortTasks)
    .slice(0, 3);
  const recentNotes = notes.slice(0, 3);

  return (
    <div className="dashboard-home">
      <div className="dashboard-top-grid">
        <section className="panel-card dashboard-today-card">
          <div className="dashboard-section-heading">
            <div>
              <span className="section-icon section-icon-coral"><Target size={18} /></span>
              <h2>今日任务</h2>
            </div>
            <button className="section-link" onClick={onOpenTasks}>查看全部 <ArrowRight size={15} /></button>
          </div>
          <DashboardTaskList tasks={todayTasks} emptyText="今天还没有任务，给自己安排一件最重要的事吧。" />
        </section>

        <div className="quick-entry-stack">
          <button className="quick-entry-card quick-task" onClick={onOpenTasks}>
            <span><Plus size={22} /></span>
            <strong>新建任务</strong>
            <small>安排今天或未来要做的事</small>
          </button>
          <button className="quick-entry-card quick-note" onClick={onOpenNotes}>
            <span><NotebookPen size={21} /></span>
            <strong>写点东西</strong>
            <small>记录此刻的想法与灵感</small>
          </button>
        </div>
      </div>

      <section className="dashboard-section">
        <div className="dashboard-section-heading outside-card">
          <div>
            <span className="section-icon section-icon-purple"><Sparkles size={18} /></span>
            <h2>长期任务</h2>
          </div>
          <button className="section-link" onClick={onOpenTasks}>管理任务 <ArrowRight size={15} /></button>
        </div>
        {longTermTasks.length === 0 ? (
          <div className="panel-card dashboard-empty">暂时没有未来任务，可以在任务中心添加长期计划。</div>
        ) : (
          <div className="long-term-grid">
            {longTermTasks.map((task, index) => (
              <article className={`long-term-card accent-${index + 1}`} key={task.id}>
                <div className="long-term-card-top">
                  <span className="long-term-icon"><Clock3 size={18} /></span>
                  <span className={`tag matrix-${task.matrix_category}`}>{getLabel(matrixOptions, task.matrix_category)}</span>
                </div>
                <h3>{task.title}</h3>
                <p>{task.description || '保持推进，一点点完成这个计划。'}</p>
                <div className="long-term-meta">
                  <strong>{getLabel(statusOptions, task.status)}</strong>
                  <span>{formatDate(task.task_date)}</span>
                </div>
                <div className="progress-track"><div style={{ width: task.status === 'in_progress' ? '60%' : task.status === 'stalled' ? '24%' : '12%' }} /></div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-heading outside-card">
          <div>
            <span className="section-icon section-icon-blue"><Clock3 size={18} /></span>
            <h2>最近笔记</h2>
          </div>
          <button className="section-link" onClick={onOpenNotes}>全部笔记 <ArrowRight size={15} /></button>
        </div>
        {recentNotes.length === 0 ? (
          <div className="panel-card dashboard-empty">还没有笔记，点击“写点东西”记录第一条内容。</div>
        ) : (
          <div className="recent-notes-grid">
            {recentNotes.map((note, index) => (
              <button className={`recent-note-card note-color-${index + 1}`} key={note.id} onClick={onOpenNotes}>
                <span className="note-color-block">
                  <span className="note-cover-icon" aria-hidden="true">{['📝', '💡', '📚'][index % 3]}</span>
                  <span className={note.visibility === 'public' ? 'note-visibility-pill public' : 'note-visibility-pill'}>
                    {note.visibility === 'public' ? '公开' : '私密'}
                  </span>
                </span>
                <strong>{note.title}</strong>
                <small>{new Date(note.created_at).toLocaleDateString('zh-CN')} · 最近编辑</small>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DashboardTaskList({ tasks, emptyText }) {
  if (tasks.length === 0) return <p className="dashboard-empty-copy">{emptyText}</p>;

  return (
    <div className="dashboard-task-list">
      {tasks.slice(0, 4).map((task) => (
        <div className={`dashboard-task-row matrix-row-${task.matrix_category}`} key={task.id}>
          <span className={task.status === 'completed' ? 'dashboard-check completed' : 'dashboard-check'}>
            <CheckCircle2 size={18} />
          </span>
          <div>
            <strong>{task.title}</strong>
            <span className={`tag matrix-${task.matrix_category}`}>{getLabel(matrixOptions, task.matrix_category)}</span>
          </div>
          <small>{formatTime(task.task_time) || getLabel(statusOptions, task.status)}</small>
        </div>
      ))}
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
  const [isComposerOpen, setIsComposerOpen] = React.useState(false);

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
    setIsComposerOpen(false);
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
    <div className="notes-page-layout">
      <div className="page-action-row">
        <div className="note-filter-pills">
          <span className="active">全部笔记</span>
          <span>{notes.filter((note) => note.visibility === 'private').length} 篇私密</span>
          <span>{notes.filter((note) => note.visibility === 'public').length} 篇公开</span>
        </div>
        <button className="workspace-main-action" onClick={() => setIsComposerOpen((open) => !open)}>
          <Plus size={18} />
          {isComposerOpen ? '收起编辑器' : '写新笔记'}
        </button>
      </div>

      {isComposerOpen && <form className="panel-card form-stack note-composer" onSubmit={handleCreateNote}>
        <div className="form-card-heading">
          <span className="section-icon section-icon-blue"><NotebookPen size={18} /></span>
          <div><h2>写新笔记</h2><p>随手记录，之后也可以继续编辑。</p></div>
        </div>
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
      </form>}

      <section className="notes-collection">
        {notes.length === 0 ? (
          <EmptyState text="还没有笔记，可以先写一个想法或记录。" />
        ) : (
          <div className="notes-card-grid">
            {notes.map((note, index) => (
              <article className={`item-card note-library-card note-accent-${(index % 4) + 1}`} key={note.id}>
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
                    <span className="note-card-cover" />
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
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [matrixFilter, setMatrixFilter] = React.useState('all');
  const [activeTaskView, setActiveTaskView] = React.useState(taskViews.list);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);

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
    setIsCreateOpen(false);
    setMessage('任务已保存到列表。');
  }

  const visibleTasks = filterTasks(tasks, statusFilter, matrixFilter);
  const emptyText = getTaskListEmptyText(statusFilter, matrixFilter);

  return (
    <div className="tasks-page-layout">
      <div className="task-toolbar">
        <div className="task-view-switcher">
          <TabButton icon={ListTodo} label="任务列表" value={taskViews.list} activeTab={activeTaskView} onClick={setActiveTaskView} />
          <TabButton icon={CalendarDays} label="日历视图" value={taskViews.calendar} activeTab={activeTaskView} onClick={setActiveTaskView} />
          <TabButton icon={Database} label="四象限矩阵" value={taskViews.matrix} activeTab={activeTaskView} onClick={setActiveTaskView} />
        </div>
        <button className="workspace-main-action" onClick={() => setIsCreateOpen((open) => !open)}>
          <Plus size={18} />
          {isCreateOpen ? '收起表单' : '新建任务'}
        </button>
      </div>

      {isCreateOpen && (
        <form className="panel-card form-stack task-composer" onSubmit={handleCreateTask}>
          <div className="form-card-heading">
            <span className="section-icon section-icon-coral"><CheckCircle2 size={18} /></span>
            <div><h2>新建任务</h2><p>设置日期、进展和重要紧急程度。</p></div>
          </div>
          <div className="task-composer-grid">
            <label className="wide-field">任务标题<input id="task-title" value={form.title} onChange={(event) => updateForm('title', event.target.value)} required /></label>
            <label className="wide-field">备注<textarea id="task-description" rows={3} value={form.description} onChange={(event) => updateForm('description', event.target.value)} /></label>
            <label>重要紧急程度<select id="task-matrix" value={form.matrix_category} onChange={(event) => updateForm('matrix_category', event.target.value)}>{matrixOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
            <label>进展状态<select id="task-status" value={form.status} onChange={(event) => updateForm('status', event.target.value)}>{statusOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
            <label>日期<input type="date" value={form.task_date} onChange={(event) => updateForm('task_date', event.target.value)} required /></label>
            <label>时间<input type="time" value={form.task_time} onChange={(event) => updateForm('task_time', event.target.value)} /></label>
          </div>
          <div className="task-composer-actions">
            <div className="quick-date-row" aria-label="快捷日期">
              <button type="button" onClick={() => updateForm('task_date', getRelativeDate(0))}>今天</button>
              <button type="button" onClick={() => updateForm('task_date', getRelativeDate(1))}>明天</button>
              <button type="button" onClick={() => updateForm('task_date', getRelativeDate(2))}>后天</button>
            </div>
            <button className="primary-button large" disabled={isSaving}><Plus size={18} />{isSaving ? '保存中...' : '保存任务'}</button>
          </div>
        </form>
      )}

      {activeTaskView === taskViews.list && (
        <div className="task-list-layout">
          <section className="panel-card task-list-panel">
            <div className="panel-heading-row">
              <div><h2>全部任务</h2><p className="muted-text">按状态和优先级快速整理。</p></div>
              <div className="task-filter-row">
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="筛选任务状态">
                  <option value="all">状态：全部</option>
                  <option value="unfinished">状态：未完成</option>
                  <option value="completed">状态：已完成</option>
                  <option value="in_progress">状态：进行中</option>
                  <option value="not_started">状态：待开始</option>
                  <option value="stalled">状态：已停滞</option>
                </select>
                <select value={matrixFilter} onChange={(event) => setMatrixFilter(event.target.value)} aria-label="筛选重要紧急程度">
                  <option value="all">程度：全部</option>
                  {matrixOptions.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <TaskList tasks={visibleTasks} setTasks={setTasks} setMessage={setMessage} emptyText={emptyText} />
          </section>
        </div>
      )}

      {activeTaskView === taskViews.calendar && <CalendarPanel tasks={tasks} />}
      {activeTaskView === taskViews.matrix && <MatrixPanel tasks={tasks} setTasks={setTasks} setMessage={setMessage} />}
    </div>
  );
}

function TaskList({ tasks, setTasks, setMessage, variant = 'default', emptyText = '这里暂时没有任务。' }) {
  if (tasks.length === 0) return <EmptyState text={emptyText} />;

  return (
    <div className="card-list">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} setTasks={setTasks} setMessage={setMessage} variant={variant} />
      ))}
    </div>
  );
}

function TaskCard({ task, setTasks, setMessage, compact = false, variant = 'default' }) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [isCompleting, setIsCompleting] = React.useState(false);
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

  async function handleToggleComplete() {
    if (task.status === 'completed') {
      await handleStatusChange('in_progress');
      return;
    }

    setIsCompleting(true);
    const [{ error }] = await Promise.all([
      supabase.from('tasks').update({ status: 'completed' }).eq('id', task.id),
      new Promise((resolve) => window.setTimeout(resolve, 500)),
    ]);

    if (error) {
      setIsCompleting(false);
      setMessage?.(`更新任务失败：${error.message}`);
      return;
    }

    setTasks?.((currentTasks) =>
      currentTasks.map((item) => (item.id === task.id ? { ...item, status: 'completed' } : item)).sort(sortTasks),
    );
    setMessage?.('任务已完成。');
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
    setMessage?.('任务重要紧急程度已更新。');
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
  const isMatrixView = variant === 'matrix';

  return (
    <article className={[task.status === 'completed' ? 'item-card completed' : 'item-card', isTaskOverdue(task) ? 'task-overdue' : '', `task-accent-${task.matrix_category}`, isMatrixView ? 'matrix-task-card' : '', isCompleting ? 'task-completing' : ''].filter(Boolean).join(' ')}>
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
            {isConfirmingDelete ? (
              <>
                <button className="danger-confirm-button" type="button" onClick={handleDeleteTask}>确认删除</button>
                <button className="cancel-confirm-button" type="button" onClick={() => setIsConfirmingDelete(false)}>保留任务</button>
              </>
            ) : (
              <button className="edit-form-delete" type="button" onClick={() => setIsConfirmingDelete(true)}>
                <Trash2 size={15} /> 删除任务
              </button>
            )}
          </div>
        </form>
      ) : (
        <>
          <div className="item-top">
            <div className="task-title-row">
              <span className="task-card-symbol"><Target size={17} /></span>
              <h3>{task.title}</h3>
            </div>
            {!compact && <div className="item-actions task-card-actions">
              <button
                className="task-edit-button"
                onClick={() => {
                  setIsEditing(true);
                  setIsConfirmingDelete(false);
                }}
                disabled={isCompleting}
                aria-label="编辑任务"
                title="编辑任务"
              >
                <Pencil size={17} />
              </button>
              <button
                className={task.status === 'completed' || isCompleting ? 'task-complete-checkbox checked' : 'task-complete-checkbox'}
                onClick={handleToggleComplete}
                disabled={isCompleting}
                aria-label={task.status === 'completed' ? '恢复为进行中' : '标记已完成'}
                title={task.status === 'completed' ? '恢复为进行中' : '完成任务'}
              >
                {(task.status === 'completed' || isCompleting) && <CheckCircle2 size={18} />}
              </button>
            </div>}
          </div>
          {task.description && <p>{task.description}</p>}
          <div className="tag-row">
            <span className={`tag matrix-${task.matrix_category}`}>{getLabel(matrixOptions, task.matrix_category)}</span>
            <span className={timingInfo.className}>{timingInfo.label}</span>
            <span className={`tag task-status-tag status-${task.status}`}>{getLabel(statusOptions, task.status)}</span>
          </div>
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

function CalendarPanel({ tasks }) {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const monthDays = getMonthDays(currentDate);

  function shiftMonth(delta) {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  }

  return (
    <div className="calendar-layout">
      <section className="panel-card">
        <div className="calendar-toolbar">
          <div className="calendar-title-group">
            <h2>{currentDate.getMonth() + 1}月 <span>{currentDate.getFullYear()}</span></h2>
            <button className="calendar-arrow" onClick={() => shiftMonth(-1)} aria-label="上个月">‹</button>
            <button className="calendar-arrow" onClick={() => shiftMonth(1)} aria-label="下个月">›</button>
          </div>
          <button className="text-button" onClick={() => setCurrentDate(new Date())}>回到今天</button>
        </div>
        <div className="calendar-grid">
          {['一', '二', '三', '四', '五', '六', '日'].map((day) => (
            <span className="calendar-head" key={day}>{day}</span>
          ))}
          {monthDays.map((day) => {
            const dayTasks = tasks.filter((task) => task.task_date === day.date);
            const isToday = day.date === getToday();
            const isPast = day.isCurrentMonth && day.date < getToday();
            return (
              <div
                className={[
                  'calendar-cell',
                  day.isCurrentMonth ? '' : 'muted',
                  isToday ? 'today' : '',
                  isPast ? 'past' : '',
                ].join(' ')}
                key={day.date}
              >
                <strong>{day.dayNumber}</strong>
                {dayTasks.slice(0, 2).map((task) => (
                  <span className={`calendar-event event-${task.matrix_category}`} key={task.id}>{task.title}</span>
                ))}
                {dayTasks.length > 2 && <small>+{dayTasks.length - 2}</small>}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function MatrixPanel({ tasks, setTasks, setMessage }) {
  return (
    <div className="matrix-grid">
      {matrixOptions.map((matrix) => {
        const matrixTasks = tasks.filter((task) => task.matrix_category === matrix.value && task.status !== 'completed');
        return (
          <section className="panel-card matrix-cell" key={matrix.value}>
            <div className="matrix-heading">
              <div>
                <span className={`matrix-heading-icon icon-${matrix.value}`}><MatrixVisualIcon value={matrix.value} /></span>
                <div><h2>{matrix.label}</h2><p>{matrix.hint}</p></div>
              </div>
              <span>{matrixTasks.length}</span>
            </div>
            <TaskList
              tasks={matrixTasks}
              setTasks={setTasks}
              setMessage={setMessage}
              variant="matrix"
              emptyText="这个象限暂时没有任务。"
            />
          </section>
        );
      })}
    </div>
  );
}

function MatrixVisualIcon({ value }) {
  if (value === 'important_urgent') return <Flame size={18} />;
  if (value === 'important_not_urgent') return <Star size={18} />;
  if (value === 'urgent_not_important') return <Zap size={18} />;
  return <Clock3 size={18} />;
}

function ProfilePanel({ session, profile, onProfileChange, setMessage, theme, setTheme }) {
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
    <section className="profile-settings-grid">
      <div className="panel-card profile-panel">
      <h2>个人资料</h2>
      <div className="profile-summary">
        <div>
          <span>当前邮箱</span>
          <strong>{session.user.email}</strong>
        </div>
        <div>
          <span>当前昵称</span>
          <strong>{profile?.nickname ?? '还没有昵称'}</strong>
        </div>
      </div>
      <p className="muted-text">公开笔记和评论会显示昵称，不显示完整邮箱。</p>
      <form className="form-stack" onSubmit={handleSave}>
        <label htmlFor="nickname">昵称</label>
        <input id="nickname" value={nickname} onChange={(event) => setNickname(event.target.value)} />
        <button className="primary-button large" disabled={isSaving}>
          {isSaving ? '保存中...' : '保存昵称'}
        </button>
      </form>
      </div>

      <div className="panel-card theme-panel">
        <div className="theme-panel-heading">
          <span className="section-icon section-icon-purple"><Palette size={18} /></span>
          <div>
            <h2>工作台主题</h2>
            <p className="muted-text">只改变登录后的私人工作台。</p>
          </div>
        </div>
        <div className="theme-options">
          <button className={theme === 'default' ? 'theme-option active' : 'theme-option'} onClick={() => setTheme('default')}>
            <span className="theme-preview default-preview"><i /><i /><i /></span>
            <span><strong>轻盈多彩</strong><small>浅灰背景、白色卡片和彩色点缀</small></span>
            {theme === 'default' && <CheckCircle2 size={19} />}
          </button>
          <button className={theme === 'mint' ? 'theme-option active' : 'theme-option'} onClick={() => setTheme('mint')}>
            <span className="theme-preview mint-preview"><i /><i /><i /></span>
            <span><strong>薄荷绿</strong><small>保留原有淡绿色背景和绿色按钮</small></span>
            {theme === 'mint' && <CheckCircle2 size={19} />}
          </button>
        </div>
      </div>
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
          setMessage('评论区还没有准备好，公开笔记可以正常查看。');
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
      setMessage('登录后就可以参与评论。');
      return;
    }

    const text = content.trim();
    if (!text) {
      setMessage('先写一点内容，再发布评论。');
      return;
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({ note_id: noteId, user_id: session.user.id, content: text })
      .select('id, note_id, user_id, content, created_at')
      .single();

    if (error) {
      setMessage(`评论发布失败：${error.message}`);
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
      setMessage(`评论删除失败：${error.message}`);
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
      setMessage(`评论更新失败：${error.message}`);
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
      <div className="public-hero">
        <div>
          <p className="public-kicker"><Sparkles size={15} /> 灵感广场</p>
          <h1>公开笔记</h1>
          <p>看看大家最近记录的想法，也可以留下你的回应。</p>
        </div>
        <div className="public-summary">
          <strong>{notes.length}</strong>
          <span>篇公开分享</span>
        </div>
      </div>
      {message && <p className="form-message global-message">{message}</p>}
      {isLoading ? (
        <p className="form-message global-message">正在读取公开笔记...</p>
      ) : notes.length === 0 ? (
        <EmptyState text="还没有公开笔记，公开后的笔记会显示在这里。" />
      ) : (
        <div className="public-grid">
          {notes.map((note, index) => (
            <article className={`public-note-card public-note-accent-${(index % 4) + 1}`} key={note.id}>
              <div className="public-note-cover">
                <span className="public-note-emoji" aria-hidden="true">{['📝', '💡', '📚', '✨'][index % 4]}</span>
                <span className="public-note-label">公开笔记</span>
              </div>
              <div className="public-note-body">
                <div className="public-note-meta">
                  <span className="public-author">{profiles[note.user_id] ?? '匿名用户'}</span>
                  <span>{new Date(note.created_at).toLocaleDateString('zh-CN')}</span>
                </div>
                <h3>{note.title}</h3>
                {note.content && <p className="public-note-content">{note.content}</p>}
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
              </div>
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
        <p className="muted-text">评论区暂时不可用。</p>
      ) : comments.length === 0 ? (
        <p className="muted-text">还没有人回应，可以留下第一条评论。</p>
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
                      <span>删除这条评论？</span>
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
              placeholder="写下你的想法..."
              maxLength={500}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button className="primary-button" type="submit" disabled={isSubmitting || !draft.trim()}>
              {isSubmitting ? '发布中...' : '发布'}
            </button>
          </form>
        ) : (
          <button className="text-button comment-login-button" onClick={onLogin}>
            登录后参与评论
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

createRoot(document.getElementById('root')).render(<App />);
