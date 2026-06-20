import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  LockKeyhole,
  LayoutDashboard,
  Sparkles,
  UserPlus,
} from 'lucide-react';

export function HomePage({ session, onRegister, onWorkspace, onPublicNotes }) {
  return (
    <section className="home-grid">
      <div className="hero-copy">
        <p className="eyebrow"><Sparkles size={16} /> 你的数字生活空间</p>
        <h1>私人工作台</h1>
        <p className="hero-text">把今天要做的事、随手记下的想法，收进一个安静而有序的个人工作台。</p>

        <div className="hero-actions">
          {session ? (
            <button className="primary-button large" onClick={onWorkspace}>
              <LayoutDashboard size={18} />
              进入我的工作台
            </button>
          ) : (
            <button className="primary-button large" onClick={onRegister}>
              <UserPlus size={18} />
              免费开始使用
              <ArrowRight size={17} />
            </button>
          )}
          {!session && (
            <button className="home-secondary-action" onClick={onPublicNotes}>
              浏览公开笔记
            </button>
          )}
        </div>

        <div className="hero-benefits" aria-label="产品特点">
          <span><CheckCircle2 size={16} /> 任务有序</span>
          <span><FileText size={16} /> 灵感不丢</span>
          <span><LockKeyhole size={16} /> 默认私密</span>
        </div>
      </div>

      <div className="tool-preview" aria-label="私人工作台锁定预览">
        <div className="preview-topbar">
          <span className="preview-window-dots" aria-hidden="true"><i /><i /><i /></span>
          <span className="preview-kicker"><LockKeyhole size={14} /> 私人空间</span>
        </div>

        <div className="preview-canvas">
          <div className="preview-heading-placeholder" aria-hidden="true">
            <i />
            <span />
          </div>
          <div className="preview-card-placeholders" aria-hidden="true">
            <span><i /></span>
            <span><i /></span>
            <span><i /></span>
          </div>

          <div className="preview-locked">
            <span className="preview-lock-icon"><LockKeyhole size={25} /></span>
            <strong>这里是你的私人工作台</strong>
            <p>登录后才能查看任务、笔记和完成进度。</p>
            {session ? (
              <button onClick={onWorkspace}>进入工作台</button>
            ) : (
              <button onClick={onRegister}>登录或注册后查看</button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
