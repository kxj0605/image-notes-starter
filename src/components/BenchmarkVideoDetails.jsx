import React from 'react';
import { ChevronUp, ClipboardPaste, Copy, Settings2 } from 'lucide-react';

const platformOptions = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'douyin', label: '抖音' },
];

const defaultPrompts = {
  youtube: '请根据 YouTube / YouTube Shorts 视频链接，提取公开资料，并严格按以下格式逐行输出。不要添加表格、序号、解释或代码块。\n\n视频标题：仅保留标题正文，不包含任何 # 标签\n视频标签：去掉 #；剔除与频道名称相同的标签；多项用 、 分隔\n视频链接：原始视频链接\n背景音乐：歌曲或音乐名称；无法确认请写不可用\n视频时长：\n频道名称：使用 @频道 Handle\n频道主页链接：https://www.youtube.com/@频道Handle\n播放量：\n点赞量：\n评论量：\n\n无法可靠获取的字段请写“不可用”，不要猜测。\n\n视频链接：{{视频链接}}',
  douyin: '我会提供一条抖音视频链接和一张视频详情截图。请结合链接与截图提取公开资料，并严格按以下格式逐行输出。不要添加表格、序号、解释或代码块。\n\n截图优先用于识别背景音乐、点赞量、评论量、收藏量和转发量；请只读取截图中清晰可见的数据。\n\n视频标题：优先读取作者昵称下方的视频发布文案第一句，去掉后续 # 标签；不要把封面、暂停画面、视频内容里的字幕或大字当作标题。若发布文案只有一句，视频标题和视频简介可以相同\n视频简介：\n视频标签：去掉 #；如果标签与频道名称相同则剔除\n视频链接：{{视频链接}}\n发布者：严格使用 Markdown 链接格式 [@昵称](https://www.douyin.com/user/...)\n背景音乐：\n点赞量：\n评论量：\n收藏量：\n转发量：\n\n无法可靠获取或截图中看不清的字段请写“不可用”，不要猜测。',
};

const fieldsByPlatform = {
  youtube: [
    { label: '视频标题', name: 'benchmark-video-title', placeholder: '不包含 # 标签', column: 'content' },
    { label: '视频标签', name: 'benchmark-video-tags', placeholder: '多个标签用 、 分隔', column: 'content' },
    { label: '视频链接', name: 'benchmark-video-url', placeholder: 'YouTube 视频链接', column: 'content' },
    { label: '背景音乐', name: 'benchmark-background-music', placeholder: '歌曲或音乐名称', column: 'content' },
    { label: '频道名称', name: 'benchmark-channel-name', placeholder: '如：@频道 Handle', column: 'content' },
    { label: '视频时长', name: 'benchmark-video-duration', placeholder: '如：00:32', column: 'metrics' },
    { label: '播放量', name: 'benchmark-view-count', placeholder: '如：12.3万', column: 'metrics' },
    { label: '点赞量', name: 'benchmark-like-count', placeholder: '如：8,420', column: 'metrics' },
    { label: '评论量', name: 'benchmark-comment-count', placeholder: '如：325', column: 'metrics' },
    { label: '频道主页链接', name: 'benchmark-channel-url', placeholder: 'https://www.youtube.com/@频道Handle', column: 'metrics' },
  ],
  douyin: [
    { label: '视频标题', name: 'benchmark-video-title', placeholder: '不包含 # 标签', column: 'content' },
    { label: '视频简介', name: 'benchmark-video-description', placeholder: '视频简介正文', column: 'content' },
    { label: '视频标签', name: 'benchmark-video-tags', placeholder: '多个标签用 、 分隔', column: 'content' },
    { label: '视频链接', name: 'benchmark-video-url', placeholder: '抖音视频链接', column: 'content' },
    { label: '发布者', name: 'benchmark-author', placeholder: '[@某某某](https://www.douyin.com/user/...)', column: 'metrics' },
    { label: '背景音乐', name: 'benchmark-background-music', placeholder: '歌曲或音乐名称', column: 'content' },
    { label: '点赞量', name: 'benchmark-like-count', placeholder: '如：8,420', column: 'metrics' },
    { label: '评论量', name: 'benchmark-comment-count', placeholder: '如：325', column: 'metrics' },
    { label: '收藏量', name: 'benchmark-favorite-count', placeholder: '如：1,260', column: 'metrics' },
    { label: '转发量', name: 'benchmark-share-count', placeholder: '如：320', column: 'metrics' },
  ],
};

