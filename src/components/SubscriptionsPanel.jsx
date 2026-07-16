import React from 'react';
import {
  CalendarClock,
  Check,
  ChevronDown,
  ChevronUp,
  CreditCard,
  GripVertical,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  Wifi,
  X,
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const DAY_MS = 24 * 60 * 60 * 1000;

const CATEGORY_OPTIONS = [
  { value: 'network', label: '网络' },
  { value: 'software', label: '软件' },
  { value: 'media', label: '影音' },
  { value: 'cloud', label: '云服务' },
  { value: 'membership', label: '会员' },
  { value: 'other', label: '其他' },
];

const CYCLE_OPTIONS = [
  { value: 'monthly', label: '月付', months: 1 },
  { value: 'quarterly', label: '季付', months: 3 },
  { value: 'semiannual', label: '半年付', months: 6 },
  { value: 'annual', label: '年付', months: 12 },
  { value: 'custom', label: '自定义周期', months: null },
];

const OVERVIEW_OPTIONS = [
  { key: 'active', label: '有效订阅' },
  { key: 'monthlyCost', label: '月均支出' },
  { key: 'annualCost', label: '年均支出' },
  { key: 'dueSoon', label: '30 天内到期' },
  { key: 'expired', label: '已过期' },
  { key: 'autoRenew', label: '自动续费' },
];

const DEFAULT_PREFERENCES = {
  viewMode: 'cards',
  cardDensity: 'compact',
  overviewMetrics: ['active', 'monthlyCost', 'annualCost', 'dueSoon'],
};

function getToday() {
  const date = new Date();
  return toDateValue(date);
}

function toDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(value) {
  return new Date(`${value}T00:00:00`);
}

function addDays(value, amount) {
  const date = parseDate(value);
  date.setDate(date.getDate() + amount);
  return toDateValue(date);
}

function addMonths(value, amount) {
  const source = parseDate(value);
  const day = source.getDate();
  source.setDate(1);
  source.setMonth(source.getMonth() + amount);
  const lastDay = new Date(source.getFullYear(), source.getMonth() + 1, 0).getDate();
  source.setDate(Math.min(day, lastDay));
  return toDateValue(source);
}

function daysBetween(start, end) {
  return Math.round((parseDate(end).getTime() - parseDate(start).getTime()) / DAY_MS);
}

function formatDate(value) {
  if (!value) return '—';
  return parseDate(value).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatCompactDate(value) {
  return value ? value.replaceAll('-', '.') : '—';
}

function formatMoney(value) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function getCycle(value) {
  return CYCLE_OPTIONS.find((option) => option.value === value) ?? CYCLE_OPTIONS[0];
}

function getCategory(value) {
  return CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? '其他';
}

function calculateEndDate(startDate, cycle) {
  const months = getCycle(cycle).months;
  return months ? addMonths(startDate, months) : startDate;
}

function getSubscriptionTiming(subscription) {
  const today = getToday();
  const totalDays = Math.max(1, daysBetween(subscription.start_date, subscription.end_date));
  const remainingDays = daysBetween(today, subscription.end_date);
  const percent = Math.max(0, Math.min(100, (remainingDays / totalDays) * 100));
  const elapsedPercent = Math.max(0, Math.min(100, 100 - percent));
  const tone = remainingDays <= 7 ? 'danger' : remainingDays <= 30 ? 'warning' : 'normal';
  return { remainingDays, percent, elapsedPercent, tone };
}

function getRemainingLabel(days) {
  if (days < 0) return `已过期 ${Math.abs(days)} 天`;
  if (days === 0) return '今天到期';
  return `剩余 ${days} 天`;
}

function getAnnualCost(subscription) {
  const amount = Number(subscription.amount) || 0;
  const months = getCycle(subscription.billing_cycle).months;
  if (months) return amount * (12 / months);
  const duration = Math.max(1, daysBetween(subscription.start_date, subscription.end_date));
  return amount * (365 / duration);
}

function normalizePreferences(value) {
  const validKeys = new Set(OVERVIEW_OPTIONS.map((option) => option.key));
  const overviewMetrics = Array.isArray(value?.overviewMetrics)
    ? value.overviewMetrics.filter((key, index, values) => validKeys.has(key) && values.indexOf(key) === index).slice(0, 4)
    : [];

  return {
    viewMode: value?.viewMode === 'list' ? 'list' : 'cards',
    cardDensity: value?.cardDensity === 'detailed' ? 'detailed' : 'compact',
    overviewMetrics: overviewMetrics.length ? overviewMetrics : DEFAULT_PREFERENCES.overviewMetrics,
  };
}

function getEmptyForm() {
  const startDate = getToday();
  return {
    name: '',
    provider: '',
    notes: '',
    category: 'network',
    amount: '',
    billing_cycle: 'monthly',
    start_date: startDate,
    end_date: calculateEndDate(startDate, 'monthly'),
    renewal_type: 'manual',
  };
}

function getPreviewSubscriptions() {
  const today = getToday();
  return [
    {
      id: 'preview-subscription-network',
      user_id: 'preview-user',
      name: '家庭千兆宽带',
      provider: '本地宽带运营商',
      notes: '家庭主线路',
      category: 'network',
      amount: 1299,
      billing_cycle: 'annual',
      start_date: addMonths(today, -11),
      end_date: addDays(today, 18),
      renewal_type: 'manual',
    },
    {
      id: 'preview-subscription-cloud',
      user_id: 'preview-user',
      name: '个人云存储',
      provider: '云存储服务商',
      notes: '保存照片与文档',
      category: 'cloud',
      amount: 18,
      billing_cycle: 'monthly',
      start_date: addDays(today, -12),
      end_date: addDays(today, 19),
      renewal_type: 'auto',
    },
    {
      id: 'preview-subscription-media',
      user_id: 'preview-user',
      name: '影音会员',
      provider: '影音平台',
      notes: '',
      category: 'media',
      amount: 198,
      billing_cycle: 'annual',
      start_date: addMonths(today, -7),
      end_date: addMonths(today, 5),
      renewal_type: 'auto',
    },
    {
      id: 'preview-subscription-expired',
      user_id: 'preview-user',
      name: '备用网络线路',
      provider: '移动网络运营商',
      notes: '备用流量线路',
      category: 'network',
      amount: 30,
      billing_cycle: 'monthly',
      start_date: addDays(today, -35),
      end_date: addDays(today, -4),
      renewal_type: 'manual',
    },
  ];
}

export function SubscriptionsPanel({ session, setMessage }) {
  const [subscriptions, setSubscriptions] = React.useState([]);
  const [preferences, setPreferences] = React.useState(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = React.useState(true);
  const [query, setQuery] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('all');
  const [cycleFilter, setCycleFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);
  const [form, setForm] = React.useState(getEmptyForm);
  const [detailSubscription, setDetailSubscription] = React.useState(null);
  const [isOverviewOpen, setIsOverviewOpen] = React.useState(false);
  const [overviewDraft, setOverviewDraft] = React.useState(DEFAULT_PREFERENCES.overviewMetrics);
  const [draggedMetric, setDraggedMetric] = React.useState(null);

  const isPreview = session?.user?.id === 'preview-user';

  React.useEffect(() => {
    setMessage('');
  }, [setMessage]);

  React.useEffect(() => {
    let isMounted = true;

    async function loadSubscriptions() {
      if (isPreview) {
        setSubscriptions(getPreviewSubscriptions());
        setPreferences(DEFAULT_PREFERENCES);
        setIsLoading(false);
        return;
      }

      if (!session || !supabase) return;
      setIsLoading(true);
      const [{ data: subscriptionData, error: subscriptionError }, { data: preferenceData, error: preferenceError }] = await Promise.all([
        supabase.from('subscriptions').select('*').order('end_date', { ascending: true }),
        supabase.from('user_preferences').select('subscription_preferences').eq('user_id', session.user.id).maybeSingle(),
      ]);

      if (!isMounted) return;
      setIsLoading(false);

      if (subscriptionError || preferenceError) {
        setMessage(`读取订阅数据失败：${subscriptionError?.message ?? preferenceError?.message}`);
        return;
      }

      setSubscriptions(subscriptionData ?? []);
      setPreferences(normalizePreferences(preferenceData?.subscription_preferences));
    }

    loadSubscriptions();
    return () => {
      isMounted = false;
    };
  }, [isPreview, session, setMessage]);

  const metrics = React.useMemo(() => {
    const timing = subscriptions.map((subscription) => ({ subscription, ...getSubscriptionTiming(subscription) }));
    const activeSubscriptions = timing.filter((item) => item.remainingDays >= 0).map((item) => item.subscription);
    const annualCost = activeSubscriptions.reduce((total, subscription) => total + getAnnualCost(subscription), 0);
    return {
      active: { value: activeSubscriptions.length, label: '有效订阅' },
      monthlyCost: { value: formatMoney(annualCost / 12), label: '月均支出' },
      annualCost: { value: formatMoney(annualCost), label: '年均支出' },
      dueSoon: { value: timing.filter((item) => item.remainingDays >= 0 && item.remainingDays <= 30).length, label: '30 天内到期' },
      expired: { value: timing.filter((item) => item.remainingDays < 0).length, label: '已过期' },
      autoRenew: { value: subscriptions.filter((subscription) => subscription.renewal_type === 'auto').length, label: '自动续费' },
    };
  }, [subscriptions]);

  const visibleSubscriptions = React.useMemo(() => subscriptions
    .filter((subscription) => [subscription.name, subscription.provider, subscription.notes]
      .some((value) => String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())))
    .filter((subscription) => categoryFilter === 'all' || subscription.category === categoryFilter)
    .filter((subscription) => cycleFilter === 'all' || subscription.billing_cycle === cycleFilter)
    .filter((subscription) => {
      if (statusFilter === 'all') return true;
      const { remainingDays } = getSubscriptionTiming(subscription);
      if (statusFilter === 'active') return remainingDays >= 0;
      if (statusFilter === 'dueSoon') return remainingDays >= 0 && remainingDays <= 30;
      return remainingDays < 0;
    })
    .sort((a, b) => a.end_date.localeCompare(b.end_date)), [subscriptions, query, categoryFilter, cycleFilter, statusFilter]);

  async function persistPreferences(nextPreferences) {
    const normalized = normalizePreferences(nextPreferences);
    setPreferences(normalized);
    if (isPreview) return;

    const { error } = await supabase.from('user_preferences').upsert({
      user_id: session.user.id,
      subscription_preferences: normalized,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    if (error) setMessage(`保存展示偏好失败：${error.message}`);
  }

  function openCreateForm() {
    setEditingId(null);
    setForm(getEmptyForm());
    setIsFormOpen(true);
  }

  function openEditForm(subscription) {
    setEditingId(subscription.id);
    setForm({
      name: subscription.name,
      provider: subscription.provider ?? '',
      notes: subscription.notes ?? '',
      category: subscription.category,
      amount: String(subscription.amount),
      billing_cycle: subscription.billing_cycle,
      start_date: subscription.start_date,
      end_date: subscription.end_date,
      renewal_type: subscription.renewal_type,
    });
    setDetailSubscription(null);
    setIsFormOpen(true);
  }

  function updateStartDate(startDate) {
    setForm((current) => ({
      ...current,
      start_date: startDate,
      end_date: current.billing_cycle === 'custom' ? current.end_date : calculateEndDate(startDate, current.billing_cycle),
    }));
  }

  function updateCycle(cycle) {
    setForm((current) => ({
      ...current,
      billing_cycle: cycle,
      end_date: cycle === 'custom' ? current.end_date : calculateEndDate(current.start_date, cycle),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.name.trim()) {
      setMessage('请填写订阅名称。');
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setMessage('请输入大于 0 的订阅金额。');
      return;
    }
    if (daysBetween(form.start_date, form.end_date) <= 0) {
      setMessage('到期日期必须晚于开始日期。');
      return;
    }

    const payload = {
      user_id: session.user.id,
      name: form.name.trim(),
      provider: form.provider.trim(),
      notes: form.notes.trim(),
      category: form.category,
      amount: Number(form.amount),
      billing_cycle: form.billing_cycle,
      start_date: form.start_date,
      end_date: form.end_date,
      renewal_type: form.renewal_type,
      updated_at: new Date().toISOString(),
    };

    if (isPreview) {
      if (editingId) {
        setSubscriptions((items) => items.map((item) => item.id === editingId ? { ...item, ...payload } : item));
      } else {
        setSubscriptions((items) => [...items, { ...payload, id: `preview-${Date.now()}` }]);
      }
      setIsFormOpen(false);
      setMessage('');
      return;
    }

    const request = editingId
      ? supabase.from('subscriptions').update(payload).eq('id', editingId).select('*').single()
      : supabase.from('subscriptions').insert(payload).select('*').single();
    const { data, error } = await request;

    if (error) {
      setMessage(`保存订阅失败：${error.message}`);
      return;
    }

    setSubscriptions((items) => editingId
      ? items.map((item) => item.id === editingId ? data : item)
      : [...items, data]);
    setIsFormOpen(false);
    setMessage('');
  }

  async function handleDelete(subscription) {
    if (!window.confirm(`确定删除“${subscription.name}”吗？`)) return;
    if (!isPreview) {
      const { error } = await supabase.from('subscriptions').delete().eq('id', subscription.id);
      if (error) {
        setMessage(`删除订阅失败：${error.message}`);
        return;
      }
    }
    setSubscriptions((items) => items.filter((item) => item.id !== subscription.id));
    setDetailSubscription(null);
    setMessage('');
  }

  async function handleRenew(subscription) {
    const duration = Math.max(1, daysBetween(subscription.start_date, subscription.end_date));
    const nextStart = subscription.end_date;
    const months = getCycle(subscription.billing_cycle).months;
    const nextEnd = months ? addMonths(subscription.end_date, months) : addDays(subscription.end_date, duration);
    const updates = { start_date: nextStart, end_date: nextEnd, updated_at: new Date().toISOString() };

    if (!isPreview) {
      const { error } = await supabase.from('subscriptions').update(updates).eq('id', subscription.id);
      if (error) {
        setMessage(`更新续费日期失败：${error.message}`);
        return;
      }
    }

    setSubscriptions((items) => items.map((item) => item.id === subscription.id ? { ...item, ...updates } : item));
    setDetailSubscription((current) => current?.id === subscription.id ? { ...current, ...updates } : current);
    setMessage('');
  }

  function openOverviewSettings() {
    setOverviewDraft(preferences.overviewMetrics);
    setIsOverviewOpen(true);
  }

  function toggleOverviewMetric(key) {
    setOverviewDraft((current) => {
      if (current.includes(key)) return current.length === 1 ? current : current.filter((item) => item !== key);
      return current.length >= 4 ? current : [...current, key];
    });
  }

  function moveOverviewMetric(key, direction) {
    setOverviewDraft((current) => {
      const index = current.indexOf(key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function dropOverviewMetric(targetKey) {
    if (!draggedMetric || draggedMetric === targetKey) return;
    setOverviewDraft((current) => {
      const next = current.filter((key) => key !== draggedMetric);
      next.splice(next.indexOf(targetKey), 0, draggedMetric);
      return next;
    });
    setDraggedMetric(null);
  }

  if (isLoading) return <div className="subscription-loading panel-card">正在读取订阅...</div>;

  return (
    <div className="subscriptions-page-layout">
      <section className="subscription-overview-grid" aria-label="订阅概览">
        {preferences.overviewMetrics.map((key) => (
          <div className={`subscription-overview-card overview-${key}`} key={key}>
            <button className="overview-card-settings" onClick={openOverviewSettings} aria-label="选择显示哪些概览卡片" title="设置概览卡片">
              <Settings2 size={16} />
            </button>
            <span>{metrics[key].label}</span>
            <strong>{metrics[key].value}</strong>
          </div>
        ))}
      </section>

      <section className="subscription-toolbar panel-card">
        <div className="subscription-search-box">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索订阅名称、备注、运营商" aria-label="搜索订阅名称、备注、运营商" />
        </div>
        <div className="subscription-filter-row">
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="按分类筛选">
            <option value="all">分类</option>
            {CATEGORY_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
          </select>
          <select value={cycleFilter} onChange={(event) => setCycleFilter(event.target.value)} aria-label="按续费周期筛选">
            <option value="all">续费周期</option>
            {CYCLE_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="按到期状态筛选">
            <option value="all">订阅状态</option>
            <option value="active">有效订阅</option>
            <option value="dueSoon">30 天内到期</option>
            <option value="expired">已过期</option>
          </select>
        </div>
        <div className="subscription-view-controls">
          <div className="subscription-segmented-control" aria-label="展示方式">
            <button className={preferences.viewMode === 'cards' ? 'active' : ''} onClick={() => persistPreferences({ ...preferences, viewMode: 'cards' })}><LayoutGrid size={16} />卡片</button>
            <button className={preferences.viewMode === 'list' ? 'active' : ''} onClick={() => persistPreferences({ ...preferences, viewMode: 'list' })}><List size={16} />列表</button>
          </div>
          {preferences.viewMode === 'cards' && (
            <div className="subscription-segmented-control density-control" aria-label="卡片密度">
              <button className={preferences.cardDensity === 'compact' ? 'active' : ''} onClick={() => persistPreferences({ ...preferences, cardDensity: 'compact' })}>精简</button>
              <button className={preferences.cardDensity === 'detailed' ? 'active' : ''} onClick={() => persistPreferences({ ...preferences, cardDensity: 'detailed' })}>详细</button>
            </div>
          )}
          <button className="workspace-main-action subscription-add-button" onClick={openCreateForm}><Plus size={18} />新增订阅</button>
        </div>
      </section>

      {visibleSubscriptions.length === 0 ? (
        <section className="subscription-empty panel-card">
          <span><Wifi size={28} /></span>
          <h2>{subscriptions.length ? '没有符合筛选条件的订阅' : '还没有订阅记录'}</h2>
          <p>{subscriptions.length ? '换一个筛选条件试试。' : '把宽带、会员或软件服务记进来，到期时间就不会再悄悄溜走。'}</p>
          {!subscriptions.length && <button className="workspace-main-action" onClick={openCreateForm}><Plus size={18} />添加第一项订阅</button>}
        </section>
      ) : preferences.viewMode === 'list' ? (
        <SubscriptionTable subscriptions={visibleSubscriptions} onEdit={openEditForm} onRenew={handleRenew} onDelete={handleDelete} />
      ) : (
        <div className={`subscription-card-grid ${preferences.cardDensity === 'detailed' ? 'detailed-grid' : 'compact-grid'}`}>
          {visibleSubscriptions.map((subscription) => preferences.cardDensity === 'compact'
            ? <CompactSubscriptionCard key={subscription.id} subscription={subscription} onOpen={() => setDetailSubscription(subscription)} />
            : <DetailedSubscriptionCard key={subscription.id} subscription={subscription} onEdit={openEditForm} onRenew={handleRenew} onDelete={handleDelete} />)}
        </div>
      )}

      {isFormOpen && (
        <SubscriptionModal title={editingId ? '编辑订阅' : '新增订阅'} onClose={() => setIsFormOpen(false)}>
          <form className="subscription-form" onSubmit={handleSubmit}>
            <label className="wide-field">订阅名称<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="例如：家庭千兆宽带" autoFocus /></label>
            <label>运营商 / 服务商<input value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value })} placeholder="例如：中国移动" /></label>
            <label>分类<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{CATEGORY_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
            <label>金额（人民币）<input type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0.00" /></label>
            <label>付费周期<select value={form.billing_cycle} onChange={(event) => updateCycle(event.target.value)}>{CYCLE_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
            <label>续费方式<select value={form.renewal_type} onChange={(event) => setForm({ ...form, renewal_type: event.target.value })}><option value="manual">手动续费</option><option value="auto">自动续费</option></select></label>
            <label>开始日期<input type="date" value={form.start_date} onChange={(event) => updateStartDate(event.target.value)} /></label>
            <label>{form.renewal_type === 'auto' ? '下次扣款日' : '到期日期'}<input type="date" value={form.end_date} min={addDays(form.start_date, 1)} onChange={(event) => setForm({ ...form, end_date: event.target.value })} /></label>
            <label className="wide-field">备注<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="账号、套餐或续费注意事项（选填）" /></label>
            <div className="subscription-modal-actions wide-field"><button type="button" className="subscription-secondary-button" onClick={() => setIsFormOpen(false)}>取消</button><button className="workspace-main-action">{editingId ? '保存修改' : '添加订阅'}</button></div>
          </form>
        </SubscriptionModal>
      )}

      {detailSubscription && (
        <SubscriptionModal title="订阅详情" onClose={() => setDetailSubscription(null)}>
          <DetailedSubscriptionCard subscription={detailSubscription} onEdit={openEditForm} onRenew={handleRenew} onDelete={handleDelete} inModal />
        </SubscriptionModal>
      )}

      {isOverviewOpen && (
        <SubscriptionModal title="选择概览卡片" onClose={() => setIsOverviewOpen(false)}>
          <p className="subscription-modal-copy">选择 1–4 个指标。拖动已选项目调整顺序，手机端也可以使用上下按钮。</p>
          <div className="overview-option-grid">
            {OVERVIEW_OPTIONS.map((option) => {
              const selected = overviewDraft.includes(option.key);
              return <button className={selected ? 'overview-option selected' : 'overview-option'} key={option.key} onClick={() => toggleOverviewMetric(option.key)} disabled={!selected && overviewDraft.length >= 4}><span>{selected ? <Check size={15} /> : null}</span>{option.label}</button>;
            })}
          </div>
          <div className="overview-sort-list">
            {overviewDraft.map((key, index) => {
              const option = OVERVIEW_OPTIONS.find((item) => item.key === key);
              return (
                <div className="overview-sort-item" draggable onDragStart={() => setDraggedMetric(key)} onDragOver={(event) => event.preventDefault()} onDrop={() => dropOverviewMetric(key)} key={key}>
                  <GripVertical size={18} />
                  <strong>{option.label}</strong>
                  <button aria-label={`上移${option.label}`} disabled={index === 0} onClick={() => moveOverviewMetric(key, -1)}><ChevronUp size={17} /></button>
                  <button aria-label={`下移${option.label}`} disabled={index === overviewDraft.length - 1} onClick={() => moveOverviewMetric(key, 1)}><ChevronDown size={17} /></button>
                </div>
              );
            })}
          </div>
          <div className="subscription-modal-actions"><button className="subscription-secondary-button" onClick={() => setIsOverviewOpen(false)}>取消</button><button className="workspace-main-action" onClick={() => { persistPreferences({ ...preferences, overviewMetrics: overviewDraft }); setIsOverviewOpen(false); }}>保存概览</button></div>
        </SubscriptionModal>
      )}
    </div>
  );
}

function SubscriptionProgress({ subscription, compact = false, mode = 'remaining' }) {
  const timing = getSubscriptionTiming(subscription);
  const isElapsed = mode === 'elapsed';
  const fillPercent = isElapsed ? timing.elapsedPercent : timing.percent;
  return (
    <div className={`subscription-progress progress-${timing.tone}${compact ? ' mini' : ''}${isElapsed ? ' elapsed-progress' : ''}`}>
      {isElapsed && (
        <div className="subscription-progress-labels">
          <span>开始 {formatCompactDate(subscription.start_date)}</span>
          <strong>{getRemainingLabel(timing.remainingDays)}</strong>
        </div>
      )}
      <div className="subscription-progress-track" role="progressbar" aria-label={isElapsed ? '订阅周期已使用时间' : '订阅周期剩余时间'} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(fillPercent)}>
        <span style={{ width: `${fillPercent}%` }} />
      </div>
      {!isElapsed && <span className="subscription-remaining-copy">{getRemainingLabel(timing.remainingDays)}</span>}
    </div>
  );
}

function CompactSubscriptionCard({ subscription, onOpen }) {
  return (
    <button className="subscription-card compact-subscription-card" onClick={onOpen}>
      <strong>{subscription.name}</strong>
      <SubscriptionProgress subscription={subscription} />
    </button>
  );
}

function DetailedSubscriptionCard({ subscription, onEdit, onRenew, onDelete, inModal = false }) {
  const cycle = getCycle(subscription.billing_cycle).label;
  return (
    <article className={`subscription-card detailed-subscription-card${inModal ? ' modal-detail-card' : ''}`}>
      <div className="subscription-card-heading">
        <span className={`subscription-category-icon category-${subscription.category}`}>{subscription.category === 'network' ? <Wifi size={18} /> : <CreditCard size={18} />}</span>
        <div><h3>{subscription.name}</h3><span>{getCategory(subscription.category)}{subscription.provider ? ` · ${subscription.provider}` : ''}</span></div>
        <span className={`renewal-badge renewal-${subscription.renewal_type}`}>{subscription.renewal_type === 'auto' ? '自动续费' : '手动续费'}</span>
      </div>
      <div className="subscription-price-line"><strong>{formatMoney(subscription.amount)}</strong><span>/ {cycle}</span></div>
      <SubscriptionProgress subscription={subscription} mode="elapsed" />
      {subscription.notes && <p className="subscription-notes">{subscription.notes}</p>}
      <div className="subscription-card-actions">
        <button onClick={() => onRenew(subscription)}><RefreshCw size={15} />{subscription.renewal_type === 'auto' ? '确认已扣款' : '已续费'}</button>
        <button onClick={() => onEdit(subscription)}><Pencil size={15} />编辑</button>
        <button className="danger-action" onClick={() => onDelete(subscription)} aria-label={`删除${subscription.name}`}><Trash2 size={15} /></button>
      </div>
    </article>
  );
}

function SubscriptionTable({ subscriptions, onEdit, onRenew, onDelete }) {
  return (
    <section className="subscription-table-card panel-card">
      <div className="subscription-table-scroll">
        <table className="subscription-table">
          <thead><tr><th>订阅</th><th>金额</th><th>续费方式</th><th>到期 / 扣款</th><th>剩余时间</th><th><span className="sr-only">操作</span></th></tr></thead>
          <tbody>
            {subscriptions.map((subscription) => (
              <tr key={subscription.id}>
                <td data-label="订阅"><strong>{subscription.name}</strong><small>{getCategory(subscription.category)}{subscription.provider ? ` · ${subscription.provider}` : ''}</small></td>
                <td data-label="金额"><strong>{formatMoney(subscription.amount)}</strong><small>{getCycle(subscription.billing_cycle).label}</small></td>
                <td data-label="续费方式"><span className={`renewal-badge renewal-${subscription.renewal_type}`}>{subscription.renewal_type === 'auto' ? '自动续费' : '手动续费'}</span></td>
                <td data-label="到期 / 扣款">{formatDate(subscription.end_date)}</td>
                <td data-label="剩余时间"><SubscriptionProgress subscription={subscription} compact /></td>
                <td data-label="操作"><div className="subscription-table-actions"><button onClick={() => onRenew(subscription)} title={subscription.renewal_type === 'auto' ? '确认已扣款' : '已续费'}><RefreshCw size={15} /></button><button onClick={() => onEdit(subscription)} title="编辑"><Pencil size={15} /></button><button className="danger-action" onClick={() => onDelete(subscription)} title="删除"><Trash2 size={15} /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SubscriptionModal({ title, onClose, children }) {
  return (
    <div className="subscription-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="subscription-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="subscription-modal-heading"><div><CalendarClock size={20} /><h2>{title}</h2></div><button onClick={onClose} aria-label="关闭"><X size={20} /></button></div>
        {children}
      </section>
    </div>
  );
}
