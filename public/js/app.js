// UI Controller for KINETIC_DL Multi-Platform Downloader

class HackerLoadingOverlay {
  constructor() {
    this.overlay = document.getElementById('hacker-overlay');
    this.canvas = document.getElementById('matrix-canvas');
    this.terminal = document.getElementById('hacker-terminal');
    this.progressBar = document.getElementById('hacker-progress');
    this.statusText = document.getElementById('hacker-status');
    this.timerDisplay = document.getElementById('hacker-timer');
    this.titleEl = document.getElementById('hacker-title');
    this.animFrameId = null;
    this.terminalInterval = null;
    this.progressInterval = null;
    this.timerInterval = null;
    this.startTime = 0;
    this.currentProgress = 0;

    this.hackerLines = [
      '[SYS] INITIALIZING BREACH_MODULE_v3.1...',
      '[NET] ESTABLISHING ENCRYPTED TUNNEL...',
      '[SEC] AES_256_HANDSHAKE: NEGOTIATING...',
      '[CMD] DEPLOYING SIGNAL INTERCEPTORS...',
      '[NET] ROUTING THROUGH PROXY_CASCADE: 7 NODES...',
      '[SYS] BUFFER_ALLOCATION: 4096MB RESERVED',
      '[SEC] SSL_PINNING_BYPASS: ACTIVE',
      '[NET] DNS_OVER_HTTPS: RESOLVING TARGET...',
      '[CMD] METADATA_EXTRACTION: IN_PROGRESS...',
      '[SYS] DECODING OBFUSCATION LAYER_1...',
      '[NET] PACKET_FRAGMENTATION: REASSEMBLING...',
      '[SEC] CERTIFICATE_VALIDATION: OVERRIDE',
      '[CMD] PARSING VIDEO_MANIFEST...',
      '[SYS] CODEC_DETECTION: SCANNING_STREAMS...',
      '[NET] BANDWIDTH_PROBE: 120 Mbps DETECTED',
      '[SEC] ANTI_BOT_BYPASS: TOKEN_GENERATED',
      '[CMD] FORMAT_ENUMERATION: PROCESSING...',
      '[SYS] THUMBNAIL_CACHE: DOWNLOADING...',
      '[NET] CDN_EDGE_SERVER: LOCATED',
      '[SEC] SESSION_TOKEN: VALIDATED',
      '[CMD] QUALITY_ANALYSIS: COMPUTING_BITRATES...',
      '[SYS] AUDIO_STREAM_DETECTION: 2 TRACKS FOUND',
      '[NET] LATENCY_OPTIMIZATION: 14ms ACHIEVED',
      '[SEC] FINGERPRINT_SPOOF: BROWSER_V122',
      '[CMD] RESOLUTION_MAPPING: 360p → 4K DETECTED',
      '[SYS] DRM_CHECK: CLEAR_CONTENT',
      '[NET] RELAY_HANDOFF: COMPLETE',
      '[CMD] EXTRACTION_PIPELINE: STAGE_3/5...',
      '[SYS] MEMORY_OPTIMIZATION: GC_SWEEP_DONE',
      '[SEC] RATE_LIMIT_EVASION: THROTTLE_BYPASS',
      '[CMD] SIGNAL_LOCK: ACQUIRED ✓',
      '[SYS] FINALIZING ACCESS VECTOR...',
    ];
  }

  show() {
    this.startTime = Date.now();
    this.currentProgress = 0;
    this.overlay.style.display = 'flex';
    this.terminal.innerHTML = '';
    requestAnimationFrame(() => { this.overlay.style.opacity = '1'; });
    this.startMatrixRain();
    this.startTerminalStream();
    this.startProgressSimulation();
    this.startTimer();
  }

  hide() {
    this.progressBar.style.width = '100%';
    this.statusText.textContent = 'ACCESS GRANTED // EXTRACTION COMPLETE';
    this.titleEl.textContent = 'SYSTEM_BREACHED';
    this.titleEl.style.textShadow = '0 0 30px rgba(142,255,113,0.8), 0 0 60px rgba(142,255,113,0.5)';
    setTimeout(() => {
      this.overlay.style.opacity = '0';
      setTimeout(() => {
        this.overlay.style.display = 'none';
        this.cleanup();
        this.titleEl.textContent = 'GETTING THE SYSTEM ACCESS';
        this.titleEl.style.textShadow = '0 0 30px rgba(142,255,113,0.6), 0 0 60px rgba(142,255,113,0.3)';
      }, 500);
    }, 800);
  }

  hideWithError() {
    this.statusText.textContent = 'EXTRACTION FAILED // SIGNAL LOST';
    this.titleEl.textContent = 'ACCESS_DENIED';
    this.titleEl.style.color = '#ff7073';
    this.titleEl.style.textShadow = '0 0 30px rgba(255,112,115,0.6)';
    setTimeout(() => {
      this.overlay.style.opacity = '0';
      setTimeout(() => {
        this.overlay.style.display = 'none';
        this.cleanup();
        this.titleEl.textContent = 'GETTING THE SYSTEM ACCESS';
        this.titleEl.style.color = '';
        this.titleEl.style.textShadow = '0 0 30px rgba(142,255,113,0.6), 0 0 60px rgba(142,255,113,0.3)';
      }, 500);
    }, 1200);
  }

