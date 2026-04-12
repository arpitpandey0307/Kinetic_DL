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

export enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  ACCESS_DENIED = 'ACCESS_DENIED',
  PLATFORM_UNAVAILABLE = 'PLATFORM_UNAVAILABLE',
  VIDEO_NOT_FOUND = 'VIDEO_NOT_FOUND',
  INVALID_URL = 'INVALID_URL',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

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
  fps?: number;
  vcodec?: string;
  acodec?: string;
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
}

export interface ExtractOptions {
  audioOnly?: boolean;
  quality?: string;
  format?: string;
  formatId?: string;
}

export interface ExtractorError {
  code: ErrorCode;
  message: string;
  retryable: boolean;
}

export interface AnalysisResult {
  success: boolean;
  metadata: MediaMetadata;
  availableQualities: QualityOption[];
  error?: ExtractorError;
}

export interface DownloadRequest {
  url: string;
  formatId: string;
  audioOnly: boolean;
  outputPath?: string;
}

export interface DownloadProgress {
  sessionId: string;
  status: DownloadStatus;
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
  speed: number;
  eta: number;
  filename: string;
}

export interface DownloadSession {
  sessionId: string;
  status: DownloadStatus;
  url: string;
  formatId: string;
  audioOnly: boolean;
  progress: DownloadProgress;
  startTime: number;
  endTime?: number;
  error?: ExtractorError;
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
  details?: any;
}
