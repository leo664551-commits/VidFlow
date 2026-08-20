# PHASE 0 — REQUIREMENTS VALIDATION (CORRECTED v2)
# Cloud-Native Video Sharing Platform — TikTok/Reels UI Paradigm

---

## CRITICAL CORRECTION: UI PARADIGM

> **This document supersedes all prior Phase 0 deliverables regarding UI/UX design.**
> The platform UI must follow the **TikTok / Instagram Reels visual and interaction paradigm**, NOT YouTube.

| Aspect | YouTube (REJECTED) | TikTok/Reels (REQUIRED) |
|---|---|---|
| **Primary layout** | Horizontal video player, grid of thumbnails | Full-screen vertical video feed (9:16) |
| **Navigation** | Sidebar, horizontal lists, click-to-navigate | Swipe/scroll up-down, bottom tab bar |
| **Video discovery** | Thumbnail grid with metadata cards | Immersive full-screen feed, "For You" stream |
| **Video player** | Dedicated page with description below | Video IS the page — overlay UI on top |
| **Comments** | Separate section below video | Bottom sheet overlay |
| **Search** | Top bar, search results as grid | Dedicated "Discover" tab, hashtag grid |
| **Background** | White/light, content cards on white | Dark/black, video fills entire viewport |
| **Chrome** | Headers, sidebars, nav bars visible | Minimal overlay — video is the hero |
| **Mobile focus** | Desktop-first, responsive | Mobile-first, full-screen immersive |
| **Engagement actions** | Like/dislike bar below player | Vertical action bar on right side of video |

---

## DELIVERABLE M: FRONTEND PAGES & ROUTING

### UI Design Philosophy

- **Dark-first aesthetic**: The background is black/dark. Video content fills the viewport.
- **Immersive fullscreen**: The video IS the interface. All other UI is an overlay.
- **Vertical-first (9:16)**: Videos are portrait-oriented. The feed is a vertical scroll.
- **Minimal chrome**: No persistent headers, no sidebars. Only overlay controls.
- **Touch-gesture friendly**: Swipe up/down for navigation, tap for pause/play.
- **Bottom tab navigation**: Primary app navigation via 5-icon bottom tab bar.

### Route Map

```
/                           → Redirect to /feed (or landing if unauthenticated)
/feed                       → Full-screen vertical video feed ("For You")
/discover                   → Search + hashtag/category grid (Instagram Explore style)
/upload                     → Creator upload page (mobile camera/file picker)
/notifications              → Inbox/notifications
/profile                    → Current user's profile
/profile/:creatorId         → Public creator profile with their video grid
/video/:id                  → Full-screen video player (single video, shareable link)
/admin                      → Admin dashboard (traditional layout, NOT TikTok-style)
/admin/creators             → Creator management
/admin/creators/:id         → Creator detail
/admin/users                → User management
/admin/videos               → Video management
/admin/comments             → Comment moderation
/creator/dashboard          → Creator dashboard (traditional layout)
/creator/videos             → Creator's video management list
/creator/videos/:id/edit    → Edit video metadata
/login                      → Login page
/register                   → Consumer registration page
```

### Bottom Tab Bar (5 tabs for Consumer, 5 for Creator, Admin has separate nav)

| Icon | Label | Route | Visible To |
|---|---|---|---|
| Home | "Home" | `/feed` | All authenticated users |
| Search | "Discover" | `/discover` | All authenticated users |
| Plus (circle) | "" | `/upload` | **CREATOR only** (absent for CONSUMER — not hidden, **absent**) |
| Bell | "Inbox" | `/notifications` | All authenticated users |
| User | "Profile" | `/profile` | All authenticated users |

- **ADMIN**: Gets an additional sidebar navigation when on `/admin/*` routes.
- **CREATOR**: Gets a separate dashboard accessible via profile menu or `/creator/dashboard`.
- **CONSUMER**: The "+" tab is completely absent — not hidden, not grayed out, **absent**.

### Layout Architecture

```
Consumer Feed Layout (TikTok Style):

┌─────────────────────────────────┐
│         (No top header)          │  ← Feed/Discover: no header
│                                  │
│    ┌──────────────────────┐     │
│    │                      │     │
│    │   FULL-SCREEN VIDEO  │     │  ← Video fills 100vh, 100vw
│    │   (9:16 portrait)     │     │
│    │                      │     │
│    │              [♥] [💬]│     │  ← Right-side action overlay
│    │              [↗] [⋯]│     │
│    │                      │     │
│    │ @creator  Title...   │     │  ← Bottom-left info overlay
│    │ ♫ Publisher - Producer  │     │
│    ├──────────────────────┤     │
│    │ 🏠  🔍  ➕  🔔  👤  │     │  ← Bottom tab bar (fixed)
│    └──────────────────────┘     │
└─────────────────────────────────┘

Admin/Creator Dashboard Layout (traditional):

┌─────────────────────────────────┐
│  ☰  Platform Name      [User]  │  ← Top header bar
├────────┬────────────────────────┤
│        │                        │
│  Nav   │   Dashboard Content    │  ← Sidebar + content area
│  Items │   (cards, tables,      │
│        │    charts, lists)      │
│        │                        │
├────────┴────────────────────────┤
│            (no footer)          │
└─────────────────────────────────┘
```