  cleanup() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.terminalInterval) clearInterval(this.terminalInterval);
    if (this.progressInterval) clearInterval(this.progressInterval);
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.progressBar.style.width = '0%';
  }

  startMatrixRain() {
    const canvas = this.canvas;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*アイウエオカキクケコサシスセソ';
    const fontSize = 12;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = new Array(columns).fill(1);
    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px monospace`;
      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillStyle = Math.random() > 0.98 ? '#ffffff' : `rgba(142, 255, 113, ${Math.random() * 0.5 + 0.2})`;
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
      this.animFrameId = requestAnimationFrame(draw);
    };
    draw();
  }

  startTerminalStream() {
    let lineIndex = 0;
    this.terminalInterval = setInterval(() => {
      const line = this.hackerLines[lineIndex % this.hackerLines.length];
      const el = document.createElement('div');
      el.textContent = line;
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.3s';
      this.terminal.appendChild(el);
      requestAnimationFrame(() => el.style.opacity = '1');
      while (this.terminal.children.length > 15) this.terminal.removeChild(this.terminal.firstChild);
      this.terminal.scrollTop = this.terminal.scrollHeight;
      lineIndex++;
    }, 400);
  }

  startProgressSimulation() {
    const msgs = [
      'INITIALIZING EXTRACTION PIPELINE...', 'BYPASSING SECURITY LAYERS...',
      'ESTABLISHING ENCRYPTED TUNNEL...', 'RESOLVING TARGET HOSTNAME...',
      'DECODING VIDEO MANIFEST...', 'ENUMERATING AVAILABLE FORMATS...',
      'ANALYZING STREAM QUALITY...', 'COMPUTING BITRATE MATRIX...',
      'FINALIZING METADATA EXTRACTION...',
    ];
    let i = 0;
    this.progressInterval = setInterval(() => {
      if (this.currentProgress < 85) {
        this.currentProgress += Math.random() * 8 + 2;
        if (this.currentProgress > 85) this.currentProgress = 85;
        this.progressBar.style.width = `${this.currentProgress}%`;
      }
      if (Math.random() > 0.5) { this.statusText.textContent = msgs[i % msgs.length]; i++; }
    }, 600);
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const secs = String(elapsed % 60).padStart(2, '0');
      this.timerDisplay.textContent = `ELAPSED: ${mins}:${secs}`;
    }, 1000);
  }
}

// ---------------------------------------------------------------------------
// Small DOM + formatting helpers. All dynamic text goes through textContent,
// never innerHTML, so titles/filenames from remote sites can't inject markup.
// ---------------------------------------------------------------------------

function h(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function icon(name, className = '') {
  return h('span', `material-symbols-outlined ${className}`, name);
}

const FALLBACK_THUMB = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225">' +
  '<rect width="400" height="225" fill="#0e0e0e"/>' +
  '<text x="200" y="118" fill="#8eff71" font-family="monospace" font-size="16" text-anchor="middle">NO_SIGNAL</text></svg>'
);

const Format = {
  bytes(bytes) {
    if (!bytes || bytes <= 0) return '--';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(i >= 2 ? 1 : 0))} ${units[i]}`;
  },
  speed(bps) {
    if (!bps || bps <= 0) return '0.00 MB/s';
    const mbps = bps / (1024 * 1024);
    return mbps >= 1024 ? `${(mbps / 1024).toFixed(2)} GB/s` : `${mbps.toFixed(2)} MB/s`;
  },
  eta(seconds) {
    if (!seconds || seconds <= 0 || !isFinite(seconds)) return '--';
    const s = Math.round(seconds);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    return hrs > 0
      ? `${hrs}h ${String(mins).padStart(2, '0')}m`
      : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  },
  duration(seconds) {
    if (!seconds) return 'LIVE';
    const s = Math.floor(seconds);
    const hrs = Math.floor(s / 3600);
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return hrs > 0 ? `${hrs}:${mm}:${ss}` : `${mm}:${ss}`;
  },
  timestamp(ts) {
    const d = new Date(ts);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} // ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
};

