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


class VideoPlayerModal {
  constructor() {
    this.modal = document.getElementById('video-player-modal');
    this.videoEl = document.getElementById('video-player-element');
    this.closeBtn = document.getElementById('video-player-close');
    this.titleEl = document.getElementById('video-player-title');
    this.loadingEl = document.getElementById('video-player-loading');

    this.closeBtn.addEventListener('click', () => this.close());
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    // Hide loading when video can play
    this.videoEl.addEventListener('canplay', () => {
      this.loadingEl.style.display = 'none';
    });
    this.videoEl.addEventListener('loadstart', () => {
      this.loadingEl.style.display = 'flex';
    });
    this.videoEl.addEventListener('error', () => {
      this.loadingEl.innerHTML = `
        <div class="flex flex-col items-center gap-3">
          <span class="material-symbols-outlined text-secondary text-3xl">error</span>
          <div class="text-[10px] font-label text-secondary tracking-wider uppercase">STREAM_ERROR: CANNOT PLAY VIDEO</div>
          <div class="text-[9px] font-mono text-neutral-500">The video format may not be supported in browser</div>
        </div>
      `;
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.style.display !== 'none') this.close();
    });
  }

  async playFromUrl(url, title) {
    this.titleEl.textContent = title || 'VIDEO_STREAM';
    this.loadingEl.style.display = 'flex';
    this.loadingEl.innerHTML = `
      <div class="flex flex-col items-center gap-3">
        <div class="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        <div class="text-[10px] font-label text-primary/60 tracking-wider uppercase">RESOLVING_STREAM_URL...</div>
      </div>
    `;
    this.show();

    try {
      // Get stream URL from backend
      const response = await fetch(`/api/stream?url=${encodeURIComponent(url)}`);
      const result = await response.json();

      if (!result.success) {
        this.showPlayerError(result.error?.message || 'Cannot get stream URL');
        return;
      }

      this.loadingEl.innerHTML = `
        <div class="flex flex-col items-center gap-3">
          <div class="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <div class="text-[10px] font-label text-primary/60 tracking-wider uppercase">BUFFERING_STREAM...</div>
        </div>
      `;

      // Cleanup any previous HLS instance
      if (this._hls) {
        this._hls.destroy();
        this._hls = null;
      }

      // HLS stream (TeraBox M3U8) — use HLS.js
      if (result.isHLS && typeof Hls !== 'undefined' && Hls.isSupported()) {
        console.log('[VideoPlayer] Using HLS.js for M3U8 stream');
        const hls = new Hls({
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          enableWorker: true
        });
        this._hls = hls;

        hls.loadSource(result.streamUrl);
        hls.attachMedia(this.videoEl);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          this.videoEl.play().catch(() => {});
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('[HLS Error]', data.type, data.details);
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              console.log('[HLS] Network error, trying to recover...');
              hls.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              console.log('[HLS] Media error, trying to recover...');
              hls.recoverMediaError();
            } else {
              this.showPlayerError('HLS playback failed: ' + data.details);
            }
          }
        });
      } else {
        // Standard direct URL playback
        this.videoEl.src = result.streamUrl;
        this.videoEl.load();
        this.videoEl.play().catch(() => {});
      }
    } catch (error) {
      console.error('Stream play error:', error);
      this.showPlayerError('Network error while fetching stream');
    }
  }

  playFromSession(sessionId, title) {
    this.titleEl.textContent = title || 'VIDEO_STREAM';
    this.loadingEl.style.display = 'flex';
    this.loadingEl.innerHTML = `
      <div class="flex flex-col items-center gap-3">
        <div class="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        <div class="text-[10px] font-label text-primary/60 tracking-wider uppercase">BUFFERING_STREAM...</div>
      </div>
    `;
    this.show();

    // Stream from the downloaded file
    this.videoEl.src = `/api/stream/${sessionId}/file`;
    this.videoEl.load();
    this.videoEl.play().catch(() => {});
  }

  showPlayerError(message) {
    this.loadingEl.style.display = 'flex';
    this.loadingEl.innerHTML = `
      <div class="flex flex-col items-center gap-3">
        <span class="material-symbols-outlined text-secondary text-3xl">error</span>
        <div class="text-[10px] font-label text-secondary tracking-wider uppercase">STREAM_ERROR</div>
        <div class="text-[9px] font-mono text-neutral-500">${message}</div>
      </div>
    `;
  }

  show() {
    this.modal.style.display = 'flex';
    requestAnimationFrame(() => { this.modal.style.opacity = '1'; });
  }

  close() {
    // Cleanup HLS instance
    if (this._hls) {
      this._hls.destroy();
      this._hls = null;
    }
    this.videoEl.pause();
    this.videoEl.removeAttribute('src');
    this.videoEl.load();
    this.videoEl.style.display = '';
    this.modal.style.opacity = '0';
    setTimeout(() => { this.modal.style.display = 'none'; }, 300);
  }
}


