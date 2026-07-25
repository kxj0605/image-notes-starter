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
        <p className="eyebrow"><Sparkles size={16} /> {session ? '你的数字生活空间' : '无需登录，先看看公开内容'}</p>
        <h1>{session ? '私人工作台' : '从公开笔记开始'}</h1>
        <p className="hero-text">{session ? '把今天要做的事、随手记下的想法，收进一个安静而有序的个人工作台。' : '先阅读大家愿意分享的笔记、方法和灵感；想记录自己的内容时，再创建一个默认私密的空间。'}</p>

        <div className="hero-actions">
          {session ? (
            <button className="primary-button large" onClick={onWorkspace}>
              <LayoutDashboard size={18} />
              进入我的工作台
            </button>
          ) : (
            <>
              <button className="primary-button large" onClick={onPublicNotes}>
                <FileText size={18} />
                浏览公开笔记
                <ArrowRight size={17} />
              </button>
              <button className="home-secondary-action" onClick={onRegister}>
                <UserPlus size={17} />
                创建我的空间
              </button>
            </>
          )}
        </div>

        <div className="hero-benefits" aria-label="产品特点">
          <span><CheckCircle2 size={16} /> 无需登录即可阅读</span>
          <span><LockKeyhole size={16} /> 创建后默认私密</span>
        </div>
      </div>

      <div className="tool-preview public-notes-preview" aria-label="公开笔记预览">
        <div className="preview-topbar">
          <span className="preview-window-dots" aria-hidden="true"><i /><i /><i /></span>
          <span className="preview-kicker"><FileText size={14} /> 公开笔记</span>
        </div>

        <div className="preview-canvas">
          <div className="public-preview-heading">
            <span>公开阅读</span>
            <h2>先看看大家分享的想法</h2>
            <p>没有登录门槛，读到有价值的内容再决定是否创建自己的空间。</p>
          </div>
          <div className="public-preview-list" aria-hidden="true">
            <article><span>灵感</span><strong>留住值得回看的片段</strong><p>把零散想法整理成可阅读的笔记。</p></article>
            <article><span>方法</span><strong>把实践过程写清楚</strong><p>分享步骤、经验和可复用的做法。</p></article>
            <article><span>复盘</span><strong>回看一次完成的过程</strong><p>记录改变、收获和下一次的方向。</p></article>
          </div>
        </div>
      </div>
    </section>
  );
}