/** fetch() wrapper: JSON in/out, timeout, and uniform error objects */
async function apiRequest(path, { method = 'GET', body, timeoutMs = 20000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    let data = null;
    try {
      data = await response.json();
    } catch {
      // non-JSON response
    }
    if (!response.ok || !data || data.success === false) {
      const error = (data && data.error) || {};
      throw {
        code: error.code || `HTTP_${response.status}`,
        message: error.message || `Request failed (${response.status})`,
        retryable: error.retryable ?? response.status >= 500,
        details: error.details
      };
    }
    return data;
  } catch (e) {
    if (e && e.code) throw e;
    const timedOut = e && e.name === 'AbortError';
    throw {
      code: 'NETWORK_ERROR',
      message: timedOut ? 'Request timed out. The server may be busy.' : 'Network error: check your connection and retry',
      retryable: true
    };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Toast notifications (replaces alert())
// ---------------------------------------------------------------------------
class Toaster {
  constructor(container) {
    this.container = container;
  }

  show({ type = 'info', title, message, details, actionLabel, onAction, timeoutMs }) {
    const palette = {
      error: { border: 'border-secondary', text: 'text-secondary', icon: 'error' },
      success: { border: 'border-primary', text: 'text-primary', icon: 'check_circle' },
      info: { border: 'border-tertiary', text: 'text-tertiary', icon: 'info' }
    }[type];

    const toast = h('div', `bg-surface-container-high/95 backdrop-blur-md border-l-4 ${palette.border} p-4 shadow-2xl transition-all duration-300 opacity-0 translate-y-2`);
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

    const row = h('div', 'flex items-start gap-3');
    row.appendChild(icon(palette.icon, `${palette.text} text-lg`));
    const body = h('div', 'flex-1 min-w-0');
    body.appendChild(h('div', `text-[10px] font-label font-bold tracking-widest uppercase ${palette.text}`, title));
    if (message) body.appendChild(h('div', 'text-xs text-on-surface mt-1 break-words', message));
    if (details && details !== message) body.appendChild(h('div', 'text-[9px] font-mono text-neutral-500 mt-1 break-words', details));
    row.appendChild(body);

    const close = h('button', 'text-neutral-500 hover:text-on-surface');
    close.setAttribute('aria-label', 'Dismiss');
    close.appendChild(icon('close', 'text-base'));
    close.addEventListener('click', () => dismiss());
    row.appendChild(close);
    toast.appendChild(row);

    if (actionLabel && onAction) {
      const action = h('button', `mt-3 w-full border ${palette.border} py-2 text-[10px] font-label font-bold tracking-widest uppercase ${palette.text} hover:bg-white/5`, actionLabel);
      action.addEventListener('click', () => {
        dismiss();
        onAction();
      });
      toast.appendChild(action);
    }

    this.container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.remove('opacity-0', 'translate-y-2'));

    let timer = null;
    const dismiss = () => {
      clearTimeout(timer);
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    };
    const ttl = timeoutMs ?? (type === 'error' ? 12000 : 6000);
    if (ttl > 0) timer = setTimeout(dismiss, ttl);
    while (this.container.children.length > 4) this.container.firstChild.remove();
    return dismiss;
  }
}

// ---------------------------------------------------------------------------
// In-app video player
// ---------------------------------------------------------------------------
class VideoPlayerModal {
  constructor() {
    this.modal = document.getElementById('video-player-modal');
    this.videoEl = document.getElementById('video-player-element');
    this.closeBtn = document.getElementById('video-player-close');
    this.titleEl = document.getElementById('video-player-title');
    this.loadingEl = document.getElementById('video-player-loading');
    this._hls = null;
    this._fallback = null;

    this.closeBtn.addEventListener('click', () => this.close());
    this.modal.addEventListener('click', e => {
      if (e.target === this.modal) this.close();
    });
    this.videoEl.addEventListener('canplay', () => {
      this.loadingEl.style.display = 'none';
    });
    this.videoEl.addEventListener('error', () => {
      if (!this.videoEl.getAttribute('src')) return;
      if (this._fallback) {
        const fallback = this._fallback;
        this._fallback = null;
        fallback();
        return;
      }
      this.showStatus('error', 'STREAM_ERROR: CANNOT PLAY VIDEO', 'The format may not be supported by this browser');
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.modal.style.display !== 'none') this.close();
    });
  }

  showStatus(kind, label, detail) {
    this.loadingEl.style.display = 'flex';
    this.loadingEl.replaceChildren();
    const box = h('div', 'flex flex-col items-center gap-3 px-6 text-center');
    if (kind === 'error') {
      box.appendChild(icon('error', 'text-secondary text-3xl'));
      box.appendChild(h('div', 'text-[10px] font-label text-secondary tracking-wider uppercase', label));
    } else {
      box.appendChild(h('div', 'w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin'));
      box.appendChild(h('div', 'text-[10px] font-label text-primary/60 tracking-wider uppercase', label));
    }
    if (detail) box.appendChild(h('div', 'text-[9px] font-mono text-neutral-500', detail));
    this.loadingEl.appendChild(box);
  }

  resetMedia() {
    if (this._hls) {
      this._hls.destroy();
      this._hls = null;
    }
    this.videoEl.pause();
    this.videoEl.removeAttribute('src');
    this.videoEl.load();
  }

  async playFromUrl(url, title) {
    this._fallback = null;
    this.titleEl.textContent = title || 'VIDEO_STREAM';
    this.resetMedia();
    this.showStatus('loading', 'RESOLVING_STREAM_URL...');
    this.show();

    let result;
    try {
      result = await apiRequest(`/api/stream?url=${encodeURIComponent(url)}`, { timeoutMs: 60000 });
    } catch (error) {
      this.showStatus('error', 'STREAM_ERROR', error.message);
      return;
    }

    this.showStatus('loading', 'BUFFERING_STREAM...', result.isHLS ? 'HLS stream' : null);
    if (result.isHLS) {
      if (typeof Hls !== 'undefined' && Hls.isSupported()) {
        const hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 60, enableWorker: true });
        this._hls = hls;
        hls.loadSource(result.streamUrl);
        hls.attachMedia(this.videoEl);
        hls.on(Hls.Events.MANIFEST_PARSED, () => this.videoEl.play().catch(() => {}));
        let recoveries = 0;
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          if (recoveries++ < 2 && data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (recoveries++ < 3 && data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else this.showStatus('error', 'HLS_PLAYBACK_FAILED', data.details);
        });
        return;
      }
      if (!this.videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        this.showStatus('error', 'HLS_UNSUPPORTED', 'This browser cannot play HLS streams');
        return;
      }
    }
    this.videoEl.src = result.streamUrl;
    this.videoEl.play().catch(() => {});
  }

  /** Play the server copy of a finished download; fall back to the source URL */
  playFromSession(sessionId, title, fallbackUrl) {
    this.titleEl.textContent = title || 'VIDEO_STREAM';
    this.resetMedia();
    this.showStatus('loading', 'BUFFERING_STREAM...');
    this.show();
    this._fallback = fallbackUrl ? () => this.playFromUrl(fallbackUrl, title) : null;
    this.videoEl.src = `/api/stream/${encodeURIComponent(sessionId)}/file`;
    this.videoEl.play().catch(() => {});
  }

  show() {
    this.modal.style.display = 'flex';
    requestAnimationFrame(() => {
      this.modal.style.opacity = '1';
    });
  }

  close() {
    this._fallback = null;
    this.resetMedia();
    this.modal.style.opacity = '0';
    setTimeout(() => {
      this.modal.style.display = 'none';
    }, 300);
  }
}

// ---------------------------------------------------------------------------
// Download history (browser localStorage, max 100 records)
// ---------------------------------------------------------------------------
class HistoryStore {
  constructor() {
    this.storageKey = 'kinetic_dl_history';
    this.maxRecords = 100;
  }

  addRecord(record) {
    const records = this.getRecords().filter(r => r.id !== record.id);
    records.unshift(record);
    this.saveRecords(records.slice(0, this.maxRecords));
  }

  updateRecord(id, changes) {
    this.saveRecords(this.getRecords().map(r => (r.id === id ? { ...r, ...changes } : r)));
  }

  removeRecord(id) {
    this.saveRecords(this.getRecords().filter(r => r.id !== id));
  }

  getRecords(limit) {
    try {
      const records = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      if (!Array.isArray(records)) return [];
      records.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      return limit ? records.slice(0, limit) : records;
    } catch {
      return [];
    }
  }

  clearHistory() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // storage unavailable
    }
  }

  saveRecords(records) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(records));
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }
}

// ---------------------------------------------------------------------------
// Main UI controller
// ---------------------------------------------------------------------------
const MAX_RETRIES = 3;
const STATUS_LABELS = {
  QUEUED: 'QUEUED // WAITING_FOR_SLOT',
  DOWNLOADING: 'DOWNLOADING',
  PROCESSING: 'PROCESSING // ENCODING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'ABORTED'
};

