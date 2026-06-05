import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  Camera,
  Database,
  Download,
  Github,
  ImagePlus,
  Lock,
  LogIn,
  LogOut,
  Rocket,
  UserPlus,
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from './supabaseClient';
import './styles.css';

const pages = {
  home: 'home',
  login: 'login',
  register: 'register',
  notes: 'notes',
};

const steps = [
  {
    icon: LogIn,
    title: '登录账号',
    text: '现在这里已经接入 Supabase，可以开始测试注册和登录。',
  },
  {
    icon: Database,
    title: '保存笔记',
    text: '下一步会创建数据库表，把标题、正文、图片地址保存进去。',
  },
  {
    icon: ImagePlus,
    title: '上传图片',
    text: '后面图片会放进 Supabase Storage，再显示在笔记里。',
  },
];

const roadmap = [
  '先做能打开的网页',
  '上传代码到 GitHub',
  '用 Vercel 发布网站',
  '接入 Supabase 登录',
  '保存和读取自己的笔记',
  '加入图片上传',
  '第二阶段加入文件下载',
];

const styleOptions = [
  {
    className: 'clean',
    name: '清爽工具感',
    note: '适合认真记录、长期使用',
  },
  {
    className: 'album',
    name: '相册生活感',
    note: '适合图片多、像个人相册',
  },
  {
    className: 'journal',
    name: '可爱手账感',
    note: '适合轻松、温柔、日常记录',
  },
  {
    className: 'focus',
    name: '深色专业感',
    note: '适合工具站、下载站、技术感',
  },
];

const journalColors = [
  {
    className: 'mint',
    name: '薄荷绿',
    note: '清新、轻松，适合图片笔记',
  },
  {
    className: 'sky',
    name: '天空蓝',
    note: '干净、安静，比较接近工具感',
  },
  {
    className: 'butter',
    name: '奶油黄',
    note: '温暖但不厚重，像日常手账',
  },
  {
    className: 'lilac',
    name: '淡丁香',
    note: '柔和一点，但不做成大片紫色',
  },
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function App() {
  const [currentPage, setCurrentPage] = React.useState(pages.home);
  const [session, setSession] = React.useState(null);
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
    });

    return () => listener.subscription.unsubscribe();
  }, []);

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
            <Camera size={20} />
          </span>
          <span>图片笔记</span>
        </button>

        <div className="nav-actions">
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
              <button className="text-button user-pill" onClick={() => setCurrentPage(pages.notes)}>
                {session.user.email}
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
        <HomePage authReady={authReady} session={session} onStart={() => setCurrentPage(pages.notes)} />
      )}
      {currentPage === pages.login && (
        <LoginPage onRegister={() => setCurrentPage(pages.register)} onDone={() => setCurrentPage(pages.notes)} />
      )}
      {currentPage === pages.register && (
        <RegisterPage onLogin={() => setCurrentPage(pages.login)} onDone={() => setCurrentPage(pages.notes)} />
      )}
      {currentPage === pages.notes && <NotesPage session={session} onLogin={() => setCurrentPage(pages.login)} />}
    </main>
  );
}

