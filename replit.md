# YouTube Downloader Web Application

## Overview
A full-featured YouTube video downloader web application with background job processing, external storage integration, and Telegram bot support. Supports both desktop and mobile browsers with a responsive design.

## Current State
- **Status:** MVP Complete
- **Auth:** Replit Auth (Google, GitHub, email/password)
- **Database:** PostgreSQL with Drizzle ORM
- **Real-time:** WebSocket for job progress updates

## Features
1. **User Authentication** - Dual auth system: Replit Auth (Google, GitHub) + local username/password
2. **YouTube Download** - Download videos/audio with quality selection
3. **Proxy Support** - HTTP/HTTPS/SOCKS4/SOCKS5 proxy for YouTube downloads
4. **Background Jobs** - Queue system with real-time progress tracking (speed + ETA)
5. **TUS Upload Server** - Upload via TUS 1.0.0 protocol (https://tusd.bedovo.ru/files/)
6. **Telegram Bot** - Remote control via Telegram
7. **Jellyfin Integration** - Auto-refresh media library
8. **Internationalization** - English and Russian languages
9. **Theme Toggle** - Light and dark mode support

## Tech Stack
- **Frontend:** React, TypeScript, TailwindCSS, Shadcn UI, Wouter
- **Backend:** Express.js, Node.js, PostgreSQL, Drizzle ORM
- **Auth:** Replit OpenID Connect (passport.js)
- **Real-time:** WebSocket (ws)

## Project Structure
```
client/
  src/
    components/     # Reusable UI components
    contexts/       # React context providers
    hooks/          # Custom React hooks
    lib/            # Utilities (queryClient, i18n)
    pages/          # Route pages (home, jobs, settings, landing)
server/
  db.ts            # Database connection
  storage.ts       # Data access layer
  routes.ts        # API endpoints
  replitAuth.ts    # Authentication setup
shared/
  schema.ts        # Database schema & types
```

## API Endpoints
- `GET /api/auth/user` - Get current user
- `POST /api/auth/login` - Login with username/password
- `POST /api/auth/register` - Register new user
- `POST /api/auth/logout` - Logout current user
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update user settings
- `POST /api/settings/test-synology` - Test Synology connection (tusd protocol)
- `PUT /api/preferences` - Update language/theme preferences
- `GET /api/jobs` - List download jobs
- `POST /api/download` - Create download job
- `POST /api/jobs/:id/cancel` - Cancel job
- `POST /api/jobs/:id/retry` - Retry failed job
- `DELETE /api/jobs/:id` - Delete job

## Database Tables
- `users` - User accounts (Replit Auth)
- `sessions` - Session storage
- `user_settings` - Synology, Telegram, Jellyfin settings
- `download_jobs` - Download job queue

## Development
```bash
npm run dev          # Start development server
npm run db:push      # Push schema to database
npm run build        # Build for production
```

## User Preferences
- Language: Stored in localStorage and database
- Theme: Stored in localStorage and database
- Settings: Stored in database per user

## Recent Changes
- **2025-12-03:** Auto-cleanup local files after NAS upload
  - Downloaded files are automatically deleted from /downloads after successful upload to NAS
  - Applies to both auto-upload and manual "Send to NAS" button
  - Frees up local disk space automatically
- **2025-12-03:** Added proxy server support for YouTube downloads
  - New Proxy tab in settings with HTTP/HTTPS/SOCKS4/SOCKS5 support
  - Proxy is applied only to YouTube downloads (not NAS uploads)
  - Optional username/password authentication for proxy
  - Database: added proxy fields to userSettings table
- **2025-12-03:** Improved progress tracking and auto-cleanup
  - Fixed progress bar not updating during yt-dlp downloads (parse both stdout/stderr)
  - Added NAS upload progress tracking (90-99% range with chunked uploads)
  - Implemented auto-cleanup when disk space <5GB (deletes oldest files uploaded to NAS)
  - Uses Android client for yt-dlp to bypass YouTube 403 blocks
  - Progress is now monotonic (never decreases)
- **2025-12-03:** Implemented real YouTube video downloading with yt-dlp
  - Replaced all simulation code with real yt-dlp integration
  - Created `server/youtube.ts` module with real video metadata extraction
  - Downloads stored in `/downloads` directory
  - Real file streaming for local download
  - Real file upload to NAS via TUS protocol
  - System dependencies: yt-dlp, ffmpeg
- **2025-12-03:** Added local download and manual NAS upload features
  - Added "Download" button for completed jobs (local browser download)
  - Added "Auto-upload to NAS" toggle in settings
  - Added "Send to NAS" button in job cards (appears when auto-upload is OFF)
  - Added "Uploaded to NAS" badge for jobs already uploaded
  - Updated i18n translations for new features (EN/RU)
  - Database: added `autoUploadToNas` field to userSettings, `uploadedToNas` field to downloadJobs
- **2025-12-03:** Updated TUS integration to v1.0.0 protocol
  - Removed authentication fields (tusd.bedovo.ru requires no auth)
  - Fixed HTTP→HTTPS redirect in Location header
  - Simplified settings UI (only endpoint URL needed)
  - Tested with real server: 1MB upload successful
- Initial MVP implementation
- Added dual authentication: Replit Auth + local username/password
- Created master admin user (username: admin)
- Added WebSocket for real-time job updates
- Added i18n support (EN/RU)
- Added dark/light theme toggle
- Added responsive mobile layout

## Architecture Decisions
- Single-page application with client-side routing (wouter)
- Dual authentication: Both OIDC (Replit Auth) and local username/password
- Sidebar navigation for authenticated users
- Landing page for unauthenticated users
- Real-time updates via WebSocket
- TUS 1.0.0 protocol for resumable uploads (no authentication)
- Real YouTube download using yt-dlp (installed via Nix)
- Downloaded files stored in `/downloads` directory

## External Integrations
### TUS Upload Server
- **Endpoint:** https://tusd.bedovo.ru/files/
- **Protocol:** TUS 1.0.0 (resumable uploads)
- **Authentication:** None required
- **File Limit:** 10GB per file
- **Destination:** /volume1/media/youtube
- **Test:** Uploads 1MB test file to verify connection
