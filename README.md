# ⚡ Cyber Combat Desktop

An ultra-sleek, interactive cyber-tactical desktop HUD designed specifically for **[Lively Wallpaper](https://www.rocksdanister.com/lively/)** on Windows 10 & 11.

Built with an offline-first architecture, glassmorphic emerald aesthetics, dynamic content-hugging widgets, and ambient day/night lighting.

---

## 📸 Overview & Features

### 🕒 1. Tactical Clock & Interactive Calendar
- **Digital Clock**: 24-hour or 12-hour display with neon glow and day/date indicator.
- **Interactive Calendar Dropdown**: Click the clock card to toggle the full-month interactive calendar.
- **🎯 Category-Colored Calendar Highlighting**: Automatically scans active scheduled tasks and circles calendar dates in the category's glow color (Rose `#f43f5e` for *Last Date for Stuff*, Purple `#c084fc` for *Competitive Exams*, Amber `#fbbf24` for *College Exams*, Emerald `#34d399` for *College Task*, and Sky Blue `#38bdf8` for *My Task*). When multiple tasks fall on the same date, conflicts resolve automatically by priority: **Last Date > Competitive Exam > College Exam > College Task > My Task**.

### 🔥 2. Consistency Streak Heatmap
- **Contribution Heatmap**: Visual month-at-a-glance habit tracker showing daily completion percentages.
- **Interactive Expansion**: Click anywhere on the compact streak widget to expand into a full interactive 200% calendar with date numbers and month-by-month history navigation.
- **Automatic Habit Sync**: Dynamically updates as you complete daily checklist items and scheduled tasks.

### 📅 3. Dynamic Day-Wise Timetable & Lightbox
- **Daily Schedule Slots**: Automatically loads today's college schedule slots in a clean 2-column view (Time & Subject).
- **Expanded Timetable Lightbox**: Click the timetable card to view the high-resolution timetable image (`TT.jpeg`) in a dynamic 60% viewport lightbox with matching cyber-glass padding.
- **Auto-Sync**: Automatically detects image hash changes and syncs OCR data into offline cache files.

### 📝 4. Dynamic Content-Hugging To-Do Widget
- **Dynamic Content Sizing**: Minimum height automatically conforms to **only the content shown**—no artificial empty voids when you have few tasks.
- **Fluid Expansion**: Expands downwards item-by-item without scrollbars up to a reserved 4-desktop-icon boundary at the bottom.
- **Organized Filtering**: Single-click tab switching between **Due Soon**, **Planned**, **All**, and **Done**.
- **Category Styling**: Color-coded left-stripe indicators (*College Task*, *College Exams*, *Last Date for Stuff*, *Competitive Exams*, *My Task*).
- **Inline Date Capsule**: Fast in-page date selector with one-click quick pills (`Today`, `Tmrw`, `+2d`, `+1wk`).
- **Auto-Cleanup**: Tasks marked done are preserved and automatically purged after 24 hours.

### ✅ 5. "MY DAY" Daily Habits Checklist
- **Recurring Routine Tracker**: Loads daily repeating habits from `daily_tasks.txt`.
- **Integrated Daily Missions**: Automatically merges tasks scheduled for today and overdue pending tasks from your To-Do list, while also giving streak credit for any other To-Do tasks completed today.
- **Collapsible Body**: Click the header or chevron to minimize/expand the checklist with smooth animations.

### 🚀 6. Quick Action Console Dock
- **Lockstep Movement**: Positioned directly underneath the dynamic To-Do card, smoothly sliding up and down in synchrony as tasks are added or completed.
- **Quick Links**: Instant access buttons for portals (Google Classroom, University Portal, etc.) loaded dynamically from `links.txt`.
- **Focus Mode / Tactical View**: Single-click the eye icon to toggle visibility mode (keeps only Clock, Timetable & Console visible for a clean, minimal look).

### 🛡️ 7. Zero Popups & Clean Wallpaper UX
- Completely free of floating toast notifications, browser popups, alerts, and native hover tooltip rectangles (`title="..."` blocked via active MutationObserver).

---

## 📁 Repository Structure

```text
Desktop_Background/
├── index.html              # Main wallpaper canvas and widget structure
├── style.css               # Glassmorphic styling, neon glows & animations
├── app.js                  # Core engine: widgets, storage, and dynamic layout
├── daily_tasks.txt         # Plaintext list of recurring daily habits (1 per line)
├── links.txt               # Configurable console quick links (Name | URL | Icon)
├── streak_history.txt      # Historical streak logs (YYYY-MM-DD: percent)
├── TT.jpeg                 # Timetable image source for expanded lightbox
├── update_wallpaper.py     # Python sync script: hash verification, cache purge, Lively reload
├── update_wallpaper.bat    # 1-click batch shortcut to run update_wallpaper.py
├── server.js               # Optional local background bridge server (port 5000)
├── start_server.bat        # Batch launcher for background server
├── data-backup.js          # Offline backup data cache
├── data-backup.json        # Unified state export
├── .gitignore              # Git ignore rules (bytecode, logs, OS files)
└── README.md               # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
1. **[Lively Wallpaper](https://www.rocksdanister.com/lively/)** (available via Microsoft Store or GitHub).
2. **Python 3.8+** (recommended for running `update_wallpaper.py`).

### Installation
1. Clone or download this repository to your computer:
   ```bash
   git clone https://github.com/techaxadi01/Desktop_Background.git
   ```
2. Open **Lively Wallpaper**.
3. Click **Add Wallpaper** (`+` icon) -> **Browse** -> Select `index.html` inside this project directory.
4. Set as your active desktop wallpaper!

---

## ⚙️ Configuration & Customization

### Modifying Daily Tasks
Open [`daily_tasks.txt`](daily_tasks.txt) and add your daily routines (one per line):
```text
DSA Practice (1 LeetCode)
Read Technical Documentation (15 mins)
Evening Workout / Stretching
Review Tomorrow's Timetable
```
Run `update_wallpaper.bat` to refresh the wallpaper instantly.

### Customizing Console Quick Links
Open [`links.txt`](links.txt) and format entries as:
```text
Google Classroom | https://classroom.google.com/u/1/ | graduation-cap
College Site | https://cue.christuniversity.in/ | landmark
GitHub | https://github.com | github
```
*(Icons use [Lucide Icons](https://lucide.dev/icons) names).*

### Updating the Timetable Image
Simply replace [`TT.jpeg`](TT.jpeg) with your updated timetable image. Run `update_wallpaper.bat` to automatically verify the image hash and sync it to the lightbox.

---

## 🔄 One-Click Sync & Reload

Whenever you edit `daily_tasks.txt`, `links.txt`, or update code:
1. Double-click **`update_wallpaper.bat`** (or run `python update_wallpaper.py` in terminal).
2. The script will:
   - Verify timetable hashes.
   - Sync text configs into offline `.js` cache files.
   - Start the background server bridge if needed.
   - Clear WebView2 cache and restart Lively Wallpaper cleanly.

---

## 🛠️ Built With

- **HTML5 & Vanilla CSS**: Custom glassmorphism, responsive grid system, and CSS custom properties.
- **JavaScript (ES6+)**: Zero external framework dependencies; pure performant DOM manipulation.
- **[Tailwind CSS (Offline)](tailwind.min.js)**: Embedded local engine for rapid utility styling.
- **[Lucide Icons (Offline)](lucide.min.js)**: Local vector icon set.
- **Python**: Automation pipeline for synchronization and Lively process management.
