import React from 'react';
import { LockKeyhole, LogIn, ShieldCheck, Sparkles, UserPlus } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../supabaseClient';

export function LoginPage({ onRegister, onDone }) {
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

    try {
      const timeout = new Promise((_, reject) => {
        window.setTimeout(() => reject(new Error('AUTH_TIMEOUT')), 12000);
      });
      const { error } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        timeout,
      ]);

      if (error) {
        const errorText = error.message?.toLowerCase() ?? '';
        if (errorText.includes('email not confirmed')) {
          setMessage('邮箱还没有验证，请先打开注册邮件完成验证。');
        } else if (errorText.includes('invalid login credentials')) {
          setMessage('邮箱或密码不正确，请检查后再试。');
        } else {
          setMessage(`登录失败：${error.message}`);
        }
        return;
      }

      onDone();
    } catch (error) {
      setMessage(
        error.message === 'AUTH_TIMEOUT'
          ? '连接登录服务超时，请检查网络后重试。'
          : '暂时无法连接登录服务，请稍后重试。',
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="auth-card-heading">
          <span className="auth-heading-icon"><LockKeyhole size={22} /></span>
          <div>
            <p className="eyebrow"><Sparkles size={15} /> 欢迎回来</p>
            <h1>进入私人工作台</h1>
            <p className="muted-text">继续管理你的任务、笔记和生活记录。</p>
          </div>
        </div>
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
        <p className="auth-trust-note"><ShieldCheck size={15} /> 安全登录到你的私人空间</p>
      </div>
    </section>
  );
}

export function RegisterPage({ onLogin, onDone }) {
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
        <div className="auth-card-heading">
          <span className="auth-heading-icon"><UserPlus size={22} /></span>
          <div>
            <p className="eyebrow"><Sparkles size={15} /> 创建空间</p>
            <h1>创建你的私人工作台</h1>
            <p className="muted-text">用一个账号，安放你的任务、笔记和生活记录。</p>
          </div>
        </div>
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
        <p className="auth-trust-note"><ShieldCheck size={15} /> 私人内容默认仅自己可见</p>
      </div>
    </section>
  );
}
