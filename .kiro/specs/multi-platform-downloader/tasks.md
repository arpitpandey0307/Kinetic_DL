# Implementation Plan: Multi-Platform Downloader

## Overview

This implementation plan converts the multi-platform downloader design into actionable coding tasks. The system will be built as a Node.js/Express backend with yt-dlp integration, RESTful API endpoints, and frontend JavaScript that wires the existing cyberpunk HTML dashboard to real backend functionality. The implementation follows a bottom-up approach: core utilities first, then platform adapters, backend services, API layer, and finally frontend integration.

## Tasks

- [x] 1. Set up project structure and dependencies
  - Create Node.js project with package.json
  - Install dependencies: express, cors, uuid, child_process (built-in)
  - Set up TypeScript configuration (tsconfig.json) with ES2020 target
  - Create directory structure: src/adapters, src/services, src/api, src/utils, public
  - Install dev dependencies: @types/node, @types/express, typescript, ts-node
  - Create .env.example file with configuration variables
  - _Requirements: 12.1, 12.2, 14.1_

- [ ] 2. Implement URL Parser component
  - [x] 2.1 Create URL Parser with platform detection
    - Write URLParser class with parse(), isSupported(), getPlatform() methods
    - Implement regex patterns for all 9 platforms (YouTube, Instagram, TikTok, Terabox, Reddit, Pinterest, Twitter, Facebook, Vimeo)
    - Return ParseResult with isValid, platform, videoId, error fields
    - Add URL validation logic with 100ms performance target
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [ ]* 2.2 Write property test for URL parsing correctness
    - **Property 1: URL Parsing Correctness**
    - **Validates: Requirements 1.1, 1.2, 1.3**
    - Generate random URLs and verify ParseResult structure consistency
    - Test that valid URLs always return platform and videoId
    - Test that invalid URLs always return null values

- [ ] 3. Implement Platform Adapter system
  - [x] 3.1 Create PlatformAdapter interface and registry
    - Define PlatformAdapter interface with extractVideoId(), getYtDlpArgs(), parseMetadata() methods
    - Create AdapterRegistry class with register(), getAdapter(), getAdapterForUrl() methods
    - Define Platform enum with all 9 supported platforms
    - Define MediaMetadata, MediaFormat, ExtractOptions interfaces
    - _Requirements: 10.1, 10.5_
  
  - [x] 3.2 Implement YouTube adapter
    - Create YouTubeAdapter implementing PlatformAdapter interface
    - Add regex pattern for YouTube URLs (watch, shorts, youtu.be, embed)
    - Implement extractVideoId() to parse YouTube video IDs
    - Implement getYtDlpArgs() with YouTube-specific parameters
    - Implement parseMetadata() to map yt-dlp JSON to MediaMetadata
    - _Requirements: 1.4, 10.2_
  
  - [x] 3.3 Implement Instagram adapter
    - Create InstagramAdapter with Instagram URL patterns (posts, reels, stories)
    - Implement video ID extraction for Instagram URLs
    - Configure yt-dlp arguments for Instagram authentication handling
    - _Requirements: 1.4, 10.2_
  
  - [x] 3.4 Implement TikTok adapter
    - Create TikTokAdapter with TikTok URL patterns (video, vm.tiktok.com)
    - Implement video ID extraction for TikTok URLs
    - Configure yt-dlp arguments for TikTok format selection
    - _Requirements: 1.4, 10.2_
  
  - [x] 3.5 Implement remaining platform adapters
    - Create adapters for Terabox, Reddit, Pinterest, Twitter, Facebook, Vimeo
    - Each adapter implements PlatformAdapter interface
    - Register all adapters in AdapterRegistry
    - _Requirements: 1.4, 10.2, 10.3_
  
  - [ ]* 3.6 Write property test for platform URL recognition
    - **Property 2: Platform URL Recognition**
    - **Validates: Requirements 10.3, 10.5**
    - Test that each adapter correctly recognizes its platform URLs
    - Verify adapter routing works for all registered platforms
  
  - [ ]* 3.7 Write property test for adapter interface conformance
    - **Property 17: Adapter Interface Conformance**
    - **Validates: Requirements 10.1, 10.5**
    - Test that all adapters implement required interface methods
    - Verify return types match interface definitions

