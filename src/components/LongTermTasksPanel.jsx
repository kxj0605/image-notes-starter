import React from 'react';
import {
  Activity,
  Archive,
  BarChart3,
  CalendarDays,
  Check,
  Clock3,
  ExternalLink,
  Flame,
  Layers3,
  Minus,
  Plus,
  RotateCcw,
  SkipForward,
  Target,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import {
  getAccountDayStatus,
  getAccountTaskStats,
  getLongTermDate,
  getLongTermScheduleLabel,
  isLongTermTaskDue,
  makeLongTermId,
  parseLongTermTask,
  serializeLongTermTask,
} from '../utils/longTermTasks';
import { sortTasks } from '../utils/tasks';

const skipReasons = ['忘记操作', '时间不足', '账号异常', '平台异常', '主动跳过', '其他原因'];
const lifecycleLabels = { active: '进行中', paused: '暂停', ended: '已结束', archived: '已归档' };

function cloneMetadata(metadata) {
  return JSON.parse(JSON.stringify(metadata));
}

function makeAccount() {
  return {
    id: makeLongTermId('account'),
    name: '',
    platform: '',
    url: '',
    instructions: '',
    targetCount: 1,
    unlimited: false,
  };
}

function getDefaultForm() {
  return {
    type: 'account',
    title: '',
    startDate: getLongTermDate(),
    endDate: '',
    scheduleType: 'daily',
    intervalDays: 2,
    weekdays: [1, 3, 5],
    monthDays: '1,15',
    currentStep: '',
    stepNotes: '',
    accounts: [makeAccount()],
  };
}

export function LongTermTasksPanel({ session, tasks, setTasks, setMessage, isCreateOpen, setIsCreateOpen }) {
  const [activeSection, setActiveSection] = React.useState('today');
  const [form, setForm] = React.useState(getDefaultForm);
  const [isSaving, setIsSaving] = React.useState(false);
  const [skipTarget, setSkipTarget] = React.useState(null);
  const [skipReason, setSkipReason] = React.useState('');
  const [nextSteps, setNextSteps] = React.useState({});
  const today = getLongTermDate();

  const longTermTasks = tasks
    .map((task) => ({ task, metadata: parseLongTermTask(task) }))
    .filter((item) => item.metadata);
  const activeTasks = longTermTasks.filter((item) => item.metadata.lifecycle !== 'archived');
  const archivedTasks = longTermTasks.filter((item) => item.metadata.lifecycle === 'archived');
  const dueTasks = activeTasks.filter((item) => isLongTermTaskDue(item.metadata, today));
  const accountTasks = activeTasks.filter((item) => item.metadata.type === 'account');
  const todayAccountTasks = accountTasks.filter((item) => isLongTermTaskDue(item.metadata, today));

  const aggregate = todayAccountTasks.reduce((summary, item) => {
    const day = getAccountDayStatus(item.metadata, today);
    const stats = getAccountTaskStats(item.metadata, today);
    return {
      completed: summary.completed + day.completed,
      total: summary.total + day.total,
      streakDays: Math.max(summary.streakDays, stats.streakDays),
      cumulativeDays: summary.cumulativeDays + stats.cumulativeDays,
      monthCompleted: summary.monthCompleted + stats.monthCompleted,
    };
  }, { completed: 0, total: 0, streakDays: 0, cumulativeDays: 0, monthCompleted: 0 });

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateAccount(index, key, value) {
    setForm((current) => ({
      ...current,
      accounts: current.accounts.map((account, accountIndex) => (
        accountIndex === index ? { ...account, [key]: value } : account
      )),
    }));
  }

  async function persistMetadata(task, metadata, successMessage) {
    const description = serializeLongTermTask(metadata);
    const { data, error } = await supabase
      .from('tasks')
      .update({ description })
      .eq('id', task.id)
      .select('*')
      .single();

    if (error) {
      setMessage(`更新长期任务失败：${error.message}`);
      return false;
    }

    setTasks((current) => current.map((item) => (item.id === task.id ? data : item)).sort(sortTasks));
    if (successMessage) setMessage(successMessage);
    return true;
  }

  async function handleCreate(event) {
    event.preventDefault();
    setMessage('');

    if (!form.title.trim()) {
      setMessage('请填写任务名称。');
      return;
    }
    if (form.type === 'account' && form.accounts.some((account) => !account.name.trim())) {
      setMessage('请填写每个账号的名称。');
      return;
    }
    if (form.type === 'project' && !form.currentStep.trim()) {
      setMessage('请填写当前要推进的小步骤。');
      return;
    }

    const schedule = { type: form.scheduleType };
    if (form.scheduleType === 'interval') schedule.intervalDays = Math.max(1, Number(form.intervalDays) || 1);
    if (form.scheduleType === 'weekly') schedule.weekdays = form.weekdays;
    if (form.scheduleType === 'monthly') {
      schedule.monthDays = [...new Set(form.monthDays.split(',')
        .map((value) => Number(value.trim()))
        .filter((value) => value >= 1 && value <= 28))];
      if (schedule.monthDays.length === 0) {
        setMessage('每月日期请填写 1 至 28，例如：1,15。');
        return;
      }
    }

    const metadata = {
      version: 1,
      type: form.type,
      lifecycle: 'active',
      startDate: form.startDate,
      endDate: form.endDate || null,
      resetTime: '00:00',
      schedule,
      checkins: {},
      accounts: form.type === 'account' ? form.accounts : [],
      currentStep: form.type === 'project' ? {
        id: makeLongTermId('step'),
        title: form.currentStep.trim(),
        notes: form.stepNotes.trim(),
        status: 'in_progress',
        startedAt: form.startDate,
      } : null,
      stepHistory: [],
    };

    setIsSaving(true);
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: form.title.trim(),
        description: serializeLongTermTask(metadata),
        task_date: form.startDate,
        task_time: null,
        matrix_category: 'important_not_urgent',
        status: 'in_progress',
        user_id: session.user.id,
      })
      .select('*')
      .single();
    setIsSaving(false);

    if (error) {
      setMessage(`保存长期任务失败：${error.message}`);
      return;
    }

    setTasks((current) => [...current, data].sort(sortTasks));
    setForm(getDefaultForm());
    setIsCreateOpen(false);
    setMessage('长期任务已保存。');
  }

  async function changeAccountCount(task, metadata, account, delta) {
    const next = cloneMetadata(metadata);
    const log = next.checkins[today] ?? { accountCounts: {} };
    const current = Number(log.accountCounts?.[account.id]) || 0;
    const maximum = account.unlimited ? Number.POSITIVE_INFINITY : Math.max(1, Number(account.targetCount) || 1);
    const nextCount = Math.max(0, Math.min(maximum, current + delta));
    log.accountCounts = { ...(log.accountCounts ?? {}), [account.id]: nextCount };
    next.checkins[today] = log;
    log.state = getAccountDayStatus(next, today).state;
    delete log.skipReason;
    await persistMetadata(task, next, delta > 0 ? '已记录本次打卡。' : '已撤销一次打卡。');
  }

  async function confirmSkip() {
    if (!skipTarget || !skipReason) {
      setMessage('请先选择跳过原因。');
      return;
    }
    const next = cloneMetadata(skipTarget.metadata);
    next.checkins[today] = { state: 'skipped', skipReason, accountCounts: {} };
    const saved = await persistMetadata(skipTarget.task, next, `今天已跳过：${skipReason}`);
    if (saved) {
      setSkipTarget(null);
      setSkipReason('');
    }
  }

  async function changeLifecycle(task, metadata, lifecycle) {
    const next = { ...metadata, lifecycle };
    await persistMetadata(task, next, `任务状态已改为“${lifecycleLabels[lifecycle]}”。`);
  }

  async function completeProjectStep(task, metadata) {
    if (!metadata.currentStep) return;
    const next = cloneMetadata(metadata);
    const completedStep = { ...next.currentStep, status: 'completed', completedAt: today };
    next.stepHistory = [...(next.stepHistory ?? []), completedStep];
    next.currentStep = null;
    next.checkins[today] = { state: 'complete', completedStepId: completedStep.id };
    await persistMetadata(task, next, '今天的小步骤已完成。');
  }

  async function addProjectStep(task, metadata) {
    const value = (nextSteps[task.id] ?? '').trim();
    if (!value) {
      setMessage('请先填写下一步内容。');
      return;
    }
    const next = cloneMetadata(metadata);
    next.currentStep = {
      id: makeLongTermId('step'),
      title: value,
      notes: '',
      status: 'in_progress',
      startedAt: today,
    };
    const saved = await persistMetadata(task, next, '下一步已添加。');
    if (saved) setNextSteps((current) => ({ ...current, [task.id]: '' }));
  }

  return (
    <div className="long-term-panel">
      <div className="long-term-subtabs" role="tablist" aria-label="长期追踪分类">
        <button className={activeSection === 'today' ? 'active' : ''} onClick={() => setActiveSection('today')}>今日打卡</button>
        <button className={activeSection === 'review' ? 'active' : ''} onClick={() => setActiveSection('review')}>数据回顾</button>
        <button className={activeSection === 'archive' ? 'active' : ''} onClick={() => setActiveSection('archive')}>已归档</button>
      </div>

      {isCreateOpen && (
        <LongTermCreateForm
          form={form}
          updateForm={updateForm}
          updateAccount={updateAccount}
          setForm={setForm}
          isSaving={isSaving}
          onSubmit={handleCreate}
        />
      )}

      {activeSection === 'today' && (
        <>
          <div className="long-term-metrics">
            <LongTermMetric icon={Check} label="今日账号进度" value={`${aggregate.completed} / ${aggregate.total}`} tone="success" />
            <LongTermMetric icon={Flame} label="真实连续天数" value={`${aggregate.streakDays} 天`} tone="warning" />
            <LongTermMetric icon={CalendarDays} label="累计完成天数" value={`${aggregate.cumulativeDays} 天`} tone="info" />
            <LongTermMetric icon={BarChart3} label="本月全部完成" value={`${aggregate.monthCompleted} 天`} tone="creative" />
          </div>

          {dueTasks.length === 0 ? (
            <div className="panel-card long-term-empty"><Target size={24} /><h2>今天没有需要打卡的任务</h2><p>新建一个账号重复任务，或者为长期项目添加下一步。</p></div>
          ) : (
            <div className="long-term-card-list">
              {dueTasks.map(({ task, metadata }) => metadata.type === 'account' ? (
                <AccountLongTermCard
                  key={task.id}
                  task={task}
                  metadata={metadata}
                  today={today}
                  onChangeCount={changeAccountCount}
                  onSkip={() => { setSkipTarget({ task, metadata }); setSkipReason(''); }}
                  onLifecycleChange={changeLifecycle}
                />
              ) : (
                <ProjectLongTermCard
                  key={task.id}
                  task={task}
                  metadata={metadata}
                  nextStep={nextSteps[task.id] ?? ''}
                  onNextStepChange={(value) => setNextSteps((current) => ({ ...current, [task.id]: value }))}
                  onComplete={() => completeProjectStep(task, metadata)}
                  onAddStep={() => addProjectStep(task, metadata)}
                  onLifecycleChange={changeLifecycle}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeSection === 'review' && (
        <div className="long-term-review-grid">
          {activeTasks.length === 0 ? <div className="panel-card long-term-empty"><BarChart3 size={24} /><h2>还没有长期任务</h2></div> : activeTasks.map(({ task, metadata }) => metadata.type === 'account' ? (
            <ReviewCard key={task.id} task={task} metadata={metadata} today={today} onLifecycleChange={changeLifecycle} />
          ) : (
            <ProjectReviewCard key={task.id} task={task} metadata={metadata} onLifecycleChange={changeLifecycle} />
          ))}
        </div>
      )}

      {activeSection === 'archive' && (
        <div className="long-term-card-list">
          {archivedTasks.length === 0 ? <div className="panel-card long-term-empty"><Archive size={24} /><h2>暂时没有已归档任务</h2></div> : archivedTasks.map(({ task, metadata }) => (
            <article className="panel-card archived-long-term-card" key={task.id}>
              <div><h2>{task.title}</h2><p>{metadata.type === 'account' ? `${metadata.accounts.length} 个账号` : `${metadata.stepHistory?.length ?? 0} 个已完成步骤`}</p></div>
              <button className="secondary-action" onClick={() => changeLifecycle(task, metadata, 'active')}><RotateCcw size={16} />恢复为进行中</button>
            </article>
          ))}
        </div>
      )}

      {skipTarget && (
        <div className="long-term-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSkipTarget(null); }}>
          <div className="long-term-modal" role="dialog" aria-modal="true" aria-labelledby="skip-title">
            <h2 id="skip-title">为什么今天要跳过？</h2>
            <p>选择原因后，今天会记录为“已跳过”，不会算作完成。</p>
            <div className="skip-reason-grid">
              {skipReasons.map((reason) => <button className={skipReason === reason ? 'selected' : ''} key={reason} onClick={() => setSkipReason(reason)}>{reason}</button>)}
            </div>
            <div className="long-term-modal-actions">
              <button className="secondary-action" onClick={() => setSkipTarget(null)}>取消</button>
              <button className="workspace-main-action" onClick={confirmSkip}>确认跳过</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LongTermCreateForm({ form, updateForm, updateAccount, setForm, isSaving, onSubmit }) {
  return (
    <form className="panel-card long-term-create-form" onSubmit={onSubmit}>
      <div className="form-card-heading">
        <span className="section-icon section-icon-blue"><Activity size={18} /></span>
        <div><h2>新建长期任务</h2><p>所有任务仍在任务中心管理。</p></div>
      </div>
      <div className="long-term-type-switch">
        <button type="button" className={form.type === 'account' ? 'active' : ''} onClick={() => updateForm('type', 'account')}><Activity size={17} />账号重复任务</button>
        <button type="button" className={form.type === 'project' ? 'active' : ''} onClick={() => updateForm('type', 'project')}><Layers3 size={17} />分步骤长期任务</button>
      </div>
      <div className="long-term-form-grid">
        <label className="wide-field">任务名称<input value={form.title} onChange={(event) => updateForm('title', event.target.value)} placeholder="例如：每天进行直播" required /></label>
        <label>开始日期<input type="date" value={form.startDate} onChange={(event) => updateForm('startDate', event.target.value)} required /></label>
        <label>结束日期（可选）<input type="date" value={form.endDate} min={form.startDate} onChange={(event) => updateForm('endDate', event.target.value)} /></label>
        <label>执行周期<select value={form.scheduleType} onChange={(event) => updateForm('scheduleType', event.target.value)}><option value="daily">每天</option><option value="interval">每隔 N 天</option><option value="weekly">每周指定星期</option><option value="monthly">每月指定日期</option></select></label>
        {form.scheduleType === 'interval' && <label>间隔天数<input type="number" min="1" value={form.intervalDays} onChange={(event) => updateForm('intervalDays', event.target.value)} /></label>}
        {form.scheduleType === 'weekly' && <fieldset className="weekday-field wide-field"><legend>执行星期</legend><div>{['日','一','二','三','四','五','六'].map((label, day) => <label key={label}><input type="checkbox" checked={form.weekdays.includes(day)} onChange={() => updateForm('weekdays', form.weekdays.includes(day) ? form.weekdays.filter((item) => item !== day) : [...form.weekdays, day])} />周{label}</label>)}</div></fieldset>}
        {form.scheduleType === 'monthly' && <label className="wide-field">每月日期（1～28，用逗号分隔）<input value={form.monthDays} onChange={(event) => updateForm('monthDays', event.target.value)} placeholder="例如：1,15" /></label>}
      </div>

      {form.type === 'account' ? (
        <div className="account-form-list">
          <div className="panel-heading-row"><div><h3>账号</h3><p>每个账号可以独立设置网址、说明和每日次数。</p></div><button type="button" className="secondary-action" onClick={() => setForm((current) => ({ ...current, accounts: [...current.accounts, makeAccount()] }))}><Plus size={16} />添加账号</button></div>
          {form.accounts.map((account, index) => (
            <div className="account-form-card" key={account.id}>
              <label>账号名称<input value={account.name} onChange={(event) => updateAccount(index, 'name', event.target.value)} required /></label>
              <label>平台<input value={account.platform} onChange={(event) => updateAccount(index, 'platform', event.target.value)} placeholder="抖音 / 快手" /></label>
              <label className="wide-field">账号网址<input type="url" value={account.url} onChange={(event) => updateAccount(index, 'url', event.target.value)} placeholder="https://" /></label>
              <label className="wide-field">操作说明<input value={account.instructions} onChange={(event) => updateAccount(index, 'instructions', event.target.value)} placeholder="进入账号并完成直播" /></label>
              <label>每天目标次数<input type="number" min="1" disabled={account.unlimited} value={account.targetCount} onChange={(event) => updateAccount(index, 'targetCount', event.target.value)} /></label>
              <label className="inline-check"><input type="checkbox" checked={account.unlimited} onChange={(event) => updateAccount(index, 'unlimited', event.target.checked)} />不设上限</label>
              {form.accounts.length > 1 && <button type="button" className="account-remove" onClick={() => setForm((current) => ({ ...current, accounts: current.accounts.filter((_, accountIndex) => accountIndex !== index) }))}>移除此账号</button>}
            </div>
          ))}
        </div>
      ) : (
        <div className="long-term-form-grid">
          <label className="wide-field">当前小步骤<input value={form.currentStep} onChange={(event) => updateForm('currentStep', event.target.value)} placeholder="例如：整理首页的信息结构" required /></label>
          <label className="wide-field">步骤备注<input value={form.stepNotes} onChange={(event) => updateForm('stepNotes', event.target.value)} /></label>
        </div>
      )}
      <div className="long-term-form-actions"><button className="primary-button large" disabled={isSaving}><Plus size={18} />{isSaving ? '保存中...' : '保存长期任务'}</button></div>
    </form>
  );
}

function LongTermMetric({ icon: Icon, label, value, tone }) {
  return <article className={`long-term-metric tone-${tone}`}><div><span>{label}</span><i><Icon size={17} /></i></div><strong>{value}</strong></article>;
}

function AccountLongTermCard({ task, metadata, today, onChangeCount, onSkip, onLifecycleChange }) {
  const status = getAccountDayStatus(metadata, today);
  const label = status.state === 'complete' ? '今日完成' : status.state === 'partial' ? '部分完成' : status.state === 'skipped' ? '已跳过' : '待打卡';
  const progress = status.total ? Math.round(status.completed / status.total * 100) : 0;
  return (
    <article className="panel-card account-long-term-card">
      <div className="long-term-card-heading">
        <div className="long-term-title"><span className="long-term-icon tone-danger"><Activity size={19} /></span><div><h2>{task.title}</h2><p><Clock3 size={13} />{getLongTermScheduleLabel(metadata)} · 00:00 换日</p></div></div>
        <div className="long-term-card-controls"><span className={`long-term-status status-${status.state}`}>{label}</span><LifecycleSelect value={metadata.lifecycle} onChange={(value) => onLifecycleChange(task, metadata, value)} /></div>
      </div>
      <div className="long-term-progress"><div><span style={{ width: `${progress}%` }} /></div><strong>{status.completed}/{status.total}</strong></div>
      <div className="long-term-account-list">
        {metadata.accounts.map((account) => {
          const count = Number(status.log.accountCounts?.[account.id]) || 0;
          const target = account.unlimited ? null : Math.max(1, Number(account.targetCount) || 1);
          const done = target ? count >= target : count > 0;
          return (
            <div className="long-term-account-row" key={account.id}>
              <div className="account-identity"><span>{(account.platform || account.name).slice(0, 1)}</span><div><strong>{account.name}</strong><small>{account.platform || '未填写平台'}{account.instructions ? ` · ${account.instructions}` : ''}</small></div></div>
              {account.url ? <a className="account-open" href={account.url} target="_blank" rel="noreferrer"><ExternalLink size={14} />打开账号</a> : <span />}
              <div className="account-check-actions">
                {count > 0 && <button className="count-minus" onClick={() => onChangeCount(task, metadata, account, -1)} aria-label={`撤销 ${account.name} 一次打卡`}><Minus size={15} /></button>}
                <button className={done ? 'account-check checked' : 'account-check'} onClick={() => onChangeCount(task, metadata, account, target === 1 && done ? -1 : 1)}>{done && target === 1 ? <><Check size={16} />已打卡</> : <><Plus size={16} />{account.unlimited ? `${count} 次` : `${count}/${target}`}</>}</button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="long-term-card-footer"><button className="secondary-action" onClick={onSkip}><SkipForward size={15} />跳过今日</button><span>{metadata.endDate ? `结束于 ${metadata.endDate}` : '无结束日期'}</span></div>
    </article>
  );
}

function ProjectLongTermCard({ task, metadata, nextStep, onNextStepChange, onComplete, onAddStep, onLifecycleChange }) {
  return (
    <article className="panel-card project-long-term-card">
      <div className="long-term-card-heading">
        <div className="long-term-title"><span className="long-term-icon tone-creative"><Layers3 size={19} /></span><div><h2>{task.title}</h2><p>分步骤长期任务 · 今天推进一步即可</p></div></div>
        <LifecycleSelect value={metadata.lifecycle} onChange={(value) => onLifecycleChange(task, metadata, value)} />
      </div>
      {metadata.currentStep ? (
        <div className="current-step-box"><div><span>当前小步骤 · {metadata.currentStep.startedAt}</span><strong>{metadata.currentStep.title}</strong>{metadata.currentStep.notes && <p>{metadata.currentStep.notes}</p>}</div><button className="account-check" onClick={onComplete}><Check size={16} />完成这一步</button></div>
      ) : (
        <div className="next-step-box"><div><span>今天没有待办步骤，不会标记漏打。</span><input value={nextStep} onChange={(event) => onNextStepChange(event.target.value)} placeholder="填写下一步内容" /></div><button className="workspace-main-action" onClick={onAddStep}><Plus size={16} />添加下一步</button></div>
      )}
      <div className="project-history-count">已经完成 {metadata.stepHistory?.length ?? 0} 个步骤</div>
    </article>
  );
}

function LifecycleSelect({ value, onChange }) {
  return <select className="lifecycle-select" value={value} onChange={(event) => onChange(event.target.value)} aria-label="长期任务状态"><option value="active">进行中</option><option value="paused">暂停</option><option value="ended">已结束</option><option value="archived">已归档</option></select>;
}

function ReviewCard({ task, metadata, today, onLifecycleChange }) {
  const stats = getAccountTaskStats(metadata, today);
  const dates = [];
  const cursor = new Date(`${today}T12:00:00`);
  cursor.setDate(cursor.getDate() - 34);
  for (let index = 0; index < 35; index += 1) {
    const date = getLongTermDate(cursor);
    const status = getAccountDayStatus(metadata, date).state;
    const visibleStatus = status === 'pending' && date < today ? 'missed' : status;
    dates.push({ date, status: isLongTermTaskDue(metadata, date) ? visibleStatus : 'off' });
    cursor.setDate(cursor.getDate() + 1);
  }
  return (
    <article className="panel-card review-card">
      <div className="panel-heading-row"><div><h2>{task.title}</h2><p>{getLongTermScheduleLabel(metadata)}</p></div><div className="review-heading-actions"><strong>{stats.cumulativeDays} 个完成日</strong><LifecycleSelect value={metadata.lifecycle} onChange={(value) => onLifecycleChange(task, metadata, value)} /></div></div>
      <div className="review-heatmap">{dates.map((item) => <span className={`heat-${item.status}`} title={`${item.date} · ${item.status}`} key={item.date} />)}</div>
      <div className="review-stat-row"><span>真实连续 <strong>{stats.streakDays} 天</strong></span><span>累计操作 <strong>{stats.totalActions} 次</strong></span><span>本月完成 <strong>{stats.monthCompleted} 天</strong></span></div>
    </article>
  );
}

function ProjectReviewCard({ task, metadata, onLifecycleChange }) {
  return (
    <article className="panel-card archived-long-term-card">
      <div><h2>{task.title}</h2><p>已完成 {metadata.stepHistory?.length ?? 0} 个步骤{metadata.currentStep ? ` · 当前：${metadata.currentStep.title}` : ' · 暂无下一步'}</p></div>
      <LifecycleSelect value={metadata.lifecycle} onChange={(value) => onLifecycleChange(task, metadata, value)} />
    </article>
  );
}
