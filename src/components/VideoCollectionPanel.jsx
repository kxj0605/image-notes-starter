import React from 'react';
import { ArrowRight, BookmarkPlus, ChevronDown, ChevronUp, Copy, Plus, Search, Trash2 } from 'lucide-react';
import './VideoCollectionPanel.css';
import { BenchmarkVideoDetails } from './BenchmarkVideoDetails';

const STORAGE_KEY = 'video-collection-v1';
const PLATFORMS = ['抖音', 'YouTube', '快手', 'B站', '小红书', '其他'];
const CATEGORIES = ['情绪', '反转打脸爽剧', '搞笑整蛊', '剧情', 'shorts'];
const STATUSES = {
  pending: { label: '待补资料', className: 'pending' },
  breaking: { label: '拆解中', className: 'breaking' },
  archived: { label: '已归档', className: 'archived' },
};

const makeId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const emptyDetails = () => ({ metadata: {} });
const loadVideos = () => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved.map((video) => {
      const legacyDetails = video.details || {};
      if (legacyDetails.metadata) return video;
      return {
        ...video,
        details: {
          metadata: {
            'benchmark-video-title': legacyDetails.officialTitle || '',
            'benchmark-author': legacyDetails.author || '',
            'benchmark-video-duration': legacyDetails.duration || '',
            'benchmark-background-music': legacyDetails.music || '',
            'benchmark-video-tags': legacyDetails.sourceTags || '',
          },
        },
      };
    }) : [];
  } catch {
    return [];
  }
};
const formatDate = (value) => new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit' }).format(new Date(value));

