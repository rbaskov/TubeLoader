# Design Guidelines: YouTube Video Downloader Web Application

## Design Approach

**Selected Approach:** Design System (Material Design 3 / Modern Minimalist)

**Justification:** This is a utility-focused productivity tool requiring efficiency, clarity, and learnability. The user explicitly requested "максимально простым и легким в дизайне" (maximally simple and light design). A clean, functional design system approach prioritizes usability over visual flourish.

**Key Design Principles:**
- Function over form: Every element serves a clear purpose
- Minimal visual noise: Clean backgrounds, clear hierarchy
- Instant comprehension: Users should understand functionality immediately
- Efficient workflows: Reduce clicks and cognitive load

---

## Core Design Elements

### A. Typography

**Font Family:** Inter (via Google Fonts CDN)
- Primary: Inter for all UI elements
- Fallback: system-ui, -apple-system, sans-serif

**Type Scale:**
- Headings (H1): text-2xl (24px), font-semibold
- Headings (H2): text-xl (20px), font-semibold  
- Body Large: text-base (16px), font-normal
- Body: text-sm (14px), font-normal
- Caption/Labels: text-xs (12px), font-medium
- Buttons: text-sm (14px), font-medium

**Hierarchy:**
- Page titles: H1 with mb-6
- Section titles: H2 with mb-4
- Form labels: text-xs uppercase tracking-wide font-medium
- Body text: text-sm with comfortable line-height (leading-relaxed)

---

### B. Layout System

**Spacing Primitives:** Tailwind units of **2, 4, 6, 8, 12, 16**
- Micro spacing (gaps, padding within components): 2, 4
- Component spacing (between elements): 4, 6, 8
- Section spacing (between major blocks): 8, 12, 16
- Page margins: 4 (mobile), 8 (desktop)

**Container Structure:**
```
Desktop: max-w-7xl mx-auto px-8
Tablet: max-w-4xl mx-auto px-6
Mobile: max-w-full px-4
```

**Grid System:**
- Main content: Single column (max-w-3xl for forms/content)
- Settings sections: Stack vertically, no multi-column
- Jobs list: Single column with card-based layout
- Responsive: Always single column on mobile

**Page Layout:**
- Fixed sidebar navigation (desktop): w-64, hidden on mobile
- Top navigation bar (mobile): Fixed header with hamburger menu
- Main content area: Scrollable with consistent padding
- No full-viewport height sections - content-driven heights

---

### C. Component Library

#### 1. Navigation

**Desktop Sidebar:**
- Fixed left sidebar: w-64, border-r
- Logo/App name at top: p-6
- Navigation items: py-3 px-4, hover state with subtle background
- Active state: Bold font, accent border-l-4
- User profile section at bottom: Avatar, username, logout

**Mobile Navigation:**
- Fixed top bar: h-16, border-b
- Hamburger menu icon (left): Opens slide-out drawer
- App name (center)
- Theme/language toggles (right)
- Drawer navigation: Full-height overlay with same menu items

**Navigation Items:**
- Home (YouTube downloader)
- Jobs/Tasks (with badge showing active count)
- Settings
- Sign Out

#### 2. Core Components

**Input Fields:**
- Text input: border, rounded-lg, px-4 py-3, focus:ring-2
- Labels: text-xs uppercase mb-2 font-medium
- Helper text: text-xs mt-1
- Error state: Red border, red text helper

**Buttons:**
- Primary: Solid background, rounded-lg, px-6 py-3, font-medium
- Secondary: Border outline, same dimensions
- Icon buttons: Square p-3, rounded-lg
- Disabled state: Reduced opacity (opacity-50), cursor-not-allowed

**Cards:**
- Container: border rounded-xl p-6 mb-4
- Shadow: shadow-sm, hover:shadow-md transition
- Header: mb-4 with title and optional actions
- Content: Organized sections with internal spacing

**Progress Bars:**
- Container: w-full h-2 rounded-full, background track
- Fill: h-full rounded-full, transition-all duration-300
- Percentage label: text-xs mt-1