class UIController {
  constructor() {
    this.apiBase = '/api';
    this.currentUrl = '';
    this.selectedFormatId = '';
    this.audioOnly = false;
    this.currentSessionId = null;
    this.eventSource = null;
    this.analysisData = null;
    
    // DOM elements
    this.urlInput = document.getElementById('url-input');
    this.extractBtn = document.getElementById('extract-btn');
    this.downloadBtn = document.getElementById('download-btn');
    this.statusDisplay = document.getElementById('status-display');
    this.trafficDisplay = document.getElementById('traffic-display');
    this.qualityGrid = document.getElementById('quality-grid');
    this.audioToggle = document.getElementById('audio-toggle');
    this.audioToggleKnob = document.getElementById('audio-toggle-knob');
    this.historyContainer = document.getElementById('history-container');
    
    // Preview elements
    this.previewSection = document.querySelector('section.col-span-12.lg\\:col-span-7');
    this.previewImg = this.previewSection ? this.previewSection.querySelector('img') : null;
    this.previewPlayBtn = this.previewSection ? this.previewSection.querySelector('button') : null;
    this.previewHud = this.previewSection ? this.previewSection.querySelector('.absolute.top-4') : null;

    this.historyStore = new HistoryStore();
    this.hackerOverlay = new HackerLoadingOverlay();
    this.videoPlayer = new VideoPlayerModal();
  }