- [ ] 4. Checkpoint - Verify URL parsing and adapters
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement Media Extractor service
  - [x] 5.1 Create MediaExtractor with yt-dlp integration
    - Write MediaExtractor class with analyze() and getFormats() methods
    - Implement yt-dlp process spawning with --dump-json flag
    - Parse yt-dlp JSON output to extract metadata and formats
    - Implement 5-second timeout for analysis operations
    - Map yt-dlp formats to QualityOption with resolution, codec, filesize
    - _Requirements: 2.1, 2.2, 2.3, 14.2_
  
  - [x] 5.2 Add error handling and classification
    - Create ErrorHandler class with classifyError() and getUserMessage() methods
    - Implement error code mapping (NETWORK_ERROR, ACCESS_DENIED, PLATFORM_UNAVAILABLE, VIDEO_NOT_FOUND, INVALID_URL)
    - Add retry logic with exponential backoff
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  
  - [ ]* 5.3 Write property test for format extraction completeness
    - **Property 3: Format Extraction Completeness**
    - **Validates: Requirements 2.2, 2.3**
    - Test that all formats from yt-dlp JSON are parsed without loss
    - Verify format data structure completeness
  
  - [ ]* 5.4 Write property test for error code mapping
    - **Property 14: Error Code Mapping**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4**
    - Test that all error types map to defined ErrorCode values
    - Verify user-facing messages are present for all error codes

- [ ] 6. Implement Download Manager service
  - [x] 6.1 Create DownloadManager with session management
    - Write DownloadManager class with startDownload(), cancelDownload(), getProgress() methods
    - Implement session creation with UUID generation
    - Create SessionState tracking with status, progress, timestamps
    - Implement concurrent download limiting (max 3 simultaneous)
    - Add download queue for requests exceeding limit
    - _Requirements: 5.1, 5.2, 14.3_
  
  - [x] 6.2 Implement yt-dlp download execution
    - Spawn yt-dlp process with selected format and output path
    - Parse yt-dlp stdout for progress updates (percent, speed, ETA)
    - Implement filename sanitization to remove invalid characters
    - Handle download completion and file verification
    - _Requirements: 5.1, 7.1, 7.2_
  
  - [x] 6.3 Add audio extraction support
    - Implement audio-only mode with yt-dlp audio extraction flags
    - Configure MP3 encoding at 320kbps constant bitrate
    - Configure FLAC encoding with lossless compression
    - Embed metadata (title, artist, thumbnail) in audio files
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ]* 6.4 Write property test for filename sanitization
    - **Property 7: Filename Sanitization**
    - **Validates: Requirements 7.2**
    - Generate random strings with special characters and unicode
    - Verify sanitized filenames are valid on all filesystems
    - Test filename length constraints (max 255 characters)
  
  - [ ]* 6.5 Write property test for concurrent download limit
    - **Property 15: Concurrent Download Limit**
    - **Validates: Requirements 14.3**
    - Submit multiple download requests simultaneously
    - Verify at most 3 downloads execute concurrently
    - Test queue management for excess requests
  
  - [ ]* 6.6 Write property test for audio extraction parameters
    - **Property 6: Audio Extraction Parameters**
    - **Validates: Requirements 4.3, 4.4**
    - Test that audioOnly=true configures correct yt-dlp parameters
    - Verify MP3 320kbps and FLAC lossless settings
  
  - [ ]* 6.7 Write property test for metadata preservation
    - **Property 20: Metadata Preservation**
    - **Validates: Requirements 4.5**
    - Test that audio files include embedded metadata
    - Verify metadata fields (title, artist, thumbnail) are preserved

- [ ] 7. Implement Progress Tracker service
  - [x] 7.1 Create ProgressTracker with real-time monitoring
    - Write ProgressTracker class with trackSession(), getProgress(), subscribe() methods
    - Parse yt-dlp stdout lines for progress data
    - Extract percent, downloadedBytes, totalBytes, speed, ETA from output
    - Maintain in-memory progress state for active sessions
    - Support multiple subscribers per session with callback pattern
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [ ]* 7.2 Write property test for progress monotonicity
    - **Property 8: Download Progress Monotonicity**
    - **Validates: Requirements 6.6**
    - Generate sequence of progress updates
    - Verify progress percentages are monotonically non-decreasing
    - Test that final progress is always 100% on completion

