import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowRight,
  ArrowUp,
  BookmarkPlus,
  CalendarDays,
  CheckCircle2,
  ClipboardPaste,
  Clock3,
  Copy,
  Database,
  Download,
  FileText,
  Film,
  Flame,
  Github,
  House,
  ListTodo,
  LibraryBig,
  LogIn,
  LogOut,
  NotebookPen,
  Palette,
  Pencil,
  Plus,
  Scissors,
  Save,
  Settings2,
  Sparkles,
  Star,
  Target,
  Trash2,
  UserPlus,
  Wifi,
  Zap,
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { matrixOptions, pages, statusOptions, tabs, taskViews } from './config';
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from './pages/AuthPages';
import { HomePage } from './pages/HomePage';
import { LongTermTasksPanel } from './components/LongTermTasksPanel';
import { SubscriptionsPanel } from './components/SubscriptionsPanel';
import { CreatorDashboard } from './components/CreatorDashboard';
import { VideoCollectionPanel } from './components/VideoCollectionPanel';
import { getBenchmarkMetadataFields } from './components/BenchmarkVideoDetails';
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
import { isLongTermTask, serializeLongTermTask } from './utils/longTermTasks';
import './styles.css';

function makeNickname(email = '') {
  const prefix = email.split('@')[0] || '用户';
  const number = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${number}`;
}

function getWorkspacePreviewTasks() {
  const today = getToday();
  return [
    {
      id: 'preview-long-term-account',
      user_id: 'preview-user',
      title: '每天进行直播',
      description: serializeLongTermTask({
        version: 1,
        type: 'account',
        lifecycle: 'active',
        startDate: today,
        endDate: null,
        resetTime: '00:00',
        schedule: { type: 'daily' },
        accounts: [
          { id: 'preview-a', name: '直播主账号', platform: '抖音', url: 'https://example.com', instructions: '进入直播间并完成直播', targetCount: 1, unlimited: false },
          { id: 'preview-b', name: '直播副账号 A', platform: '快手', url: 'https://example.com', instructions: '进入直播间并完成直播', targetCount: 1, unlimited: false },
          { id: 'preview-c', name: '直播副账号 B', platform: '视频号', url: 'https://example.com', instructions: '进入直播间并完成直播', targetCount: 1, unlimited: false },
        ],
        checkins: { [today]: { state: 'partial', accountCounts: { 'preview-a': 1, 'preview-b': 1 } } },
        currentStep: null,
        stepHistory: [],
      }),
      task_date: today,
      task_time: null,
      matrix_category: 'important_not_urgent',
      status: 'in_progress',
      created_at: new Date().toISOString(),
    },
    {
      id: 'preview-long-term-project',
      user_id: 'preview-user',
      title: '搭建个人知识库',
      description: serializeLongTermTask({
        version: 1,
        type: 'project',
        lifecycle: 'active',
        startDate: today,
        endDate: null,
        resetTime: '00:00',
        schedule: { type: 'daily' },
        accounts: [],
        checkins: {},
        currentStep: { id: 'preview-step', title: '整理首页的信息结构和栏目名称', notes: '', status: 'in_progress', startedAt: today },
        stepHistory: [],
      }),
      task_date: today,
      task_time: null,
      matrix_category: 'important_not_urgent',
      status: 'in_progress',
      created_at: new Date().toISOString(),
    },
  ];
}

function App() {
  const isWorkspacePreview = import.meta.env.DEV && new URLSearchParams(window.location.search).has('workspace-preview');
  const isPasswordReset = new URLSearchParams(window.location.search).has('reset-password');
  const requestedPreviewTab = new URLSearchParams(window.location.search).get('workspace-tab');
  const [currentPage, setCurrentPage] = React.useState(
    isWorkspacePreview ? pages.workspace : isPasswordReset ? pages.resetPassword : pages.home,
  );
  const [passwordRecoveryEmail, setPasswordRecoveryEmail] = React.useState('');
  const [workspaceTab, setWorkspaceTab] = React.useState(
    isWorkspacePreview && Object.values(tabs).includes(requestedPreviewTab) ? requestedPreviewTab : tabs.dashboard,
  );
  const [session, setSession] = React.useState(isWorkspacePreview ? { user: { id: 'preview-user', email: 'preview@example.com' } } : null);
  const [profile, setProfile] = React.useState(isWorkspacePreview ? { id: 'preview-user', nickname: '预览账号' } : null);
  const [authReady, setAuthReady] = React.useState(isWorkspacePreview);

  React.useEffect(() => {
    if (isWorkspacePreview) return undefined;
    if (!supabase) {
      setAuthReady(true);
      return undefined;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'PASSWORD_RECOVERY') {
        setCurrentPage(pages.resetPassword);
        return;
      }
      if (nextSession) setCurrentPage(pages.workspace);
    });

    return () => listener.subscription.unsubscribe();
  }, [isWorkspacePreview]);

  React.useEffect(() => {
    async function loadProfile() {
      if (isWorkspacePreview) return;
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
  }, [isWorkspacePreview, session]);

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
          : currentPage === pages.login || currentPage === pages.register || currentPage === pages.forgotPassword || currentPage === pages.resetPassword
            ? 'app-shell auth-app-shell'
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
          {currentPage !== pages.home && (
            <a
              className="icon-button"
              href="https://github.com/kxj0605/image-notes-starter"
              aria-label="GitHub 代码"
              target="_blank"
              rel="noreferrer"
            >
              <Github size={18} />
            </a>
          )}

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
          onForgotPassword={(email) => {
            setPasswordRecoveryEmail(email);
            setCurrentPage(pages.forgotPassword);
          }}
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
      {currentPage === pages.forgotPassword && (
        <ForgotPasswordPage
          initialEmail={passwordRecoveryEmail}
          onLogin={() => setCurrentPage(pages.login)}
        />
      )}
      {currentPage === pages.resetPassword && (
        <ResetPasswordPage
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
          onSignOut={handleSignOut}
        />
      )}
    </main>
  );
}

function WorkspacePage({ session, profile, initialTab, onProfileChange, onLogin, onSignOut }) {
  const [activeTab, setActiveTab] = React.useState(
    initialTab === tabs.calendar || initialTab === tabs.matrix ? tabs.tasks : initialTab,
  );
  const [selectedCollectionVideo, setSelectedCollectionVideo] = React.useState(null);
  const [notes, setNotes] = React.useState([]);
  const [tasks, setTasks] = React.useState([]);
  const [message, setMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [theme, setTheme] = React.useState(() => window.localStorage.getItem('workspace-theme') || 'default');

  const loadData = React.useCallback(async () => {
    if (!session || !supabase) return;

    if (session.user.id === 'preview-user') {
      setNotes([]);
      setTasks(getWorkspacePreviewTasks());
      return;
    }

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
  const todayTasks = tasks.filter((task) => !isLongTermTask(task) && task.task_date === today);
  const importantTodayTasks = todayTasks.filter(
    (task) => task.status !== 'completed' && task.matrix_category.startsWith('important_'),
  );
  const creatorTabs = [tabs.creator, tabs.creatorProjects, tabs.creatorCollection, tabs.breakdown, tabs.creatorMaterials, tabs.creatorReview];
  const isCreatorTab = creatorTabs.includes(activeTab);
  const workspaceTitle = {
    [tabs.creator]: '创作概览',
    [tabs.creatorProjects]: '项目',
    [tabs.creatorCollection]: '灵感视频',
    [tabs.breakdown]: '拆解学习',
    [tabs.creatorMaterials]: '素材库',
    [tabs.creatorReview]: '复盘',
    [tabs.notes]: '笔记',
    [tabs.tasks]: '任务',
    [tabs.subscriptions]: '订阅',
    [tabs.publicNotes]: '公开笔记',
    [tabs.profile]: '设置',
  }[activeTab];
  const workspaceDescription = {
    [tabs.creator]: '查看当前创作节奏，并回到最需要推进的一步。',
    [tabs.creatorProjects]: '管理每支视频的制作步骤；本阶段不与个人任务合并。',
    [tabs.creatorCollection]: '收集灵感视频，在同一张卡中补全对标资料并开始拆解。',
    [tabs.breakdown]: '按故事、情绪和传播维度，拆解对标视频的脚本结构。',
    [tabs.creatorMaterials]: '沉淀并复用创作中常用的提示词与参考资料。',
    [tabs.creatorReview]: '回看创作过程中的阶段记录与学习沉淀。',
    [tabs.notes]: `共 ${notes.length} 篇笔记，记录想法并决定内容是否公开。`,
    [tabs.tasks]: `今天有 ${todayTasks.length} 项任务，任务列表、日历和四象限都集中在这里。`,
  }[activeTab];

  return (
    <section className={`workspace-frame workspace-theme-${theme}`}>
      <aside className="workspace-sidebar">
        <div className="workspace-mode-switcher" role="tablist" aria-label="工作模式">
          <button type="button" role="tab" aria-selected={!isCreatorTab} className={!isCreatorTab ? 'active' : ''} onClick={() => setActiveTab(tabs.dashboard)}>个人管理</button>
          <button type="button" role="tab" aria-selected={isCreatorTab} className={isCreatorTab ? 'active' : ''} onClick={() => setActiveTab(tabs.creator)}>创作工作室</button>
        </div>

        <nav className="workspace-nav" aria-label={isCreatorTab ? '创作工作室导航' : '个人管理导航'}>
          {isCreatorTab ? <>
            <SidebarButton icon={Target} label="创作概览" active={activeTab === tabs.creator} onClick={() => setActiveTab(tabs.creator)} />
            <SidebarButton icon={Film} label="项目" active={activeTab === tabs.creatorProjects} onClick={() => setActiveTab(tabs.creatorProjects)} />
            <SidebarButton icon={BookmarkPlus} label="灵感视频" active={activeTab === tabs.creatorCollection} onClick={() => setActiveTab(tabs.creatorCollection)} />
            <SidebarButton icon={Scissors} label="拆解学习" active={activeTab === tabs.breakdown} onClick={() => setActiveTab(tabs.breakdown)} />
            <SidebarButton icon={LibraryBig} label="素材库" active={activeTab === tabs.creatorMaterials} onClick={() => setActiveTab(tabs.creatorMaterials)} />
            <SidebarButton icon={Sparkles} label="复盘" active={activeTab === tabs.creatorReview} onClick={() => setActiveTab(tabs.creatorReview)} />
          </> : <>
            <SidebarButton icon={House} label="今日" active={activeTab === tabs.dashboard} onClick={() => setActiveTab(tabs.dashboard)} />
            <SidebarButton icon={CheckCircle2} label="任务" active={activeTab === tabs.tasks} onClick={() => setActiveTab(tabs.tasks)} />
            <SidebarButton icon={NotebookPen} label="笔记" active={activeTab === tabs.notes} onClick={() => setActiveTab(tabs.notes)} />
            <SidebarButton icon={Wifi} label="订阅" active={activeTab === tabs.subscriptions} onClick={() => setActiveTab(tabs.subscriptions)} />
          </>}
        </nav>

        <div className="workspace-sidebar-footer">
          <button
            className={activeTab === tabs.publicNotes ? 'sidebar-settings-entry active' : 'sidebar-settings-entry'}
            onClick={() => setActiveTab(tabs.publicNotes)}
          >
            <FileText size={19} />
            <span>公开笔记</span>
          </button>
          <button
            className={activeTab === tabs.profile ? 'sidebar-settings-entry active' : 'sidebar-settings-entry'}
            onClick={() => setActiveTab(tabs.profile)}
            aria-label="设置"
          >
            <Settings2 size={19} />
            <span>设置</span>
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

        {activeTab !== tabs.dashboard && activeTab !== tabs.creatorCollection && (
          <header className="workspace-heading compact-heading">
            <div>
              <h1>{workspaceTitle}</h1>
              {workspaceDescription && <p className="auth-state">{workspaceDescription}</p>}
            </div>
          </header>
        )}

        {message && <p className="form-message global-message">{message}</p>}
        {isLoading && <p className="form-message global-message">正在读取数据...</p>}

        {activeTab === tabs.dashboard && (
          <Dashboard notes={notes} tasks={tasks} onOpenTasks={() => setActiveTab(tabs.tasks)} onOpenNotes={() => setActiveTab(tabs.notes)} />
        )}
        {activeTab === tabs.creator && <CreatorDashboard view="overview" />}
        {activeTab === tabs.creatorProjects && <CreatorDashboard view="projects" />}
        {activeTab === tabs.creatorCollection && <VideoCollectionPanel onOpenBreakdown={(video) => { setSelectedCollectionVideo(video); setActiveTab(tabs.breakdown); }} />}
        {activeTab === tabs.creatorMaterials && <CreatorDashboard view="materials" />}
        {activeTab === tabs.creatorReview && <CreatorDashboard view="review" />}
        {activeTab === tabs.notes && (
          <NotesPanel session={session} notes={notes} setNotes={setNotes} setMessage={setMessage} />
        )}
        {activeTab === tabs.tasks && (
          <TasksPanel session={session} tasks={tasks} setTasks={setTasks} setMessage={setMessage} />
        )}
        {activeTab === tabs.breakdown && <ScriptBreakdownPanel collectionVideo={selectedCollectionVideo} />}
        {activeTab === tabs.subscriptions && (
          <SubscriptionsPanel session={session} setMessage={setMessage} />
        )}
        {activeTab === tabs.publicNotes && (
          <PublicNotesPage session={session} profile={profile} onLogin={onLogin} embedded />
        )}
        {activeTab === tabs.profile && (
          <ProfilePanel
            session={session}
            profile={profile}
            onProfileChange={onProfileChange}
            setMessage={setMessage}
            theme={theme}
            setTheme={setTheme}
            onSignOut={onSignOut}
          />
        )}
      </div>
      <ScrollToTopButton />
    </section>
  );
}

function ScrollToTopButton() {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const updateProgress = () => {
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(documentHeight > 0 ? Math.round((window.scrollY / documentHeight) * 100) : 0);
    };

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, []);

  if (progress <= 50) return null;

  return (
    <button
      className="scroll-top-button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label={`回到顶部，当前浏览进度 ${progress}%`}
      title={`回到顶部 · ${progress}%`}
      style={{ '--scroll-progress': `${progress * 3.6}deg` }}
    >
      <span className="scroll-top-button-surface">
        <ArrowUp size={18} aria-hidden="true" />
      </span>
    </button>
  );
}

function SidebarButton({ icon: Icon, label, active = false, onClick }) {
  return (
    <button className={active ? 'sidebar-nav-button active' : 'sidebar-nav-button'} onClick={onClick} aria-label={label}>
      <Icon size={19} />
      <span>{label}</span>
    </button>
  );
}

function parseDouyinAuthorProfile(value) {
  const match = typeof value === 'string'
    ? value.trim().match(/^\[([^\]]+)\]\((https:\/\/[^\s)]+)\)$/)
    : null;
  if (!match) return null;

  try {
    const url = new URL(match[2]);
    const isDouyinProfile = url.protocol === 'https:'
      && ['douyin.com', 'www.douyin.com'].includes(url.hostname)
      && url.pathname.startsWith('/user/');
    return isDouyinProfile ? { label: match[1].trim(), href: url.href } : null;
  } catch {
    return null;
  }
}

const scriptBreakdownNavItems = [
  { id: 'script-breakdown-video-type', label: '视频类型' },
  { id: 'script-breakdown-universal', label: '通用传播维度' },
  { id: 'script-breakdown-structure', label: '剧情结构' },
  { id: 'script-breakdown-extra', label: '补充维度' },
  { id: 'script-breakdown-ai', label: 'AI 独立拆解' },
  { id: 'script-breakdown-compare', label: '颜色对照' },
];

function ScriptBreakdownPanel({ collectionVideo = null }) {
  const formRef = React.useRef(null);
  const draftSaveTimerRef = React.useRef(null);
  const [minimapState, setMinimapState] = React.useState({ visible: false, activeIndex: 0 });
  const [isExportOpen, setIsExportOpen] = React.useState(false);
  const [exportLocation, setExportLocation] = React.useState('picker');
  const [exportFormat, setExportFormat] = React.useState('md');
  const [exportFileName, setExportFileName] = React.useState('脚本拆解');
  const [notice, setNotice] = React.useState('');
  const [comparison, setComparison] = React.useState(null);
  const defaultBenchmarkPrompts = {
    youtube: '请根据 YouTube / YouTube Shorts 视频链接，提取公开资料，并严格按以下格式逐行输出。不要添加表格、序号、解释或代码块。\n\n视频标题：仅保留标题正文，不包含任何 # 标签\n视频标签：去掉 #；剔除与频道名称相同的标签；多项用 、 分隔\n视频链接：原始视频链接\n背景音乐：歌曲或音乐名称；无法确认请写不可用\n视频时长：\n频道名称：使用 @频道 Handle\n频道主页链接：https://www.youtube.com/@频道Handle\n播放量：\n点赞量：\n评论量：\n\n无法可靠获取的字段请写“不可用”，不要猜测。\n\n视频链接：{{视频链接}}',
    douyin: '我会提供一条抖音视频链接和一张视频详情截图。请结合链接与截图提取公开资料，并严格按以下格式逐行输出。不要添加表格、序号、解释或代码块。\n\n截图优先用于识别背景音乐、点赞量、评论量、收藏量和转发量；请只读取截图中清晰可见的数据。\n\n视频标题：优先读取作者昵称下方的视频发布文案第一句，去掉后续 # 标签；不要把封面、暂停画面、视频内容里的字幕或大字当作标题。若发布文案只有一句，视频标题和视频简介可以相同\n视频简介：\n视频标签：去掉 #；如果标签与频道名称相同则剔除\n视频链接：{{视频链接}}\n发布者：严格使用 Markdown 链接格式 [@昵称](https://www.douyin.com/user/...)\n背景音乐：\n点赞量：\n评论量：\n收藏量：\n转发量：\n\n无法可靠获取或截图中看不清的字段请写“不可用”，不要猜测。',
  };
  const [benchmarkPromptTemplates, setBenchmarkPromptTemplates] = React.useState(defaultBenchmarkPrompts);
  const [isBenchmarkPromptSettingsOpen, setIsBenchmarkPromptSettingsOpen] = React.useState(false);
  const [promptSettingsPlatform, setPromptSettingsPlatform] = React.useState('youtube');
  const [isBenchmarkMetadataPasteOpen, setIsBenchmarkMetadataPasteOpen] = React.useState(false);
  const [benchmarkMetadataPasteText, setBenchmarkMetadataPasteText] = React.useState('');
  const [benchmarkVideoUrl, setBenchmarkVideoUrl] = React.useState('');
  const [benchmarkPlatform, setBenchmarkPlatform] = React.useState('youtube');
  const [selectedVideoType, setSelectedVideoType] = React.useState('');
  const [videoTypeValues, setVideoTypeValues] = React.useState({});
  const [structureMode, setStructureMode] = React.useState('shots');
  const createCoreEventChainRow = (id) => ({
    id,
    startName: `core-event-chain-${id}-start`,
    endName: `core-event-chain-${id}-end`,
    startPlaceholder: '',
    endPlaceholder: '',
    timeStartName: `core-event-chain-${id}-time-start`,
    timeEndName: `core-event-chain-${id}-time-end`,
    timeStartPlaceholder: '',
    timeEndPlaceholder: '',
    contentName: `core-event-chain-${id}-content`,
    taskName: `core-event-chain-${id}-task`,
    psychologyName: `core-event-chain-${id}-psychology`,
  });
  const [coreEventChainRows, setCoreEventChainRows] = React.useState(() => [1, 2, 3].map(createCoreEventChainRow));
  const [aiBreakdownValues, setAiBreakdownValues] = React.useState({});
  const [aiDistributionSummary, setAiDistributionSummary] = React.useState(null);
  const [draftRevision, setDraftRevision] = React.useState(0);
  const [isDraftReady, setIsDraftReady] = React.useState(false);

  React.useEffect(() => {
    const updateMinimap = () => {
      const panel = formRef.current?.closest('.script-breakdown-panel');
      if (!panel) return;

      const viewportAnchor = window.innerHeight * 0.5;
      const activeIndex = scriptBreakdownNavItems.reduce((currentIndex, item, index) => {
        const target = document.getElementById(item.id);
        return target && target.getBoundingClientRect().top <= viewportAnchor ? index : currentIndex;
      }, 0);
      const nextState = {
        visible: true,
        activeIndex,
      };

      setMinimapState((current) => (
        current.visible === nextState.visible
        && current.activeIndex === nextState.activeIndex
          ? current
          : nextState
      ));
    };

    updateMinimap();
    window.addEventListener('scroll', updateMinimap, { passive: true });
    window.addEventListener('resize', updateMinimap);
    return () => {
      window.removeEventListener('scroll', updateMinimap);
      window.removeEventListener('resize', updateMinimap);
    };
  }, [comparison, coreEventChainRows.length, draftRevision, isExportOpen, selectedVideoType, structureMode]);

  const resizeTextareaElement = (textarea) => {
    if (!textarea.value.trim()) {
      textarea.style.height = '';
      return;
    }

    textarea.style.height = 'auto';
    const lineHeight = Number.parseFloat(window.getComputedStyle(textarea).lineHeight) || 21;
    textarea.style.height = `${textarea.scrollHeight + lineHeight}px`;
  };

  const resizeTextarea = (event) => resizeTextareaElement(event.currentTarget);

  const scrollToBreakdownSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const updateTextareaValue = (textarea, nextValue, selectionStart, selectionEnd = selectionStart) => {
    const nativeValueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    if (nativeValueSetter) nativeValueSetter.call(textarea, nextValue);
    else textarea.value = nextValue;

    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    resizeTextareaElement(textarea);
    textarea.focus();
    textarea.setSelectionRange(selectionStart, selectionEnd);
  };

  const TextFormattingToolbar = () => {
    const getTextarea = (event) => event.currentTarget.closest('.script-breakdown-field')?.querySelector('textarea');
    const keepTextareaFocused = (event) => event.preventDefault();
    const insertText = (event, text) => {
      const textarea = getTextarea(event);
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const nextValue = `${textarea.value.slice(0, start)}${text}${textarea.value.slice(end)}`;
      updateTextareaValue(textarea, nextValue, start + text.length);
    };
    const insertNextNumber = (event) => {
      const textarea = getTextarea(event);
      if (!textarea) return;

      const start = textarea.selectionStart;
      const currentLineStart = textarea.value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
      const previousNumbers = [...textarea.value.slice(0, currentLineStart).matchAll(/(?:^|\n)(\d+)\.\s/g)].map((match) => Number(match[1]));
      const number = previousNumbers.length ? Math.max(...previousNumbers) + 1 : 1;
      insertText(event, `${number}. `);
    };
    const wrapSelectionWithBold = (event) => {
      const textarea = getTextarea(event);
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.slice(start, end);
      const nextValue = `${textarea.value.slice(0, start)}**${selectedText}**${textarea.value.slice(end)}`;
      const nextCursor = start + 2;
      updateTextareaValue(textarea, nextValue, nextCursor, selectedText ? end + 2 : nextCursor);
    };

    return (
      <div className="text-format-toolbar" role="toolbar" aria-label="快捷输入工具栏">
        <span className="text-format-toolbar-label">快捷输入</span>
        <button type="button" onMouseDown={keepTextareaFocused} onClick={insertNextNumber} title="插入下一序号">1.</button>
        <button type="button" className="text-format-toolbar-bold" onMouseDown={keepTextareaFocused} onClick={wrapSelectionWithBold} title="给选中文字加粗">B</button>
        <span className="text-format-toolbar-emojis" aria-label="常用表情">
          {['⭐', '➡️', '💡', '✅', '❌', '⁉️', '❤️'].map((emoji) => (
            <button type="button" key={emoji} onMouseDown={keepTextareaFocused} onClick={(event) => insertText(event, emoji)} aria-label={`插入 ${emoji}`}>{emoji}</button>
          ))}
        </span>
      </div>
    );
  };

  const detectBenchmarkPlatform = (value) => {
    const normalizedValue = value.trim().toLowerCase();
    if (!normalizedValue) return 'youtube';

    try {
      const hostname = new URL(normalizedValue).hostname.replace(/^www\./, '');
      if (hostname === 'youtu.be' || hostname === 'youtube.com' || hostname.endsWith('.youtube.com')) return 'youtube';
      if (hostname === 'douyin.com' || hostname.endsWith('.douyin.com') || hostname.endsWith('iesdouyin.com')) return 'douyin';
    } catch {
      if (/(^|\.)youtu\.be\b|(^|\.)youtube\.com\b/.test(normalizedValue)) return 'youtube';
      if (/douyin\.com\b|iesdouyin\.com\b/.test(normalizedValue)) return 'douyin';
    }

    return 'youtube';
  };

  const normalizeDouyinVideoUrl = (value) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) return '';

    try {
      const url = new URL(trimmedValue);
      const isDouyinUrl = url.protocol === 'https:'
        && (url.hostname === 'douyin.com' || url.hostname.endsWith('.douyin.com'));
      if (!isDouyinUrl) return trimmedValue;

      const detailVideoId = url.searchParams.get('modal_id')
        || url.pathname.match(/^\/video\/(\d+)/)?.[1];
      return detailVideoId ? `https://www.douyin.com/video/${detailVideoId}` : trimmedValue;
    } catch {
      return trimmedValue;
    }
  };

  const benchmarkPlatformOptions = [
    { value: 'youtube', label: 'YouTube' },
    { value: 'douyin', label: '抖音' },
  ];

  const videoTypeOptions = [
    {
      value: 'reversal',
      label: '爽剧 / 反转打脸',
      description: '看受虐、逆袭与爽感落点',
      fields: [
        { name: 'video-type-reversal-setback', title: '受虐 / 憋屈点', hint: '主角受到了什么不公、嘲笑或陷害？', placeholder: '写下让观众产生同情和愤怒的起点。' },
        { name: 'video-type-reversal-turn', title: '反转爆发点', hint: '主角如何瞬间逆袭？', placeholder: '写下出人意料的证据、身份或武力。' },
        { name: 'video-type-reversal-villain', title: '反派反应', hint: '真相揭开后，对方有什么变化？', placeholder: '写下尴尬、惊恐或失语等爽感落点。' },
        { name: 'video-type-reversal-highlight', title: '金句 / 高光动作', hint: '哪句台词或哪个动作最有记忆点？', placeholder: '写下帅气台词或绝杀动作。' },
      ],
    },
    {
      value: 'comedy',
      label: '搞笑 / 整蛊剧情',
      description: '看冲突、包袱与递进节奏',
      fields: [
        { name: 'video-type-comedy-conflict', title: '荒诞规则 / 冲突', hint: '发生了什么日常中不会如此极端的事？', placeholder: '写下故事的反常规则或冲突。' },
        { name: 'video-type-comedy-response', title: '主角的脑洞对策', hint: '为了应付检查或难题，主角用了什么歪招？', placeholder: '写下聪明或愚蠢却出人意料的对策。' },
        { name: 'video-type-comedy-punchline', title: '抓包 / 打脸包袱', hint: '笑点是如何抖出来的？', placeholder: '写下被识破、反差或翻车的瞬间。' },
        { name: 'video-type-comedy-escalation', title: '重复与递进', hint: '是否重复 2—3 次，并且一次更夸张？', placeholder: '写下“三翻四抖”的节奏变化。' },
      ],
    },
    {
      value: 'emotion',
      label: '情感 / 共鸣 / 微小说',
      description: '看现实痛点、情绪爆发与升华',
      fields: [
        { name: 'video-type-emotion-pain-point', title: '故事内核/选题', hint: '梳理完整剧情，总结视频传递的深层内涵和创作立意', placeholder: '重点不是照搬原作品，而是找到其中已经被验证过的情绪母题\n例如：陌生人的善意；亲情与遗憾；小人物的坚持；身份反差；误解与反转；熟悉人物遇到现代问题。' },
      ],
    },
    {
      value: 'other',
      label: '其他',
      description: '按自己的观察重点自由拆解',
      fields: [
        { name: 'video-type-other-dimensions', title: '自定义拆解维度', hint: '你最想从哪些角度看这个视频？', placeholder: '如：节奏设计、镜头语言、知识点安排。' },
        { name: 'video-type-other-analysis', title: '拆解内容', hint: '围绕上面的维度写下你的观察。', placeholder: '填写你的拆解内容。' },
      ],
    },
  ];
  const activeVideoType = videoTypeOptions.find((option) => option.value === selectedVideoType);

  const universalFields = [
    {
      title: '黄金开头',
      placeholder: '记录前 3 秒给出的钩子：冲突、意外、危险、损失、反常结果；再补一句“观众为什么会继续看”。',
      accent: true,
    },
    {
      title: '节奏与留存',
      placeholder: '记录信息/情绪如何推进：哪里抛出新问题、哪里给小回报、哪里可能拖沓，以及中段如何避免观众划走。',
      accent: true,
    },
    {
      title: '互动点',
      placeholder: '记录最容易引发评论的位置：争议判断、代入式提问、站队、开放结局或反常观点；可补充是否明确引导评论。',
      accent: true,
    },
  ];

  const fields = [
    {
      title: '核心事件链',
      hint: '一段完整梗概，简述事件顺序是什么。',
      placeholder: '一句话故事\n一段简述事件顺序的梗概',
      accent: true,
    },
    {
      title: '可复刻的结构公式',
      placeholder: '这个视频的结构公式是什么？对叙事结构进行抽象化提取\n一个反常请求→ 被人误解 →揭示隐藏原因 →陌生人的善意回应\n危险场景 →反常回答 → 逐层揭示身世 →陌生人提供帮助 →一句话释放情绪',
    },
    {
      title: '观众情绪曲线',
      hint: '状态怎么变化？',
      placeholder: '观众的感觉，情绪曲线\n感觉可以是紧张、感动、快乐、心疼、好笑或震惊，如：建立期待 → 制造冲突→推高情绪→反转或释放',
    },
    {
      title: '角色',
      hint: '写下主要角色、身份和关系。',
      placeholder: '角色为什么讨喜？有无反差？\n角色有没有清晰的身份、愿望和性格？\n观众是否知道“他是谁”“他想做什么”“为什么值得关心”？',
    },
    {
      title: '其他',
      placeholder: '补充其他观察或想法。',
    },
  ];

  const structureModeOptions = [
    { value: 'shots', label: '分镜' },
    { value: 'time', label: '时间' },
    { value: 'both', label: '分镜＋时间' },
  ];
  const activeStructureModeLabel = structureModeOptions.find((option) => option.value === structureMode)?.label || '分镜';

  const updateNextCoreEventStart = (rowIndex, event) => {
    const nextRow = coreEventChainRows[rowIndex + 1];
    const endShot = Number(event.currentTarget.value);
    if (!nextRow || !Number.isInteger(endShot) || endShot < 1) return;

    const nextStartInput = formRef.current?.elements.namedItem(nextRow.startName);
    if (nextStartInput && typeof nextStartInput.value === 'string') {
      nextStartInput.value = String(endShot + 1);
    }
  };

  const normalizeShortTime = (value) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) return '';

    const colonMatch = trimmedValue.match(/^(\d+):(\d{1,2})$/);
    const digits = colonMatch ? null : trimmedValue.replace(/\D/g, '');
    if (!colonMatch && !digits) return '';

    const minutes = colonMatch
      ? Number(colonMatch[1])
      : digits.length > 2
        ? Number(digits.slice(0, -2))
        : 0;
    const seconds = colonMatch
      ? Number(colonMatch[2])
      : Number(digits.slice(-2));
    const totalSeconds = (minutes * 60) + seconds;
    return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
  };

  const updateNextCoreEventTime = (rowIndex, event) => {
    const endTime = normalizeShortTime(event.currentTarget.value);
    if (!endTime) return;

    event.currentTarget.value = endTime;
    const nextRow = coreEventChainRows[rowIndex + 1];
    if (!nextRow) return;
    const nextStartInput = formRef.current?.elements.namedItem(nextRow.timeStartName);
    if (nextStartInput && typeof nextStartInput.value === 'string' && (!nextStartInput.value || nextStartInput.dataset.autoFilled === 'true')) {
      nextStartInput.value = endTime;
      nextStartInput.dataset.autoFilled = 'true';
    }
  };

  const formatCoreEventTime = (event) => {
    const normalizedTime = normalizeShortTime(event.currentTarget.value);
    if (normalizedTime) event.currentTarget.value = normalizedTime;
  };

  const addCoreEventChainRow = () => {
    const lastRow = coreEventChainRows.at(-1);
    const nextRow = createCoreEventChainRow(Math.max(...coreEventChainRows.map((row) => row.id)) + 1);
    const lastEndShot = Number(formRef.current?.elements.namedItem(lastRow?.endName)?.value);
    const lastEndTime = normalizeShortTime(formRef.current?.elements.namedItem(lastRow?.timeEndName)?.value || '');

    setCoreEventChainRows((rows) => [...rows, nextRow]);
    setComparison(null);

    window.requestAnimationFrame(() => {
      const nextStartShot = formRef.current?.elements.namedItem(nextRow.startName);
      const nextStartTime = formRef.current?.elements.namedItem(nextRow.timeStartName);
      if (nextStartShot && Number.isInteger(lastEndShot) && lastEndShot > 0) nextStartShot.value = String(lastEndShot + 1);
      if (nextStartTime && lastEndTime) {
        nextStartTime.value = lastEndTime;
        nextStartTime.dataset.autoFilled = 'true';
      }
    });
  };

  const removeLastCoreEventChainRow = () => {
    if (coreEventChainRows.length === 1) return;
    setCoreEventChainRows((rows) => rows.slice(0, -1));
    setComparison(null);
  };

  const getCoreEventRangeText = (row, formData, separator = '<br>') => {
    const shotRange = `${formData.get(row.startName)?.trim() || '（未填写）'} ~ ${formData.get(row.endName)?.trim() || '（未填写）'}`;
    const timeRange = `${formData.get(row.timeStartName)?.trim() || '（未填写）'} ~ ${formData.get(row.timeEndName)?.trim() || '（未填写）'}`;
    if (structureMode === 'time') return timeRange;
    if (structureMode === 'both') return `分镜：${shotRange}${separator}时间：${timeRange}`;
    return shotRange;
  };

  const getCoreEventRangeNames = (row) => {
    if (structureMode === 'time') return [row.timeStartName, row.timeEndName];
    if (structureMode === 'both') return [row.startName, row.endName, row.timeStartName, row.timeEndName];
    return [row.startName, row.endName];
  };

  const getCoreEventChainDetails = (formData) => coreEventChainRows
    .map((row) => `${activeStructureModeLabel}：${getCoreEventRangeText(row, formData, '\n')}\n内容：${formData.get(row.contentName)?.trim() || '（未填写）'}\n结构任务/镜头功能：${formData.get(row.taskName)?.trim() || '（未填写）'}\n观众心理：${formData.get(row.psychologyName)?.trim() || '（未填写）'}`)
    .join('\n\n');

  const getAiBreakdownSectionDefinitions = () => [
    ...(activeVideoType
      ? activeVideoType.fields.map((field, index) => ({
        id: `video-type-${field.name}`,
        label: `1.${index + 1} ${field.title}`,
        getOwn: (formData) => formData.get(field.name)?.trim() || '（未填写）',
      }))
      : []),
    ...universalFields.map((field, index) => ({
      id: `universal-${index + 1}`,
      label: `2.${index + 1} ${field.title}`,
      getOwn: (formData) => formData.get(field.title)?.trim() || '（未填写）',
    })),
    {
      id: 'story-structure',
      label: '3. 剧情结构',
      getOwn: getCoreEventChainDetails,
    },
    ...fields.map((field, index) => ({
      id: `field-${index + 5}`,
      label: `${index + 4}. ${field.title}`,
      getOwn: (formData) => formData.get(field.title)?.trim() || '（未填写）',
    })),
  ];

  const getAiBreakdownInputName = (id) => `ai-breakdown-${id}`;

  const getAiBreakdownSections = (formData) => getAiBreakdownSectionDefinitions().map((section) => ({
    ...section,
    own: section.getOwn(formData),
    ai: formData.get(getAiBreakdownInputName(section.id))?.trim() || '',
  }));

  const splitComparisonPoints = (value) => value
    .replace(/（未填写）/g, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

  const normalizeComparisonPoint = (value) => value
    .replace(/^\s*(?:[-+*•]|\d+[.、)）])\s*/, '')
    .replace(/[\s，,。！？!?；;：:“”"'‘’（）()【】\[\]]/g, '')
    .toLowerCase();

  const pointsMatch = (first, second) => {
    const normalizedFirst = normalizeComparisonPoint(first);
    const normalizedSecond = normalizeComparisonPoint(second);
    if (!normalizedFirst || !normalizedSecond) return false;
    return normalizedFirst === normalizedSecond
      || (Math.min(normalizedFirst.length, normalizedSecond.length) >= 8
        && (normalizedFirst.includes(normalizedSecond) || normalizedSecond.includes(normalizedFirst)));
  };

  const getColoredComparison = (section) => {
    const ownPoints = splitComparisonPoints(section.own);
    const aiPoints = splitComparisonPoints(section.ai);
    const ownExtra = ownPoints.filter((point) => !aiPoints.some((aiPoint) => pointsMatch(point, aiPoint)));
    const aiPointsWithStatus = aiPoints.map((point) => ({
      text: point,
      status: ownPoints.some((ownPoint) => pointsMatch(point, ownPoint)) ? 'same' : 'missing',
    }));

    return { ownExtra, aiPoints: aiPointsWithStatus };
  };

  const splitAiBreakdownIntoSections = (rawText, definitions) => {
    const lines = rawText.replace(/\r\n?/g, '\n').split('\n');
    const matchedHeadings = [];

    lines.forEach((line, lineIndex) => {
      const normalizedLine = line
        .replace(/^\s*(?:#{1,6}\s*)?(?:[-+*]\s*)?/, '')
        .replace(/\*\*|__/g, '')
        .trim();
      const section = definitions.find((item) => {
        if (!normalizedLine.startsWith(item.label)) return false;
        const followingCharacter = normalizedLine.charAt(item.label.length);
        return !followingCharacter || /[\s:：(（]/.test(followingCharacter);
      });
      if (!section || matchedHeadings.some((item) => item.section.id === section.id)) return;

      const remainder = normalizedLine.slice(section.label.length).trim();
      matchedHeadings.push({
        section,
        lineIndex,
        inlineContent: /^[：:]/.test(remainder) ? remainder.slice(1).trim() : '',
      });
    });

    return matchedHeadings.reduce((values, heading, index) => {
      const nextHeading = matchedHeadings[index + 1];
      const blockLines = lines.slice(heading.lineIndex + 1, nextHeading?.lineIndex);
      const content = [heading.inlineContent, ...blockLines].filter(Boolean).join('\n').trim();
      if (content) values[heading.section.id] = content;
      return values;
    }, {});
  };

  const renderInlineAiBreakdown = (id, label) => {
    const coloredComparison = comparison?.sections.find((section) => section.id === id)?.colored;

    return (
    <details className="inline-ai-breakdown">
      <summary>
        <strong>{coloredComparison ? 'AI 对照版' : 'AI 拆解'}</strong>
        <span>{coloredComparison ? '红色待补、灰色一致、蓝色是你的额外拆解' : '自动整理后显示在这里，也可手动补充'}</span>
      </summary>
      {coloredComparison ? (
        <div className="inline-ai-comparison" aria-label={`AI 对${label}的颜色对照`}>
          <p className="inline-ai-comparison-note">按换行和相同词句自动对照；颜色是提示，仍可回看或编辑 AI 原文。</p>
          {coloredComparison.aiPoints.length ? coloredComparison.aiPoints.map((point, index) => (
            <p className={`inline-ai-comparison-point is-${point.status}`} key={`${point.status}-${index}`}>
              <span>{point.status === 'missing' ? '待补' : '一致'}</span>
              {point.text}
            </p>
          )) : <p className="inline-ai-comparison-empty">AI 尚未整理到这一项。</p>}
          {coloredComparison.ownExtra.map((point, index) => (
            <p className="inline-ai-comparison-point is-extra" key={`extra-${index}`}>
              <span>你的额外拆解</span>
              {point}
            </p>
          ))}
          <details className="inline-ai-source">
            <summary>编辑 AI 原文</summary>
            <textarea
              name={getAiBreakdownInputName(id)}
              value={aiBreakdownValues[id] || ''}
              rows={3}
              placeholder={`AI 对“${label}”的拆解会显示在这里`}
              aria-label={`AI 对${label}的拆解`}
              onChange={(event) => {
                setAiBreakdownValues((values) => ({ ...values, [id]: event.target.value }));
                setComparison(null);
              }}
              onInput={resizeTextarea}
            />
          </details>
        </div>
      ) : (
        <textarea
          name={getAiBreakdownInputName(id)}
          value={aiBreakdownValues[id] || ''}
          rows={3}
          placeholder={`AI 对“${label}”的拆解会显示在这里`}
          aria-label={`AI 对${label}的拆解`}
          onChange={(event) => setAiBreakdownValues((values) => ({ ...values, [id]: event.target.value }))}
          onInput={resizeTextarea}
        />
      )}
    </details>
    );
  };

  const benchmarkMetadataFieldsByPlatform = {
    youtube: [
      { label: '视频标题', name: 'benchmark-video-title', placeholder: '不包含 # 标签', column: 'content' },
      { label: '视频标签', name: 'benchmark-video-tags', placeholder: '多个标签用 、 分隔', column: 'content' },
      { label: '视频链接', name: 'benchmark-video-url', placeholder: 'YouTube 视频链接', column: 'content' },
      { label: '背景音乐', name: 'benchmark-background-music', placeholder: '歌曲或音乐名称', column: 'content' },
      { label: '频道名称', name: 'benchmark-channel-name', placeholder: '如：@频道 Handle', column: 'content' },
      { label: '视频时长', name: 'benchmark-video-duration', placeholder: '如：00:32', column: 'metrics' },
      { label: '播放量', name: 'benchmark-view-count', placeholder: '如：12.3万', column: 'metrics' },
      { label: '点赞量', name: 'benchmark-like-count', placeholder: '如：8,420', column: 'metrics' },
      { label: '评论量', name: 'benchmark-comment-count', placeholder: '如：325', column: 'metrics' },
      { label: '频道主页链接', name: 'benchmark-channel-url', placeholder: 'https://www.youtube.com/@频道Handle', column: 'metrics' },
    ],
    douyin: [
      { label: '视频标题', name: 'benchmark-video-title', placeholder: '不包含 # 标签', column: 'content' },
      { label: '视频简介', name: 'benchmark-video-description', placeholder: '视频简介正文', column: 'content' },
      { label: '视频标签', name: 'benchmark-video-tags', placeholder: '多个标签用 、 分隔', column: 'content' },
      { label: '视频链接', name: 'benchmark-video-url', placeholder: '抖音视频链接', column: 'content' },
      { label: '发布者', name: 'benchmark-author', placeholder: '[@某某某](https://www.douyin.com/user/...)', column: 'metrics' },
      { label: '背景音乐', name: 'benchmark-background-music', placeholder: '歌曲或音乐名称', column: 'content' },
      { label: '点赞量', name: 'benchmark-like-count', placeholder: '如：8,420', column: 'metrics' },
      { label: '评论量', name: 'benchmark-comment-count', placeholder: '如：325', column: 'metrics' },
      { label: '收藏量', name: 'benchmark-favorite-count', placeholder: '如：1,260', column: 'metrics' },
      { label: '转发量', name: 'benchmark-share-count', placeholder: '如：320', column: 'metrics' },
    ],
  };
  const benchmarkMetadataFields = benchmarkMetadataFieldsByPlatform[benchmarkPlatform];
  const benchmarkMetadataColumns = [
    benchmarkMetadataFields.filter((field) => field.column === 'content'),
    benchmarkMetadataFields.filter((field) => field.column === 'metrics'),
  ];
  const activeBenchmarkPlatform = benchmarkPlatformOptions.find((option) => option.value === benchmarkPlatform) || benchmarkPlatformOptions[0];
  const activePromptSettingsPlatform = benchmarkPlatformOptions.find((option) => option.value === promptSettingsPlatform) || benchmarkPlatformOptions[0];
  const activePromptTemplate = benchmarkPromptTemplates[benchmarkPlatform] || defaultBenchmarkPrompts[benchmarkPlatform];
  const promptSettingsTemplate = benchmarkPromptTemplates[promptSettingsPlatform] || defaultBenchmarkPrompts[promptSettingsPlatform];
  const benchmarkAuthorProfile = parseDouyinAuthorProfile(formRef.current?.elements.namedItem('benchmark-author')?.value);

  React.useEffect(() => {
    try {
      const savedDraft = window.localStorage.getItem('script-breakdown-draft-v1');
      if (savedDraft && formRef.current) {
        const draft = JSON.parse(savedDraft);
        const restoredRowIds = Array.isArray(draft['core-event-chain-row-ids'])
          ? draft['core-event-chain-row-ids'].filter((id) => Number.isInteger(id) && id > 0)
          : [];
        if (restoredRowIds.length) setCoreEventChainRows(restoredRowIds.map(createCoreEventChainRow));
        Object.entries(draft).forEach(([name, value]) => {
          const control = formRef.current.elements.namedItem(name);
          if (control && typeof control.value === 'string') control.value = value;
        });
        if (restoredRowIds.length) {
          window.requestAnimationFrame(() => {
            Object.entries(draft).forEach(([name, value]) => {
              const control = formRef.current?.elements.namedItem(name);
              if (control && typeof control.value === 'string') control.value = value;
            });
          });
        }
        const restoredVideoType = videoTypeOptions.find((option) => option.value === draft['video-type']);
        if (restoredVideoType) setSelectedVideoType(restoredVideoType.value);
        if (structureModeOptions.some((option) => option.value === draft['structure-mode'])) {
          setStructureMode(draft['structure-mode']);
        }
        const restoredBenchmarkVideoUrl = typeof draft['benchmark-video'] === 'string' ? draft['benchmark-video'] : '';
        setBenchmarkVideoUrl(restoredBenchmarkVideoUrl);
        setBenchmarkPlatform(detectBenchmarkPlatform(restoredBenchmarkVideoUrl));
        const restoredVideoTypeValues = Object.fromEntries(
          videoTypeOptions
            .flatMap((option) => option.fields)
            .filter((field) => typeof draft[field.name] === 'string')
            .map((field) => [field.name, draft[field.name]]),
        );
        setVideoTypeValues(restoredVideoTypeValues);
        const restoredAiBreakdownValues = Object.fromEntries(
          Object.entries(draft)
            .filter(([name, value]) => name.startsWith('ai-breakdown-') && typeof value === 'string')
            .map(([name, value]) => [name.replace(/^ai-breakdown-/, ''), value]),
        );
        setAiBreakdownValues(restoredAiBreakdownValues);
        setNotice('已恢复上次保存的练习');
      }

      const savedYouTubePrompt = window.localStorage.getItem('benchmark-video-prompt-youtube-v1') || window.localStorage.getItem('benchmark-video-prompt-v1');
      const savedDouyinPrompt = window.localStorage.getItem('benchmark-video-prompt-douyin-v1');
      if (savedYouTubePrompt || savedDouyinPrompt) {
        setBenchmarkPromptTemplates((templates) => ({
          ...templates,
          ...(savedYouTubePrompt ? { youtube: savedYouTubePrompt } : {}),
          ...(savedDouyinPrompt ? { douyin: savedDouyinPrompt } : {}),
        }));
      }
    } catch {
      // 本地草稿读取失败时仍保持空白练习表单。
    } finally {
      setIsDraftReady(true);
    }
  }, []);

  React.useEffect(() => {
    if (!collectionVideo || !isDraftReady || !formRef.current) return;
    const platform = detectBenchmarkPlatform(collectionVideo.url);
    const displayVideoUrl = platform === 'douyin' ? normalizeDouyinVideoUrl(collectionVideo.url) : collectionVideo.url;
    const collectionCategoryToVideoType = {
      '情绪': 'emotion',
      '反转打脸爽剧': 'reversal',
      '搞笑整蛊': 'comedy',
    };
    const carriedVideoType = collectionCategoryToVideoType[collectionVideo.category] || '';
    const benchmarkControl = formRef.current.elements.namedItem('benchmark-video');
    const titleControl = formRef.current.elements.namedItem('title');
    if (benchmarkControl && typeof benchmarkControl.value === 'string') benchmarkControl.value = displayVideoUrl;
    if (titleControl && typeof titleControl.value === 'string' && !titleControl.value.trim()) titleControl.value = collectionVideo.title;
    setBenchmarkVideoUrl(displayVideoUrl);
    setBenchmarkPlatform(platform);
    setSelectedVideoType(carriedVideoType);
    setDraftRevision((revision) => revision + 1);
    setNotice(carriedVideoType
      ? `已带入「${collectionVideo.title}」，并自动选中对应的视频类型。`
      : `已带入「${collectionVideo.title}」，请按内容选择视频类型。`);
  }, [collectionVideo, isDraftReady]);

  React.useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  React.useEffect(() => {
    if (!isDraftReady) return undefined;

    const frame = window.requestAnimationFrame(() => {
      formRef.current?.querySelectorAll('.core-event-chain-table textarea').forEach(resizeTextareaElement);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [coreEventChainRows, isDraftReady]);

  const getScriptFormData = () => {
    const formData = new FormData(formRef.current);
    formData.set('video-type', selectedVideoType);
    formData.set('structure-mode', structureMode);
    Object.entries(videoTypeValues).forEach(([name, value]) => formData.set(name, value));
    Object.entries(aiBreakdownValues).forEach(([id, value]) => formData.set(`ai-breakdown-${id}`, value));
    return formData;
  };

  const buildExportContent = () => {
    const formData = getScriptFormData();
    const title = formData.get('title')?.trim() || '脚本拆解';
    const collectionMetadata = collectionVideo?.details?.metadata || {};
    const benchmarkDetails = getBenchmarkMetadataFields(benchmarkVideoUrl)
      .map((field) => `${field.label}：${collectionMetadata[field.name]?.trim() || '（未填写）'}`)
      .join('\n');
    const videoTypeDetails = activeVideoType
      ? activeVideoType.fields.map((field) => `#### ${field.title}\n\n${formData.get(field.name)?.trim() || '（未填写）'}`).join('\n\n')
      : '';
    const universalDetails = universalFields
      .map((field) => `### ${field.title}\n\n${formData.get(field.title)?.trim() || '（未填写）'}`)
      .join('\n\n');
    const coreEventChainTable = [
      `${activeStructureModeLabel} | 内容 | 结构任务/镜头功能 | 观众心理`,
      '--- | --- | --- | ---',
      ...coreEventChainRows.map((row) => [
        getCoreEventRangeText(row, formData),
        formData.get(row.contentName)?.trim() || '（未填写）',
        formData.get(row.taskName)?.trim() || '（未填写）',
        formData.get(row.psychologyName)?.trim() || '（未填写）',
      ].map((value) => String(value).replaceAll('|', '\\|')).join(' | ')),
    ].map((row) => `| ${row} |`).join('\n');
    const sections = fields.map((field, index) => `## ${index + 4}. ${field.title}\n\n${formData.get(field.title)?.trim() || '（未填写）'}`);
    const markdown = [
      `# ${title}`,
      '',
      '## 1. 对标视频',
      '',
      formData.get('benchmark-video')?.trim() || '（未填写）',
      '',
      '### 视频资料',
      '',
      benchmarkDetails || '（未填写）',
      '',
      '## 1. 视频类型',
      '',
      activeVideoType?.label || '（未选择）',
      ...(videoTypeDetails ? ['', '### 拆解维度', '', videoTypeDetails] : []),
      '',
      '## 2. 通用传播维度',
      '',
      universalDetails,
      '',
      '## 3. 剧情结构',
      '',
      coreEventChainTable,
      '',
      ...sections,
      '',
    ].join('\n');
    return { markdown, title };
  };

  const getFormValues = () => ({
    ...Object.fromEntries(getScriptFormData().entries()),
    'core-event-chain-row-ids': coreEventChainRows.map((row) => row.id),
  });

  const persistDraft = (showNotice = false) => {
    try {
      const formValues = getFormValues();
      const hasDraftContent = selectedVideoType || Object.entries(formValues).some(([name, value]) => (
        name !== 'video-type'
        && name !== 'structure-mode'
        && name !== 'core-event-chain-row-ids'
        && typeof value === 'string'
        && value.trim()
      ));

      if (!hasDraftContent) {
        window.localStorage.removeItem('script-breakdown-draft-v1');
        if (showNotice) setNotice('当前练习为空，无需保存');
        return;
      }

      window.localStorage.setItem('script-breakdown-draft-v1', JSON.stringify(formValues));
      if (showNotice) setNotice('当前练习已保存在此浏览器');
    } catch {
      if (showNotice) setNotice('保存失败，请检查浏览器存储权限');
    }
  };

  React.useEffect(() => {
    if (!isDraftReady) return undefined;

    window.clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = window.setTimeout(() => persistDraft(), 800);
    return () => window.clearTimeout(draftSaveTimerRef.current);
  }, [
    aiBreakdownValues,
    benchmarkVideoUrl,
    coreEventChainRows,
    draftRevision,
    isDraftReady,
    selectedVideoType,
    structureMode,
    videoTypeValues,
  ]);

  React.useEffect(() => {
    if (!isDraftReady) return undefined;

    const saveBeforeLeaving = () => persistDraft();
    window.addEventListener('pagehide', saveBeforeLeaving);
    return () => window.removeEventListener('pagehide', saveBeforeLeaving);
  }, [aiBreakdownValues, benchmarkVideoUrl, coreEventChainRows, isDraftReady, selectedVideoType, structureMode, videoTypeValues]);

  const fillBenchmarkMetadata = (pastedText) => {
    if (!formRef.current) return 0;
    const parsedValues = new Map();
    pastedText.split(/\r?\n/).forEach((line) => {
      const normalizedLine = line
        .replace(/^\s*(?:[-+•]\s+|\d+[.)]\s+)?/, '')
        .replace(/[*_`]/g, '')
        .trim();
      const separatorIndex = normalizedLine.indexOf('：') >= 0 ? normalizedLine.indexOf('：') : normalizedLine.indexOf(':');
      if (separatorIndex < 0) return;

      const label = normalizedLine.slice(0, separatorIndex).trim();
      const value = normalizedLine.slice(separatorIndex + 1).trim();
      const matchingField = benchmarkMetadataFields.find((field) => field.label === label);
      if (matchingField) parsedValues.set(matchingField.name, value);
    });

    parsedValues.forEach((value, name) => {
      const control = formRef.current.elements.namedItem(name);
      const shouldNormalizeDouyinVideo = name === 'benchmark-video-url'
        && detectBenchmarkPlatform(value) === 'douyin';
      if (control && typeof control.value === 'string') {
        control.value = shouldNormalizeDouyinVideo ? normalizeDouyinVideoUrl(value) : value;
      }
    });
    return parsedValues.size;
  };

  const pasteBenchmarkMetadata = (event) => {
    const filledCount = fillBenchmarkMetadata(event.clipboardData.getData('text/plain'));
    if (!filledCount) return;
    event.preventDefault();
    setNotice(`已填入 ${filledCount} 项视频资料`);
  };

  const applyBenchmarkMetadataPasteText = (text) => {
    setBenchmarkMetadataPasteText(text);
    const filledCount = fillBenchmarkMetadata(text);
    if (!filledCount) return;

    setBenchmarkMetadataPasteText('');
    setIsBenchmarkMetadataPasteOpen(false);
    setNotice(`已填入 ${filledCount} 项视频资料`);
  };

  const handleBenchmarkMetadataPasteText = (event) => {
    event.preventDefault();
    applyBenchmarkMetadataPasteText(event.clipboardData.getData('text/plain'));
  };

  const copyBenchmarkMetadata = async () => {
    const formData = new FormData(formRef.current);
    const metadataText = benchmarkMetadataFields
      .map((field) => `${field.label}：${formData.get(field.name)?.trim() || ''}`)
      .join('\n');

    try {
      await navigator.clipboard.writeText(metadataText);
      setNotice('视频资料已复制');
    } catch {
      setNotice('复制失败，请允许浏览器访问剪贴板');
    }
  };

  const copyBenchmarkMetadataPrompt = async () => {
    const benchmarkVideo = new FormData(formRef.current).get('benchmark-video')?.trim();
    const prompt = activePromptTemplate.includes('{{视频链接}}')
      ? activePromptTemplate.replaceAll('{{视频链接}}', benchmarkVideo || '')
      : benchmarkVideo
        ? `视频链接：${benchmarkVideo}\n\n${activePromptTemplate}`
        : activePromptTemplate;

    try {
      await navigator.clipboard.writeText(prompt);
      setNotice(benchmarkVideo ? `${activeBenchmarkPlatform.label} 视频资料提示词已复制，已附视频链接` : `${activeBenchmarkPlatform.label} 视频资料提示词已复制`);
    } catch {
      setNotice('复制失败，请允许浏览器访问剪贴板');
    }
  };

  const saveBenchmarkPromptSettings = () => {
    try {
      window.localStorage.setItem(
        `benchmark-video-prompt-${promptSettingsPlatform}-v1`,
        promptSettingsTemplate.trim() || defaultBenchmarkPrompts[promptSettingsPlatform],
      );
      setIsBenchmarkPromptSettingsOpen(false);
      setNotice('视频资料提示词已保存');
    } catch {
      setNotice('保存失败，请检查浏览器存储权限');
    }
  };

  const resetBenchmarkPrompt = () => {
    setBenchmarkPromptTemplates((templates) => ({
      ...templates,
      [promptSettingsPlatform]: defaultBenchmarkPrompts[promptSettingsPlatform],
    }));
    window.localStorage.removeItem(`benchmark-video-prompt-${promptSettingsPlatform}-v1`);
    if (promptSettingsPlatform === 'youtube') window.localStorage.removeItem('benchmark-video-prompt-v1');
    setNotice('已恢复默认提示词');
  };

  const buildAiPrompt = () => {
    const formData = formRef.current ? getScriptFormData() : new FormData();
    const benchmarkVideo = formData.get('benchmark-video')?.trim();
    if (!benchmarkVideo) return '';

    const sectionList = [
      `1. 视频类型：${activeVideoType?.label || '未选择'}`,
      ...getAiBreakdownSectionDefinitions().map((section) => section.label),
    ].join('\n');
    return `请独立拆解下面这个对标视频的脚本，不要参考或复述我的答案。\n\n对标视频：${benchmarkVideo}\n\n请严格按以下编号和标题作答：每个标题必须单独占一行，标题文字和编号不要改写；标题下面再写内容。无法判断的项目写“（未分析）”。不要用表格，不要合并项目。\n\n${sectionList}\n\n重点说明故事如何展开、冲突在哪里出现、转折如何解决，以及声音与动作怎样分工。`;
  };

  const saveDraft = () => {
    persistDraft(true);
  };

  const archiveBreakdown = () => {
    const formValues = getFormValues();
    const title = formValues.title?.trim() || '未命名脚本拆解';
    const hasContent = selectedVideoType || Object.entries(formValues).some(([name, value]) => (
      name !== 'video-type'
      && name !== 'structure-mode'
      && name !== 'core-event-chain-row-ids'
      && typeof value === 'string'
      && value.trim()
    ));
    if (!hasContent) {
      setNotice('先填写一些拆解内容，再完成归档');
      return;
    }

    try {
      const archiveKey = 'script-breakdown-archives-v1';
      const existing = JSON.parse(window.localStorage.getItem(archiveKey) || '[]');
      const archivedAt = new Date().toISOString();
      const archive = {
        id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
        title,
        archivedAt,
        videoType: activeVideoType?.label || '未标记',
        structureMode: activeStructureModeLabel,
        shotRows: coreEventChainRows.length,
        values: formValues,
      };
      window.localStorage.setItem(archiveKey, JSON.stringify([archive, ...(Array.isArray(existing) ? existing : [])]));
      if (collectionVideo?.id) {
        const collectionKey = 'video-collection-v1';
        const collectionVideos = JSON.parse(window.localStorage.getItem(collectionKey) || '[]');
        if (Array.isArray(collectionVideos)) {
          window.localStorage.setItem(collectionKey, JSON.stringify(collectionVideos.map((video) => video.id === collectionVideo.id ? { ...video, status: 'archived', archivedAt } : video)));
        }
      }
      persistDraft();
      setNotice(`已完成并归档「${title}」，创作数据页会自动计入这条拆解`);
    } catch {
      setNotice('归档失败，请检查浏览器存储权限');
    }
  };

  const clearScriptBreakdown = () => {
    if (!window.confirm('确定清空当前脚本拆解的所有内容吗？此操作无法撤销。')) return;

    window.clearTimeout(draftSaveTimerRef.current);
    formRef.current?.reset();
    setIsExportOpen(false);
    setComparison(null);
    setSelectedVideoType('');
    setVideoTypeValues({});
    setStructureMode('shots');
    setCoreEventChainRows([1, 2, 3].map(createCoreEventChainRow));
    setAiBreakdownValues({});
    setAiDistributionSummary(null);
    setBenchmarkVideoUrl('');
    setBenchmarkPlatform('youtube');
    setIsBenchmarkMetadataPasteOpen(false);
    setBenchmarkMetadataPasteText('');
    setDraftRevision((revision) => revision + 1);
    window.localStorage.removeItem('script-breakdown-draft-v1');
    setNotice('已清空当前脚本拆解');
  };

  const copyAiPrompt = async () => {
    const prompt = buildAiPrompt();
    if (!prompt) {
      setNotice('请先粘贴对标视频链接');
      return;
    }

    try {
      await navigator.clipboard.writeText(prompt);
      setNotice('AI 拆解提示词已复制');
    } catch {
      setNotice('复制失败，请允许浏览器访问剪贴板');
    }
  };

  const distributeAiBreakdown = () => {
    const formData = getScriptFormData();
    const rawAiBreakdown = formData.get('ai-analysis')?.trim();
    if (!rawAiBreakdown) {
      setNotice('请先粘贴 AI 的完整拆解结果');
      return;
    }

    const definitions = getAiBreakdownSectionDefinitions();
    const distributedValues = splitAiBreakdownIntoSections(rawAiBreakdown, definitions);
    const matchedCount = Object.keys(distributedValues).length;

    if (!matchedCount) {
      setAiDistributionSummary({ matched: 0, total: definitions.length });
      setNotice('没有识别到对应标题；请让 AI 保留提示词中的编号和标题');
      return;
    }

    setAiBreakdownValues((values) => ({ ...values, ...distributedValues }));
    setAiDistributionSummary({ matched: matchedCount, total: definitions.length });
    setComparison(null);
    setNotice(`已整理 ${matchedCount}/${definitions.length} 项；其余原文仍保留在上方，可手动补充`);
  };

  const showComparison = () => {
    const formData = getScriptFormData();
    const hasCoreEventChain = coreEventChainRows.some((row) => [...getCoreEventRangeNames(row), row.contentName, row.taskName, row.psychologyName]
      .some((name) => formData.get(name)?.trim()));
    const hasOwnBreakdown = [...universalFields, ...fields].some((field) => formData.get(field.title)?.trim())
      || activeVideoType?.fields.some((field) => formData.get(field.name)?.trim())
      || hasCoreEventChain;
    const aiAnalysis = formData.get('ai-analysis')?.trim();

    if (!hasOwnBreakdown || !aiAnalysis) {
      setNotice('完成自己的拆解并粘贴 AI 结果后，才可以对比');
      return;
    }

    const sections = getAiBreakdownSections(formData);
    if (!sections.some((section) => section.ai)) {
      setNotice('请先点击“整理到各项”，或在对应项目下手动补充 AI 拆解');
      return;
    }

    const coloredSections = sections.filter((section) => section.ai).map((section) => ({
      ...section,
      colored: getColoredComparison(section),
    }));
    const summary = coloredSections.reduce((total, section) => ({
      same: total.same + section.colored.aiPoints.filter((point) => point.status === 'same').length,
      missing: total.missing + section.colored.aiPoints.filter((point) => point.status === 'missing').length,
      extra: total.extra + section.colored.ownExtra.length,
    }), { same: 0, missing: 0, extra: 0 });

    setComparison({
      title: formData.get('title')?.trim() || '本次脚本拆解',
      sections: coloredSections,
      summary,
    });
  };

  const openExportDialog = () => {
    const formData = new FormData(formRef.current);
    setExportFileName(formData.get('title')?.trim() || '脚本拆解');
    setIsExportOpen(true);
  };

  const downloadExport = (content, fileName, mimeType) => {
    const file = new Blob([content], { type: mimeType });
    const fileUrl = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(fileUrl);
  };

  const exportDocument = async () => {
    const { markdown } = buildExportContent();
    const extension = exportFormat === 'txt' ? 'txt' : 'md';
    const mimeType = extension === 'txt' ? 'text/plain;charset=utf-8' : 'text/markdown;charset=utf-8';
    const baseName = exportFileName.replace(/\.(md|txt)$/i, '').replace(/[\\/:*?"<>|]/g, '-').trim() || '脚本拆解';
    const fileName = `${baseName}.${extension}`;

    if (exportLocation === 'picker' && 'showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{ description: extension === 'md' ? 'Markdown' : '纯文本', accept: { [mimeType.split(';')[0]]: [`.${extension}`] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(markdown);
        await writable.close();
        setIsExportOpen(false);
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }

    downloadExport(markdown, fileName, mimeType);
    setIsExportOpen(false);
  };

  return (
    <section className="script-breakdown-panel" aria-label="脚本拆解">
      <aside
        className={minimapState.visible ? 'script-breakdown-minimap is-visible' : 'script-breakdown-minimap'}
        aria-label="脚本拆解导航"
      >
        {scriptBreakdownNavItems.map((item, index) => (
          <button
            className={index === minimapState.activeIndex ? 'is-active' : undefined}
            type="button"
            key={item.id}
            title={item.label}
            aria-label={`跳转至${item.label}`}
            aria-current={index === minimapState.activeIndex ? 'location' : undefined}
            onClick={() => scrollToBreakdownSection(item.id)}
          />
        ))}
      </aside>
      <div className="form-card-heading">
        <span className="section-icon section-icon-blue"><Scissors size={18} /></span>
        <div>
          <h2>脚本拆解</h2>
          <p>先自己拆解，再邀请 AI 独立作答，最后对照答案。</p>
        </div>
        <div className="script-breakdown-actions">
          <button className="script-breakdown-save" type="button" onClick={saveDraft}>
            <Save size={17} /> 保存
          </button>
          <button className="script-breakdown-export" type="button" onClick={archiveBreakdown}>
            <Database size={17} /> 完成并归档
          </button>
          <button className="script-breakdown-export" type="button" onClick={openExportDialog} aria-label="导出" title="导出">
            <Download size={18} /> 导出
          </button>
          <span className="script-breakdown-action-separator" aria-hidden="true" />
          <button className="script-breakdown-clear" type="button" onClick={clearScriptBreakdown}>
            <Trash2 size={17} /> 清空全部
          </button>
        </div>
      </div>
      {notice && <p className="script-breakdown-notice" role="status">{notice}</p>}
      {isExportOpen && (
        <section className="script-export-popover" aria-label="导出选项">
          <h3>导出</h3>
          <label>
            导出位置
            <select value={exportLocation} onChange={(event) => setExportLocation(event.target.value)}>
              <option value="picker">选择保存位置</option>
              <option value="download">浏览器默认下载位置</option>
            </select>
          </label>
          <label>
            导出格式
            <select value={exportFormat} onChange={(event) => setExportFormat(event.target.value)}>
              <option value="md">Markdown (.md)</option>
              <option value="txt">纯文本 (.txt)</option>
            </select>
          </label>
          <label>
            导出文件名
            <input value={exportFileName} onChange={(event) => setExportFileName(event.target.value)} />
          </label>
          <div className="script-export-actions">
            <button type="button" className="text-button" onClick={() => setIsExportOpen(false)}>取消</button>
            <button type="button" className="primary-button" onClick={exportDocument}>导出</button>
          </div>
        </section>
      )}
      <form
        className="form-stack script-breakdown-form"
        ref={formRef}
        onInput={() => setDraftRevision((revision) => revision + 1)}
        onSubmit={(event) => event.preventDefault()}
      >
        <input type="hidden" name="benchmark-video" value={benchmarkVideoUrl} readOnly />
        <label className="script-breakdown-title-field">
          <span>标题</span>
          <input name="title" placeholder="x月x日 脚本拆解v1" />
        </label>
        <section className="video-type-section" id="script-breakdown-video-type" aria-labelledby="video-type-title">
          <div className="video-type-heading">
            <div>
              <strong id="video-type-title">1. 视频类型</strong>
              <span>选择后展示对应的拆解维度</span>
            </div>
            {activeVideoType && <em>{activeVideoType.label}</em>}
          </div>
          <div className="video-type-options" role="group" aria-label="选择视频类型">
            {videoTypeOptions.map((option) => {
              const isSelected = option.value === selectedVideoType;
              return (
                <button
                  className={isSelected ? 'video-type-option selected' : 'video-type-option'}
                  key={option.value}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedVideoType(option.value);
                    setNotice(`已选择“${option.label}”，已填写内容会保留`);
                  }}
                >
                  <strong>{option.label}</strong>
                  <span>{option.description}</span>
                </button>
              );
            })}
          </div>
          {activeVideoType && (
            <div className="video-type-breakdown" aria-live="polite">
              <div className="video-type-breakdown-heading">
                <strong>拆解维度</strong>
                <span>{activeVideoType.description}</span>
              </div>
              {activeVideoType.fields.map((field, index) => (
                <div className="script-breakdown-field video-type-field" key={field.name}>
                  <label>
                    <span className="script-breakdown-label">
                      <strong>
                        2.{index + 1} {field.title}
                        {field.name === 'video-type-emotion-pain-point' && <span className="script-breakdown-priority-star" role="img" aria-label="重点维度">⭐</span>}
                      </strong>
                      <em>{field.hint}</em>
                    </span>
                    <textarea
                      name={field.name}
                      value={videoTypeValues[field.name] || ''}
                      rows={3}
                      placeholder={field.placeholder}
                      onChange={(event) => setVideoTypeValues((values) => ({ ...values, [field.name]: event.target.value }))}
                      onInput={resizeTextarea}
                    />
                  </label>
                  <TextFormattingToolbar />
                  {renderInlineAiBreakdown(`video-type-${field.name}`, `1.${index + 1} ${field.title}`)}
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="video-type-section universal-dimensions-section" id="script-breakdown-universal" aria-labelledby="universal-dimensions-title">
          <div className="video-type-heading">
            <div>
              <strong id="universal-dimensions-title">2. 通用传播维度</strong>
              <span>适用于所有视频类型的传播拆解</span>
            </div>
          </div>
          <div className="video-type-breakdown">
            {universalFields.map((field, index) => (
              <div className="script-breakdown-field video-type-field" key={field.title}>
                <label>
                  <span className="script-breakdown-label">
                    <strong className="script-breakdown-accent">
                      2.{index + 1} {field.title}
                      {index === 0 && <span className="script-breakdown-priority-star" role="img" aria-label="重点维度">⭐</span>}
                    </strong>
                  </span>
                  <textarea name={field.title} rows={3} placeholder={field.placeholder} onInput={resizeTextarea} />
                </label>
                <TextFormattingToolbar />
                {renderInlineAiBreakdown(`universal-${index + 1}`, `2.${index + 1} ${field.title}`)}
              </div>
            ))}
          </div>
        </section>
        <section className="core-event-chain-structure" id="script-breakdown-structure" aria-labelledby="core-event-chain-structure-title">
          <h3 id="core-event-chain-structure-title">3. 剧情结构 <span className="script-breakdown-priority-star" role="img" aria-label="重点维度">⭐</span></h3>
          <div className="core-event-chain-mode-switcher" role="group" aria-label="剧情结构填写方式">
            {structureModeOptions.map((option) => (
              <button
                className={structureMode === option.value ? 'active' : undefined}
                type="button"
                key={option.value}
                aria-pressed={structureMode === option.value}
                onClick={() => setStructureMode(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className={`core-event-chain-table mode-${structureMode}`}>
            <table>
            <colgroup>
              <col className="core-event-chain-range-column" />
              <col className="core-event-chain-content-column" />
              <col className="core-event-chain-task-column" />
              <col className="core-event-chain-psychology-column" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">分镜／时间</th>
                <th scope="col">内容</th>
                <th scope="col">结构任务/镜头功能</th>
                <th scope="col">观众心理</th>
              </tr>
            </thead>
            <tbody>
              {coreEventChainRows.map((row, rowIndex) => (
                <tr key={row.id}>
                  <th scope="row">
                    <span className="core-event-chain-ranges">
                      <span className="core-event-chain-range core-event-chain-shot-range">
                        <input type="number" min="1" inputMode="numeric" name={row.startName} placeholder={row.startPlaceholder} aria-label={`分镜起始编号，第 ${rowIndex + 1} 行`} />
                        <span>~</span>
                        <input type="number" min="1" inputMode="numeric" name={row.endName} placeholder={row.endPlaceholder} aria-label={`分镜结束编号，第 ${rowIndex + 1} 行`} onChange={(event) => updateNextCoreEventStart(rowIndex, event)} />
                      </span>
                      <span className="core-event-chain-range core-event-chain-time-range">
                        <input type="text" inputMode="numeric" name={row.timeStartName} placeholder={row.timeStartPlaceholder} aria-label={`时间起始，第 ${rowIndex + 1} 行`} onInput={(event) => { delete event.currentTarget.dataset.autoFilled; }} onBlur={formatCoreEventTime} />
                        <span>~</span>
                        <input type="text" inputMode="numeric" name={row.timeEndName} placeholder={row.timeEndPlaceholder} aria-label={`时间结束，第 ${rowIndex + 1} 行`} onBlur={(event) => updateNextCoreEventTime(rowIndex, event)} />
                      </span>
                    </span>
                  </th>
                  <td><textarea name={row.contentName} rows={1} aria-label={`内容，第 ${rowIndex + 1} 行`} onInput={resizeTextarea} /></td>
                  <td><textarea name={row.taskName} rows={1} aria-label={`结构任务/镜头功能，第 ${rowIndex + 1} 行`} onInput={resizeTextarea} /></td>
                  <td><textarea name={row.psychologyName} rows={1} aria-label={`观众心理，第 ${rowIndex + 1} 行`} onInput={resizeTextarea} /></td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
          <div className="core-event-chain-actions">
            <button className="core-event-chain-add-row" type="button" onClick={addCoreEventChainRow}>＋ 新增一行</button>
            <button className="core-event-chain-remove-row" type="button" onClick={removeLastCoreEventChainRow} disabled={coreEventChainRows.length === 1}>删除底行</button>
          </div>
          {renderInlineAiBreakdown('story-structure', '3. 剧情结构')}
        </section>
        {fields.map((field, index) => (
          <div className="script-breakdown-field" id={index === 0 ? 'script-breakdown-extra' : undefined} key={field.title}>
            <label>
              <span className="script-breakdown-label">
                <strong className={field.accent ? 'script-breakdown-accent' : undefined}>
                  {index + 4}. {field.title}
                  <span className="script-breakdown-priority-star" role="img" aria-label="重点维度">⭐</span>
                </strong>
                {field.hint && <em>{field.hint}</em>}
              </span>
              <textarea name={field.title} rows={3} placeholder={field.placeholder} onInput={resizeTextarea} />
            </label>
            <TextFormattingToolbar />
            {renderInlineAiBreakdown(`field-${index + 5}`, `${index + 4}. ${field.title}`)}
          </div>
        ))}
        <section className="ai-breakdown-step" id="script-breakdown-ai" aria-labelledby="ai-breakdown-title">
          <div className="ai-breakdown-step-heading">
            <div>
              <span className="script-breakdown-step-number">2</span>
              <h3 id="ai-breakdown-title">让 AI 独立拆解</h3>
            </div>
            <p>将 AI 的完整回答粘贴在这里，点击“整理到各项”后，系统会按对应维度放入各项下方的 AI 拆解框。原始回答会保留，方便随时回看。</p>
          </div>
          <div className="ai-prompt-control-row">
            <details className="ai-prompt-preview">
              <summary>AI 拆解提示词</summary>
              <textarea
                readOnly
                rows={8}
                value={buildAiPrompt()}
                placeholder="填写对标视频链接后，这里会生成 AI 拆解提示词"
                aria-label="AI 拆解提示词"
              />
            </details>
            <button className="script-breakdown-copy" type="button" onClick={copyAiPrompt}>
              <Copy size={17} /> 复制 AI 拆解提示词
            </button>
          </div>
          <label className="script-breakdown-field ai-result-field">
            <span className="script-breakdown-label ai-result-label">
              <span>
                <strong>AI 拆解结果</strong>
                <em>粘贴后点“整理到各项”；原始回答会始终保留。</em>
              </span>
              <button className="script-breakdown-distribute" type="button" onClick={distributeAiBreakdown}>
                <ClipboardPaste size={17} /> 整理到各项
              </button>
            </span>
            <textarea
              name="ai-analysis"
              rows={8}
              placeholder="在这里粘贴 AI 的脚本拆解回答"
              onInput={(event) => {
                resizeTextarea(event);
                setAiDistributionSummary(null);
                setComparison(null);
              }}
            />
          </label>
          {aiDistributionSummary && (
            <p className="ai-distribution-summary">
              已识别 {aiDistributionSummary.matched}/{aiDistributionSummary.total} 项；未识别内容仍保留在原始回答中。
            </p>
          )}
        </section>
        <section className="script-comparison-action" id="script-breakdown-compare" aria-label="对比答案">
          <div>
            <span className="script-breakdown-step-number">3</span>
            <h3>生成颜色对照</h3>
            <p>根据你的拆解与 AI 拆解，自动生成逐项对照：红色提示待补要点，灰色表示内容一致，蓝色标出你的额外拆解。结果直接显示在各项下方的“AI 对照版”中。</p>
          </div>
          <button className="primary-button script-compare-button" type="button" onClick={showComparison}>
            <Sparkles size={17} /> 生成颜色对照
          </button>
        </section>
      </form>
      {comparison && (
        <section className="script-comparison-panel" aria-labelledby="script-comparison-title">
          <div className="script-comparison-heading">
            <div>
              <span className="section-icon section-icon-purple"><Sparkles size={18} /></span>
              <h3 id="script-comparison-title">{comparison.title} · 对照已生成</h3>
            </div>
            <button className="text-button" type="button" onClick={() => setComparison(null)}>收起</button>
          </div>
          <p className="script-comparison-summary">颜色已放回每个项目下方的 AI 对照版，不再重复展示左右两栏。</p>
          <div className="script-comparison-totals" aria-label="本次颜色对照汇总">
            <span className="is-missing">红色待补 {comparison.summary.missing} 条</span>
            <span className="is-same">灰色一致 {comparison.summary.same} 条</span>
            <span className="is-extra">蓝色额外 {comparison.summary.extra} 条</span>
          </div>
        </section>
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

function Dashboard({ notes, tasks, onOpenTasks, onOpenNotes }) {
  const today = getToday();
  const ordinaryTasks = tasks.filter((task) => !isLongTermTask(task));
  const todayTasks = ordinaryTasks.filter((task) => task.task_date === today).sort(sortTasks);
  const longTermTasks = tasks
    .filter((task) => !isLongTermTask(task) && task.task_date > today && task.status !== 'completed')
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

  const ordinaryTasks = tasks.filter((task) => !isLongTermTask(task));
  const visibleTasks = filterTasks(ordinaryTasks, statusFilter, matrixFilter);
  const emptyText = getTaskListEmptyText(statusFilter, matrixFilter);

  return (
    <div className="tasks-page-layout">
      <div className="task-toolbar">
        <div className="task-view-switcher">
          <TabButton icon={ListTodo} label="任务列表" value={taskViews.list} activeTab={activeTaskView} onClick={setActiveTaskView} />
          <TabButton icon={CalendarDays} label="日历视图" value={taskViews.calendar} activeTab={activeTaskView} onClick={setActiveTaskView} />
          <TabButton icon={Database} label="四象限矩阵" value={taskViews.matrix} activeTab={activeTaskView} onClick={setActiveTaskView} />
          <TabButton icon={Flame} label="长期追踪" value={taskViews.longTerm} activeTab={activeTaskView} onClick={(view) => { setActiveTaskView(view); setIsCreateOpen(false); }} />
        </div>
        <button className="workspace-main-action" onClick={() => setIsCreateOpen((open) => !open)}>
          <Plus size={18} />
          {isCreateOpen ? '收起表单' : '新建任务'}
        </button>
      </div>

      {isCreateOpen && activeTaskView !== taskViews.longTerm && (
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

      {activeTaskView === taskViews.calendar && <CalendarPanel tasks={ordinaryTasks} />}
      {activeTaskView === taskViews.matrix && <MatrixPanel tasks={ordinaryTasks} setTasks={setTasks} setMessage={setMessage} />}
      {activeTaskView === taskViews.longTerm && (
        <LongTermTasksPanel
          session={session}
          tasks={tasks}
          setTasks={setTasks}
          setMessage={setMessage}
          isCreateOpen={isCreateOpen}
          setIsCreateOpen={setIsCreateOpen}
        />
      )}
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
  const activeCells = {
    important_urgent: 'top-left',
    important_not_urgent: 'top-right',
    urgent_not_important: 'bottom-left',
    not_urgent_not_important: 'bottom-right',
  };

  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none">
      {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((cell) => {
        const isActive = activeCells[value] === cell;
        const x = cell.endsWith('right') ? 12.5 : 3.5;
        const y = cell.startsWith('bottom') ? 12.5 : 3.5;
        return (
          <rect
            key={cell}
            x={x}
            y={y}
            width="8"
            height="8"
            rx="2"
            fill={isActive ? 'currentColor' : 'none'}
            opacity={isActive ? 1 : 0.62}
            stroke="currentColor"
            strokeWidth="1.65"
          />
        );
      })}
    </svg>
  );
}

function ProfilePanel({ session, profile, onProfileChange, setMessage, theme, setTheme, onSignOut }) {
  const [nickname, setNickname] = React.useState(profile?.nickname ?? '');
  const [isSaving, setIsSaving] = React.useState(false);
  const [isNicknameSaved, setIsNicknameSaved] = React.useState(false);

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
    setIsNicknameSaved(true);
    setMessage('昵称已更新。');
  }

  const isNicknameUnchanged = nickname.trim() === (profile?.nickname ?? '').trim();

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
      <form className="profile-nickname-form" onSubmit={handleSave}>
        <label htmlFor="nickname">昵称</label>
        <div className="profile-nickname-row">
          <input
            id="nickname"
            value={nickname}
            onChange={(event) => {
              setNickname(event.target.value);
              setIsNicknameSaved(false);
            }}
          />
          <button className="nickname-save-button" disabled={isSaving || isNicknameUnchanged}>
            {isSaving ? '保存中...' : isNicknameSaved ? '已保存' : '保存修改'}
          </button>
        </div>
      </form>
      <button className="profile-signout-button" onClick={onSignOut}>
        <LogOut size={17} />
        退出登录
      </button>
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

function PublicNotesPage({ session, profile, onLogin, embedded = false }) {
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
    <section className={embedded ? 'public-page embedded-public-page' : 'public-page'}>
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
      <p>{text}</p>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
