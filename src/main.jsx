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
  Rocket,
  UserPlus,
} from 'lucide-react';
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
    text: '以后这里会接 Supabase 登录，让每个人进入自己的空间。',
  },
  {
    icon: Database,
    title: '保存笔记',
    text: '标题、正文、图片地址会保存到 Supabase 数据库。',
  },
  {
    icon: ImagePlus,
    title: '上传图片',
    text: '图片会放进 Supabase Storage，然后在笔记里显示。',
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

function App() {
  const [currentPage, setCurrentPage] = React.useState(pages.home);

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
          <button className="icon-button" aria-label="GitHub 代码">
            <Github size={18} />
          </button>
          <button className="text-button" onClick={() => setCurrentPage(pages.login)}>
            <LogIn size={17} />
            登录
          </button>
          <button className="primary-button" onClick={() => setCurrentPage(pages.register)}>
            <UserPlus size={17} />
            注册
          </button>
        </div>
      </nav>

      {currentPage === pages.home && <HomePage onStart={() => setCurrentPage(pages.notes)} />}
      {currentPage === pages.login && <LoginPage onRegister={() => setCurrentPage(pages.register)} />}
      {currentPage === pages.register && <RegisterPage onLogin={() => setCurrentPage(pages.login)} />}
      {currentPage === pages.notes && <NotesPage />}
    </main>
  );
}

function HomePage({ onStart }) {
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
              查看笔记页
            </button>
            <button className="text-button large">
              <Download size={18} />
              下载功能预留
            </button>
          </div>
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

      <section className="style-section" aria-label="风格预览">
        <div className="section-heading">
          <p className="eyebrow">先看风格</p>
          <h2>你可以先挑一个大方向</h2>
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
          <p className="eyebrow">第 3 种的换色</p>
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

      <section className="roadmap-section" aria-label="项目路线">
        <div className="section-heading">
          <p className="eyebrow">你现在的位置</p>
          <h2>第 2 步：页面入口能切换</h2>
        </div>

        <ol className="roadmap-list">
          {roadmap.map((item, index) => (
            <li className={index <= 1 ? 'active' : ''} key={item}>
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

function LoginPage({ onRegister }) {
  return (
    <section className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">登录页面</p>
        <h1>进入我的图片笔记</h1>
        <form className="auth-form">
          <label htmlFor="login-email">邮箱</label>
          <input id="login-email" type="email" placeholder="you@example.com" />
          <label htmlFor="login-password">密码</label>
          <input id="login-password" type="password" placeholder="请输入密码" />
          <button className="primary-button large" type="button">
            <LogIn size={18} />
            登录
          </button>
        </form>
        <button className="link-button" onClick={onRegister}>
          还没有账号，去注册
        </button>
      </div>
    </section>
  );
}

function RegisterPage({ onLogin }) {
  return (
    <section className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">注册页面</p>
        <h1>创建一个测试账号</h1>
        <form className="auth-form">
          <label htmlFor="register-email">邮箱</label>
          <input id="register-email" type="email" placeholder="you@example.com" />
          <label htmlFor="register-password">密码</label>
          <input id="register-password" type="password" placeholder="至少 6 位" />
          <button className="primary-button large" type="button">
            <UserPlus size={18} />
            注册
          </button>
        </form>
        <button className="link-button" onClick={onLogin}>
          已经有账号，去登录
        </button>
      </div>
    </section>
  );
}

function NotesPage() {
  return (
    <section className="notes-page">
      <div className="section-heading">
        <p className="eyebrow">我的笔记页</p>
        <h1>发布一条图片笔记</h1>
      </div>

      <div className="notes-layout">
        <NotePreview />
        <article className="feature-card">
          <ImagePlus size={22} />
          <h3>后面会接真实功能</h3>
          <p>
            现在这里只是页面结构。下一阶段接入 Supabase 后，图片会真正上传，
            笔记会真正保存到数据库。
          </p>
        </article>
      </div>
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);