function HomePage({ authReady, session, onStart }) {
  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">GitHub + Vercel + Supabase 练手项目</p>
          <h1>我的图片笔记网站</h1>
          <p className="hero-text">
            第一阶段先完成登录、数据保存和图片上传。第二阶段再加文件下载入口。
          </p>

          <div className="hero-actions">
            <button className="primary-button large" onClick={onStart}>
              <Rocket size={18} />
              {session ? '进入我的笔记' : '查看笔记页'}
            </button>
            <button className="text-button large">
              <Download size={18} />
              下载功能预留
            </button>
          </div>

          <p className="auth-state">
            {authReady
              ? session
                ? `当前已登录：${session.user.email}`
                : '当前未登录，可以先注册一个测试账号'
              : '正在检查登录状态...'}
          </p>
        </div>

        <NotePreview />
      </section>

      <section className="work-section" aria-label="核心功能">
        <div className="section-heading">
          <p className="eyebrow">第一阶段</p>
          <h2>先把核心网站跑通</h2>
        </div>

        <div className="feature-grid">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <article className="feature-card" key={item.title}>
                <Icon size={22} />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <StylePreviewSection />

      <section className="roadmap-section" aria-label="项目路线">
        <div className="section-heading">
          <p className="eyebrow">你现在的位置</p>
          <h2>第 4 步：接入 Supabase 登录</h2>
        </div>

        <ol className="roadmap-list">
          {roadmap.map((item, index) => (
            <li className={index <= 3 ? 'active' : ''} key={item}>
              <span>{index + 1}</span>
              {item}
            </li>
          ))}
        </ol>
      </section>

      <section className="download-section" aria-label="第二阶段">
        <Lock size={22} />
        <div>
          <p className="eyebrow">第二阶段</p>
          <h2>文件下载功能先不急</h2>
          <p>
            等登录、数据和图片上传完成后，再把小软件放到 GitHub Releases，
            网站这里只放下载按钮。
          </p>
        </div>
      </section>
    </>
  );
}

