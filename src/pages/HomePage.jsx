import React from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  LayoutDashboard,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';

export function HomePage({ session, onRegister, onWorkspace }) {
  return (
    <section className="home-grid">
      <div className="hero-copy">
        <p className="eyebrow">任务与笔记，一个工作台就够了</p>
        <h1>个人工作台</h1>

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
            </button>
          )}
        </div>

        <p className="privacy-note">
          <ShieldCheck size={16} />
          任务默认仅自己可见
        </p>
      </div>

      <div className="tool-preview" aria-label="今天的任务预览">
        <div className="preview-topbar">
          <div>
            <span className="preview-kicker">今天的任务</span>
            <h2>今天，先完成这 3 件事</h2>
          </div>
          <span className="preview-date">
            <CalendarDays size={15} /> 6月18日
          </span>
        </div>

        <div className="preview-progress" aria-label="今日完成进度 33%">
          <div>
            <span>今日进度</span>
            <strong>1 / 3</strong>
          </div>
          <span className="preview-progress-track"><i /></span>
        </div>

        <div className="preview-task-list">
          <div className="preview-task is-complete">
            <CheckCircle2 size={19} />
            <span><strong>整理本周任务</strong><small>已完成</small></span>
          </div>
          <div className="preview-task">
            <Circle size={19} />
            <span><strong>完成首页排版调整</strong><small>今天 · 重要</small></span>
            <em>优先</em>
          </div>
          <div className="preview-task">
            <Circle size={19} />
            <span><strong>记录项目复盘</strong><small>今天 18:00</small></span>
          </div>
        </div>
      </div>
    </section>
  );
}