export function VideoCollectionPanel({ onOpenBreakdown }) {
  const [videos, setVideos] = React.useState(loadVideos);
  const [draft, setDraft] = React.useState({ title: '', platform: '抖音', category: '情绪', tags: '', url: '', note: '', details: emptyDetails() });
  const [query, setQuery] = React.useState('');
  const [selectedPlatforms, setSelectedPlatforms] = React.useState([]);
  const [selectedCategories, setSelectedCategories] = React.useState([]);
  const [isDraftExtraOpen, setIsDraftExtraOpen] = React.useState(false);
  const [isDraftDetailsOpen, setIsDraftDetailsOpen] = React.useState(false);
  const [notice, setNotice] = React.useState('');

  React.useEffect(() => { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(videos)); }, [videos]);
  React.useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filteredVideos = videos.filter((video) => {
    const category = video.category || video.focus || '';
    const searchable = `${video.title} ${video.platform || ''} ${category} ${(video.tags || []).join(' ')} ${video.note || ''} ${video.url || ''}`.toLowerCase();
    return (!selectedPlatforms.length || selectedPlatforms.includes(video.platform))
      && (!selectedCategories.length || selectedCategories.includes(category))
      && (!query.trim() || searchable.includes(query.trim().toLowerCase()));
  });

  const updateVideo = (id, updater) => {
    setVideos((current) => current.map((item) => item.id === id ? updater(item) : item));
  };

  const collectVideo = (event) => {
    event.preventDefault();
    const title = draft.title.trim();
    const url = draft.url.trim();
    if (!title || !url) {
      setNotice('请填写视频名称和视频链接。');
      return;
    }
    if (videos.some((video) => video.url === url)) {
      setNotice('这条视频已在灵感视频库中。');
      return;
    }
    const created = {
      id: makeId(),
      title,
      platform: draft.platform,
      category: draft.category,
      status: 'pending',
      tags: draft.tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean),
      url,
      note: draft.note.trim(),
      details: draft.details || emptyDetails(),
      createdAt: new Date().toISOString(),
    };
    setVideos((current) => [created, ...current]);
    setDraft({ title: '', platform: '抖音', category: '情绪', tags: '', url: '', note: '', details: emptyDetails() });
    setIsDraftExtraOpen(false);
    setIsDraftDetailsOpen(false);
    setNotice('已收录到视频库。');
  };

  const openBreakdown = (video) => {
    updateVideo(video.id, (item) => ({ ...item, status: item.status === 'pending' ? 'breaking' : item.status }));
    onOpenBreakdown(video);
  };

  const deleteVideo = (video) => {
    if (!window.confirm(`确定删除「${video.title}」吗？删除后无法恢复。`)) return;
    setVideos((current) => current.filter((item) => item.id !== video.id));
    setNotice(`已删除「${video.title}」。`);
  };

  const copyDraftUrl = async () => {
    try {
      await navigator.clipboard.writeText(draft.url.trim());
      setNotice('视频链接已复制。');
    } catch {
      setNotice('复制失败，请允许浏览器访问剪贴板。');
    }
  };

  return <section className="video-collection" aria-label="灵感视频">
    {notice && <p className="video-collection-notice" role="status">{notice}</p>}
    <article className="video-collection-card">
      <div className="video-collection-card-head"><div><h2>收录视频</h2></div><div className="video-collection-card-head-actions"><b className="video-collection-status-tag"><i />待补资料</b><BookmarkPlus size={20} /></div></div>
      <form onSubmit={collectVideo} className="video-collection-form">
        <div className="video-collection-primary-row"><input className="video-collection-title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="视频名称，例如：电梯反转短片的前三秒节奏" aria-label="视频名称" maxLength="100" /><div className="video-collection-url-field"><input type="url" value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} placeholder="视频链接（必填）" aria-label="视频链接" /><button type="button" onClick={copyDraftUrl} disabled={!draft.url.trim()} title="复制视频链接" aria-label="复制视频链接"><Copy size={17} /><span>复制</span></button></div></div>
        <div className="video-collection-choice-row"><ChoiceGroup options={PLATFORMS} value={draft.platform} onChange={(platform) => setDraft({ ...draft, platform })} /><ChoiceGroup options={CATEGORIES} value={draft.category} onChange={(category) => setDraft({ ...draft, category })} tone="focus" /></div>
        <div className="video-draft-extra"><button type="button" className="video-draft-extra-toggle" aria-expanded={isDraftExtraOpen} onClick={() => setIsDraftExtraOpen((current) => !current)}><span>补充信息（可选）</span>{isDraftExtraOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</button>{isDraftExtraOpen && <div className="video-draft-extra-fields"><input value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} placeholder="标签，用逗号分隔（可选）" aria-label="标签" /><textarea value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="为什么值得收集 / 我想研究什么（可选）" rows="3" /></div>}</div>
        <div className="video-draft-details">
          {isDraftDetailsOpen ? (draft.url.trim() ? <BenchmarkVideoDetails video={draft} onChange={setDraft} onNotice={setNotice} onCollapse={() => setIsDraftDetailsOpen(false)} /> : <div className="video-data-empty"><div><strong>视频数据</strong><button type="button" className="benchmark-data-collapse" onClick={() => setIsDraftDetailsOpen(false)} aria-label="收起视频数据" title="收起视频数据"><ChevronUp size={17} /></button></div><p>请先填写视频链接，再补全视频数据。</p></div>) : <div className="video-data-collapsed"><strong>视频数据</strong><button type="button" className="benchmark-data-collapse" aria-expanded="false" onClick={() => setIsDraftDetailsOpen(true)} aria-label="展开视频数据" title="展开视频数据"><ChevronDown size={17} /></button></div>}
        </div>
        <div className="video-collection-submit"><button type="submit"><Plus size={17} />收录到视频库</button></div>
      </form>
    </article>

    <section className="video-library" aria-labelledby="video-library-title">
      <div className="video-library-head"><div><h2 id="video-library-title">视频库</h2><p>集中检索已收录的视频，并从这里进入详细拆解。</p></div><span>{videos.length} 条</span></div>
      <div className="video-library-filter"><label><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索视频、标签…" /></label><div className="video-library-filter-tags"><span>标签</span><div className="video-library-filter-tabs category-filter" aria-label="按标签筛选视频">{CATEGORIES.map((category) => <button key={category} type="button" aria-pressed={selectedCategories.includes(category)} className={selectedCategories.includes(category) ? 'active' : ''} onClick={() => setSelectedCategories((current) => current.includes(category) ? current.filter((value) => value !== category) : [...current, category])}>{category}</button>)}</div><span>平台</span><div className="video-library-filter-tabs platform-filter" aria-label="按平台筛选视频">{PLATFORMS.map((platform) => <button key={platform} type="button" aria-pressed={selectedPlatforms.includes(platform)} className={selectedPlatforms.includes(platform) ? 'active' : ''} onClick={() => setSelectedPlatforms((current) => current.includes(platform) ? current.filter((value) => value !== platform) : [...current, platform])}>{platform}</button>)}</div>{(selectedPlatforms.length > 0 || selectedCategories.length > 0) && <button className="video-library-filter-clear" type="button" onClick={() => { setSelectedPlatforms([]); setSelectedCategories([]); }}>清除筛选</button>}</div></div>
      <div className="video-library-list">{filteredVideos.length ? filteredVideos.map((video) => <VideoCard key={video.id} video={video} onOpen={() => openBreakdown(video)} onDelete={() => deleteVideo(video)} />) : <p className="video-library-empty">收录完成的视频会保存在这里，可按标签查找并进入拆解学习。</p>}</div>
    </section>
  </section>;
}

function ChoiceGroup({ options, value, onChange, tone = '' }) {
  return <div className={`video-choice-group ${tone}`}><div>{options.map((option) => <button key={option} type="button" aria-pressed={value === option} className={value === option ? 'active' : ''} onClick={() => onChange(option)}>{option}</button>)}</div></div>;
}

function VideoCard({ video, onOpen, onDelete }) {
  const status = STATUSES[video.status] || STATUSES.pending;

  return <article className="video-library-row compact">
    <div className="video-library-row-summary">
      <div className="video-library-row-copy"><h3>{video.title}</h3><div><span className="video-chip platform">{video.platform}</span><span className="video-chip focus">{video.category || video.focus || '剧情'}</span><span className={`video-chip status ${status.className}`}>{status.label}</span>{(video.tags || []).map((tag) => <span className="video-chip tag" key={tag}>{tag}</span>)}<time>{formatDate(video.createdAt)}</time></div>{video.note && <p>{video.note}</p>}</div>
      <div className="video-library-row-actions">
        <button className="video-library-row-primary-action" type="button" onClick={onOpen}>进入拆解学习<ArrowRight size={16} /></button>
        <button className="video-library-row-delete" type="button" onClick={onDelete} aria-label={`删除${video.title}`} title="删除视频"><Trash2 size={17} /></button>
      </div>
    </div>
  </article>;
}