const detectPlatform = (value) => /douyin\.com\b|iesdouyin\.com\b/i.test(value) ? 'douyin' : 'youtube';
const normalizeDouyinVideoUrl = (value) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed);
    const isDouyin = url.protocol === 'https:' && (url.hostname === 'douyin.com' || url.hostname.endsWith('.douyin.com'));
    const videoId = url.searchParams.get('modal_id') || url.pathname.match(/^\/video\/(\d+)/)?.[1];
    return isDouyin && videoId ? `https://www.douyin.com/video/${videoId}` : trimmed;
  } catch {
    return trimmed;
  }
};

export function BenchmarkVideoDetails({ video, onChange, onNotice, onCollapse }) {
  const [isPromptSettingsOpen, setIsPromptSettingsOpen] = React.useState(false);
  const [promptPlatform, setPromptPlatform] = React.useState(detectPlatform(video.url));
  const [templates, setTemplates] = React.useState(defaultPrompts);
  const [isPasteOpen, setIsPasteOpen] = React.useState(false);
  const [pasteText, setPasteText] = React.useState('');
  const platform = detectPlatform(video.url);
  const fields = fieldsByPlatform[platform];
  const metadata = { 'benchmark-video-url': video.url, ...(video.details?.metadata || {}) };
  const activeTemplate = templates[platform] || defaultPrompts[platform];
  const settingsTemplate = templates[promptPlatform] || defaultPrompts[promptPlatform];

  React.useEffect(() => {
    const nextTemplates = { ...defaultPrompts };
    platformOptions.forEach(({ value }) => {
      const saved = window.localStorage.getItem(`benchmark-video-prompt-${value}-v1`) || (value === 'youtube' ? window.localStorage.getItem('benchmark-video-prompt-v1') : '');
      if (saved) nextTemplates[value] = saved;
    });
    setTemplates(nextTemplates);
  }, []);

  const updateMetadata = (name, value) => {
    const nextMetadata = { ...metadata, [name]: value };
    const nextVideo = name === 'benchmark-video-url'
      ? { ...video, url: detectPlatform(value) === 'douyin' ? normalizeDouyinVideoUrl(value) : value }
      : video;
    onChange({ ...nextVideo, details: { ...(video.details || {}), metadata: nextMetadata } });
  };

  const applyPaste = (text) => {
    setPasteText(text);
    const parsed = {};
    text.split(/\r?\n/).forEach((line) => {
      const normalized = line.replace(/^\s*(?:[-+•]\s+|\d+[.)]\s+)?/, '').replace(/[*_`]/g, '').trim();
      const separator = normalized.indexOf('：') >= 0 ? normalized.indexOf('：') : normalized.indexOf(':');
      if (separator < 0) return;
      const label = normalized.slice(0, separator).trim();
      const field = fields.find((item) => item.label === label);
      if (field) parsed[field.name] = normalized.slice(separator + 1).trim();
    });
    if (!Object.keys(parsed).length) return;
    const metadataWithPaste = { ...metadata, ...parsed };
    const pastedUrl = parsed['benchmark-video-url'];
    const nextVideo = pastedUrl ? { ...video, url: detectPlatform(pastedUrl) === 'douyin' ? normalizeDouyinVideoUrl(pastedUrl) : pastedUrl } : video;
    onChange({ ...nextVideo, details: { ...(video.details || {}), metadata: metadataWithPaste } });
    setPasteText('');
    setIsPasteOpen(false);
    onNotice(`已填入 ${Object.keys(parsed).length} 项视频资料`);
  };

  const copyMetadata = async () => {
    const text = fields.map((field) => `${field.label}：${metadata[field.name] || ''}`).join('\n');
    try { await navigator.clipboard.writeText(text); onNotice('视频资料已复制'); } catch { onNotice('复制失败，请允许浏览器访问剪贴板'); }
  };

  const copyPrompt = async () => {
    const prompt = activeTemplate.replaceAll('{{视频链接}}', video.url || '');
    try { await navigator.clipboard.writeText(prompt); onNotice(`${platformOptions.find((item) => item.value === platform)?.label} 视频资料提示词已复制，已附视频链接`); } catch { onNotice('复制失败，请允许浏览器访问剪贴板'); }
  };

  const savePromptSettings = () => {
    window.localStorage.setItem(`benchmark-video-prompt-${promptPlatform}-v1`, settingsTemplate.trim() || defaultPrompts[promptPlatform]);
    setIsPromptSettingsOpen(false);
    onNotice('视频资料提示词已保存');
  };

  const resetPrompt = () => {
    setTemplates((current) => ({ ...current, [promptPlatform]: defaultPrompts[promptPlatform] }));
    window.localStorage.removeItem(`benchmark-video-prompt-${promptPlatform}-v1`);
    if (promptPlatform === 'youtube') window.localStorage.removeItem('benchmark-video-prompt-v1');
    onNotice('已恢复默认提示词');
  };

  return <section className="benchmark-video-details-inspiration" aria-label={`${video.title} 的视频数据`}>
    <div className="benchmark-data-head"><div className="benchmark-data-heading"><h4>视频数据</h4><button type="button" className="benchmark-data-collapse" onClick={onCollapse} aria-label="收起视频数据" title="收起视频数据"><ChevronUp size={17} /></button><span className={`benchmark-platform-badge ${platform}`}>已识别：{platformOptions.find((item) => item.value === platform)?.label}</span></div><div className="benchmark-data-actions"><div className="benchmark-prompt-actions" aria-label="视频数据提示词操作"><span className="benchmark-prompt-label">提示词</span><button type="button" onClick={copyPrompt} aria-label="复制提示词" title="复制提示词"><Copy size={17} /></button><button type="button" onClick={() => { setPromptPlatform(platform); setIsPromptSettingsOpen((open) => !open); }} aria-label="设置视频数据提示词" aria-expanded={isPromptSettingsOpen} title="设置提示词"><Settings2 size={17} /></button></div></div></div>
    {isPromptSettingsOpen && <section className="benchmark-prompt-settings" aria-label="视频资料提示词设置"><div><h3>视频资料提示词 · {platformOptions.find((item) => item.value === promptPlatform)?.label}</h3><p>保留 <code>{'{{视频链接}}'}</code> 会在复制时自动替换为这条视频的链接。</p></div><div className="benchmark-prompt-platform-tabs" role="group" aria-label="选择提示词平台">{platformOptions.map((item) => <button type="button" className={promptPlatform === item.value ? 'active' : undefined} aria-pressed={promptPlatform === item.value} key={item.value} onClick={() => setPromptPlatform(item.value)}>{item.label}</button>)}</div><textarea value={settingsTemplate} onChange={(event) => setTemplates((current) => ({ ...current, [promptPlatform]: event.target.value }))} rows={14} aria-label="视频资料提示词内容" /><div className="benchmark-prompt-settings-actions"><button type="button" className="text-button" onClick={resetPrompt}>恢复默认</button><button type="button" className="primary-button" onClick={savePromptSettings}>保存提示词</button></div></section>}
    <section className="benchmark-video-details benchmark-metadata-panel" aria-label="视频资料">
      <div className="benchmark-metadata-head"><strong>视频资料</strong><span className="benchmark-metadata-actions" aria-label="视频资料操作"><button type="button" onClick={() => setIsPasteOpen(true)} title="粘贴导入视频资料"><ClipboardPaste size={15} />粘贴导入</button><button type="button" onClick={copyMetadata} title="复制资料"><Copy size={15} />复制资料</button></span></div>
      {isPasteOpen && <div className="benchmark-metadata-paste-panel"><div className="benchmark-metadata-paste-heading"><span>在这里按 Ctrl+V，识别后会自动填入表格</span><button type="button" onClick={() => { setPasteText(''); setIsPasteOpen(false); }}>取消</button></div><textarea value={pasteText} onChange={(event) => applyPaste(event.target.value)} onPaste={(event) => { event.preventDefault(); applyPaste(event.clipboardData.getData('text/plain')); }} rows={4} autoFocus aria-label="粘贴视频资料内容" placeholder="在这里粘贴视频标题、标签、链接、播放量等资料" /></div>}
      <div className="benchmark-metadata-grid" aria-label="视频资料">{['content', 'metrics'].map((column) => <div className="benchmark-metadata-column" key={column}>{fields.filter((field) => field.column === column).map((field) => <label className="benchmark-metadata-field" key={field.name}><span>{field.label}</span><input value={metadata[field.name] || ''} placeholder={field.placeholder} aria-label={field.label} onChange={(event) => updateMetadata(field.name, event.target.value)} onPaste={field.name === 'benchmark-video-title' ? (event) => { const text = event.clipboardData.getData('text/plain'); if (text.includes('：') || text.includes(':')) { event.preventDefault(); applyPaste(text); } } : undefined} /></label>)}</div>)}</div>
    </section>
  </section>;
}

export const getBenchmarkMetadataFields = (url) => fieldsByPlatform[detectPlatform(url)];