- [ ] 8. Checkpoint - Verify backend services
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement REST API layer
  - [x] 9.1 Create Express server and middleware
    - Set up Express app with JSON body parser
    - Configure CORS middleware with allowed origins
    - Add request logging middleware
    - Configure static file serving for frontend
    - Set up error handling middleware
    - _Requirements: 12.5, 12.6_
  
  - [x] 9.2 Implement POST /api/analyze endpoint
    - Create route handler accepting { url: string } in request body
    - Call URLParser to validate URL
    - Call MediaExtractor to fetch available formats
    - Return AnalysisResult with metadata and quality options
    - Handle errors and return appropriate HTTP status codes
    - _Requirements: 12.1, 2.1, 2.4_
  
  - [x] 9.3 Implement POST /api/download endpoint
    - Create route handler accepting { url, formatId, audioOnly } in request body
    - Call DownloadManager to start download session
    - Return sessionId for progress tracking
    - Handle validation errors (no quality selected)
    - _Requirements: 12.2, 5.1, 5.4_
  
  - [x] 9.4 Implement GET /api/progress/:sessionId endpoint (SSE)
    - Create SSE endpoint with text/event-stream content type
    - Subscribe to ProgressTracker for session updates
    - Stream progress events to client in SSE format
    - Handle client disconnection and cleanup
    - Send completion or error events
    - _Requirements: 12.3, 6.1, 6.5_
  
  - [x] 9.5 Implement GET /api/history endpoint
    - Create route handler returning stored download records
    - Read from localStorage (server-side simulation for testing)
    - Return array of DownloadRecord objects
    - _Requirements: 12.4, 8.2_
  
  - [ ]* 9.6 Write property test for API response structure
    - **Property 16: API Response Structure**
    - **Validates: Requirements 12.5, 12.6**
    - Test all endpoints return valid JSON
    - Verify HTTP status codes match success/error states
    - Test required fields are present in all responses

- [ ] 10. Implement frontend UI Controller
  - [x] 10.1 Create UIController class and DOM element mapping
    - Write UIController class with initialize() method
    - Map DOM elements: URL input, Extract button, Download button, quality buttons, audio toggle
    - Map status displays: Status, Traffic, Encryp_Lvl fields
    - Map history cards in "Recent Transfers" section
    - Add event listeners to all interactive elements
    - _Requirements: 13.1, 13.2, 13.3, 13.4_
  
  - [x] 10.2 Implement URL extraction flow
    - Add click handler for "EXTRACT" button
    - Read URL from input field
    - Call POST /api/analyze with URL
    - Update status display to "ANALYZING_SOURCE"
    - Handle analysis response and populate quality buttons
    - Display error messages for invalid URLs
    - _Requirements: 1.1, 1.3, 1.5, 2.4, 2.5_
  
  - [x] 10.3 Implement quality selection logic
    - Add click handlers for quality buttons
    - Update button states (selected/unselected)
    - Store selected formatId in component state
    - Highlight highest quality as default
    - Disable unavailable quality buttons
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [x] 10.4 Implement audio-only toggle
    - Add change handler for audio toggle switch
    - Update toggle visual state (background color, position)
    - Disable video quality buttons when audio mode active
    - Enable audio format selection
    - _Requirements: 3.4, 4.1_
  
  - [x] 10.5 Implement download initiation
    - Add click handler for "Initialize Download" button
    - Validate quality selection before download
    - Call POST /api/download with URL, formatId, audioOnly
    - Update status display to "DOWNLOADING_ACTIVE"
    - Disable download button during active download
    - _Requirements: 5.1, 5.2, 5.4, 5.5_
  
  - [x] 10.6 Implement real-time progress display
    - Connect to GET /api/progress/:sessionId SSE endpoint
    - Parse progress events from SSE stream
    - Update progress bar with smooth animation
    - Display download speed in MB/s or GB/s with unit scaling
    - Display downloaded size / total size with human-readable formatting
    - Display ETA in minutes and seconds
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 10.7 Handle download completion
    - Listen for completion event from SSE stream
    - Update status to "COMPLETED" with success notification
    - Display filename in notification
    - Return status to "IDLE_WAITING" after 3 seconds
    - Re-enable download button
    - Refresh history display
    - _Requirements: 7.3, 7.4_
  
  - [ ]* 10.8 Write property test for UI state consistency
    - **Property 5: UI State Consistency**
    - **Validates: Requirements 1.5, 5.2, 5.3, 13.3**
    - Test state transitions (IDLE → ANALYZING → DOWNLOADING → COMPLETED)
    - Verify all status displays update correctly
    - Test that no intermediate states are skipped
  
  - [ ]* 10.9 Write property test for quality button state consistency
    - **Property 18: Quality Button State Consistency**
    - **Validates: Requirements 2.5, 3.2, 3.4**
    - Test that available formats enable corresponding buttons
    - Verify exactly one button is selected at a time
    - Test audio-only mode disables video quality buttons
  
  - [ ]* 10.10 Write property test for progress display formatting
    - **Property 9: Progress Display Formatting**
    - **Validates: Requirements 6.2, 6.3, 6.4**
    - Test speed formatting with MB/s and GB/s unit scaling
    - Test size formatting with appropriate units
    - Test ETA formatting in human-readable format
  
  - [ ]* 10.11 Write property test for download validation
    - **Property 19: Download Validation**
    - **Validates: Requirements 5.4**
    - Test that download is prevented when no quality selected
    - Verify validation error message is displayed