---

## DELIVERABLE N: CONSUMER EXPERIENCE (TikTok/Reels Style)

### Primary Experience: The Feed (`/feed`)

This is the **core** of the consumer experience. It must replicate the TikTok/Reels full-screen vertical feed.

#### Visual Design
- **Background**: Pure black (`#000`)
- **Video**: Fills entire viewport (`100vw × 100vh`), centered, object-fit: cover
- **Aspect ratio**: 9:16 (portrait). Videos not 9:16 are letterboxed/pillarboxed with black bars.
- **Auto-play**: Videos auto-play when scrolled into view. Previous video pauses.
- **Loop**: Videos loop when they finish.
- **Muted by default**: Sound off on first view. Tap speaker icon to unmute.
- **Tap to pause**: Single tap anywhere on video pauses. Tap again to resume.

#### Right-Side Action Bar (vertical icon stack)

Positioned on the right edge of the video, vertically centered.

```
    [Avatar]        ← Creator's profile pic (circular, tappable → /profile/:creatorId)
    [♥ 1.2K]       ← Like button + count (animated heart on tap)
    [💬 342]        ← Comment button + count (opens comment bottom sheet)
    [↗ Share]       ← Share button (copy link / native share)
    [⭐ 4.2]        ← Star rating display / tap to rate (1-5)
    [⋯ More]        ← More options (report, not interested)
```

- Icons are white with subtle text-shadow for readability over video.
- Counts below each icon in small white text.
- **Like**: Tap toggles. Heart animation. Unauthenticated → redirect to login.
- **Comment**: Opens bottom sheet.
- **Rating**: Tap opens inline star picker. CONSUMER only. Shows average if not rated.

#### Bottom-Left Info Overlay

```
    @creatorhandle              ← Creator name, tappable → /profile/:creatorId
    Video title here...         ← Title (max 2 lines, truncated)
    ♫ Publisher - Producer      ← Scrolling info ticker
    #genre1 #genre2             ← Genre tags (tappable → /discover?genre=...)
```

- White text with subtle text-shadow.
- Creator name tappable.
- Genre tags tappable → `/discover` with genre filter.

#### Comment Bottom Sheet
- Slides up from bottom, covers ~60% of screen height.
- Video info at top, scrollable comment list, input pinned at bottom.
- Each comment: user avatar, display name, time ago, comment text.
- User can edit/delete own comments (via ⋯ menu).
- Drag down to dismiss.

#### Feed Navigation
- **Scroll/swipe UP**: Next video.
- **Scroll/swipe DOWN**: Previous video.
- Virtualized scroll. Only 3 videos rendered (prev, current, next).
- Feed API: `GET /api/videos/feed?page=1&limit=10` — paginated READY videos by newest.
- Infinite scroll: load next page near end of current batch.

### Discover Page (`/discover`)

Instagram Explore / TikTok search style.

#### Top Section
- Search bar (full-width, rounded, search icon).
- Focused state: search suggestions / recent searches.

#### Category/Hashtag Row
- Horizontal scrollable genre/category pills.
- Tapping filters the grid below.

#### Video Grid
- **2-column masonry/waterfall grid** (Instagram Explore style), NOT uniform YouTube grid.
- Each cell: thumbnail, play count (bottom-left), duration (bottom-right), title (bottom with gradient).
- Tap → opens `/video/:id` in full-screen player.

### Single Video Page (`/video/:id`)
- Identical to feed layout — full-screen video with same overlays.
- Shareable link for a specific video.
- No infinite scroll — just this one video.
- Back button at top-left.
- All right-side actions and bottom-left info present.

### Notifications Page (`/notifications`)
- List of recent activity notifications.
- Dark theme.

### Consumer Profile (`/profile`)
- User avatar, display name, email, join date.
- Stats: comments made, ratings given.
- Edit profile button.
- Dark theme.

### Registration & Login
- Full-screen dark themed pages.
- Minimal clean forms.
- Post-login redirect → `/feed`.

### What Consumers NEVER See
- Upload button / upload page (absent from tab bar)
- Creator dashboard
- Admin interface

---

## DELIVERABLE O: CREATOR EXPERIENCE

### Feed & Discover
- Creator uses the **same TikTok-style feed** (`/feed`) and **same discover** (`/discover`) as consumers.
- Tab bar includes the **"+" upload button**.
- Creator **cannot** comment or rate (enforced at API). Buttons hidden/disabled for creator role.