**Dropdowns/Select:**
- Similar styling to text inputs
- Custom chevron icon
- Dropdown menu: absolute, border, rounded-lg, shadow-lg
- Menu items: px-4 py-2, hover state

**Toggles:**
- Theme toggle: Icon-based switch (sun/moon)
- Language toggle: Flag icons or text labels (EN/RU)
- Setting toggles: Standard switch component

#### 3. Page-Specific Components

**Main Page (YouTube Downloader):**
- Centered layout: max-w-2xl mx-auto
- Large URL input field: Focus on this primary action
- Format selection: Radio buttons or segmented control (Audio/Video)
- Quality dropdown: Appears when Video selected
- Download button: Large, prominent, primary style
- Recent downloads: Small list below (3-5 items) with status

**Jobs/Tasks Page:**
- List of cards, each representing a download job
- Card content: Video title, URL (truncated), format, quality
- Progress bar: Prominent within card
- Status indicator: Icon + text (Queued, Downloading, Uploading, Complete, Failed)
- Timestamp: When job was created
- Actions: Cancel (for active), Remove (for completed/failed)

**Settings Page:**
- Tabbed sections or accordion for: Account, Synology, Telegram, Jellyfin, Preferences
- Each section: Card-based with form fields
- Save button: At bottom of each section
- Success/error messages: Toast notifications

**Authentication Pages:**
- Centered card: max-w-md mx-auto, mt-16
- Minimal branding at top
- Form fields: Username, password
- Submit button: Full width
- Alternative auth options: Social login buttons (if using Replit Auth)
- Switch between login/register: Link below form

---

### D. Animations

**Extremely Minimal - Use only for:**
- Progress bar fills: transition-all duration-300
- Card hover states: hover:shadow-md transition
- Button states: transition-colors duration-150
- Navigation drawer: slide-in transform transition-transform duration-200
- Toast notifications: Fade in/out

**Avoid:**
- Page transitions
- Scroll-triggered animations
- Complex micro-interactions
- Loading spinners (unless truly necessary for jobs)

---

## Mobile Optimization

**Responsive Breakpoints:**
- Mobile: Base styles (< 768px)
- Desktop: md: prefix (≥ 768px)

**Mobile-Specific Adjustments:**
- Larger tap targets: min-h-12 for buttons
- Simplified navigation: Hamburger menu
- Stacked layouts: All elements single column
- Reduced padding: px-4 instead of px-8
- Larger input fields: py-3 minimum
- Bottom action bars: Fixed bottom positioning for primary actions on long forms

**Touch Interactions:**
- No hover-dependent functionality
- Swipe gestures: Swipe to delete jobs (optional)
- Pull to refresh: On jobs list

---

## Language & Theme Support

**Language Toggle:**
- Position: Top-right of navigation bar
- Implementation: Icon flags or text labels (EN | RU)
- Persistence: Save to user preferences

**Theme Toggle:**
- Position: Next to language toggle
- Icon-based: Sun (light) / Moon (dark)
- Persistence: Save to user preferences
- Implementation: CSS variables or Tailwind dark mode classes

---

## Images

**No hero images required** - This is a utility application focused on functionality.

**Icon Usage:**
- Download icon: For main action button
- Video/Audio icons: For format selection
- Status icons: Success checkmark, error X, loading spinner, clock for queued
- Settings icons: Gear for each settings section
- Navigation icons: Home, list, settings, logout

**Use Heroicons** (via CDN) for all icon needs - outline style for navigation, solid style for status indicators.

---

## Visual Hierarchy Principles

1. **Primary Action Emphasis:** URL input + Download button are hero elements of main page
2. **Status Clarity:** Jobs list uses color + icon + text for unambiguous status
3. **Progressive Disclosure:** Settings organized in sections, avoiding overwhelming users
4. **Scannable Content:** Clear labels, adequate spacing, grouped related items
5. **Feedback:** Immediate visual feedback for all user actions (button states, toasts, progress)