class UIController {
  constructor() {
    this.apiBase = '/api';
    this.currentUrl = '';
    this.analysisData = null;
    this.selectedFormatId = '';
    this.selectedQualityLabel = '';
    this.audioOnly = false;
    this.audioFormat = 'mp3';
    this.currentSessionId = null;
    this.eventSource = null;
    this.pollTimer = null;
    this.downloadContext = null;
    this.retryCounts = { extract: 0, download: 0 };
    this.pendingFrame = null;

    const $ = id => document.getElementById(id);
    this.urlInput = $('url-input');
    this.extractBtn = $('extract-btn');
    this.downloadBtn = $('download-btn');
    this.statusDisplay = $('status-display');
    this.trafficDisplay = $('traffic-display');
    this.qualityGrid = $('quality-grid');
    this.audioToggle = $('audio-toggle');
    this.audioToggleKnob = $('audio-toggle-knob');
    this.audioFormatGroup = $('audio-format-group');
    this.historyContainer = $('history-container');
    this.historyCount = $('history-count');
    this.clearHistoryBtn = $('clear-history-btn');
    this.previewImg = $('preview-img');
    this.previewPlayBtn = $('preview-play');
    this.previewHud = $('preview-hud');
    this.previewTitle = $('preview-title');
    this.ttlDisplay = $('ttl-display');
    this.progress = {
      panel: $('progress-panel'),
      status: $('progress-status'),
      percent: $('progress-percent'),
      track: $('progress-track'),
      bar: $('progress-bar'),
      size: $('progress-size'),
      speed: $('progress-speed'),
      eta: $('progress-eta'),
      cancel: $('cancel-btn')
    };

    this.historyStore = new HistoryStore();
    this.hackerOverlay = new HackerLoadingOverlay();
    this.videoPlayer = new VideoPlayerModal();
    this.toaster = new Toaster($('toast-container'));
  }

