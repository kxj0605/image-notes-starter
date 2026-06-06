import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  Camera,
  Database,
  Github,
  ImagePlus,
  LogIn,
  LogOut,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from './supabaseClient';
import './styles.css';

const pages = {
  home: 'home',
  login: 'login',
  register: 'register',
  notes: 'notes',
};

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
        <HomePage
          authReady={authReady}
          session={session}
          onLogin={() => setCurrentPage(pages.login)}
          onRegister={() => setCurrentPage(pages.register)}
          onOpenNotes={() => setCurrentPage(pages.notes)}
        />
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

function HomePage({ authReady, session, onLogin, onRegister, onOpenNotes }) {
  return (
    <section className="home-grid">
      <div className="hero-copy">
        <p className="eyebrow">图片记录工具</p>
        <h1>把照片和想法收进自己的笔记里</h1>
        <p className="hero-text">登录后可以保存图片笔记，每个账号只看到自己的内容。</p>

        <div className="privacy-note">
          <Database size={18} />
          <span>你的笔记不是公开内容，登录后只有你自己可以看到。</span>
        </div>

        <div className="hero-actions">
          {session ? (
            <button className="primary-button large" onClick={onOpenNotes}>
              <Database size={18} />
              进入我的笔记
            </button>
          ) : (
            <>
              <button className="primary-button large" onClick={onRegister}>
                <UserPlus size={18} />
                注册账号
              </button>
              <button className="text-button large" onClick={onLogin}>
                <LogIn size={18} />
                登录
              </button>
            </>
          )}
        </div>

        <p className="auth-state">
          {authReady ? (session ? `当前已登录：${session.user.email}` : '当前未登录') : '正在检查登录状态...'}
        </p>
      </div>

      <div className="preview-panel" aria-label="笔记预览">
        <div className="sample-photo">
          <ImagePlus size={34} />
        </div>
        <div className="sample-note">
          <span>今天的照片</span>
          <h2>薄荷色的下午</h2>
          <p>一张图片，一点文字，保存成只属于自己的小记录。</p>
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
      setMessage(`登录失败：${error.message}`);
      return;
    }

    onDone();
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">登录</p>
        <h1>进入图片笔记</h1>
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
        <h1>创建图片笔记账号</h1>
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
  const [deletingId, setDeletingId] = React.useState('');

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

  function clearSelectedImage() {
    setImageFile(null);
    setImagePreview('');
    const input = document.getElementById('note-image');
    if (input) input.value = '';
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
    clearSelectedImage();
    setMessage('笔记已保存。');
    await loadNotes();
  }

  async function handleDeleteNote(note) {
    if (!supabase) return;

    setDeletingId(note.id);
    setMessage('');

    const { error } = await supabase.from('notes').delete().eq('id', note.id);
    setDeletingId('');

    if (error) {
      setMessage(`删除失败：${error.message}`);
      return;
    }

    setNotes((currentNotes) => currentNotes.filter((item) => item.id !== note.id));
    setMessage('笔记已删除。');
  }

  if (!session) {
    return (
      <section className="auth-page">
        <div className="auth-card">
          <p className="eyebrow">需要登录</p>
          <h1>先登录，再进入我的笔记</h1>
          <p className="form-message">这里会显示当前用户自己的图片笔记。</p>
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
      <div className="section-heading page-heading">
        <div>
          <p className="eyebrow">我的笔记</p>
          <h1>发布一条图片笔记</h1>
          <p className="auth-state">当前用户：{session.user.email}</p>
        </div>
        <span className="note-count">{notes.length} 条笔记</span>
      </div>

      <div className="notes-layout">
        <form className="note-editor" onSubmit={handleCreateNote}>
          <div className="upload-wrap">
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
            {imagePreview && (
              <button className="clear-image" type="button" onClick={clearSelectedImage} aria-label="清除图片">
                <X size={16} />
              </button>
            )}
          </div>
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
          {isLoading && <p className="form-message">正在读取笔记...</p>}

          {!isLoading && notes.length === 0 && (
            <article className="empty-state">
              <Database size={22} />
              <h3>还没有笔记</h3>
              <p>先写一条，保存后会显示在这里。</p>
            </article>
          )}

          <div className="saved-notes">
            {notes.map((note) => (
              <article className="saved-note" key={note.id}>
                {note.image_url && <img src={note.image_url} alt={note.title} />}
                <div className="saved-note-body">
                  <div className="saved-note-top">
                    <h3>{note.title}</h3>
                    <button
                      className="delete-button"
                      type="button"
                      onClick={() => handleDeleteNote(note)}
                      disabled={deletingId === note.id}
                      aria-label="删除笔记"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {note.content && <p>{note.content}</p>}
                  <span>{new Date(note.created_at).toLocaleString('zh-CN')}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);
