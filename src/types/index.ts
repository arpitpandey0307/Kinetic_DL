// Core type definitions for the multi-platform downloader

export enum Platform {
  YOUTUBE = 'youtube',
  INSTAGRAM = 'instagram',
  TIKTOK = 'tiktok',
  TERABOX = 'terabox',
  REDDIT = 'reddit',
  PINTEREST = 'pinterest',
  TWITTER = 'twitter',
  FACEBOOK = 'facebook',
  VIMEO = 'vimeo',
  GENERIC = 'generic'
}

export enum DownloadStatus {
  QUEUED = 'QUEUED',
  DOWNLOADING = 'DOWNLOADING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export const TERMINAL_STATUSES: ReadonlySet<DownloadStatus> = new Set([
  DownloadStatus.COMPLETED,
  DownloadStatus.FAILED,
  DownloadStatus.CANCELLED
]);

export enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  ACCESS_DENIED = 'ACCESS_DENIED',
  PLATFORM_UNAVAILABLE = 'PLATFORM_UNAVAILABLE',
  VIDEO_NOT_FOUND = 'VIDEO_NOT_FOUND',
  INVALID_URL = 'INVALID_URL',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FORMAT_UNAVAILABLE = 'FORMAT_UNAVAILABLE',
  DEPENDENCY_MISSING = 'DEPENDENCY_MISSING',
  CANCELLED = 'CANCELLED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export type AudioFormat = 'mp3' | 'flac';

export interface ParseResult {
  isValid: boolean;
  platform: Platform | null;
  videoId: string | null;
  error?: string;
}

export interface MediaFormat {
  formatId: string;
  resolution: string;
  codec: string;
  container: string;
  filesize: number;
  width?: number;
  height?: number;
  fps?: number;
  vcodec?: string;
  acodec?: string;
  protocol?: string;
  tbr?: number;
}

export interface MediaMetadata {
  title: string;
  thumbnail: string;
  duration: number;
  formats: MediaFormat[];
  author?: string;
  uploadDate?: string;
}

export interface QualityOption {
  label: string;
  resolution: string;
  formatId: string;
  codec: string;
  container: string;
  filesize: number;
  hasAudio: boolean;
  fps?: number;
}

export interface ExtractOptions {
  audioOnly?: boolean;
  audioFormat?: AudioFormat;
  formatId?: string;
  /** true when the chosen format already contains an audio track */
  formatHasAudio?: boolean;
}

export interface ExtractorError {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  details?: string;
}

export interface AnalysisResult {
  success: boolean;
  platform?: Platform;
  metadata: MediaMetadata;
  availableQualities: QualityOption[];
  error?: ExtractorError;
}

export interface DownloadRequest {
  url: string;
  formatId: string;
  audioOnly: boolean;
  audioFormat?: AudioFormat;
}

export interface DownloadProgress {
  sessionId: string;
  status: DownloadStatus;
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
  speed: number;
  eta: number;
  /** Base name of the output file — never a server path */
  filename: string;
  error?: ExtractorError;
}

export interface DownloadSession {
  sessionId: string;
  status: DownloadStatus;
  url: string;
  formatId: string;
  audioOnly: boolean;
  audioFormat?: AudioFormat;
  progress: DownloadProgress;
  createdAt: number;
  startTime?: number;
  endTime?: number;
  error?: ExtractorError;
  fileAvailable: boolean;
  expiresAt?: number;
}

export interface DownloadRecord {
  id: string;
  url: string;
  filename: string;
  filesize: number;
  timestamp: number;
  thumbnail: string;
  platform: Platform;
  status: DownloadStatus;
  quality: string;
  audioOnly: boolean;
  error?: string;
  duration?: number;
  author?: string;
}

export interface ApiError {
  code: string;
  message: string;
  retryable?: boolean;
  details?: string;
}