### Upload Page (`/upload`)
- Dark themed full-screen.
- Large drag-and-drop zone or file picker.
- Form below: Title (req), Publisher (req), Producer (req), Genre (req, dropdown), Age Rating (req, dropdown), Description (opt), Thumbnail (opt).
- Upload progress bar.
- Post-upload status indicator (UPLOADING → PROCESSING → READY/FAILED).
- Success → "View My Videos" button.

### Creator Dashboard (`/creator/dashboard`)
- **Traditional layout** (sidebar + content) — NOT TikTok-style.
- Stat cards: Total videos, Published, Processing, Failed, Total views, Avg rating.
- Recent uploads table.
- "Upload New Video" button.

### My Videos (`/creator/videos`)
- Table/list (traditional).
- Columns: Thumbnail, Title, Status (badge), Views, Avg Rating, Date, Actions.
- Filter by status.
- Edit → `/creator/videos/:id/edit`.
- Delete → confirmation modal.

### Edit Video (`/creator/videos/:id/edit`)
- Pre-filled form: Title, Publisher, Producer, Genre, Age Rating, Description, Thumbnail.
- Not editable: Status, View count, Ratings.

### Creator Profile (Public) (`/profile/:creatorId`)
- TikTok-style profile (dark theme):
  - Large circular avatar centered.
  - Creator name + description.
  - Stats: Video count, Total views.
  - **3-column video thumbnail grid** (TikTok profile style).
  - Tap thumbnail → `/video/:id` full-screen.

---

## DELIVERABLE P: ADMIN EXPERIENCE

### Navigation
- `/admin/*` routes use **traditional dashboard layout** — sidebar + content area.
- NOT TikTok-style. Admin interfaces are functional management tools.
- Dark theme (to match app aesthetic).
- Server-enforced ADMIN-only access.

### Admin Dashboard (`/admin`)
- Stat cards: Total Consumers, Total Creators, Total Videos, Published, Pending/Processing, Failed.
- Recent uploads, recent users, recent comments needing moderation.

### Creator Management (`/admin/creators`)
- Table: Name, Email, Status, Video Count, Join Date, Actions.
- "Create Creator" button → form/modal.
- Actions: View, Activate/Deactivate, Delete.

### User Management (`/admin/users`)
- Table: Email, Display Name, Role, Status, Join Date, Actions.
- Filter by role, status.
- Actions: Disable/Enable.

### Video Management (`/admin/videos`)
- Table: Thumbnail, Title, Creator, Genre, Status, Views, Date, Actions.
- Filter by status, genre, creator.
- Actions: Publish (UNPUBLISHED→READY), Unpublish, Delete.

### Comment Moderation (`/admin/comments`)
- Table: Video, User, Comment (truncated), Status, Date, Actions.
- Actions: Approve, Hide, Delete.

---

## UNCHANGED DELIVERABLES (from v1)

The following remain completely unchanged — the UI paradigm correction does not affect backend architecture:

- **A**: Functional Requirements
- **B**: Non-Functional Requirements
- **C**: Actors & Permission Matrix
- **D**: Open Questions (D1, D6, D8, D9, D10)
- **E**: Entity Relationship Model
- **F**: PostgreSQL Schema
- **G**: Prisma Schema
- **H**: Azure Service Map
- **I**: Service Abstraction Interfaces (IAuthService, IStorageService, IAuditService, IVideoProcessingService)
- **J**: REST API Specification (including feed endpoint)
- **K**: Request/Response Schemas
- **L**: Error Handling Specification
- **Q**: Security Design
- **R**: Scalability Design
- **S**: Deployment Architecture
- **T**: Requirements Traceability Matrix

---

## FEED API ADDENDUM

### `GET /api/videos/feed`

**Auth**: None required (public). Authenticated users get `user_liked` and `user_rating` fields.

**Query Params**: `page` (default 1), `limit` (default 10, max 20), `genre` (optional)

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Video Title",
      "description": "Optional",
      "creator": {
        "id": "uuid",
        "creator_name": "handle",
        "display_name": "Display Name"
      },
      "publisher": "Publisher",
      "producer": "Producer",
      "genre": "Comedy",
      "age_rating": "PG",
      "thumbnail_url": "https://...sas...",
      "video_url": "https://...sas...",
      "duration": 45,
      "view_count": 1234,
      "like_count": 56,
      "comment_count": 12,
      "avg_rating": 4.2,
      "user_liked": false,
      "user_rating": null,
      "created_at": "ISO-8601"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 156,
    "total_pages": 16
  }
}
```

---

## PHASE GATE — PENDING APPROVAL

Phase 0 v2 is complete with the TikTok/Reels UI correction applied.

**Changed**: M, N, O, P (UI/UX design)
**Unchanged**: A-L, Q-T (backend, data, security, architecture)

**Open questions remain** (D1, D6, D8, D9, D10 from v1).

**Awaiting your approval to proceed to Phase 1 implementation.**