- [ ] 11. Implement History Store component
  - [x] 11.1 Create HistoryStore with localStorage persistence
    - Write HistoryStore class with addRecord(), getRecords(), clearHistory() methods
    - Implement localStorage read/write with key "kinetic_dl_history"
    - Serialize/deserialize DownloadRecord objects to JSON
    - Implement 100-record size limit with oldest-first eviction
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [x] 11.2 Integrate history with download completion
    - Call HistoryStore.addRecord() when download completes
    - Include all required fields: id, filename, filesize, timestamp, thumbnail, platform, status
    - Save failed downloads with ERROR status and error message
    - _Requirements: 8.1, 8.5_
  
  - [ ]* 11.3 Write property test for history record completeness
    - **Property 10: History Record Completeness**
    - **Validates: Requirements 8.1, 8.5, 9.3**
    - Test that all completed downloads create complete records
    - Verify all required fields are present and non-null
    - Test optional fields are handled correctly
  
  - [ ]* 11.4 Write property test for history size limit enforcement
    - **Property 11: History Size Limit Enforcement**
    - **Validates: Requirements 8.3, 8.4**
    - Add more than 100 records to history
    - Verify exactly 100 records are maintained
    - Test that oldest records are removed first

- [ ] 12. Implement history display in UI
  - [x] 12.1 Create history card rendering
    - Read history records from HistoryStore
    - Render 3 most recent records in "Recent Transfers" section
    - Display thumbnail, filename, filesize, timestamp for each record
    - Format filesize with appropriate units (MB, GB)
    - Format timestamp as "YYYY-MM-DD // HH:MM"
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [x] 12.2 Add status badge rendering
    - Render status badge with appropriate color
    - Use green (#8eff71) for COMPLETED status
    - Use red (#ff7073) for ERROR/FAILED status
    - Use yellow/neutral for other statuses
    - Display error details on hover for ERROR status
    - _Requirements: 9.4, 9.5_
  
  - [x] 12.3 Add history card animations
    - Implement grayscale-to-color transition on hover
    - Preserve existing card hover effects
    - Add new record to top of history with fade-in animation
    - _Requirements: 9.6, 13.6_
  
  - [ ]* 12.4 Write property test for history display ordering
    - **Property 12: History Display Ordering**
    - **Validates: Requirements 9.1, 9.2**
    - Test that 3 most recent records are displayed
    - Verify records are in descending chronological order
  
  - [ ]* 12.5 Write property test for status badge color mapping
    - **Property 13: Status Badge Color Mapping**
    - **Validates: Requirements 9.4, 9.5, 13.7**
    - Test that COMPLETED status renders green badge
    - Test that ERROR/FAILED status renders red badge
    - Verify color values match design system

- [ ] 13. Checkpoint - Verify frontend integration
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Wire existing HTML dashboard to backend
  - [x] 14.1 Copy existing HTML to public directory
    - Copy stitch/stitch/downloader_dashboard_telemetry_expansion/code.html to public/index.html
    - Preserve all existing styles, animations, and structure
    - _Requirements: 13.1, 13.2, 13.6_
  
  - [x] 14.2 Add frontend JavaScript to HTML
    - Create public/js/app.js with UIController implementation
    - Add script tag to index.html to load app.js
    - Initialize UIController on DOMContentLoaded
    - _Requirements: 13.1, 13.2_
  
  - [x] 14.3 Update status displays with real data
    - Wire "Status" field to show current download state
    - Wire "Traffic" field to show current download speed
    - Update "Encryp_Lvl" field (keep as static "AES_256_ACTIVE")
    - _Requirements: 13.3_
  
  - [ ] 14.4 Test full download flow end-to-end
    - Test URL input → Extract → Quality selection → Download → Completion
    - Verify progress updates display correctly
    - Verify history updates after completion
    - Test error handling for invalid URLs
    - _Requirements: 1.1, 2.1, 3.1, 5.1, 6.1, 7.1, 8.1, 9.1_

- [ ] 15. Add comprehensive error handling
  - [x] 15.1 Implement error display in UI
    - Create error notification component
    - Display error messages with appropriate styling (red theme)
    - Add "RETRY" button for retryable errors
    - Implement 3-retry limit with user guidance
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_
  
  - [x] 15.2 Add network error handling
    - Catch fetch errors and display "NETWORK_ERROR" message
    - Implement retry logic with exponential backoff
    - Handle timeout errors (5 seconds for analysis)
    - _Requirements: 11.1_
  
  - [x] 15.3 Add platform-specific error handling
    - Handle "ACCESS_DENIED" for private/restricted videos
    - Handle "PLATFORM_UNAVAILABLE" for temporary outages
    - Handle "VIDEO_NOT_FOUND" for deleted content
    - _Requirements: 11.2, 11.3, 11.4_

- [ ] 16. Add performance optimizations
  - [x] 16.1 Implement format analysis caching
    - Cache analysis results in memory for 5 minutes
    - Use URL as cache key
    - Reduce redundant yt-dlp calls for same URL
    - _Requirements: 14.2_
  
  - [x] 16.2 Optimize progress updates
    - Throttle progress updates to 500ms intervals
    - Use requestAnimationFrame for smooth progress bar animation
    - Prevent UI blocking during updates
    - _Requirements: 6.1, 14.4_
  
  - [x] 16.3 Add memory management
    - Clean up completed sessions after 1 hour
    - Limit in-memory session storage
    - Monitor memory usage and log warnings
    - _Requirements: 14.6_

- [ ] 17. Final checkpoint and testing
  - [ ] 17.1 Run all unit tests
    - Execute all property-based tests
    - Execute all unit tests for components
    - Verify 100% pass rate
  
  - [ ] 17.2 Run integration tests
    - Test POST /api/analyze with real YouTube URL
    - Test POST /api/download with format selection
    - Test SSE progress streaming
    - Test history persistence across page reloads
  
  - [ ] 17.3 Run end-to-end tests
    - Test complete download flow from URL to file
    - Test audio extraction flow
    - Test error handling for invalid URLs
    - Test multi-platform support (YouTube, Instagram, TikTok)
  
  - [ ] 17.4 Verify UI preservation
    - Confirm all existing animations work
    - Confirm cyberpunk color scheme is preserved
    - Confirm responsive layout works on mobile
    - Confirm all hover effects are intact

- [x] 18. Create documentation and deployment files
  - Create README.md with setup instructions
  - Create .env.example with all configuration variables
  - Document API endpoints and request/response formats
  - Add inline code comments for complex logic
  - Create deployment guide for Docker and Kubernetes

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties from the design document
- The implementation preserves the existing cyberpunk UI design while adding full functionality
- All backend code uses TypeScript for type safety
- Frontend uses vanilla JavaScript (ES6+) for simplicity
- yt-dlp must be installed on the system before running the application