function StylePreviewSection() {
  return (
    <section className="style-section" aria-label="风格预览">
      <div className="section-heading">
        <p className="eyebrow">当前风格</p>
        <h2>清爽工具感 + 薄荷绿</h2>
      </div>

      <div className="style-grid">
        {styleOptions.map((item) => (
          <article className="style-card" key={item.name}>
            <div className={`style-preview ${item.className}`}>
              <div className="mock-nav"></div>
              <div className="mock-hero"></div>
              <div className="mock-layout">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <h3>{item.name}</h3>
            <p>{item.note}</p>
          </article>
        ))}
      </div>

      <div className="section-heading compact-heading">
        <p className="eyebrow">备选颜色</p>
        <h2>手账感也可以不是粉色</h2>
      </div>

      <div className="color-grid">
        {journalColors.map((item) => (
          <article className="style-card" key={item.name}>
            <div className={`style-preview journal-color ${item.className}`}>
              <div className="mock-nav"></div>
              <div className="mock-hero"></div>
              <div className="mock-layout">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <h3>{item.name}</h3>
            <p>{item.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function NotePreview() {
  return (
    <div className="preview-panel" aria-label="笔记预览">
      <div className="image-placeholder">
        <ImagePlus size={38} />
        <strong>上传一张图片</strong>
        <span>第一版先展示样子，后面再接真实上传</span>
      </div>
      <div className="note-lines">
        <label htmlFor="demo-title">笔记标题</label>
        <div id="demo-title" className="demo-input">
          旅行照片记录
        </div>
        <label htmlFor="demo-content">笔记内容</label>
        <div id="demo-content" className="demo-textarea">
          今天先做页面空壳，后面再接真实数据。
        </div>
      </div>
    </div>
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setIsLoading(false);

    if (error) {
      setMessage(`登录失败：${error.message}`);
      return;
    }

    setMessage('登录成功。');
    onDone();
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">登录页面</p>
        <h1>进入我的图片笔记</h1>
        <form className="auth-form" onSubmit={handleSubmit}>
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    setIsLoading(false);

    if (error) {
      setMessage(`注册失败：${error.message}`);
      return;
    }

    if (data.session) {
      setMessage('注册成功，已经登录。');
      onDone();
      return;
    }

    setMessage('注册成功。请去邮箱里点确认邮件，然后回来登录。');
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">注册页面</p>
        <h1>创建一个测试账号</h1>
        <form className="auth-form" onSubmit={handleSubmit}>
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

function NotesPage({ session, onLogin }) {
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [imageFile, setImageFile] = React.useState(null);
  const [imagePreview, setImagePreview] = React.useState('');
  const [notes, setNotes] = React.useState([]);
  const [message, setMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const loadNotes = React.useCallback(async () => {
    if (!session || !supabase) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from('notes')
      .select('id, title, content, image_url, created_at')
      .order('created_at', { ascending: false });
    setIsLoading(false);

    if (error) {
      setMessage(`读取笔记失败：${error.message}`);
      return;
    }

    setNotes(data ?? []);
  }, [session]);

  React.useEffect(() => {
    if (!imageFile) {
      setImagePreview('');
      return undefined;
    }

    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

  React.useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  function handleImageChange(event) {
    const file = event.target.files?.[0];
    setMessage('');

    if (!file) {
      setImageFile(null);
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageFile(null);
      setMessage('请选择 JPG、PNG、WEBP 或 GIF 图片。');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setImageFile(null);
      setMessage('图片不能超过 5 MB。');
      return;
    }

    setImageFile(file);
  }

  async function uploadImage() {
    if (!imageFile || !session || !supabase) return '';

    const extension = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filePath = `${session.user.id}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from('note-images').upload(filePath, imageFile, {
      cacheControl: '3600',
      contentType: imageFile.type,
      upsert: false,
    });

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage.from('note-images').getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function handleCreateNote(event) {
    event.preventDefault();
    setMessage('');

    if (!session || !supabase) {
      setMessage('请先登录。');
      return;
    }

    setIsSaving(true);
    let imageUrl = '';

    try {
      imageUrl = await uploadImage();
    } catch (error) {
      setIsSaving(false);
      setMessage(`上传图片失败：${error.message}`);
      return;
    }

    const { error: insertError } = await supabase.from('notes').insert({
      user_id: session.user.id,
      title,
      content,
      image_url: imageUrl || null,
    });
    setIsSaving(false);

    if (insertError) {
      setMessage(`保存笔记失败：${insertError.message}`);
      return;
    }

    setTitle('');
    setContent('');
    setImageFile(null);
    setMessage('笔记已保存。');
    await loadNotes();
  }

  if (!session) {
    return (
      <section className="auth-page">
        <div className="auth-card">
          <p className="eyebrow">需要登录</p>
          <h1>先登录，再进入我的笔记</h1>
          <p className="form-message">这里以后会显示当前用户自己的图片笔记。</p>
          <button className="primary-button large" onClick={onLogin}>
            <LogIn size={18} />
            去登录
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="notes-page">
      <div className="section-heading">
        <p className="eyebrow">我的笔记页</p>
        <h1>发布一条图片笔记</h1>
        <p className="auth-state">当前用户：{session.user.email}</p>
      </div>

      <div className="notes-layout">
        <form className="note-editor" onSubmit={handleCreateNote}>
          <label className="upload-control" htmlFor="note-image">
            {imagePreview ? (
              <img src={imagePreview} alt="待上传预览" />
            ) : (
              <span className="upload-empty">
                <ImagePlus size={34} />
                <strong>选择一张图片</strong>
                <small>JPG、PNG、WEBP、GIF，最大 5 MB</small>
              </span>
            )}
          </label>
          <input
            id="note-image"
            className="file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleImageChange}
          />

          <label htmlFor="note-title">笔记标题</label>
          <input
            id="note-title"
            type="text"
            placeholder="比如：今天的照片记录"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />

          <label htmlFor="note-content">笔记内容</label>
          <textarea
            id="note-content"
            placeholder="写一点内容..."
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={5}
          />

          <button className="primary-button large" type="submit" disabled={isSaving}>
            <Database size={18} />
            {isSaving ? '保存中...' : '保存笔记'}
          </button>

          {message && <p className="form-message">{message}</p>}
        </form>

        <section className="notes-list" aria-label="我的笔记列表">
          <div className="section-heading small-heading">
            <p className="eyebrow">已保存</p>
            <h2>我的笔记</h2>
          </div>

          {isLoading && <p className="form-message">正在读取笔记...</p>}

          {!isLoading && notes.length === 0 && (
            <article className="empty-state">
              <Database size={22} />
              <h3>还没有笔记</h3>
              <p>先在左边写一条，保存后会显示在这里。</p>
            </article>
          )}

          <div className="saved-notes">
            {notes.map((note) => (
              <article className="saved-note" key={note.id}>
                {note.image_url && <img src={note.image_url} alt={note.title} />}
                <h3>{note.title}</h3>
                {note.content && <p>{note.content}</p>}
                <span>{new Date(note.created_at).toLocaleString('zh-CN')}</span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);