  initialize() {
    this.extractBtn.addEventListener('click', () => this.handleExtract());
    this.downloadBtn.addEventListener('click', () => this.handleDownload());
    this.audioToggle.addEventListener('click', () => this.handleAudioToggle());
    
    if (this.previewPlayBtn) {
      this.previewPlayBtn.addEventListener('click', () => this.handlePlayPreview());
    }

    this.urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleExtract();
    });
    
    this.refreshHistory();
    this.startHubAnimation();
    this.startKernelLogAnimation();
    console.log('KINETIC_DL UI Controller initialized');
  }

  startHubAnimation() {
    const hubValue = document.getElementById('hub-value');
    const hubStatus = document.getElementById('hub-status');
    if (!hubValue || !hubStatus) return;

    const statuses = [
      { min: 90, label: 'OPTIMAL', color: 'text-primary' },
      { min: 80, label: 'STRONG', color: 'text-primary' },
      { min: 70, label: 'NOMINAL', color: 'text-secondary' },
    ];

    setInterval(() => {
      const val = (75 + Math.random() * 24).toFixed(1);
      hubValue.textContent = `${val} dBm`;
      const status = statuses.find(s => parseFloat(val) >= s.min) || statuses[2];
      hubStatus.textContent = status.label;
      hubStatus.className = `text-[8px] font-mono mt-1 ${status.color}`;
    }, 2000);
  }

  startKernelLogAnimation() {
    const logContainer = document.getElementById('kernel-log');
    if (!logContainer) return;

    const logLines = [
      '[SYSTEM] INITIATING HANDSHAKE...',
      '[NET] ENCRYPTED TUNNEL OPENED: 0x82AF...',
      '[DB] CACHE_SYNC COMPLETE (12ms)',
      '[CMD] FETCH_SIGNAL: OK',
      '[SYS] BUFFER_MAP: RESOLVING...',
      '[NET] PACKET_LOSS: 0.0003%',
      '[SEC] AES_256_KEY_ROTATED',
      '[WAR] ANOMALOUS_PACKET_DETECTED (DISCARDED)',
      '[SYS] THERMAL_CONTROL_ACTIVE',
      '[NET] IO_THROUGHPUT: 1.2 GB/s',
      '[LOG] SESSION_ID: KNT_' + Math.floor(Math.random() * 99999) + '_X',
      '[SYSTEM] CORE_STABILIZED',
      '[NET] RELAY_POINT: HK_ALPHA_4',
      '[SEC] FIREWALL_REDUNDANCY: 100%',
      '[NET] PROXY_CHAIN: 7 NODES ACTIVE',
      '[SYS] MEMORY_ALLOC: 2048MB OK',
      '[SEC] TLS_1.3_NEGOTIATED',
      '[CMD] DNS_RESOLVER: 1.1ms',
      '[NET] CDN_EDGE: US_WEST_2',
      '[SYS] THREAD_POOL: 16/16 ACTIVE',
      '[SEC] HMAC_VERIFY: PASS',
      '[LOG] STREAM_BUFFER: 4096KB',
      '[NET] PEER_DISCOVERY: 3 NODES',
      '[WAR] JITTER_SPIKE: 2ms (RECOVERED)',
      '[SYS] SCHEDULER_TICK: 0.4ms',
      '[SEC] CERT_PIN: MATCH_OK',
    ];

    // Clear existing content and start fresh
    logContainer.innerHTML = '';
    logContainer.style.whiteSpace = 'normal';
    logContainer.style.overflow = 'hidden';
    logContainer.classList.remove('animate-scroll');

    let lineIdx = 0;
    const addLine = () => {
      const line = logLines[lineIdx % logLines.length];
      const el = document.createElement('div');
      el.style.whiteSpace = 'nowrap';
      el.style.overflow = 'hidden';
      el.style.textOverflow = 'ellipsis';
      el.textContent = line;
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.3s';
      logContainer.appendChild(el);
      requestAnimationFrame(() => el.style.opacity = '1');

      // Keep max 20 lines visible
      while (logContainer.children.length > 20) {
        logContainer.removeChild(logContainer.firstChild);
      }
      logContainer.scrollTop = logContainer.scrollHeight;
      lineIdx++;
    };

    // Initial fill
    for (let i = 0; i < 14; i++) { addLine(); lineIdx++; }
    // Add new lines continuously
    setInterval(addLine, 1500);
  }

  async handleExtract() {
    const url = this.urlInput.value.trim();
    if (!url) { this.showError('Please enter a URL'); return; }

    this.currentUrl = url;
    this.extractBtn.disabled = true;
    this.hackerOverlay.show();

    try {
      const response = await fetch(`${this.apiBase}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const result = await response.json();

      if (!result.success) {
        this.hackerOverlay.hideWithError();
        this.showError(result.error.message);
        this.updateStatus('IDLE_WAITING');
        return;
      }

      this.analysisData = result.data;
      if (result.data.metadata && result.data.metadata.thumbnail) {
        this.updatePreview(result.data.metadata);
      }

      this.hackerOverlay.hide();
      setTimeout(() => {
        this.populateQualityOptions(result.data.availableQualities);
        this.updateStatus('READY_FOR_DOWNLOAD');
      }, 1300);
      
    } catch (error) {
      console.error('Analysis error:', error);
      this.hackerOverlay.hideWithError();
      this.showError('Network error: Check connection and retry');
      this.updateStatus('IDLE_WAITING');
    } finally {
      this.extractBtn.disabled = false;
    }
  }

  updatePreview(metadata) {
    if (this.previewImg && metadata.thumbnail) {
      this.previewImg.src = metadata.thumbnail;
      this.previewImg.alt = metadata.title || 'Video Preview';
    }
    if (this.previewHud) {
      const duration = metadata.duration ? this.formatDuration(metadata.duration) : 'LIVE';
      this.previewHud.innerHTML = `<span class="text-[10px] font-label text-primary">PREVIEW_MODE // ${duration}</span>`;
    }
  }

  handlePlayPreview() {
    if (this.currentUrl) {
      const title = this.analysisData?.metadata?.title || 'Video Stream';
      this.videoPlayer.playFromUrl(this.currentUrl, title);
    } else {
      this.showError('No URL loaded. Extract a video first.');
    }
  }

  populateQualityOptions(qualities) {
    if (!qualities || qualities.length === 0) {
      this.qualityGrid.innerHTML = '<div class="col-span-2 text-center text-neutral-500 text-xs py-4">No video formats found. Try Audio Only mode.</div>';
      return;
    }
    this.qualityGrid.innerHTML = '';

    qualities.forEach((quality, index) => {
      const button = document.createElement('button');
      button.className = 'quality-btn bg-surface-container-highest border p-3 text-left hover:border-primary transition-all';
      button.dataset.formatId = quality.formatId;
      button.dataset.resolution = quality.resolution;

      if (index === 0) {
        button.classList.add('border-primary');
        this.selectedFormatId = quality.formatId;
      } else {
        button.classList.add('border-outline-variant/20');
      }

      const filesize = this.formatFilesize(quality.filesize);
      button.innerHTML = `
        <div class="text-xs font-bold ${index === 0 ? 'text-primary' : 'text-on-surface'}">${quality.label}</div>
        <div class="text-[8px] ${index === 0 ? 'text-primary/60' : 'text-neutral-600'}">${quality.resolution} // ${quality.codec} // ${filesize}</div>
      `;

      button.addEventListener('click', () => this.handleQualitySelect(button));
      this.qualityGrid.appendChild(button);
    });
  }

  handleQualitySelect(button) {
    const allButtons = this.qualityGrid.querySelectorAll('.quality-btn');
    allButtons.forEach(btn => {
      btn.classList.remove('border-primary');
      btn.classList.add('border-outline-variant/20');
      const t = btn.querySelector('.text-xs');
      const s = btn.querySelector('.text-\\[8px\\]');
      if (t) { t.classList.remove('text-primary'); t.classList.add('text-on-surface'); }
      if (s) { s.classList.remove('text-primary/60'); s.classList.add('text-neutral-600'); }
    });
    button.classList.add('border-primary');
    button.classList.remove('border-outline-variant/20');
    const t = button.querySelector('.text-xs');
    const s = button.querySelector('.text-\\[8px\\]');
    if (t) { t.classList.add('text-primary'); t.classList.remove('text-on-surface'); }
    if (s) { s.classList.add('text-primary/60'); s.classList.remove('text-neutral-600'); }
    this.selectedFormatId = button.dataset.formatId;
  }

  handleAudioToggle() {
    this.audioOnly = !this.audioOnly;
    if (this.audioOnly) {
      this.audioToggle.classList.add('bg-secondary/40');
      this.audioToggle.classList.remove('bg-neutral-800');
      this.audioToggleKnob.style.transform = 'translateX(24px)';
      this.audioToggleKnob.classList.add('bg-secondary');
      this.audioToggleKnob.classList.remove('bg-neutral-600');
      this.qualityGrid.querySelectorAll('.quality-btn').forEach(btn => { btn.disabled = true; btn.classList.add('opacity-50'); });
    } else {
      this.audioToggle.classList.remove('bg-secondary/40');
      this.audioToggle.classList.add('bg-neutral-800');
      this.audioToggleKnob.style.transform = 'translateX(0)';
      this.audioToggleKnob.classList.remove('bg-secondary');
      this.audioToggleKnob.classList.add('bg-neutral-600');
      this.qualityGrid.querySelectorAll('.quality-btn').forEach(btn => { btn.disabled = false; btn.classList.remove('opacity-50'); });
    }
  }

  async handleDownload() {
    if (!this.currentUrl) { this.showError('Please extract a URL first'); return; }
    if (!this.selectedFormatId && !this.audioOnly) { this.showError('Please select a quality option'); return; }

    this.updateStatus('DOWNLOADING_ACTIVE');
    this.downloadBtn.disabled = true;

    try {
      const response = await fetch(`${this.apiBase}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: this.currentUrl, formatId: this.selectedFormatId, audioOnly: this.audioOnly })
      });
      const result = await response.json();
      if (!result.success) {
        this.showError(result.error.message);
        this.updateStatus('IDLE_WAITING');
        this.downloadBtn.disabled = false;
        return;
      }
      this.currentSessionId = result.sessionId;
      this.connectToProgressStream(result.sessionId);
    } catch (error) {
      console.error('Download error:', error);
      this.showError('Failed to start download');
      this.updateStatus('IDLE_WAITING');
      this.downloadBtn.disabled = false;
    }
  }

  connectToProgressStream(sessionId) {
    if (this.eventSource) this.eventSource.close();
    this.eventSource = new EventSource(`${this.apiBase}/progress/${sessionId}`);
    this.eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'progress') this.updateProgress(data.data);
      else if (data.type === 'complete') this.handleDownloadComplete(data.data, sessionId);
    };
    this.eventSource.onerror = () => {
      this.eventSource.close();
      this.updateStatus('IDLE_WAITING');
      this.downloadBtn.disabled = false;
    };
  }

  updateProgress(progress) {
    const speed = this.formatSpeed(progress.speed);
    this.trafficDisplay.textContent = speed;
    this.trafficDisplay.classList.remove('text-secondary');
    this.trafficDisplay.classList.add('text-primary');
    this.statusDisplay.textContent = `DOWNLOADING_${Math.round(progress.percent)}%`;
  }

  handleDownloadComplete(progress, sessionId) {
    if (this.eventSource) { this.eventSource.close(); this.eventSource = null; }

    if (progress.status === 'COMPLETED') {
      this.updateStatus('COMPLETED');
      this.triggerBrowserDownload(sessionId);

      const filename = progress.filename ? progress.filename.split(/[\\/]/).pop() : 'download';

      this.historyStore.addRecord({
        id: progress.sessionId || sessionId,
        url: this.currentUrl,
        filename: filename,
        filesize: progress.totalBytes || 0,
        timestamp: Date.now(),
        thumbnail: this.analysisData?.metadata?.thumbnail || '',
        platform: this.detectPlatform(this.currentUrl),
        status: 'COMPLETED',
        quality: this.selectedFormatId,
        audioOnly: this.audioOnly,
        sessionId: sessionId
      });
      this.refreshHistory();

      setTimeout(() => {
        this.updateStatus('IDLE_WAITING');
        this.trafficDisplay.textContent = '0.00 GB/s';
        this.trafficDisplay.classList.add('text-secondary');
        this.trafficDisplay.classList.remove('text-primary');
        this.downloadBtn.disabled = false;
      }, 3000);
    } else {
      this.updateStatus('FAILED');
      this.showError('Download failed');
      this.downloadBtn.disabled = false;
    }
  }

  triggerBrowserDownload(sessionId) {
    const link = document.createElement('a');
    link.href = `${this.apiBase}/download/${sessionId}/file`;
    link.download = '';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => document.body.removeChild(link), 5000);
  }

  detectPlatform(url) {
    if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
    if (/instagram\.com/i.test(url)) return 'instagram';
    if (/tiktok\.com/i.test(url)) return 'tiktok';
    if (/twitter\.com|x\.com/i.test(url)) return 'twitter';
    if (/facebook\.com|fb\.watch/i.test(url)) return 'facebook';
    if (/reddit\.com|redd\.it/i.test(url)) return 'reddit';
    if (/pinterest\.com|pin\.it/i.test(url)) return 'pinterest';
    if (/vimeo\.com/i.test(url)) return 'vimeo';
    if (/terabox\.com/i.test(url)) return 'terabox';
    return 'generic';
  }

  updateStatus(status) {
    this.statusDisplay.textContent = status;
    this.statusDisplay.classList.remove('text-primary', 'text-secondary', 'text-on-surface');
    if (status.includes('COMPLETED')) this.statusDisplay.classList.add('text-primary');
    else if (status.includes('FAILED') || status.includes('ERROR')) this.statusDisplay.classList.add('text-secondary');
    else this.statusDisplay.classList.add('text-primary');
  }

  refreshHistory() {
    const records = this.historyStore.getRecords(3);
    this.historyContainer.innerHTML = '';
    if (records.length === 0) {
      this.historyContainer.innerHTML = '<div class="col-span-3 text-center text-neutral-600 py-12">No download history yet</div>';
      return;
    }
    records.forEach(record => {
      const card = this.createHistoryCard(record);
      this.historyContainer.appendChild(card);
    });
  }

  createHistoryCard(record) {
    const card = document.createElement('div');
    card.className = 'bg-surface-container-low group hover:bg-surface-container-high transition-colors relative';

    const statusColor = record.status === 'COMPLETED' ? 'bg-primary text-on-primary' : 'bg-secondary text-on-secondary';
    const thumbnail = record.thumbnail || 'https://via.placeholder.com/400x300/0e0e0e/8eff71?text=NO_SIGNAL';
    const filesize = this.formatFilesize(record.filesize);
    const timestamp = this.formatTimestamp(record.timestamp);
    const platform = (record.platform || 'unknown').toUpperCase();

    card.innerHTML = `
      <div class="h-40 overflow-hidden relative cursor-pointer" data-action="play-thumb">
        <img alt="Thumbnail" class="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" src="${thumbnail}"/>
        <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div class="w-14 h-14 bg-primary/20 backdrop-blur-sm border border-primary/40 flex items-center justify-center hover:scale-110 transition-transform">
            <span class="material-symbols-outlined text-primary text-2xl">play_arrow</span>
          </div>
        </div>
        <div class="absolute top-2 right-2 ${statusColor} text-[8px] font-bold px-2 py-1">${record.status}</div>
        <div class="absolute top-2 left-2 bg-black/60 text-primary text-[8px] font-bold px-2 py-1 font-label">${platform}</div>
      </div>
      <button class="absolute top-2 right-14 w-6 h-6 flex items-center justify-center bg-black/70 border border-secondary/30 hover:border-secondary hover:bg-secondary/20 transition-all opacity-0 group-hover:opacity-100 z-10" data-action="delete" title="Remove from history">
        <span class="material-symbols-outlined text-secondary text-sm">close</span>
      </button>
      <div class="p-6">
        <h4 class="text-sm font-headline font-bold text-on-surface mb-1 truncate">${record.filename}</h4>
        <div class="flex justify-between items-center text-[10px] text-neutral-500 font-label mb-3">
          <span>${filesize}</span>
          <span>${timestamp}</span>
        </div>
        <div class="flex gap-2">
          <button class="flex-1 py-2 text-[9px] font-label font-bold tracking-wider uppercase border border-primary/30 text-primary hover:bg-primary/10 transition-all flex items-center justify-center gap-1" data-action="play-btn">
            <span class="material-symbols-outlined text-xs">play_arrow</span> PLAY
          </button>
          <button class="flex-1 py-2 text-[9px] font-label font-bold tracking-wider uppercase border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-highest transition-all flex items-center justify-center gap-1" data-action="save-btn">
            <span class="material-symbols-outlined text-xs">download</span> SAVE
          </button>
        </div>
      </div>
    `;

    // Delete button
    card.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
      e.stopPropagation();
      this.historyStore.removeRecord(record.id);
      this.refreshHistory();
    });

    // Play from thumbnail click — play using downloaded file if available, else stream from URL
    card.querySelector('[data-action="play-thumb"]').addEventListener('click', () => {
      const sid = record.sessionId || record.id;
      if (record.status === 'COMPLETED' && sid) {
        this.videoPlayer.playFromSession(sid, record.filename);
      } else if (record.url) {
        this.videoPlayer.playFromUrl(record.url, record.filename);
      }
    });

    // Play button
    card.querySelector('[data-action="play-btn"]').addEventListener('click', (e) => {
      e.stopPropagation();
      const sid = record.sessionId || record.id;
      if (record.status === 'COMPLETED' && sid) {
        this.videoPlayer.playFromSession(sid, record.filename);
      } else if (record.url) {
        this.videoPlayer.playFromUrl(record.url, record.filename);
      }
    });

    // Save button — trigger browser download
    card.querySelector('[data-action="save-btn"]').addEventListener('click', (e) => {
      e.stopPropagation();
      const sid = record.sessionId || record.id;
      if (sid) this.triggerBrowserDownload(sid);
    });

    return card;
  }

  formatFilesize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatSpeed(bps) {
    if (bps === 0) return '0.00 GB/s';
    const mbps = bps / (1024 * 1024);
    return mbps >= 1000 ? (mbps / 1024).toFixed(2) + ' GB/s' : mbps.toFixed(2) + ' MB/s';
  }

  formatDuration(seconds) {
    const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  formatTimestamp(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} // ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  showError(message) {
    console.error('Error:', message);
    alert(`ERROR: ${message}`);
  }

  showSuccess(message) {
    console.log('Success:', message);
  }
}


class HistoryStore {
  constructor() {
    this.storageKey = 'kinetic_dl_history';
    this.maxRecords = 100;
  }

  addRecord(record) {
    const records = this.getRecords();
    records.unshift(record);
    if (records.length > this.maxRecords) records.splice(this.maxRecords);
    this.saveRecords(records);
  }

  removeRecord(id) {
    const records = this.getRecords().filter(r => r.id !== id);
    this.saveRecords(records);
  }

  getRecords(limit) {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return [];
      const records = JSON.parse(data);
      return limit ? records.slice(0, limit) : records;
    } catch (error) {
      console.error('Failed to load history:', error);
      return [];
    }
  }

  clearHistory() {
    localStorage.removeItem(this.storageKey);
  }

  saveRecords(records) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(records));
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }
}


// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  const controller = new UIController();
  controller.initialize();
});