  initialize() {
    this.extractBtn.addEventListener('click', () => this.handleExtract());
    this.downloadBtn.addEventListener('click', () => this.handleDownload());
    this.audioToggle.addEventListener('click', () => this.handleAudioToggle());
    this.previewPlayBtn?.addEventListener('click', () => this.handlePlayPreview());
    this.progress.cancel?.addEventListener('click', () => this.handleCancel());
    this.clearHistoryBtn?.addEventListener('click', () => this.handleClearHistory());
    this.audioFormatGroup?.querySelectorAll('.audio-format-btn').forEach(btn =>
      btn.addEventListener('click', () => this.selectAudioFormat(btn.dataset.audioFormat))
    );
    this.urlInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') this.handleExtract();
    });

    this.refreshHistory();
    this.checkServerHealth();
    this.startHubAnimation();
    this.startKernelLogAnimation();
  }

  // ----- notifications -----------------------------------------------------

  notifyError(error, retryKind, retryFn) {
    const count = this.retryCounts[retryKind] || 0;
    const canRetry = error.retryable && retryFn && count < MAX_RETRIES;
    const exhausted = error.retryable && retryFn && count >= MAX_RETRIES;
    this.toaster.show({
      type: 'error',
      title: (error.code || 'ERROR').replace(/_/g, ' '),
      message: exhausted ? `${error.message}. Retry limit reached — check the link or try again later.` : error.message,
      details: error.details,
      actionLabel: canRetry ? `RETRY (${count + 1}/${MAX_RETRIES})` : null,
      onAction: canRetry ? () => {
        this.retryCounts[retryKind] = count + 1;
        retryFn();
      } : null
    });
  }

  async checkServerHealth() {
    try {
      const health = await apiRequest('/api/health');
      if (health.config?.fileTtlMinutes && this.ttlDisplay) {
        this.ttlDisplay.textContent = `SERVER_COPY: ${health.config.fileTtlMinutes} MIN`;
      }
      if (health.ytdlp && !health.ytdlp.available) {
        this.toaster.show({ type: 'error', title: 'SERVER MISCONFIGURED', message: 'yt-dlp is not installed on the server, so extraction will fail.', timeoutMs: 0 });
      } else if (health.ffmpeg && !health.ffmpeg.available) {
        this.toaster.show({ type: 'error', title: 'SERVER MISCONFIGURED', message: 'ffmpeg is missing on the server: HD merges and audio extraction will fail.', timeoutMs: 0 });
      }
    } catch {
      // health is informational only
    }
  }

  // ----- extraction ----------------------------------------------------------

  async handleExtract(isRetry = false) {
    const url = this.urlInput.value.trim();
    if (!url) {
      this.toaster.show({ type: 'info', title: 'NO TARGET', message: 'Paste a video URL first.' });
      this.urlInput.focus();
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      this.toaster.show({ type: 'error', title: 'INVALID URL', message: 'The URL must start with http:// or https://' });
      return;
    }
    if (this.extractBtn.disabled) return;
    if (!isRetry) this.retryCounts.extract = 0;

    this.extractBtn.disabled = true;
    this.updateStatus('ANALYZING_SOURCE');
    this.hackerOverlay.show();

    try {
      const result = await apiRequest(`${this.apiBase}/analyze`, { method: 'POST', body: { url }, timeoutMs: 180000 });
      this.currentUrl = url;
      this.analysisData = result.data;
      this.retryCounts.extract = 0;
      this.updatePreview(result.data.metadata, result.data.platform);
      this.hackerOverlay.hide();
      setTimeout(() => {
        this.populateQualityOptions(result.data.availableQualities || []);
        this.applyPlatformCapabilities();
        this.updateStatus('READY_FOR_DOWNLOAD');
      }, 1300);
    } catch (error) {
      this.hackerOverlay.hideWithError();
      this.updateStatus('IDLE_WAITING');
      setTimeout(() => this.notifyError(error, 'extract', () => this.handleExtract(true)), 1300);
    } finally {
      this.extractBtn.disabled = false;
    }
  }

  updatePreview(metadata, platform) {
    if (this.previewImg) {
      this.previewImg.src = metadata.thumbnail || FALLBACK_THUMB;
      this.previewImg.alt = metadata.title || 'Video preview';
      this.previewImg.onerror = () => {
        this.previewImg.onerror = null;
        this.previewImg.src = FALLBACK_THUMB;
      };
    }
    if (this.previewHud) {
      const label = platform === 'terabox' ? 'TERABOX // PREVIEW' : `PREVIEW_MODE // ${Format.duration(metadata.duration)}`;
      this.previewHud.replaceChildren(h('span', 'text-[10px] font-label text-primary', label));
    }
    if (this.previewTitle) this.previewTitle.textContent = metadata.title || '';
  }

  applyPlatformCapabilities() {
    const audioAvailable = this.analysisData?.audioAvailable !== false;
    this.audioToggle.disabled = !audioAvailable;
    this.audioToggle.classList.toggle('opacity-40', !audioAvailable);
    this.audioToggle.title = audioAvailable ? '' : 'Audio extraction is not available for this source';
    if (!audioAvailable && this.audioOnly) this.handleAudioToggle();
  }

  handlePlayPreview() {
    if (!this.currentUrl) {
      this.toaster.show({ type: 'info', title: 'NO SIGNAL', message: 'Extract a video first, then press play.' });
      return;
    }
    const title = this.analysisData?.metadata?.title || 'Video Stream';
    // Prefer an already-downloaded copy: it always plays, even when the site
    // only offers separate audio/video streams the browser can't combine
    const downloaded = this.historyStore.getRecords()
      .find(r => r.url === this.currentUrl && r.status === 'COMPLETED' && !r.audioOnly && !r.expired);
    if (downloaded) {
      this.videoPlayer.playFromSession(downloaded.sessionId || downloaded.id, title, this.currentUrl);
    } else {
      this.videoPlayer.playFromUrl(this.currentUrl, title);
    }
  }

  populateQualityOptions(qualities) {
    this.qualityGrid.replaceChildren();
    this.selectedFormatId = '';
    this.selectedQualityLabel = '';

    if (qualities.length === 0) {
      this.qualityGrid.appendChild(h('div', 'col-span-2 text-center text-neutral-500 text-xs py-4',
        this.analysisData?.audioAvailable === false ? 'No downloadable files found.' : 'No video formats found. Use AUDIO ONLY mode.'));
      return;
    }

    qualities.forEach((quality, index) => {
      const button = h('button', 'quality-btn bg-surface-container-highest border border-outline-variant/20 p-3 text-left hover:border-primary transition-all disabled:cursor-not-allowed');
      button.dataset.formatId = quality.formatId;
      button.dataset.label = quality.label;
      const size = quality.filesize ? `~${Format.bytes(quality.filesize)}` : 'SIZE_N/A';
      button.appendChild(h('div', 'q-title text-xs font-bold text-on-surface truncate', quality.label));
      button.appendChild(h('div', 'q-sub text-[8px] text-neutral-600 truncate', `${quality.resolution} // ${String(quality.codec).toUpperCase()} // ${size}`));
      button.title = `${quality.resolution} ${quality.codec} ${quality.fps ? quality.fps + 'fps' : ''}`.trim();
      button.disabled = this.audioOnly;
      button.classList.toggle('opacity-50', this.audioOnly);
      button.addEventListener('click', () => this.handleQualitySelect(button));
      this.qualityGrid.appendChild(button);
      if (index === 0) this.handleQualitySelect(button);
    });
  }

  handleQualitySelect(button) {
    this.qualityGrid.querySelectorAll('.quality-btn').forEach(btn => {
      const active = btn === button;
      btn.classList.toggle('border-primary', active);
      btn.classList.toggle('border-outline-variant/20', !active);
      btn.setAttribute('aria-pressed', String(active));
      btn.querySelector('.q-title')?.classList.toggle('text-primary', active);
      btn.querySelector('.q-title')?.classList.toggle('text-on-surface', !active);
      btn.querySelector('.q-sub')?.classList.toggle('text-primary/60', active);
      btn.querySelector('.q-sub')?.classList.toggle('text-neutral-600', !active);
    });
    this.selectedFormatId = button.dataset.formatId;
    this.selectedQualityLabel = button.dataset.label;
  }

  handleAudioToggle() {
    if (this.audioToggle.disabled && !this.audioOnly) return;
    this.audioOnly = !this.audioOnly;
    this.audioToggle.setAttribute('aria-checked', String(this.audioOnly));
    this.audioToggle.classList.toggle('bg-secondary/40', this.audioOnly);
    this.audioToggle.classList.toggle('bg-neutral-800', !this.audioOnly);
    this.audioToggleKnob.style.transform = this.audioOnly ? 'translateX(24px)' : 'translateX(0)';
    this.audioToggleKnob.classList.toggle('bg-secondary', this.audioOnly);
    this.audioToggleKnob.classList.toggle('bg-neutral-600', !this.audioOnly);
    this.audioFormatGroup?.classList.toggle('hidden', !this.audioOnly);
    this.audioFormatGroup?.classList.toggle('grid', this.audioOnly);
    this.qualityGrid.querySelectorAll('.quality-btn').forEach(btn => {
      btn.disabled = this.audioOnly;
      btn.classList.toggle('opacity-50', this.audioOnly);
    });
  }

  selectAudioFormat(format) {
    this.audioFormat = format === 'flac' ? 'flac' : 'mp3';
    this.audioFormatGroup.querySelectorAll('.audio-format-btn').forEach(btn => {
      const active = btn.dataset.audioFormat === this.audioFormat;
      btn.classList.toggle('border-secondary', active);
      btn.classList.toggle('bg-secondary/10', active);
      btn.classList.toggle('text-secondary', active);
      btn.classList.toggle('border-outline-variant/20', !active);
      btn.classList.toggle('text-neutral-500', !active);
    });
  }

  // ----- download ------------------------------------------------------------

  async handleDownload(isRetry = false) {
    if (!this.currentUrl || !this.analysisData) {
      this.toaster.show({ type: 'info', title: 'NO SIGNAL', message: 'Extract a URL before downloading.' });
      return;
    }
    if (this.urlInput.value.trim() && this.urlInput.value.trim() !== this.currentUrl) {
      this.toaster.show({ type: 'info', title: 'URL CHANGED', message: 'Press EXTRACT to analyze the new URL first.' });
      return;
    }
    if (!this.audioOnly && !this.selectedFormatId) {
      this.toaster.show({ type: 'error', title: 'NO QUALITY SELECTED', message: 'Select a resolution tier or enable audio-only mode.' });
      return;
    }
    if (this.currentSessionId) return; // a transfer is already running
    if (!isRetry) this.retryCounts.download = 0;

    this.downloadContext = {
      url: this.currentUrl,
      title: this.analysisData.metadata?.title || '',
      thumbnail: this.analysisData.metadata?.thumbnail || '',
      duration: this.analysisData.metadata?.duration || 0,
      platform: this.analysisData.platform || 'generic',
      audioOnly: this.audioOnly,
      audioFormat: this.audioFormat,
      formatId: this.selectedFormatId,
      quality: this.audioOnly ? this.audioFormat.toUpperCase() : this.selectedQualityLabel
    };

    this.downloadBtn.disabled = true;
    this.downloadBtn.classList.add('opacity-60');
    this.updateStatus('DOWNLOADING_ACTIVE');
    this.showProgressPanel();

    try {
      const result = await apiRequest(`${this.apiBase}/download`, {
        method: 'POST',
        body: {
          url: this.downloadContext.url,
          formatId: this.audioOnly ? undefined : this.selectedFormatId,
          audioOnly: this.audioOnly,
          audioFormat: this.audioOnly ? this.audioFormat : undefined
        }
      });
      this.currentSessionId = result.sessionId;
      this.renderProgress({ status: result.status || 'QUEUED', percent: 0 });
      this.connectToProgressStream(result.sessionId);
    } catch (error) {
      this.resetDownloadUi();
      this.notifyError(error, 'download', () => this.handleDownload(true));
    }
  }

  async handleCancel() {
    if (!this.currentSessionId) return;
    this.progress.cancel.disabled = true;
    try {
      await apiRequest(`${this.apiBase}/cancel/${this.currentSessionId}`, { method: 'POST' });
    } catch (error) {
      this.progress.cancel.disabled = false;
      this.notifyError(error);
    }
  }

  connectToProgressStream(sessionId) {
    this.stopProgressTracking();
    if (typeof EventSource === 'undefined') {
      this.startPolling(sessionId);
      return;
    }
    const es = new EventSource(`${this.apiBase}/progress/${sessionId}`);
    this.eventSource = es;
    es.onmessage = event => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      if (message.type === 'progress') this.renderProgress(message.data);
      else if (message.type === 'complete') this.handleDownloadComplete(message.data, sessionId);
    };
    es.onerror = () => {
      // Proxies sometimes cut long-lived streams; poll instead of giving up
      if (this.currentSessionId !== sessionId) return;
      es.close();
      this.eventSource = null;
      this.startPolling(sessionId);
    };
  }

  startPolling(sessionId) {
    clearTimeout(this.pollTimer);
    let failures = 0;
    const poll = async () => {
      if (this.currentSessionId !== sessionId) return;
      try {
        const { session } = await apiRequest(`${this.apiBase}/sessions/${sessionId}`);
        failures = 0;
        this.renderProgress(session.progress);
        if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(session.status)) {
          this.handleDownloadComplete({ ...session.progress, error: session.error }, sessionId);
          return;
        }
      } catch (error) {
        if (error.code === 'NOT_FOUND' || ++failures >= 10) {
          this.handleDownloadComplete({ status: 'FAILED', error: { message: 'Lost track of the download (server restarted?)', retryable: true } }, sessionId);
          return;
        }
      }
      this.pollTimer = setTimeout(poll, 2000);
    };
    poll();
  }

  stopProgressTracking() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    clearTimeout(this.pollTimer);
    this.pollTimer = null;
  }

  showProgressPanel() {
    this.progress.panel?.classList.remove('hidden');
    if (this.progress.cancel) {
      this.progress.cancel.disabled = false;
      this.progress.cancel.classList.remove('hidden');
    }
    this.renderProgress({ status: 'QUEUED', percent: 0 });
  }

  renderProgress(p) {
    // Batch DOM writes into one animation frame (SSE can fire rapidly)
    this.latestProgress = p;
    if (this.pendingFrame) return;
    this.pendingFrame = requestAnimationFrame(() => {
      this.pendingFrame = null;
      const progress = this.latestProgress;
      const percent = Math.max(0, Math.min(100, Number(progress.percent) || 0));
      const pr = this.progress;
      if (pr.bar) pr.bar.style.width = `${percent}%`;
      pr.track?.setAttribute('aria-valuenow', String(Math.round(percent)));
      if (pr.percent) pr.percent.textContent = `${percent.toFixed(percent < 10 && percent > 0 ? 1 : 0)}%`;
      if (pr.status) pr.status.textContent = STATUS_LABELS[progress.status] || progress.status;
      if (pr.size) {
        pr.size.textContent = progress.totalBytes
          ? `${Format.bytes(progress.downloadedBytes)} / ${Format.bytes(progress.totalBytes)}`
          : Format.bytes(progress.downloadedBytes);
      }
      if (pr.speed) pr.speed.textContent = progress.speed ? Format.speed(progress.speed) : '--';
      if (pr.eta) pr.eta.textContent = Format.eta(progress.eta);

      const failed = progress.status === 'FAILED' || progress.status === 'CANCELLED';
      pr.bar?.classList.toggle('bg-primary', !failed);
      pr.bar?.classList.toggle('bg-secondary', failed);

      if (progress.status === 'DOWNLOADING' || progress.status === 'PROCESSING') {
        this.trafficDisplay.textContent = Format.speed(progress.speed);
        this.trafficDisplay.classList.remove('text-secondary');
        this.trafficDisplay.classList.add('text-primary');
        this.statusDisplay.textContent = progress.status === 'PROCESSING' ? 'PROCESSING_MEDIA' : `DOWNLOADING_${Math.round(percent)}%`;
      } else if (progress.status === 'QUEUED') {
        this.statusDisplay.textContent = 'QUEUED_WAITING';
      }
    });
  }

  handleDownloadComplete(progress, sessionId) {
    if (this.currentSessionId !== sessionId) return;
    this.stopProgressTracking();
    this.currentSessionId = null;
    this.renderProgress(progress);
    if (this.progress.cancel) this.progress.cancel.classList.add('hidden');

    const ctx = this.downloadContext || {};
    const baseRecord = {
      id: sessionId,
      sessionId,
      url: ctx.url,
      title: ctx.title,
      thumbnail: ctx.thumbnail,
      platform: ctx.platform,
      quality: ctx.quality,
      audioOnly: ctx.audioOnly,
      duration: ctx.duration,
      timestamp: Date.now()
    };

    if (progress.status === 'COMPLETED') {
      this.retryCounts.download = 0;
      this.updateStatus('COMPLETED');
      const filename = progress.filename || ctx.title || 'download';
      this.historyStore.addRecord({ ...baseRecord, filename, filesize: progress.totalBytes || 0, status: 'COMPLETED' });
      this.triggerBrowserDownload(sessionId);
      this.toaster.show({ type: 'success', title: 'TRANSFER COMPLETE', message: filename });
    } else if (progress.status === 'CANCELLED') {
      this.updateStatus('ABORTED');
      this.toaster.show({ type: 'info', title: 'TRANSFER ABORTED', message: 'The download was cancelled.' });
    } else {
      this.updateStatus('FAILED');
      const error = progress.error || { message: 'Download failed', retryable: true };
      this.historyStore.addRecord({
        ...baseRecord,
        filename: ctx.title || 'download',
        filesize: 0,
        status: 'ERROR',
        error: error.message
      });
      this.notifyError({ code: error.code || 'DOWNLOAD_FAILED', ...error }, 'download', () => this.handleDownload(true));
    }

    this.refreshHistory(true);
    setTimeout(() => this.resetDownloadUi(), 3000);
  }

  resetDownloadUi() {
    if (this.currentSessionId) return;
    this.updateStatus(this.analysisData ? 'READY_FOR_DOWNLOAD' : 'IDLE_WAITING');
    this.trafficDisplay.textContent = '0.00 GB/s';
    this.trafficDisplay.classList.add('text-secondary');
    this.trafficDisplay.classList.remove('text-primary');
    this.downloadBtn.disabled = false;
    this.downloadBtn.classList.remove('opacity-60');
    this.progress.panel?.classList.add('hidden');
  }

  triggerBrowserDownload(sessionId) {
    const link = document.createElement('a');
    link.href = `${this.apiBase}/download/${encodeURIComponent(sessionId)}/file`;
    link.download = '';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => link.remove(), 5000);
  }

  updateStatus(status) {
    this.statusDisplay.textContent = status;
    this.statusDisplay.classList.remove('text-primary', 'text-secondary', 'text-on-surface');
    this.statusDisplay.classList.add(/FAILED|ERROR|ABORTED/.test(status) ? 'text-secondary' : 'text-primary');
  }

  // ----- history ---------------------------------------------------------------

  handleClearHistory() {
    const btn = this.clearHistoryBtn;
    if (btn.dataset.confirm !== 'yes') {
      btn.dataset.confirm = 'yes';
      btn.textContent = 'CONFIRM_PURGE?';
      btn.classList.add('text-secondary', 'border-secondary');
      this._clearTimer = setTimeout(() => this.resetClearButton(), 3000);
      return;
    }
    clearTimeout(this._clearTimer);
    this.historyStore.clearHistory();
    this.resetClearButton();
    this.refreshHistory();
    this.toaster.show({ type: 'info', title: 'HISTORY PURGED', message: 'Local transfer history was cleared.' });
  }

  resetClearButton() {
    const btn = this.clearHistoryBtn;
    btn.dataset.confirm = '';
    btn.textContent = 'CLEAR_HISTORY_PURGE';
    btn.classList.remove('text-secondary', 'border-secondary');
  }

  refreshHistory(animateFirst = false) {
    const all = this.historyStore.getRecords();
    const records = all.slice(0, 3);
    if (this.historyCount) this.historyCount.textContent = `SHOWING ${records.length} OF ${all.length} SESSIONS`;

    this.historyContainer.replaceChildren();
    if (records.length === 0) {
      this.historyContainer.appendChild(h('div', 'col-span-full text-center text-neutral-600 py-12 text-xs font-label tracking-widest uppercase', 'No download history yet'));
      return;
    }
    records.forEach((record, i) => {
      const card = this.createHistoryCard(record);
      if (animateFirst && i === 0) {
        card.classList.add('opacity-0', 'translate-y-2');
        requestAnimationFrame(() => card.classList.remove('opacity-0', 'translate-y-2'));
      }
      this.historyContainer.appendChild(card);
    });
    this.checkHistoryAvailability(records);
  }

  /** Ask the server which completed downloads still have a copy on disk */
  async checkHistoryAvailability(records) {
    const ids = records.filter(r => r.status === 'COMPLETED' && r.sessionId).map(r => r.sessionId);
    records.filter(r => r.expired).forEach(r => {
      const card = this.historyContainer.querySelector(`[data-session-id="${r.sessionId}"]`);
      if (card) this.markCardExpired(card);
    });
    if (ids.length === 0) return;
    try {
      const { records: states } = await apiRequest(`${this.apiBase}/history?ids=${ids.join(',')}`);
      for (const state of states) {
        if (state.fileAvailable) continue;
        this.historyStore.updateRecord(state.sessionId, { expired: true });
        const card = this.historyContainer.querySelector(`[data-session-id="${state.sessionId}"]`);
        if (card) this.markCardExpired(card);
      }
    } catch {
      // keep cards as they are
    }
  }

  markCardExpired(card) {
    card.dataset.expired = 'true';
    const save = card.querySelector('[data-action="save-btn"]');
    if (save) {
      save.disabled = true;
      save.classList.add('opacity-40', 'cursor-not-allowed');
      save.title = 'Server copy expired. Extract the URL again to re-download.';
    }
    const expiry = card.querySelector('[data-role="expiry"]');
    if (expiry) expiry.textContent = 'SERVER_COPY_EXPIRED';
  }

  createHistoryCard(record) {
    const card = h('div', 'bg-surface-container-low group hover:bg-surface-container-high transition-all duration-500 relative');
    card.dataset.sessionId = record.sessionId || record.id;

    const isError = record.status === 'ERROR' || record.status === 'FAILED';
    const badgeClass = record.status === 'COMPLETED' ? 'bg-primary text-on-primary' : isError ? 'bg-secondary text-on-secondary' : 'bg-yellow-400 text-black';
    if (isError && record.error) card.title = `Error: ${record.error}`;

    // Thumbnail
    const thumbWrap = h('div', 'h-40 overflow-hidden relative cursor-pointer');
    const img = h('img', 'w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500');
    img.alt = record.title || record.filename || 'Thumbnail';
    img.loading = 'lazy';
    img.src = record.thumbnail || FALLBACK_THUMB;
    img.addEventListener('error', () => {
      img.src = FALLBACK_THUMB;
    }, { once: true });
    thumbWrap.appendChild(img);

    const playOverlay = h('div', 'absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity');
    const playIcon = h('div', 'w-14 h-14 bg-primary/20 backdrop-blur-sm border border-primary/40 flex items-center justify-center hover:scale-110 transition-transform');
    playIcon.appendChild(icon(record.audioOnly ? 'music_note' : 'play_arrow', 'text-primary text-2xl'));
    playOverlay.appendChild(playIcon);
    thumbWrap.appendChild(playOverlay);

    thumbWrap.appendChild(h('div', `absolute top-2 right-2 ${badgeClass} text-[8px] font-bold px-2 py-1`, record.status));
    thumbWrap.appendChild(h('div', 'absolute top-2 left-2 bg-black/60 text-primary text-[8px] font-bold px-2 py-1 font-label', String(record.platform || 'unknown').toUpperCase()));
    card.appendChild(thumbWrap);

    const del = h('button', 'absolute top-2 right-20 w-6 h-6 flex items-center justify-center bg-black/70 border border-secondary/30 hover:border-secondary hover:bg-secondary/20 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-10');
    del.title = 'Remove from history';
    del.setAttribute('aria-label', 'Remove from history');
    del.appendChild(icon('close', 'text-secondary text-sm'));
    card.appendChild(del);

    // Body
    const body = h('div', 'p-6');
    body.appendChild(h('h4', 'text-sm font-headline font-bold text-on-surface mb-1 truncate', record.filename || record.title || 'download'));
    const meta = h('div', 'flex justify-between items-center text-[10px] text-neutral-500 font-label mb-1 gap-2');
    meta.appendChild(h('span', 'truncate', isError ? 'TRANSFER_FAILED' : `${Format.bytes(record.filesize)}${record.quality ? ' // ' + record.quality : ''}`));
    meta.appendChild(h('span', 'shrink-0', Format.timestamp(record.timestamp)));
    body.appendChild(meta);
    const sub = h('div', 'text-[9px] font-mono mb-3 truncate ' + (isError ? 'text-secondary' : 'text-neutral-600'), isError ? (record.error || 'Unknown error') : '');
    sub.dataset.role = 'expiry';
    body.appendChild(sub);

    const actions = h('div', 'flex gap-2');
    const playBtn = h('button', 'flex-1 py-2 text-[9px] font-label font-bold tracking-wider uppercase border border-primary/30 text-primary hover:bg-primary/10 transition-all flex items-center justify-center gap-1');
    playBtn.dataset.action = 'play-btn';
    playBtn.append(icon('play_arrow', 'text-xs'), document.createTextNode(' PLAY'));
    const saveBtn = h('button', 'flex-1 py-2 text-[9px] font-label font-bold tracking-wider uppercase border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-highest transition-all flex items-center justify-center gap-1');
    saveBtn.dataset.action = 'save-btn';
    if (isError) {
      saveBtn.append(icon('refresh', 'text-xs'), document.createTextNode(' RETRY'));
    } else {
      saveBtn.append(icon('download', 'text-xs'), document.createTextNode(' SAVE'));
    }
    actions.append(playBtn, saveBtn);
    body.appendChild(actions);
    card.appendChild(body);

    // Behaviour
    const play = () => {
      const sid = record.sessionId || record.id;
      const title = record.title || record.filename;
      if (record.status === 'COMPLETED' && card.dataset.expired !== 'true') {
        this.videoPlayer.playFromSession(sid, title, record.url);
      } else if (record.url) {
        this.videoPlayer.playFromUrl(record.url, title);
      }
    };
    thumbWrap.addEventListener('click', play);
    playBtn.addEventListener('click', e => {
      e.stopPropagation();
      play();
    });
    saveBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (isError) {
        // Load the URL back into the extractor so the user can try again
        this.urlInput.value = record.url || '';
        this.urlInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.handleExtract();
      } else if (card.dataset.expired !== 'true') {
        this.triggerBrowserDownload(record.sessionId || record.id);
      }
    });
    del.addEventListener('click', e => {
      e.stopPropagation();
      this.historyStore.removeRecord(record.id);
      this.refreshHistory();
    });

    return card;
  }

  // ----- decorative telemetry -------------------------------------------------

  startHubAnimation() {
    const hubValue = document.getElementById('hub-value');
    const hubStatus = document.getElementById('hub-status');
    if (!hubValue || !hubStatus) return;
    const statuses = [
      { min: 90, label: 'OPTIMAL', color: 'text-primary' },
      { min: 80, label: 'STRONG', color: 'text-primary' },
      { min: 0, label: 'NOMINAL', color: 'text-secondary' }
    ];
    setInterval(() => {
      const val = 75 + Math.random() * 24;
      hubValue.textContent = `${val.toFixed(1)} dBm`;
      const status = statuses.find(s => val >= s.min);
      hubStatus.textContent = status.label;
      hubStatus.className = `text-[8px] font-mono mt-1 ${status.color}`;
    }, 2000);
  }

  startKernelLogAnimation() {
    const logContainer = document.getElementById('kernel-log');
    if (!logContainer) return;
    const logLines = [
      '[SYSTEM] INITIATING HANDSHAKE...', '[NET] ENCRYPTED TUNNEL OPENED: 0x82AF...', '[DB] CACHE_SYNC COMPLETE (12ms)',
      '[CMD] FETCH_SIGNAL: OK', '[SYS] BUFFER_MAP: RESOLVING...', '[NET] PACKET_LOSS: 0.0003%', '[SEC] AES_256_KEY_ROTATED',
      '[WAR] ANOMALOUS_PACKET_DETECTED (DISCARDED)', '[SYS] THERMAL_CONTROL_ACTIVE', '[NET] IO_THROUGHPUT: 1.2 GB/s',
      '[LOG] SESSION_ID: KNT_' + Math.floor(Math.random() * 99999) + '_X', '[SYSTEM] CORE_STABILIZED', '[NET] RELAY_POINT: HK_ALPHA_4',
      '[SEC] FIREWALL_REDUNDANCY: 100%', '[NET] PROXY_CHAIN: 7 NODES ACTIVE', '[SYS] MEMORY_ALLOC: 2048MB OK', '[SEC] TLS_1.3_NEGOTIATED',
      '[CMD] DNS_RESOLVER: 1.1ms', '[NET] CDN_EDGE: US_WEST_2', '[SYS] THREAD_POOL: 16/16 ACTIVE', '[SEC] HMAC_VERIFY: PASS',
      '[LOG] STREAM_BUFFER: 4096KB', '[NET] PEER_DISCOVERY: 3 NODES', '[WAR] JITTER_SPIKE: 2ms (RECOVERED)', '[SYS] SCHEDULER_TICK: 0.4ms',
      '[SEC] CERT_PIN: MATCH_OK'
    ];
    logContainer.replaceChildren();
    logContainer.style.whiteSpace = 'normal';
    logContainer.style.overflow = 'hidden';
    logContainer.classList.remove('animate-scroll');

    let lineIdx = 0;
    const addLine = () => {
      const el = h('div', '', logLines[lineIdx % logLines.length]);
      el.style.cssText = 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:0;transition:opacity .3s';
      logContainer.appendChild(el);
      requestAnimationFrame(() => (el.style.opacity = '1'));
      while (logContainer.children.length > 20) logContainer.firstChild.remove();
      lineIdx++;
    };
    for (let i = 0; i < 14; i++) addLine();
    setInterval(addLine, 1500);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const controller = new UIController();
  controller.initialize();
  window.kineticDL = controller;
});
