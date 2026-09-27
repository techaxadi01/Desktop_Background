/**
 * Live Interactive Wallpaper Engine
 * Designed for Lively Wallpaper / Wallpaper Engine / Web Browsers
 */

// --- Default Timetable Data (From TT.jpeg: 2 MCA B, Room 813) ---
const TIMETABLE_DATA = {
  Monday: [
    { start: "07:30", end: "09:00", subject: "DSA", teacher: "DB", type: "theory" },
    { start: "09:00", end: "09:45", subject: "BREAK", teacher: "-", type: "break" },
    { start: "09:45", end: "10:45", subject: "PP LAB", teacher: "RK, SU, MAN, NB", type: "lab" },
    { start: "10:45", end: "11:45", subject: "PP LAB", teacher: "RK, SU, MAN, NB", type: "lab" },
    { start: "11:45", end: "12:45", subject: "Statistics", teacher: "Dr. Azharuddin", type: "theory" },
    { start: "12:45", end: "13:45", subject: "OS", teacher: "PA", type: "theory" }
  ],
  Tuesday: [
    { start: "07:30", end: "09:00", subject: "PP", teacher: "RK", type: "theory" },
    { start: "09:00", end: "09:45", subject: "BREAK", teacher: "-", type: "break" },
    { start: "09:45", end: "10:45", subject: "DSA LAB", teacher: "DB, VA, PA, ANU, VAR", type: "lab" },
    { start: "10:45", end: "11:45", subject: "DSA LAB", teacher: "DB, VA, PA, ANU, VAR", type: "lab" },
    { start: "11:45", end: "12:45", subject: "RM", teacher: "JC", type: "theory" }
  ],
  Wednesday: [
    { start: "07:30", end: "09:00", subject: "RM", teacher: "JC", type: "theory" },
    { start: "09:00", end: "09:45", subject: "BREAK", teacher: "-", type: "break" },
    { start: "09:45", end: "10:45", subject: "PP LAB", teacher: "RK, SU, SHA, NB", type: "lab" },
    { start: "10:45", end: "11:45", subject: "PP LAB", teacher: "RK, SU, SHA, NB", type: "lab" },
    { start: "11:45", end: "12:45", subject: "SE", teacher: "NS", type: "theory" }
  ],
  Thursday: [
    { start: "07:30", end: "09:00", subject: "DSA", teacher: "DB", type: "theory" },
    { start: "09:00", end: "09:45", subject: "BREAK", teacher: "-", type: "break" },
    { start: "09:45", end: "10:45", subject: "OS", teacher: "PA", type: "theory" },
    { start: "10:45", end: "11:45", subject: "OS", teacher: "PA", type: "theory" },
    { start: "11:45", end: "12:45", subject: "Statistics", teacher: "Dr. Azharuddin", type: "theory" }
  ],
  Friday: [
    { start: "07:30", end: "09:00", subject: "SE", teacher: "NS", type: "theory" },
    { start: "09:00", end: "09:45", subject: "BREAK", teacher: "-", type: "break" },
    { start: "09:45", end: "10:45", subject: "PP", teacher: "RK", type: "theory" },
    { start: "10:45", end: "11:45", subject: "CPCG", teacher: "-", type: "theory" },
    { start: "11:45", end: "12:45", subject: "CPCG", teacher: "-", type: "theory" }
  ],
  Saturday: [
    { start: "08:00", end: "09:00", subject: "Statistics", teacher: "Dr. Azharuddin", type: "theory" },
    { start: "09:00", end: "10:00", subject: "OS", teacher: "PA", type: "theory" },
    { start: "10:00", end: "11:00", subject: "DSA LAB", teacher: "DB, RK, NAV, BHO", type: "lab" },
    { start: "11:00", end: "12:00", subject: "DSA LAB", teacher: "DB, RK, NAV, BHO", type: "lab" }
  ],
  Sunday: []
};



// --- Safe Icon Creator (Lively Wallpaper Offline Reliable) ---
function safeCreateIcons() {
  const lucideObj = (typeof lucide !== "undefined" && lucide) || (typeof window !== "undefined" && window.lucide);
  if (lucideObj && typeof lucideObj.createIcons === "function") {
    try {
      lucideObj.createIcons();
    } catch (e) {
      console.warn("Lucide warning:", e);
    }
  }
}

// App State
let state = {
  tasks: [],
  schedule: {},
  streak: {
    count: 0,
    lastCheckin: null,
    history: [],
    dailyHistory: {}, // current month: stored in localStorage 'bg_streak_current_month'
    previousMonthsHistory: {}, // previous months: loaded on demand from streak_history.txt
    previousMonthsLoaded: false,
    isExpanded: false, // default false: compact single current month view; expands to 200% on click
    viewYear: new Date().getFullYear(),
    viewMonth: new Date().getMonth()
  },
  settings: {
    timeFormat: "24", // '12' or '24'
    bgMode: "night",  // 'night' at 50% intensity
    userName: "Pilot"
  },
  activeTab: "due-soon",
  timetable: null,
  myDay: {
    minimized: false,
    tasks: [],
    checks: {},
    date: new Date().toISOString().split("T")[0]
  }
};

// --- Storage Manager (LocalStorage Exclusive + Automatic Backup Restore) ---
const Storage = {
  async load() {
    try {
      // 1. One-time clean wipe for fresh personal start (v4: resets timetable cache & custom image)
      const CLEAN_KEY = "bg_user_fresh_start_v4";
      if (localStorage.getItem(CLEAN_KEY) !== "true") {
        localStorage.removeItem("bg_tasks");
        localStorage.removeItem("bg_my_day_checks");
        localStorage.removeItem("bg_streak_current_month");
        localStorage.removeItem("bg_streak");
        localStorage.removeItem("bg_settings");
        localStorage.removeItem("bg_timetable");
        localStorage.removeItem("bg_tt_image");
        localStorage.setItem(CLEAN_KEY, "true");
      }

      // Auto-restore backup when moving folders or starting in a new browser origin
      if (!localStorage.getItem("bg_settings") && typeof window !== "undefined" && window.BACKUP_DATA) {
        try {
          const b = window.BACKUP_DATA;
          if (b.settings) localStorage.setItem("bg_settings", JSON.stringify(b.settings));
          if (b.tasks && Array.isArray(b.tasks)) localStorage.setItem("bg_tasks", JSON.stringify(b.tasks));
          if (b.schedule) localStorage.setItem("bg_schedule", JSON.stringify(b.schedule));
          if (b.streak) localStorage.setItem("bg_streak", JSON.stringify(b.streak));
          if (b.timetable) localStorage.setItem("bg_timetable", JSON.stringify(b.timetable));
        } catch (e) { }
      }

      // 2. Load Tasks (starts clean and empty for direct personal use)
      const savedTasks = localStorage.getItem("bg_tasks");
      if (savedTasks) {
        try {
          state.tasks = JSON.parse(savedTasks);
        } catch (e) {
          state.tasks = [];
        }
      } else {
        state.tasks = [];
      }
      cleanupOldCompletedTasks();

      const savedTab = localStorage.getItem("bg_todo_tab");
      if (savedTab) {
        state.activeTab = savedTab;
        if (state.activeTab === "pending") state.activeTab = "due-soon";
        if (state.activeTab === "completed") state.activeTab = "done";
      } else {
        state.activeTab = "due-soon";
      }

      const savedSchedule = localStorage.getItem("bg_schedule");
      if (savedSchedule) {
        state.schedule = JSON.parse(savedSchedule);
      } else {
        state.schedule = {
          "08": "DSA Lab / Lectures",
          "11": "Statistics & Revision",
          "14": "Coding & Problem Solving",
          "17": "Evening Workout / Rest",
          "20": "Project Development & Review"
        };
      }

      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const todayDate = now.getDate();
      const todayStr = `${currentMonthKey}-${String(todayDate).padStart(2, "0")}`;

      const savedStreak = localStorage.getItem("bg_streak");
      if (savedStreak) {
        state.streak = { ...state.streak, ...JSON.parse(savedStreak) };
      }

      // Load CURRENT MONTH streak from localStorage exclusively (starts clean)
      const savedCurrentMonth = localStorage.getItem("bg_streak_current_month");
      if (savedCurrentMonth) {
        try {
          const parsed = JSON.parse(savedCurrentMonth);
          if (parsed && parsed.month === currentMonthKey && parsed.daily) {
            state.streak.dailyHistory = parsed.daily;
          }
        } catch (e) { }
      }
      if (!state.streak.dailyHistory) {
        state.streak.dailyHistory = {};
      }

      state.streak.previousMonthsLoaded = false;
      state.streak.previousMonthsHistory = {};
      state.streak.viewYear = now.getFullYear();
      state.streak.viewMonth = now.getMonth();

      const savedSettings = localStorage.getItem("bg_settings");
      if (savedSettings) state.settings = { ...state.settings, ...JSON.parse(savedSettings) };

      // Prioritize disk timetable (window.TIMETABLE_CACHE from timetable.js)
      if (typeof window !== "undefined" && window.TIMETABLE_CACHE && (window.TIMETABLE_CACHE.Monday || window.TIMETABLE_CACHE.Tuesday || window.TIMETABLE_CACHE.Wednesday)) {
        state.timetable = JSON.parse(JSON.stringify(window.TIMETABLE_CACHE));
        localStorage.setItem("bg_timetable", JSON.stringify(state.timetable));
      } else {
        const savedTT = localStorage.getItem("bg_timetable");
        if (savedTT) {
          try {
            state.timetable = JSON.parse(savedTT);
          } catch (e) {
            state.timetable = JSON.parse(JSON.stringify(TIMETABLE_DATA));
          }
        } else {
          state.timetable = JSON.parse(JSON.stringify(TIMETABLE_DATA));
        }
      }

      // Load disk TT.jpeg image with cache buster
      const diskImgSrc = `TT.jpeg?t=${Date.now()}`;
      const modalImg = document.getElementById("tt-image-element");
      if (modalImg) modalImg.src = diskImgSrc;

      // Load MY DAY daily checklist state (Always expanded by default)
      const savedMyDayDate = localStorage.getItem("bg_my_day_date");
      state.myDay.minimized = false;
      localStorage.setItem("bg_my_day_minimized", "false");

      if (savedMyDayDate === todayStr) {
        try {
          state.myDay.checks = JSON.parse(localStorage.getItem("bg_my_day_checks") || "{}");
        } catch (e) {
          state.myDay.checks = {};
        }
      } else {
        // Daily reset: new day starts fresh so tasks repeat every day!
        if (savedMyDayDate && state.streak.dailyHistory && state.streak.dailyHistory[savedMyDayDate] === undefined) {
          let prevChecks = {};
          try { prevChecks = JSON.parse(localStorage.getItem("bg_my_day_checks") || "{}"); } catch (e) { }
          const done = Object.values(prevChecks).filter(Boolean).length;
          state.streak.dailyHistory[savedMyDayDate] = done >= 6 ? 100 : Math.round((done / 6) * 100);
        }
        state.myDay.checks = {};
        localStorage.setItem("bg_my_day_date", todayStr);
        localStorage.setItem("bg_my_day_checks", "{}");
      }
      state.myDay.date = todayStr;

      // Ensure snapshot backup exists
      Storage.saveUnifiedBackup();
    } catch (e) {
      console.error("Failed to load state:", e);
    }
  },


  save() {
    try {
      // 1. Instant LocalStorage save (zero RAM overhead, 0ms lag)
      localStorage.setItem("bg_tasks", JSON.stringify(state.tasks));
      localStorage.setItem("bg_schedule", JSON.stringify(state.schedule));
      localStorage.setItem("bg_streak", JSON.stringify(state.streak));
      localStorage.setItem("bg_settings", JSON.stringify(state.settings));
      localStorage.setItem("bg_my_day_checks", JSON.stringify(state.myDay.checks));
      localStorage.setItem("bg_my_day_date", state.myDay.date);
      localStorage.setItem("bg_my_day_minimized", JSON.stringify(state.myDay.minimized));
      localStorage.setItem("bg_todo_tab", state.activeTab || "due-soon");
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      localStorage.setItem("bg_streak_current_month", JSON.stringify({
        month: currentMonthKey,
        daily: state.streak.dailyHistory || {}
      }));
      if (state.timetable) {
        localStorage.setItem("bg_timetable", JSON.stringify(state.timetable));
      }

      // 2. Automatically backup state snapshot
      Storage.saveUnifiedBackup();

      // 3. Optional background server disk write (if running server.js locally)
      Storage.tryPushDiskBackup();
    } catch (e) {
      console.error("Failed to save local state:", e);
    }
  },

  saveUnifiedBackup() {
    try {
      const backupPayload = {
        updatedAt: new Date().toISOString(),
        tasks: state.tasks,
        schedule: state.schedule,
        streak: state.streak,
        settings: state.settings,
        timetable: state.timetable
      };
      localStorage.setItem("bg_unified_backup", JSON.stringify(backupPayload));
    } catch (e) { }
  },

  async tryPushDiskBackup() {
    try {
      const payload = {
        tasks: state.tasks,
        schedule: state.schedule,
        streak: state.streak,
        settings: state.settings,
        timetable: state.timetable,
        updatedAt: new Date().toISOString()
      };
      await fetch("http://localhost:5000/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      // Silently ignore if server is not running; LocalStorage has full safe data
    }
  },

};

// Expose clean reset function for manual console use
if (typeof window !== "undefined") {
  window.resetStorage = function () {
    localStorage.clear();
    location.reload();
  };
}


// --- Date & Time Engine (Without Seconds) ---
function updateClock() {
  const now = new Date();
  const timeElem = document.getElementById("clock-time");
  const ampmElem = document.getElementById("clock-ampm");
  const dateElem = document.getElementById("clock-date");

  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  let ampm = "";

  if (state.settings.timeFormat === "12") {
    ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
  }
  const hoursStr = String(hours).padStart(2, "0");

  if (timeElem) timeElem.textContent = `${hoursStr}:${minutes}`;
  if (ampmElem) {
    ampmElem.textContent = ampm;
    ampmElem.style.display = state.settings.timeFormat === "12" ? "inline-block" : "none";
  }

  // Format date: DDD, DD MMM YYYY (e.g. "Wed, 23 Sep 2026")
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const ddd = days[now.getDay()];
  const dd = String(now.getDate()).padStart(2, "0");
  const mmm = months[now.getMonth()];
  const yyyy = now.getFullYear();

  if (dateElem) dateElem.textContent = `${ddd}, ${dd} ${mmm} ${yyyy}`;

  // Update live class status once when the minute changes
  const currentMinuteKey = `${now.getDate()}-${now.getHours()}:${now.getMinutes()}`;
  if (state._lastTimetableMinute && state._lastTimetableMinute !== currentMinuteKey) {
    state._lastTimetableMinute = currentMinuteKey;
    renderTodayTimetable();
    checkMyDayNewDay();
  } else if (!state._lastTimetableMinute) {
    state._lastTimetableMinute = currentMinuteKey;
  }
}

// --- Interactive Full Month Calendar Module ---
let calendarState = {
  year: new Date().getFullYear(),
  month: new Date().getMonth() // 0 to 11
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function renderCalendar() {
  const monthElem = document.getElementById("cal-month-name");
  const yearElem = document.getElementById("cal-year-val");
  const gridElem = document.getElementById("cal-days-grid");
  const todayLabel = document.getElementById("cal-today-label");
  if (!gridElem) return;

  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDate = now.getDate();

  if (monthElem) monthElem.textContent = MONTH_NAMES[calendarState.month];
  if (yearElem) yearElem.textContent = calendarState.year;
  if (todayLabel) todayLabel.textContent = now.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  gridElem.innerHTML = "";

  // Set of dates with active scheduled To-Do tasks (YYYY-MM-DD)
  const scheduledTaskDates = new Set();
  (state.tasks || []).forEach(t => {
    if (!t.done && t.date) {
      scheduledTaskDates.add(t.date);
    }
  });

  // First day of current displayed month (0 = Sunday, 1 = Monday ... 6 = Saturday)
  const firstDay = new Date(calendarState.year, calendarState.month, 1).getDay();
  const startOffset = (firstDay + 6) % 7; // Convert to Monday = 0

  // Total days in current month
  const totalDays = new Date(calendarState.year, calendarState.month + 1, 0).getDate();

  // Total days in previous month
  const prevMonthDays = new Date(calendarState.year, calendarState.month, 0).getDate();

  // 1. Previous month filler cells
  const prevMonth = calendarState.month === 0 ? 11 : calendarState.month - 1;
  const prevYear = calendarState.month === 0 ? calendarState.year - 1 : calendarState.year;
  for (let i = startOffset - 1; i >= 0; i--) {
    const dVal = prevMonthDays - i;
    const dateKey = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(dVal).padStart(2, "0")}`;
    const hasScheduledTask = scheduledTaskDates.has(dateKey);
    const cell = document.createElement("div");
    cell.className = `cal-day-cell text-gray-600 other-month ${hasScheduledTask ? "has-task" : ""}`;
    cell.textContent = dVal;
    gridElem.appendChild(cell);
  }

  // 2. Current month active date cells (circled if task is scheduled)
  for (let d = 1; d <= totalDays; d++) {
    const cell = document.createElement("div");
    const isToday = (calendarState.year === todayYear && calendarState.month === todayMonth && d === todayDate);
    const dateKey = `${calendarState.year}-${String(calendarState.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const hasScheduledTask = scheduledTaskDates.has(dateKey);

    let cellClasses = "cal-day-cell cursor-pointer";
    if (isToday) cellClasses += " today-cell";
    else cellClasses += " text-gray-300";
    if (hasScheduledTask) cellClasses += " has-task";

    cell.className = cellClasses;
    cell.textContent = d;
    gridElem.appendChild(cell);
  }

  // 3. Next month filler cells to make full rows of 7
  const nextMonth = calendarState.month === 11 ? 0 : calendarState.month + 1;
  const nextYear = calendarState.month === 11 ? calendarState.year + 1 : calendarState.year;
  const totalRendered = startOffset + totalDays;
  const remaining = (7 - (totalRendered % 7)) % 7;
  for (let n = 1; n <= remaining; n++) {
    const dateKey = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(n).padStart(2, "0")}`;
    const hasScheduledTask = scheduledTaskDates.has(dateKey);
    const cell = document.createElement("div");
    cell.className = `cal-day-cell text-gray-600 other-month ${hasScheduledTask ? "has-task" : ""}`;
    cell.textContent = n;
    gridElem.appendChild(cell);
  }
}

function setupCalendarListeners() {
  const clockCard = document.getElementById("clock-main-card");
  const calDropdown = document.getElementById("calendar-dropdown");

  if (clockCard && calDropdown) {
    let lastClockToggle = 0;
    // 1. Click clock: toggle calendar open/close
    clockCard.addEventListener("click", (e) => {
      const now = Date.now();
      if (now - lastClockToggle < 250) return;
      lastClockToggle = now;
      e.stopPropagation();
      calDropdown.classList.toggle("active");
    });

    // 2. Click inside calendar: keep open, do not bubble to document
    calDropdown.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    // 3. Click anywhere outside: close calendar
    document.addEventListener("click", (e) => {
      if (!calDropdown.contains(e.target) && !clockCard.contains(e.target)) {
        calDropdown.classList.remove("active");
      }
    });
  }

  document.getElementById("cal-prev-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    calendarState.month--;
    if (calendarState.month < 0) {
      calendarState.month = 11;
      calendarState.year--;
    }
    renderCalendar();
  });

  document.getElementById("cal-next-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    calendarState.month++;
    if (calendarState.month > 11) {
      calendarState.month = 0;
      calendarState.year++;
    }
    renderCalendar();
  });

  document.getElementById("cal-today-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    calendarState.month = new Date().getMonth();
    calendarState.year = new Date().getFullYear();
    renderCalendar();
  });
}

// --- Dynamic Timetable Layout Engine (Dynamic Adapting Height, Zero Scrollbars) ---
function setupDynamicTimetable() {
  const streakContainer = document.getElementById("streak-container");
  const ttContainer = document.getElementById("timetable-container");
  const schedulerContainer = document.getElementById("scheduler-container");
  const todoContainer = document.getElementById("todo-container");
  const consoleContainer = document.getElementById("console-container");

  function syncLayout() {
    if (!ttContainer) return;

    // Day-wise timetable card layout (compact width matching TODO widget 286px, dynamic height)
    const ttWidth = 286;
    ttContainer.style.width = `${ttWidth}px`;
    ttContainer.style.height = "auto";

    // Anchor Streak container directly to the left with clean 12px gap
    const isStreakExpanded = !!(state.streak && state.streak.isExpanded);
    const streakWidth = isStreakExpanded ? 220 : 104;
    if (streakContainer) {
      streakContainer.style.right = `calc(1% + ${ttWidth + 12}px)`;
      streakContainer.style.left = "auto";
      streakContainer.style.top = "12px";
      streakContainer.style.width = `${streakWidth}px`;
    }

    // Read natural rendered height of the timetable card
    const ttCard = document.getElementById("timetable-card");
    const ttHeight = ttCard ? ttCard.offsetHeight : (ttContainer.offsetHeight || 195);

    // Right Column Layout: Timetable -> TODO -> Console (sitting dynamically just below TODO)
    const todoWidth = 286;
    const consoleHeight = 52;
    const consoleGap = 10;
    const iconRowsBottomClearance = 320; // Clearance for at least 4 rows of desktop shortcut icons (reduced max height by one icon space)
    const isHiddenMode = document.body.classList.contains("focus-mode");

    // Dynamic top for middle widgets (Scheduler & TODO), positioned 14px under Timetable
    const newTop = 12 + ttHeight + 14;

    // Available bottom boundary leaving room for console and 4 rows of desktop shortcut icons
    const bottomLimit = window.innerHeight - iconRowsBottomClearance;
    const maxTodoHeight = Math.max(100, bottomLimit - consoleHeight - consoleGap - newTop);

    let actualTodoHeight = 160;

    if (todoContainer) {
      const topStr = `${newTop}px`;
      if (todoContainer.style.top !== topStr) todoContainer.style.top = topStr;
      if (todoContainer.style.right !== "1%") todoContainer.style.right = "1%";
      if (todoContainer.style.left !== "auto") todoContainer.style.left = "auto";
      const widthStr = `${todoWidth}px`;
      if (todoContainer.style.width !== widthStr) todoContainer.style.width = widthStr;

      const taskList = document.getElementById("task-list");
      const tabsStrip = document.querySelector("#todo-container .task-tab-btn")?.closest("div");
      const addForm = document.getElementById("add-task-form");

      // Accurately measure tabs header height + margin (approx 34px)
      const tabsHeight = tabsStrip ? (Math.ceil(tabsStrip.getBoundingClientRect().height) || 26) + 8 : 34;

      // Accurately measure add-task-form height + margin (approx 75px)
      const formHeight = addForm ? (Math.ceil(addForm.getBoundingClientRect().height) || 69) + 6 : 75;

      // Container padding + borders (p-2: 8px top + 8px bottom + 2px borders = 18px)
      const cardDecorations = 18;

      // Calculate total height of all tasks/items shown in task list
      let naturalTaskListHeight = 0;
      if (taskList && taskList.children.length > 0) {
        const visibleChildren = Array.from(taskList.children).filter(el => !el.classList.contains("hidden"));
        visibleChildren.forEach((child, idx) => {
          const rect = child.getBoundingClientRect();
          const h = Math.ceil(rect.height) || child.offsetHeight || 30;
          naturalTaskListHeight += h + (idx > 0 ? 4 : 0); // 4px spacing between items (space-y-1)
        });
        if (visibleChildren.length > 0) {
          naturalTaskListHeight += 4; // 4px for task-list pb-1
        }
      }

      // Dynamic height: contains only the content shown (+ 2px subpixel safety)
      const todoContentHeight = Math.ceil(tabsHeight + formHeight + cardDecorations + naturalTaskListHeight + 2);

      // Fits exactly what's shown, up to the max height leaving space for 4 desktop icons
      const fitsWithoutScroll = (todoContentHeight <= maxTodoHeight);
      actualTodoHeight = fitsWithoutScroll ? todoContentHeight : maxTodoHeight;

      const heightStr = `${Math.round(actualTodoHeight)}px`;
      if (todoContainer.style.height !== heightStr) todoContainer.style.height = heightStr;
      if (taskList) {
        const targetOverflow = fitsWithoutScroll ? "hidden" : "auto";
        if (taskList.style.overflowY !== targetOverflow) taskList.style.overflowY = targetOverflow;
      }
    }

    // Position Console dynamically just below TODO
    if (consoleContainer) {
      if (consoleContainer.style.right !== "1%") consoleContainer.style.right = "1%";
      if (consoleContainer.style.left !== "auto") consoleContainer.style.left = "auto";
      const cWidthStr = `${todoWidth}px`;
      if (consoleContainer.style.width !== cWidthStr) consoleContainer.style.width = cWidthStr;
      const cHeightStr = `${consoleHeight}px`;
      if (consoleContainer.style.height !== cHeightStr) consoleContainer.style.height = cHeightStr;

      if (isHiddenMode) {
        // When stuff are hidden in focus mode, move console directly below timetable
        const cTopStr = `${newTop}px`;
        if (consoleContainer.style.top !== cTopStr) consoleContainer.style.top = cTopStr;
      } else {
        // Normal mode: console is dynamic, sitting just below TODO!
        const consoleTop = newTop + actualTodoHeight + consoleGap;
        const cTopStr = `${Math.round(consoleTop)}px`;
        if (consoleContainer.style.top !== cTopStr) consoleContainer.style.top = cTopStr;
      }
      if (consoleContainer.style.bottom !== "auto") consoleContainer.style.bottom = "auto";
    }

    if (schedulerContainer) {
      const sCard = document.getElementById("streak-card");
      const streakHeight = sCard ? sCard.offsetHeight : (isStreakExpanded ? 220 : 92);
      const isMinimized = Boolean(state.myDay && state.myDay.minimized);
      const defaultStreakWidth = 104;
      const expandedWidth = 260; // Keep the width as much it was before when maximized
      const myDayTop = 12 + streakHeight + 8;
      const reservedRowsLimit = window.innerHeight - iconRowsBottomClearance;
      const maxAllowedHeight = Math.max(38, reservedRowsLimit - myDayTop);
      const minHeight = 38;

      schedulerContainer.style.top = `${myDayTop}px`;
      schedulerContainer.style.right = `calc(1% + ${ttWidth + 12}px)`;
      schedulerContainer.style.left = "auto";
      schedulerContainer.style.width = isMinimized ? `${defaultStreakWidth}px` : `${expandedWidth}px`;

      const card = document.getElementById("my-day-card");
      const chevron = document.getElementById("my-day-chevron");
      const list = document.getElementById("my-day-tasks-list");
      let myDayItemsHeight = 0;
      if (list && list.children.length > 0) {
        const visibleChildren = Array.from(list.children).filter(el => !el.classList.contains("hidden"));
        visibleChildren.forEach((child, idx) => {
          const itemH = child.offsetHeight || 36;
          myDayItemsHeight += itemH;
          if (idx > 0) myDayItemsHeight += 6;
        });
      }
      // Natural content height: header (36px) + bottom padding & border (12px) + items
      const contentHeight = Math.max(38, 48 + myDayItemsHeight);

      if (isMinimized) {
        if (card) card.classList.add("is-minimized");
        if (chevron) chevron.style.transform = "rotate(0deg)";
        schedulerContainer.style.height = `${minHeight}px`;
        if (list) list.style.overflowY = "hidden";
      } else {
        if (card) card.classList.remove("is-minimized");
        if (chevron) chevron.style.transform = "rotate(180deg)";
        const fitsWithoutScroll = (contentHeight <= maxAllowedHeight);
        const targetHeight = fitsWithoutScroll ? contentHeight : maxAllowedHeight;
        schedulerContainer.style.height = `${targetHeight}px`;
        if (list) {
          list.style.overflowY = fitsWithoutScroll ? "hidden" : "auto";
        }
      }
    }
  }

  window.syncTimetableLayout = syncLayout;
  syncLayout();
  window.addEventListener("resize", syncLayout);
}

// --- Dynamic Time-Based Background System ---
function applyTimeBackground() {
  const bgContainer = document.getElementById("bg-container");
  const bgOverlay = document.getElementById("bg-overlay");
  if (!bgContainer || !bgOverlay) return;

  const hours = new Date().getHours();
  let mode = state.settings.bgMode;

  if (mode === "auto") {
    if (hours >= 5 && hours < 8) mode = "dawn";
    else if (hours >= 8 && hours < 17) mode = "day";
    else if (hours >= 17 && hours < 20) mode = "sunset";
    else mode = "night";
  }

  bgContainer.style.backgroundImage = `url('BG.jpg')`;

  switch (mode) {
    case "dawn":
      bgOverlay.style.background = "radial-gradient(ellipse at top, rgba(251, 146, 60, 0.25), rgba(16, 185, 129, 0.15) 50%, rgba(10, 15, 20, 0.75) 100%)";
      break;
    case "day":
      bgOverlay.style.background = "radial-gradient(ellipse at top, rgba(56, 189, 248, 0.18), rgba(16, 185, 129, 0.1) 60%, rgba(10, 15, 20, 0.65) 100%)";
      break;
    case "sunset":
      bgOverlay.style.background = "radial-gradient(ellipse at top right, rgba(244, 63, 94, 0.3), rgba(217, 119, 6, 0.2) 40%, rgba(10, 15, 20, 0.8) 100%)";
      break;
    case "night":
    default:
      bgOverlay.style.background = "radial-gradient(ellipse at center, rgba(16, 185, 129, 0.12), rgba(0, 0, 0, 0.6) 70%, rgba(5, 8, 12, 0.9) 100%)";
      break;
  }
}

// --- Target Day Calculation (Switches to Next Day After 13:00 hrs) ---
function getDayTimetableTarget() {
  const now = new Date();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDayIndex = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const isAfter1300 = currentMinutes >= 13 * 60; // 13:00 hrs (1:00 PM)

  let targetDayIndex;
  let statusBadgeText = "TODAY";

  if (isAfter1300) {
    // After 1300 hrs, display next day's timetable
    targetDayIndex = (currentDayIndex + 1) % 7;
    statusBadgeText = "TOMORROW";

    // If next day is Sunday (no scheduled classes), advance to Monday
    if (targetDayIndex === 0) {
      targetDayIndex = 1; // Monday
      statusBadgeText = "NEXT MON";
    }
  } else {
    // Before 1300 hrs, display today's timetable
    targetDayIndex = currentDayIndex;
    statusBadgeText = "TODAY";

    // If today is Sunday (no scheduled classes), show upcoming Monday
    if (targetDayIndex === 0) {
      targetDayIndex = 1; // Monday
      statusBadgeText = "UPCOMING";
    }
  }

  const targetDayName = days[targetDayIndex];
  const isTargetActualToday = !isAfter1300 && targetDayIndex === currentDayIndex;

  return {
    dayName: targetDayName,
    badgeText: statusBadgeText,
    isTargetActualToday: isTargetActualToday,
    isAfter1300: isAfter1300
  };
}

// --- Timetable Logic (Single Day, After 13:00 Next Day, 2 Columns: Time & Subject) ---
function renderTodayTimetable() {
  const { dayName, badgeText, isTargetActualToday } = getDayTimetableTarget();

  // 1. Day on Top
  const dayTitleElem = document.getElementById("tt-active-day-title");
  if (dayTitleElem) {
    dayTitleElem.textContent = dayName;
  }

  const badgeElem = document.getElementById("tt-day-status-badge");
  if (badgeElem) {
    badgeElem.textContent = badgeText;
  }

  // 2. Timetable List (Two Columns: Column 1 = Time, Column 2 = Subject)
  const container = document.getElementById("tt-slots-list");
  if (!container) return;
  container.innerHTML = "";

  const ttData = state.timetable || TIMETABLE_DATA;
  const rawSchedule = ttData[dayName] || [];
  // Exclude BREAK: only actual subjects displayed
  const scheduleForDay = rawSchedule.filter(item => {
    const sub = (item.subject || "").trim().toUpperCase();
    return sub !== "BREAK" && item.type !== "break";
  });

  if (scheduleForDay.length === 0) {
    container.innerHTML = `
      <div class="py-6 text-center rounded-xl border border-emerald-500/20 bg-emerald-950/20 text-emerald-300 text-xs flex flex-col items-center justify-center">
        <i data-lucide="coffee" class="w-5 h-5 mb-1 opacity-70"></i>
        <span>No scheduled classes for ${dayName}.</span>
      </div>
    `;
    safeCreateIcons();
    if (typeof window.syncTimetableLayout === "function") {
      requestAnimationFrame(window.syncTimetableLayout);
    }
    return;
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  scheduleForDay.forEach(item => {
    const [startH, startM] = (item.start || "00:00").split(":").map(Number);
    const [endH, endM] = (item.end || "00:00").split(":").map(Number);
    const itemStartMin = startH * 60 + startM;
    const itemEndMin = endH * 60 + endM;

    const isOngoing = isTargetActualToday && currentMinutes >= itemStartMin && currentMinutes < itemEndMin;
    const isPast = isTargetActualToday && currentMinutes >= itemEndMin;

    const row = document.createElement("div");
    if (isOngoing) {
      row.className = "tt-slot-row is-live neon-border flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs bg-emerald-500/15 border-emerald-400/80 text-emerald-200";
    } else if (isPast) {
      row.className = "tt-slot-row flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs bg-black/30 border-white/5 text-gray-500 line-through opacity-60";
    } else {
      row.className = "tt-slot-row flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs bg-black/40 border-white/10 hover:border-emerald-500/30 text-gray-200";
    }

    row.innerHTML = `
      <!-- Column 1: Time -->
      <div class="font-mono text-[11px] font-bold ${isOngoing ? "text-emerald-400" : "text-emerald-400/90"}">
        <span>${item.start} - ${item.end}</span>
      </div>

      <!-- Column 2: Subject -->
      <div class="font-bold text-xs truncate pl-2 text-right ${isOngoing ? "text-emerald-100 font-semibold" : "text-white"} flex items-center justify-end gap-1.5">
        <span class="truncate">${escapeHtml(item.subject)}</span>
        ${isOngoing ? '<span class="text-[9px] bg-emerald-400/20 text-emerald-300 px-1 py-0.5 rounded font-mono font-semibold flex-shrink-0">NOW</span>' : ''}
      </div>
    `;

    container.appendChild(row);
  });

  if (typeof window.syncTimetableLayout === "function") {
    requestAnimationFrame(window.syncTimetableLayout);
  }
}


// --- Configurable Console Quick Links Loader ---
async function renderConsoleLinks() {
  const container = document.getElementById("console-links-group");
  if (!container) return;

  let links = [];

  // 1. Try links.json (if hosted on local web server or Lively)
  try {
    const res = await fetch(`links.json?t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        links = data;
      }
    }
  } catch (err) { }

  // 2. Try links.txt (if user edited plain text file)
  if (!links || links.length === 0) {
    try {
      const res = await fetch(`links.txt?t=${Date.now()}`);
      if (res.ok) {
        const text = await res.text();
        const lines = text.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#"));
        const parsed = [];
        for (const line of lines) {
          const parts = line.split("|").map(p => p.trim());
          if (parts.length >= 2) {
            parsed.push({
              name: parts[0],
              url: parts[1],
              icon: parts[2] || "link"
            });
          }
        }
        if (parsed.length > 0) links = parsed;
      }
    } catch (err) { }
  }

  // 3. Fallback to links.js (window.CONSOLE_LINKS - works on file:// protocol without any server)
  if (!links || links.length === 0) {
    if (window.CONSOLE_LINKS && Array.isArray(window.CONSOLE_LINKS) && window.CONSOLE_LINKS.length > 0) {
      links = window.CONSOLE_LINKS;
    }
  }

  // 4. Default fallback
  if (!links || links.length === 0) {
    links = [
      { name: "Google Classroom", url: "https://classroom.google.com/u/1/", icon: "graduation-cap" },
      { name: "Christ University Portal (CUE)", url: "https://cue.christuniversity.in/", icon: "landmark" }
    ];
  }

  const linksCacheKey = JSON.stringify(links);
  if (container._renderedCacheKey === linksCacheKey && container.children.length > 0) {
    return;
  }
  container._renderedCacheKey = linksCacheKey;
  container.innerHTML = "";

  links.forEach(link => {
    const a = document.createElement("a");
    const rawUrl = (link.url || "").trim();
    a.href = rawUrl || "#";
    if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }

    a.className = "w-9 h-9 rounded-xl flex items-center justify-center text-gray-300 hover:text-emerald-300 hover:bg-emerald-500/20 border border-white/5 hover:border-emerald-500/40 transition-all cursor-pointer group shadow-md flex-shrink-0";

    const iconName = link.icon || "link";
    a.innerHTML = `<i data-lucide="${iconName}" class="w-4 h-4 transition-transform group-hover:scale-110"></i>`;

    container.appendChild(a);
  });

  safeCreateIcons();
}



// --- To-Do Auto-Cleanup Engine (Purges tasks marked done > 24 hours ago) ---
function cleanupOldCompletedTasks() {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  let changed = false;

  state.tasks = (state.tasks || []).filter(task => {
    if (task.done) {
      if (!task.completedAt) {
        task.completedAt = now;
        changed = true;
        return true;
      }
      if (now - task.completedAt > ONE_DAY_MS) {
        changed = true;
        return false; // Removed after 1 day
      }
    }
    return true;
  });

  if (changed) {
    Storage.save();
  }
}

// Helper: Evaluates whether a date is within 2 weeks (<= 14 days) from today
function isTaskDueWithinTwoWeeks(dateStr) {
  if (!dateStr) return true; // Undated tasks belong in Due Soon
  const parts = dateStr.split("-").map(Number);
  if (parts.length < 3 || isNaN(parts[0])) return true;

  const taskDate = new Date(parts[0], parts[1] - 1, parts[2]);
  taskDate.setHours(0, 0, 0, 0);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.round((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 14;
}

// Helper: Generates a sleek, color-coded badge for task dates
function getTaskDateBadge(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("-").map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return null;

  const taskDate = new Date(parts[0], parts[1] - 1, parts[2]);
  taskDate.setHours(0, 0, 0, 0);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  today.setHours(0, 0, 0, 0);

  const diffMs = taskDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const formattedDate = `${months[parts[1] - 1]} ${parts[2]}`;

  if (diffDays < 0) {
    const overdueLabel = diffDays === -1 ? "Yesterday" : `${Math.abs(diffDays)}d overdue`;
    return {
      text: overdueLabel,
      className: "border-rose-500/50 text-rose-300 bg-rose-950/60 font-semibold",
      icon: "alert-circle"
    };
  } else if (diffDays === 0) {
    return {
      text: "Today",
      className: "border-emerald-400/60 text-emerald-300 bg-emerald-950/70 font-bold",
      icon: "clock"
    };
  } else if (diffDays === 1) {
    return {
      text: "Tomorrow",
      className: "border-amber-500/50 text-amber-300 bg-amber-950/60 font-medium",
      icon: "calendar"
    };
  } else {
    return {
      text: formattedDate,
      className: "border-white/10 text-gray-300 bg-white/5",
      icon: "calendar"
    };
  }
}

// --- To-Do List Engine ---
function renderTasks() {
  const listContainer = document.getElementById("task-list");
  const countBadge = document.getElementById("task-count");
  if (!listContainer) return;

  // 1. Purge tasks completed > 1 day ago
  cleanupOldCompletedTasks();

  // 2. Ensure activeTab validity
  if (!state.activeTab || state.activeTab === "pending") state.activeTab = "due-soon";
  if (state.activeTab === "completed") state.activeTab = "done";

  // 3. Highlight the active tab button
  document.querySelectorAll(".task-tab-btn").forEach(b => {
    const tabName = b.getAttribute("data-tab");
    if (tabName === state.activeTab) {
      b.classList.add("text-emerald-400", "border-emerald-400");
      b.classList.remove("text-gray-400", "border-transparent");
    } else {
      b.classList.remove("text-emerald-400", "border-emerald-400");
      b.classList.add("text-gray-400", "border-transparent");
    }
  });

  listContainer.innerHTML = "";

  // 4. Tab Filtering
  let filtered = [];
  if (state.activeTab === "due-soon") {
    // Default view: Undated tasks + tasks due within 2 weeks (pending only)
    filtered = state.tasks.filter(t => !t.done && (!t.date || isTaskDueWithinTwoWeeks(t.date)));
    // Sort: Overdue & dated first chronologically, then undated
    filtered.sort((a, b) => {
      if (a.date && b.date) return a.date.localeCompare(b.date);
      if (a.date && !b.date) return -1;
      if (!a.date && b.date) return 1;
      return (b.id || 0) - (a.id || 0);
    });
  } else if (state.activeTab === "planned") {
    // Planned view: Tasks with dates beyond 2 weeks (pending only)
    filtered = state.tasks.filter(t => !t.done && t.date && !isTaskDueWithinTwoWeeks(t.date));
    filtered.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  } else if (state.activeTab === "done") {
    // Done view: Exclusively completed tasks
    filtered = state.tasks.filter(t => Boolean(t.done));
    filtered.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  } else if (state.activeTab === "all") {
    // All view: All pending tasks (completed tasks strictly in Done tab)
    filtered = state.tasks.filter(t => !t.done);
    filtered.sort((a, b) => {
      if (a.date && b.date) return a.date.localeCompare(b.date);
      if (a.date && !b.date) return -1;
      if (!a.date && b.date) return 1;
      return (b.id || 0) - (a.id || 0);
    });
  }

  if (countBadge) countBadge.textContent = filtered.length;

  // 5. Empty State
  if (filtered.length === 0) {
    let emptyMsg = "No tasks in this view.";
    if (state.activeTab === "due-soon") emptyMsg = "No upcoming or undated tasks.";
    else if (state.activeTab === "planned") emptyMsg = "No future tasks beyond 2 weeks.";
    else if (state.activeTab === "done") emptyMsg = "No completed tasks yet.";
    else if (state.activeTab === "all") emptyMsg = "No pending tasks found.";

    listContainer.innerHTML = `
      <div class="py-3 text-center text-gray-500 text-xs">
        <i data-lucide="check-circle" class="w-5 h-5 mx-auto mb-1 opacity-40"></i>
        ${emptyMsg}
      </div>
    `;
    safeCreateIcons();
    renderCalendar();
    if (typeof window.syncTimetableLayout === "function") {
      window.syncTimetableLayout();
      requestAnimationFrame(window.syncTimetableLayout);
    }
    return;
  }

  // 6. Category Left-Edge Color Stripe Palette (Saves space, clean indicator)
  const catBorderColors = {
    "College Task": "border-l-[3px] border-l-emerald-400",
    "College Exams": "border-l-[3px] border-l-amber-400",
    "Last Date for Stuff": "border-l-[3px] border-l-rose-500",
    "Competitive Exams": "border-l-[3px] border-l-purple-400",
    // Backwards-compatible mappings for legacy items
    College: "border-l-[3px] border-l-emerald-400",
    Study: "border-l-[3px] border-l-blue-400",
    Urgent: "border-l-[3px] border-l-rose-500",
    Project: "border-l-[3px] border-l-purple-400"
  };

  // 7. Render Task Items (Space-Saving Single-Row Layout with Color-Coded Left Edge)
  filtered.forEach(task => {
    const item = document.createElement("div");
    const catBorder = catBorderColors[task.category] || "border-l-[3px] border-l-emerald-400";
    item.className = `group flex items-center justify-between px-2 py-1 rounded-lg bg-black/30 border border-white/5 ${catBorder} hover:border-emerald-500/30 transition-all text-xs select-none min-h-[28px]`;

    const dateBadge = getTaskDateBadge(task.date);

    item.innerHTML = `
      <div class="flex items-center gap-2 flex-1 min-w-0 pr-1.5">
        <input type="checkbox" ${task.done ? "checked" : ""} class="task-checkbox w-3.5 h-3.5 rounded border-gray-600 bg-black/60 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-emerald-500 flex-shrink-0" data-id="${task.id}">
        <span class="truncate leading-tight ${task.done ? "line-through text-gray-500" : "text-gray-200"}">${escapeHtml(task.text)}</span>
      </div>
      <div class="flex items-center gap-1.5 flex-shrink-0">
        ${dateBadge ? `
          <span class="px-1.5 py-0.5 rounded border flex items-center gap-1 text-[9px] leading-none ${dateBadge.className}">
            <i data-lucide="${dateBadge.icon}" class="w-2.5 h-2.5"></i>
            <span>${dateBadge.text}</span>
          </span>
        ` : ""}
        <button class="delete-task-btn opacity-0 group-hover:opacity-100 hover:text-rose-400 p-0.5 rounded transition-opacity flex-shrink-0 cursor-pointer" data-id="${task.id}">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    `;

    listContainer.appendChild(item);
  });

  // Attach event handlers
  listContainer.querySelectorAll(".task-checkbox").forEach(chk => {
    chk.addEventListener("change", (e) => {
      e.stopPropagation();
      const id = Number(e.target.getAttribute("data-id"));
      const t = state.tasks.find(x => x.id === id);
      if (t) {
        t.done = e.target.checked;
        t.completedAt = t.done ? Date.now() : null;
        Storage.save();
        renderTasks();
        renderMyDay(); // Synchronize with MY DAY
      }
    });
    chk.addEventListener("click", (e) => e.stopPropagation());
    chk.addEventListener("pointerdown", (e) => e.stopPropagation());
  });

  listContainer.querySelectorAll(".delete-task-btn").forEach(btn => {
    const handleDelete = (e) => {
      e.stopPropagation();
      const id = Number(btn.getAttribute("data-id"));
      state.tasks = state.tasks.filter(x => x.id !== id);
      Storage.save();
      renderTasks();
      renderMyDay();
    };
    btn.addEventListener("click", handleDelete);
    btn.addEventListener("pointerdown", handleDelete);
  });

  safeCreateIcons();
  renderCalendar();
  if (typeof window.syncTimetableLayout === "function") {
    window.syncTimetableLayout();
    requestAnimationFrame(window.syncTimetableLayout);
  }
}

function addTask(text, category = "College Task", date = "") {
  if (!text.trim()) return;
  const newTask = {
    id: Date.now(),
    text: text.trim(),
    category: category || "College Task",
    date: date || "",
    done: false,
    createdAt: Date.now(),
    completedAt: null
  };
  state.tasks.unshift(newTask);
  Storage.save();
  renderTasks();
  if (newTask.date) {
    renderMyDay();
  }
}

// --- MY DAY Daily Checklist Engine (Repeats daily, loaded from daily_tasks.txt) ---
async function loadMyDayTasks(forceRender = false) {
  let loaded = false;
  let tasks = [];

  // 1. Try daily_tasks.txt with cache-busting
  try {
    const res = await fetch(`daily_tasks.txt?t=${Date.now()}`);
    if (res.ok) {
      const text = await res.text();
      tasks = text.split("\n")
        .map(l => l.trim())
        .filter(l => l && !l.startsWith("#"));
      loaded = true;
    }
  } catch (e) { }

  // 2. Try window.DAILY_TASKS (for standalone file:// protocol where fetch may fail)
  if (!loaded && typeof window !== "undefined" && Array.isArray(window.DAILY_TASKS)) {
    tasks = window.DAILY_TASKS.filter(Boolean);
    loaded = true;
  }

  // 3. If neither source was readable, fallback to current state
  if (!loaded) {
    tasks = state.myDay.tasks || [];
  }

  // Clean up checked status for any tasks that were removed
  if (state.myDay.checks) {
    const activeTaskSet = new Set(tasks);
    let checksChanged = false;
    for (const t of Object.keys(state.myDay.checks)) {
      if (!activeTaskSet.has(t)) {
        delete state.myDay.checks[t];
        checksChanged = true;
      }
    }
    if (checksChanged) {
      Storage.save();
    }
  }

  // Only re-render if tasks list actually changed or forceRender is requested
  const currentTasksStr = JSON.stringify(state.myDay.tasks || []);
  const newTasksStr = JSON.stringify(tasks);
  if (forceRender || currentTasksStr !== newTasksStr) {
    const taskInput = document.getElementById("new-task-input");
    if (taskInput && document.activeElement === taskInput) {
      // Defer render so active typing is not disturbed
      state.myDay.tasks = tasks;
      return;
    }
    state.myDay.tasks = tasks;
    renderMyDay();
  }
}

function renderMyDay() {
  const card = document.getElementById("my-day-card");
  const body = document.getElementById("my-day-body");
  const chevron = document.getElementById("my-day-chevron");
  const list = document.getElementById("my-day-tasks-list");
  const container = document.getElementById("scheduler-container");
  if (!body || !list) return;

  const isStreakExpanded = !!(state.streak && state.streak.isExpanded);
  const sCard = document.getElementById("streak-card");
  const defaultStreakWidth = 104;
  const streakWidth = sCard ? sCard.offsetWidth : defaultStreakWidth;
  const streakHeight = sCard ? sCard.offsetHeight : (isStreakExpanded ? 220 : 92);
  const expandedWidth = 260; // Keep the width as much it was before when maximized
  const iconRowsBottomClearance = 320; // Reduced max height by one icon space
  const myDayTop = 12 + streakHeight + 8;
  const reservedRowsLimit = window.innerHeight - iconRowsBottomClearance;
  const maxAllowedHeight = Math.max(38, reservedRowsLimit - myDayTop);
  const minHeight = 38;

  // 1. Render Checklist Items First to measure exact content height
  list.innerHTML = "";
  let doneCount = 0;

  // A. Recurring daily tasks from daily_tasks.txt
  state.myDay.tasks.forEach((taskText) => {
    const isDone = Boolean(state.myDay.checks[taskText]);
    if (isDone) doneCount++;

    const item = document.createElement("div");
    item.className = `my-day-item group flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer select-none ${
      isDone
        ? "bg-emerald-950/20 border-emerald-500/20 text-gray-400"
        : "bg-black/40 border-white/5 hover:border-emerald-500/40 text-gray-200"
    }`;

    item.innerHTML = `
      <div class="flex items-center gap-2.5 flex-1 min-w-0">
        <div class="w-4 h-4 rounded-md border flex items-center justify-center transition-colors flex-shrink-0 ${
          isDone
            ? "bg-emerald-500 border-emerald-400 text-black shadow-sm"
            : "border-white/20 group-hover:border-emerald-400/60 bg-black/30"
        }">
          ${isDone ? '<i data-lucide="check" class="w-3 h-3 stroke-[3]"></i>' : ""}
        </div>
        <span class="text-xs truncate transition-all ${
          isDone ? "line-through text-gray-500 opacity-70" : "text-gray-200 group-hover:text-white"
        }">
          ${escapeHtml(taskText)}
        </span>
      </div>
    `;

    item.addEventListener("click", () => {
      toggleMyDayTask(taskText);
    });

    list.appendChild(item);
  });

  // B. To-Do Tasks scheduled for today
  const now = new Date();
  const todayYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const todayScheduledTasks = (state.tasks || []).filter(t => t.date === todayYMD);

  if (todayScheduledTasks.length > 0) {
    const divider = document.createElement("div");
    divider.className = "pt-2 pb-1 border-t border-white/10 flex items-center justify-between text-[9px] text-emerald-400/90 font-mono uppercase tracking-wider select-none";
    divider.innerHTML = `
      <span>Today's Tasks (${todayScheduledTasks.length})</span>
      <span class="text-[8px] text-emerald-400/60">From To-Do</span>
    `;
    list.appendChild(divider);

    todayScheduledTasks.forEach((tTask) => {
      const isDone = Boolean(tTask.done);
      if (isDone) doneCount++;

      const catBorderColors = {
        "College Task": "border-l-[3px] border-l-emerald-400",
        "College Exams": "border-l-[3px] border-l-amber-400",
        "Last Date for Stuff": "border-l-[3px] border-l-rose-500",
        "Competitive Exams": "border-l-[3px] border-l-purple-400",
        College: "border-l-[3px] border-l-emerald-400",
        Study: "border-l-[3px] border-l-blue-400",
        Urgent: "border-l-[3px] border-l-rose-500",
        Project: "border-l-[3px] border-l-purple-400"
      };
      const catBorder = catBorderColors[tTask.category] || "border-l-[3px] border-l-emerald-400";

      const item = document.createElement("div");
      item.className = `my-day-item group flex items-center justify-between p-2 rounded-xl border border-white/5 ${catBorder} transition-all cursor-pointer select-none ${
        isDone
          ? "bg-emerald-950/20 text-gray-400"
          : "bg-black/40 hover:border-emerald-400/50 text-gray-200"
      }`;

      item.innerHTML = `
        <div class="flex items-center gap-2.5 flex-1 min-w-0">
          <div class="w-4 h-4 rounded-md border flex items-center justify-center transition-colors flex-shrink-0 ${
            isDone
              ? "bg-emerald-500 border-emerald-400 text-black shadow-sm"
              : "border-white/20 group-hover:border-emerald-400/60 bg-black/30"
          }">
            ${isDone ? '<i data-lucide="check" class="w-3 h-3 stroke-[3]"></i>' : ""}
          </div>
          <span class="text-xs truncate transition-all ${
            isDone ? "line-through text-gray-500 opacity-70" : "text-gray-200 group-hover:text-white"
          }">
            ${escapeHtml(tTask.text)}
          </span>
        </div>
      `;

      item.addEventListener("click", () => {
        tTask.done = !tTask.done;
        tTask.completedAt = tTask.done ? Date.now() : null;
        Storage.save();
        renderTasks();
        renderMyDay();
        renderStreak();
      });

      list.appendChild(item);
    });
  }

  // C. Empty state when no daily recurring tasks and no tasks scheduled for today
  if (state.myDay.tasks.length === 0 && todayScheduledTasks.length === 0) {
    const emptyNotice = document.createElement("div");
    emptyNotice.className = "py-4 px-2 text-center text-xs text-gray-500 italic flex flex-col items-center gap-1 select-none";
    emptyNotice.innerHTML = `
      <span>No daily tasks</span>
      <span class="text-[10px] text-gray-600 font-mono">Add items to daily_tasks.txt</span>
    `;
    list.appendChild(emptyNotice);
  }

  // 2. Measure natural content height: Just fit all content without scrollbar; cap at reserved rows
  let myDayItemsHeight = 0;
  if (list && list.children.length > 0) {
    const visibleChildren = Array.from(list.children).filter(el => !el.classList.contains("hidden"));
    visibleChildren.forEach((child, idx) => {
      const itemH = child.offsetHeight || 36;
      myDayItemsHeight += itemH;
      if (idx > 0) myDayItemsHeight += 6;
    });
  }
  // Natural content height: header (36px) + bottom padding & border (12px) + items
  const contentHeight = Math.max(38, 48 + myDayItemsHeight);
  const isMinimized = Boolean(state.myDay.minimized);

  if (container) {
    container.style.top = `${myDayTop}px`;
  }

  if (isMinimized) {
    if (card) card.classList.add("is-minimized");
    if (container) {
      container.style.width = `${defaultStreakWidth}px`;
      container.style.height = `${minHeight}px`;
    }
    list.style.overflowY = "hidden";
    if (chevron) {
      chevron.style.transform = "rotate(0deg)";
    }
  } else {
    if (card) card.classList.remove("is-minimized");
    if (chevron) {
      chevron.style.transform = "rotate(180deg)";
    }

    const fitsWithoutScroll = (contentHeight <= maxAllowedHeight);
    const targetHeight = fitsWithoutScroll ? contentHeight : maxAllowedHeight;

    if (container) {
      container.style.width = `${expandedWidth}px`;
      container.style.height = `${targetHeight}px`;
    }

    // No scrollbar if content fits; scrollbar added only if content extends past reserved rows limit
    list.style.overflowY = fitsWithoutScroll ? "hidden" : "auto";
  }


  // 4. Update today's streak tile to reflect daily task completion percentage!
  const grandTotal = state.myDay.tasks.length + todayScheduledTasks.length;
  const percent = grandTotal > 0 ? Math.round((doneCount / grandTotal) * 100) : 0;
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (state.streak && state.streak.dailyHistory) {
    state.streak.dailyHistory[todayKey] = percent;
  }

  updateStreakCountFromDailyTasks();
  saveCurrentMonthStreak();

  safeCreateIcons();
  if (typeof window.syncTimetableLayout === "function") {
    window.syncTimetableLayout();
  }
}

function toggleMyDayTask(taskText) {
  state.myDay.checks[taskText] = !state.myDay.checks[taskText];
  Storage.save();
  renderMyDay();
  renderStreak();
}

function toggleMyDayMinimize() {
  state.myDay.minimized = !state.myDay.minimized;
  Storage.save();
  renderMyDay();
  if (typeof window.syncTimetableLayout === "function") {
    window.syncTimetableLayout();
  }
}

// Resets daily task checklist at 12 midnight & updates streak
function checkMyDayNewDay() {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  if (state.myDay.date && state.myDay.date !== todayStr) {
    const prevDate = state.myDay.date;
    // Finalize yesterday's completion percentage in daily history
    if (state.streak.dailyHistory && state.streak.dailyHistory[prevDate] === undefined) {
      const total = state.myDay.tasks.length;
      let done = 0;
      state.myDay.tasks.forEach(t => { if (state.myDay.checks[t]) done++; });
      state.streak.dailyHistory[prevDate] = total > 0 ? Math.round((done / total) * 100) : 0;
    }

    // Reset daily tasks for the new day
    state.myDay.date = todayStr;
    state.myDay.checks = {};
    localStorage.setItem("bg_my_day_date", todayStr);
    localStorage.setItem("bg_my_day_checks", "{}");

    // Recalculate streak for the new day
    updateStreakCountFromDailyTasks();
    saveCurrentMonthStreak();

    renderMyDay();
    renderStreak();
    renderTodayTimetable();
  } else if (!state.myDay.date) {
    state.myDay.date = todayStr;
    localStorage.setItem("bg_my_day_date", todayStr);
  }
}

function saveCurrentMonthStreak() {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  localStorage.setItem("bg_streak_current_month", JSON.stringify({
    month: currentMonthKey,
    daily: state.streak.dailyHistory || {}
  }));
}

function parseStreakHistoryTxt(text) {
  const result = {};
  if (!text) return result;
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//") || trimmed.startsWith("[")) {
      continue;
    }
    const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})\s*[:=]\s*(\d+)/);
    if (match) {
      const dateKey = match[1];
      const val = Math.min(100, Math.max(0, parseInt(match[2], 10)));
      result[dateKey] = val;
    }
  }
  return result;
}

// Fetches previous months on-demand from streak_history.txt only when user clicks streak / previous month
async function fetchPreviousMonthsHistory() {
  if (state.streak.previousMonthsLoaded) {
    return state.streak.previousMonthsHistory;
  }

  let history = {};
  try {
    const res = await fetch("streak_history.txt?t=" + Date.now());
    if (res.ok) {
      const text = await res.text();
      history = parseStreakHistoryTxt(text);
    }
  } catch (e) {
    // Local file protocol or network error
  }

  // Fallback to window.STREAK_HISTORY if fetch returned empty (for file:/// standalone protocol)
  if (Object.keys(history).length === 0 && typeof window !== "undefined" && window.STREAK_HISTORY) {
    history = { ...window.STREAK_HISTORY };
  }

  state.streak.previousMonthsHistory = history;
  state.streak.previousMonthsLoaded = true;
  return history;
}

// Calculate active consecutive day completion streak
function updateStreakCountFromDailyTasks() {
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const todayPercent = (state.streak.dailyHistory && state.streak.dailyHistory[todayKey] !== undefined)
    ? state.streak.dailyHistory[todayKey]
    : 0;

  let streak = (todayPercent >= 100) ? 1 : 0;

  // Walk backwards starting from yesterday
  let cur = new Date(now);
  cur.setDate(cur.getDate() - 1);

  for (let i = 0; i < 365; i++) {
    const curKey = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
    let p = state.streak.dailyHistory ? state.streak.dailyHistory[curKey] : undefined;
    if (p === undefined && state.streak.previousMonthsHistory) {
      p = state.streak.previousMonthsHistory[curKey];
    }
    if (p === undefined && typeof window !== "undefined" && window.STREAK_HISTORY) {
      p = window.STREAK_HISTORY[curKey];
    }

    if (p !== undefined && p >= 100) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    } else {
      break;
    }
  }

  // If today is in progress (< 100%), maintain active streak from yesterday
  if (todayPercent < 100) {
    let yesterdayStreak = 0;
    let cur2 = new Date(now);
    cur2.setDate(cur2.getDate() - 1);

    for (let i = 0; i < 365; i++) {
      const curKey = `${cur2.getFullYear()}-${String(cur2.getMonth() + 1).padStart(2, "0")}-${String(cur2.getDate()).padStart(2, "0")}`;
      let p = state.streak.dailyHistory ? state.streak.dailyHistory[curKey] : undefined;
      if (p === undefined && state.streak.previousMonthsHistory) {
        p = state.streak.previousMonthsHistory[curKey];
      }
      if (p === undefined && typeof window !== "undefined" && window.STREAK_HISTORY) {
        p = window.STREAK_HISTORY[curKey];
      }

      if (p !== undefined && p >= 100) {
        yesterdayStreak++;
        cur2.setDate(cur2.getDate() - 1);
      } else {
        break;
      }
    }
    streak = yesterdayStreak;
  }

  state.streak.count = streak;
  return streak;
}

// --- Month Streak Day Tracker Engine (Red -> Yellow -> Green with 80%/100% threshold) ---
function getStreakGradient(percent) {
  if (percent === undefined || percent === null) {
    return {
      bg: "rgba(255, 255, 255, 0.03)",
      border: "rgba(255, 255, 255, 0.08)",
      color: "#64748b",
      glow: "none"
    };
  }

  // 100% Completion: Direct jump to pure vibrant emerald neon green
  if (percent >= 100) {
    return {
      bg: "rgba(16, 185, 129, 0.85)",
      border: "#00ff88",
      color: "#05080c",
      glow: "0 0 10px rgba(0, 255, 136, 0.8)"
    };
  }

  // 0% Completion: Red
  if (percent <= 0) {
    return {
      bg: "rgba(239, 68, 68, 0.25)",
      border: "rgba(239, 68, 68, 0.6)",
      color: "#fca5a5",
      glow: "0 0 4px rgba(239, 68, 68, 0.3)"
    };
  }

  // At 99% task completion, gradient is at only 80%
  const factor = (percent / 99) * 0.80;

  let r, g, b;
  if (factor <= 0.40) {
    // Red (239, 68, 68) -> Yellow (234, 179, 8)
    const t = factor / 0.40;
    r = Math.round(239 + (234 - 239) * t);
    g = Math.round(68 + (179 - 68) * t);
    b = Math.round(68 + (8 - 68) * t);
  } else {
    // Yellow (234, 179, 8) -> 80% mark Yellow-Green (140, 205, 25)
    const t = (factor - 0.40) / 0.40;
    r = Math.round(234 + (140 - 234) * t);
    g = Math.round(179 + (205 - 179) * t);
    b = Math.round(8 + (25 - 8) * t);
  }

  return {
    bg: `rgba(${r}, ${g}, ${b}, 0.35)`,
    border: `rgba(${r}, ${g}, ${b}, 0.8)`,
    color: "#ffffff",
    glow: `0 0 6px rgba(${r}, ${g}, ${b}, 0.4)`
  };
}

function toggleStreakExpanded(expand) {
  state.streak.isExpanded = (typeof expand === "boolean") ? expand : !state.streak.isExpanded;

  // Enforce requirement: "keep only the current month in the streak by default"
  // When collapsing back to default, always return to current month!
  if (!state.streak.isExpanded) {
    const now = new Date();
    state.streak.viewYear = now.getFullYear();
    state.streak.viewMonth = now.getMonth();
  }

  renderStreak();
  window.syncTimetableLayout?.();
}

function renderStreak() {
  const isHiddenMode = document.body.classList.contains("focus-mode");
  const streakContainer = document.getElementById("streak-container");
  const streakCard = document.getElementById("streak-card");
  const monthTitleElem = document.getElementById("streak-month-title");
  const gridElem = document.getElementById("streak-days-grid");
  const nextBtn = document.getElementById("streak-next-btn");
  const prevBtn = document.getElementById("streak-prev-btn");
  const weekdaysRow = document.getElementById("streak-weekdays-row");
  if (!gridElem) return;

  gridElem.innerHTML = "";

  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth();
  const todayDate = now.getDate();

  const isExpanded = !!state.streak.isExpanded;

  if (isExpanded) {
    streakContainer?.classList.add("is-expanded");
    prevBtn?.classList.remove("hidden");
    prevBtn?.classList.add("flex");
    nextBtn?.classList.remove("hidden");
    nextBtn?.classList.add("flex");
    weekdaysRow?.classList.remove("hidden");
    weekdaysRow?.classList.add("grid");
  } else {
    streakContainer?.classList.remove("is-expanded");
    prevBtn?.classList.add("hidden");
    prevBtn?.classList.remove("flex");
    nextBtn?.classList.add("hidden");
    nextBtn?.classList.remove("flex");
    weekdaysRow?.classList.add("hidden");
    weekdaysRow?.classList.remove("grid");

    // Enforce requirement: "keep only the current month in the streak by default"
    state.streak.viewYear = nowYear;
    state.streak.viewMonth = nowMonth;
  }

  if (state.streak.viewYear === undefined) state.streak.viewYear = nowYear;
  if (state.streak.viewMonth === undefined) state.streak.viewMonth = nowMonth;

  const viewYear = state.streak.viewYear;
  const viewMonth = state.streak.viewMonth;
  const isCurrentMonthView = (viewYear === nowYear && viewMonth === nowMonth);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Next button state: disabled if currently viewing the current month
  if (nextBtn) {
    if (isCurrentMonthView) {
      nextBtn.classList.add("opacity-30", "pointer-events-none");
      nextBtn.classList.remove("hover:text-emerald-300", "cursor-pointer");
    } else {
      nextBtn.classList.remove("opacity-30", "pointer-events-none");
      nextBtn.classList.add("hover:text-emerald-300", "cursor-pointer");
    }
  }

  if (monthTitleElem) {
    if (isExpanded) {
      monthTitleElem.textContent = `${monthNames[viewMonth]} ${viewYear}`;
    } else {
      monthTitleElem.textContent = monthNames[viewMonth];
    }
  }

  if (isHiddenMode) {
    // === HIDDEN / FOCUS MODE: Weekly with ONLY THE BOXES ===
    if (monthTitleElem) monthTitleElem.style.display = "none";
    gridElem.className = "flex items-center gap-1.5 justify-center py-0.5";

    const currentDayOfWeek = now.getDay();
    const diffToMonday = (currentDayOfWeek + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const dayNamesFull = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);

      const dYear = d.getFullYear();
      const dMonth = String(d.getMonth() + 1).padStart(2, "0");
      const dNum = String(d.getDate()).padStart(2, "0");
      const dateKey = `${dYear}-${dMonth}-${dNum}`;

      const isToday = d.toDateString() === now.toDateString();
      const isPast = d < new Date(now.getFullYear(), now.getMonth(), now.getDate());

      let completion = 0;
      if (state.streak.dailyHistory && state.streak.dailyHistory[dateKey] !== undefined) {
        completion = state.streak.dailyHistory[dateKey];
      } else if (state.streak.previousMonthsHistory && state.streak.previousMonthsHistory[dateKey] !== undefined) {
        completion = state.streak.previousMonthsHistory[dateKey];
      }

      const box = document.createElement("div");
      box.className = "streak-day-box streak-week-box";

      if (isToday) {
        box.classList.add("streak-today-box", "ring-2", "ring-blue-400");
      } else if (isPast) {
        const styleInfo = getStreakGradient(completion);
        box.style.backgroundColor = styleInfo.bg;
        box.style.borderColor = styleInfo.border;
        box.style.color = styleInfo.color;
        box.style.boxShadow = styleInfo.glow;
      } else {
        box.classList.add("streak-upcoming-box");
        box.style.backgroundColor = "rgba(0, 0, 0, 0.45)";
        box.style.borderColor = "rgba(255, 255, 255, 0.22)";
        box.style.boxShadow = "none";
      }

      gridElem.appendChild(box);
    }
  } else {
    // === MONTH HEATMAP: Compact Mini (default) vs 200% Expanded with Dates ===
    if (monthTitleElem) monthTitleElem.style.display = "block";
    gridElem.className = isExpanded
      ? "grid grid-cols-7 gap-1 justify-items-center pt-1.5"
      : "grid grid-cols-7 gap-1 justify-items-center pt-1";

    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const startOffset = (firstDay + 6) % 7; // Monday = 0
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();

    // Spacers for preceding days of the week
    const spacerClass = isExpanded
      ? "w-[24px] h-[24px] opacity-0 pointer-events-none"
      : "w-[10px] h-[10px] opacity-0 cursor-pointer";

    for (let i = 0; i < startOffset; i++) {
      const spacer = document.createElement("div");
      spacer.className = spacerClass;
      gridElem.appendChild(spacer);
    }

    // Day boxes
    for (let d = 1; d <= totalDays; d++) {
      const box = document.createElement("div");
      box.className = isExpanded
        ? "streak-expanded-box"
        : "streak-day-box streak-month-box cursor-pointer";

      if (isExpanded) {
        box.textContent = d; // DISPLAY DATE NUMBERS (1..31)
      }

      const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

      const isToday = isCurrentMonthView && (d === todayDate);
      const isPast = (viewYear < nowYear) ||
                     (viewYear === nowYear && viewMonth < nowMonth) ||
                     (isCurrentMonthView && d < todayDate);
      const isFuture = (viewYear > nowYear) ||
                       (viewYear === nowYear && viewMonth > nowMonth) ||
                       (isCurrentMonthView && d > todayDate);

      let completion = 0;
      if (isCurrentMonthView) {
        completion = (state.streak.dailyHistory && state.streak.dailyHistory[dateKey] !== undefined)
          ? state.streak.dailyHistory[dateKey]
          : 0;
      } else {
        if (state.streak.previousMonthsHistory && state.streak.previousMonthsHistory[dateKey] !== undefined) {
          completion = state.streak.previousMonthsHistory[dateKey];
        } else if (typeof window !== "undefined" && window.STREAK_HISTORY && window.STREAK_HISTORY[dateKey] !== undefined) {
          completion = window.STREAK_HISTORY[dateKey];
        } else {
          completion = 0;
        }
      }

      if (isToday) {
        // Today is shown in vibrant BLUE!
        box.classList.add("streak-today-box");
      } else if (isPast) {
        // Previous days shown in gradient according to completion!
        const styleInfo = getStreakGradient(completion);
        box.style.backgroundColor = styleInfo.bg;
        box.style.borderColor = styleInfo.border;
        box.style.color = styleInfo.color;
        box.style.boxShadow = styleInfo.glow;
      } else {
        // Upcoming days: distinct darkened border across compact and maximize
        box.classList.add("streak-upcoming-box");
        box.style.backgroundColor = "rgba(0, 0, 0, 0.45)";
        box.style.borderColor = "rgba(255, 255, 255, 0.22)";
        box.style.boxShadow = "none";
        box.style.color = "rgba(148, 163, 184, 0.6)";
      }

      gridElem.appendChild(box);
    }
  }

  safeCreateIcons();
}

function setupStreakListeners() {
  const prevBtn = document.getElementById("streak-prev-btn");
  const nextBtn = document.getElementById("streak-next-btn");
  const titleBtn = document.getElementById("streak-month-title");
  const streakCard = document.getElementById("streak-card");
  const streakContainer = document.getElementById("streak-container");

  const daysGrid = document.getElementById("streak-days-grid");

  // Clicking anywhere in the streak card maximizes it (or collapses when clicking header)
  streakCard?.addEventListener("click", (e) => {
    // If clicking on previous / next buttons, do not trigger card expand/collapse
    if (e.target.closest("button")) return;

    if (!state.streak.isExpanded) {
      // In compact mode: clicking on any date box, title, grid or card maximizes the streak!
      toggleStreakExpanded(true);
    } else if (e.target.closest("#streak-header")) {
      // Clicking the header when maximized collapses it back
      toggleStreakExpanded(false);
    }
  });

  // Explicit listener on the dates grid: clicking any date box in compact view immediately maximizes
  daysGrid?.addEventListener("click", (e) => {
    if (!state.streak.isExpanded) {
      e.stopPropagation();
      toggleStreakExpanded(true);
    }
  });

  // Click outside collapses back to default (only current month)
  document.addEventListener("click", (e) => {
    if (state.streak.isExpanded) {
      if (streakContainer && !streakContainer.contains(e.target)) {
        toggleStreakExpanded(false);
      }
    }
  });

  prevBtn?.addEventListener("click", async (e) => {
    e.stopPropagation();
    // Lazy fetch previous months from streak_history.txt on-demand!
    if (!state.streak.previousMonthsLoaded) {
      await fetchPreviousMonthsHistory();
      updateStreakCountFromDailyTasks();
    }
    state.streak.viewMonth--;
    if (state.streak.viewMonth < 0) {
      state.streak.viewMonth = 11;
      state.streak.viewYear--;
    }
    renderStreak();
    window.syncTimetableLayout?.();
  });

  nextBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    const now = new Date();
    if (state.streak.viewYear === now.getFullYear() && state.streak.viewMonth === now.getMonth()) {
      return;
    }
    state.streak.viewMonth++;
    if (state.streak.viewMonth > 11) {
      state.streak.viewMonth = 0;
      state.streak.viewYear++;
    }
    renderStreak();
    window.syncTimetableLayout?.();
  });

  titleBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!state.streak.isExpanded) {
      toggleStreakExpanded(true);
      return;
    }
    const now = new Date();
    const isCurrent = state.streak.viewYear === now.getFullYear() && state.streak.viewMonth === now.getMonth();
    if (!isCurrent) {
      // Jump back to current month
      state.streak.viewYear = now.getFullYear();
      state.streak.viewMonth = now.getMonth();
      renderStreak();
      window.syncTimetableLayout?.();
    } else {
      // If already on current month and clicked, collapse back
      toggleStreakExpanded(false);
    }
  });
}




// Clean wallpaper right-click (prevents browser context menu from interrupting wallpaper)
window.addEventListener("contextmenu", (e) => {
  if (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA" && !e.target.isContentEditable) {
    e.preventDefault();
  }
});

// --- Modals & Popups ---
function updateTimetableModalDynamicSize() {
  const modal = document.getElementById("timetable-modal");
  const modalImg = document.getElementById("tt-image-element");
  const modalCard = document.getElementById("tt-modal-card");
  if (!modal || modal.classList.contains("hidden") || !modalImg || !modalCard) return;

  const nw = modalImg.naturalWidth || 1345;
  const nh = modalImg.naturalHeight || 471;
  const ratio = nw / nh;
  const paddingPx = 12; // 6px padding on all 4 sides (left + right, top + bottom)

  // 60% viewport bounds (increased by 10% from 50%)
  const maxW = window.innerWidth * 0.60;
  const maxH = window.innerHeight * 0.60;

  const widthConstrainedByHeight = (maxH - paddingPx) * ratio + paddingPx;
  const targetWidth = Math.min(maxW, widthConstrainedByHeight);

  modalCard.style.width = `${Math.round(targetWidth)}px`;
  modalCard.style.maxWidth = "60vw";
  modalCard.style.maxHeight = "60vh";
  modalCard.style.height = "auto";
}

window.addEventListener("resize", updateTimetableModalDynamicSize);

function openTimetableModal() {
  const modal = document.getElementById("timetable-modal");
  const modalImg = document.getElementById("tt-image-element");
  const savedTTImage = localStorage.getItem("bg_tt_image");

  if (modalImg) {
    const onImgReady = () => {
      updateTimetableModalDynamicSize();
    };

    const targetSrc = savedTTImage || "TT.jpeg";
    if (!modalImg.src.includes(targetSrc)) {
      modalImg.src = targetSrc;
    }

    if (modalImg.complete && modalImg.naturalWidth) {
      onImgReady();
    } else {
      modalImg.onload = onImgReady;
    }
  }

  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    updateTimetableModalDynamicSize();
  }
}

function closeTimetableModal() {
  const modal = document.getElementById("timetable-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}



function toggleFocusMode() {
  document.body.classList.toggle("focus-mode");
  const isFocus = document.body.classList.contains("focus-mode");
  const btn = document.getElementById("dock-focus-btn");
  if (btn) {
    btn.innerHTML = `<i data-lucide="${isFocus ? "eye-off" : "eye"}" class="w-4 h-4 transition-transform group-hover:scale-110"></i>`;
    if (isFocus) {
      btn.classList.add("text-emerald-300", "border-emerald-400/60", "bg-emerald-500/25");
      btn.classList.remove("text-gray-300", "border-white/5");
    } else {
      btn.classList.remove("text-emerald-300", "border-emerald-400/60", "bg-emerald-500/25");
      btn.classList.add("text-gray-300", "border-white/5");
    }
    safeCreateIcons();
  }
  // Re-render streak according to mode (Month when normal, Weekly boxes only when hidden mode is ON)
  renderStreak();

  // Re-sync layout so console glides to the top below timetable when hidden, or back down in normal mode
  if (typeof window.syncTimetableLayout === "function") {
    window.syncTimetableLayout();
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  Storage.load();
  updateClock();
  setInterval(updateClock, 1000);

  applyTimeBackground();
  // Check background lighting every 5 minutes
  // Strip and block all title attributes to prevent browser native floating tooltip boxes
  document.querySelectorAll("[title]").forEach(el => el.removeAttribute("title"));
  try {
    const titleObserver = new MutationObserver((mutations) => {
      mutations.forEach(m => {
        if (m.type === "attributes" && m.attributeName === "title" && m.target && m.target.hasAttribute && m.target.hasAttribute("title")) {
          m.target.removeAttribute("title");
        } else if (m.type === "childList") {
          m.addedNodes.forEach(node => {
            if (node && node.nodeType === 1) {
              if (node.hasAttribute("title")) node.removeAttribute("title");
              node.querySelectorAll?.("[title]").forEach(el => el.removeAttribute("title"));
            }
          });
        }
      });
    });
    titleObserver.observe(document.body, { attributes: true, subtree: true, childList: true, attributeFilter: ["title"] });
  } catch (e) { }



  renderCalendar();
  setupCalendarListeners();
  setupDynamicTimetable();
  renderTodayTimetable();
  renderTasks();
  renderMyDay();
  loadMyDayTasks(true);
  updateStreakCountFromDailyTasks();
  renderStreak();
  setupStreakListeners();
  renderConsoleLinks();
  
  // Live auto-refresh: checks daily_tasks.txt every 10 seconds (safely checks if text hasn't changed)
  setInterval(() => {
    const taskInput = document.getElementById("new-task-input");
    if (taskInput && document.activeElement === taskInput) return;
    loadMyDayTasks();
  }, 10000);

  window.addEventListener("focus", () => {
    const taskInput = document.getElementById("new-task-input");
    if (taskInput && document.activeElement === taskInput) return;
    loadMyDayTasks();
  });

  // MY DAY Daily Task Checklist Toggle (Click to Minimize / Expand)
  document.getElementById("my-day-header")?.addEventListener("click", toggleMyDayMinimize);
  document.getElementById("my-day-toggle-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMyDayMinimize();
  });

  // Timetable Card Click (Opens Expanded Image Lightbox)
  document.getElementById("timetable-card")?.addEventListener("click", openTimetableModal);

  // Bottom Right Console Action
  document.getElementById("dock-focus-btn")?.addEventListener("click", toggleFocusMode);

  // Timetable Modal Click (Anywhere closes it) & Global Escape Dismiss
  document.getElementById("timetable-modal")?.addEventListener("click", () => {
    closeTimetableModal();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeTimetableModal();
    }
  });

  // To-Do Input Form & Category Color Dynamics
  const taskInput = document.getElementById("new-task-input");
  const taskCategory = document.getElementById("new-task-category");
  const taskDate = document.getElementById("new-task-date");
  const taskForm = document.getElementById("add-task-form");

  // In-Page Custom Category Selector & Dropdown (100% Offline & Desktop Wallpaper Reliable)
  const catCapsule = document.getElementById("category-picker-capsule");
  const catDisplay = document.getElementById("category-picker-display");
  const catChevron = document.getElementById("category-picker-chevron");
  const catDropdown = document.getElementById("todo-category-dropdown");

  function syncCategoryDropdownColor() {
    if (!taskCategory) return;
    const val = taskCategory.value || "College Task";

    const colorMap = {
      "College Task": { border: "border-l-emerald-400", text: "text-emerald-300" },
      "College Exams": { border: "border-l-amber-400", text: "text-amber-300" },
      "Last Date for Stuff": { border: "border-l-rose-500", text: "text-rose-300" },
      "Competitive Exams": { border: "border-l-purple-400", text: "text-purple-300" }
    };
    const c = colorMap[val] || colorMap["College Task"];

    if (catCapsule) {
      catCapsule.classList.remove(
        "border-l-emerald-400", "border-l-amber-400", "border-l-rose-500", "border-l-purple-400",
        "text-emerald-300", "text-amber-300", "text-rose-300", "text-purple-300"
      );
      catCapsule.classList.add(c.border, c.text);
    }
    if (catDisplay) {
      catDisplay.textContent = `● ${val}`;
    }
  }

  function openCategoryDropdown() {
    if (!catDropdown) return;
    closeTodoCalendar();
    catDropdown.classList.remove("hidden");
    catDropdown.classList.add("flex");
    catChevron?.classList.add("rotate-180");
    safeCreateIcons();
  }

  function closeCategoryDropdown() {
    if (!catDropdown) return;
    catDropdown.classList.add("hidden");
    catDropdown.classList.remove("flex");
    catChevron?.classList.remove("rotate-180");
  }

  let lastCatToggleTime = 0;
  const toggleCategoryDropdown = (e) => {
    const now = Date.now();
    if (now - lastCatToggleTime < 250) return;
    lastCatToggleTime = now;
    if (e) e.stopPropagation();
    if (catDropdown?.classList.contains("hidden")) {
      openCategoryDropdown();
    } else {
      closeCategoryDropdown();
    }
  };

  catCapsule?.addEventListener("click", toggleCategoryDropdown);
  catDropdown?.addEventListener("click", (e) => e.stopPropagation());

  document.querySelectorAll(".todo-cat-opt-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const val = btn.dataset.value;
      if (val && taskCategory) {
        taskCategory.value = val;
        syncCategoryDropdownColor();
      }
      closeCategoryDropdown();
    });
  });

  taskCategory?.addEventListener("change", syncCategoryDropdownColor);
  syncCategoryDropdownColor();

  function syncDatePickerVisuals() {
    const dateInput = document.getElementById("new-task-date");
    const capsule = document.getElementById("date-picker-capsule");
    const icon = document.getElementById("date-picker-icon");
    const display = document.getElementById("date-picker-display");
    const trailingIcon = document.getElementById("date-picker-trailing-icon");
    const clearBtn = document.getElementById("clear-task-date-btn");
    if (!dateInput || !capsule) return;

    if (dateInput.value) {
      const parts = dateInput.value.split("-");
      if (parts.length === 3) {
        const [y, m, d] = parts;
        if (display) {
          display.textContent = `${d} / ${m} / ${y}`;
          display.classList.add("text-emerald-300", "font-medium");
          display.classList.remove("text-gray-300");
        }
      }
      capsule.classList.add("border-emerald-400/60", "bg-emerald-950/30");
      capsule.classList.remove("border-white/10", "bg-black/60");
      if (icon) {
        icon.classList.add("text-emerald-300");
        icon.classList.remove("text-emerald-400/70");
      }
      if (trailingIcon) trailingIcon.classList.add("hidden");
      if (clearBtn) clearBtn.classList.remove("hidden");
    } else {
      if (display) {
        display.textContent = "dd / mm / yyyy";
        display.classList.remove("text-emerald-300", "font-medium");
        display.classList.add("text-gray-300");
      }
      capsule.classList.remove("border-emerald-400/60", "bg-emerald-950/30");
      capsule.classList.add("border-white/10", "bg-black/60");
      if (icon) {
        icon.classList.remove("text-emerald-300");
        icon.classList.add("text-emerald-400/70");
      }
      if (trailingIcon) trailingIcon.classList.remove("hidden");
      if (clearBtn) clearBtn.classList.add("hidden");
    }
  }

  taskDate?.addEventListener("input", syncDatePickerVisuals);
  taskDate?.addEventListener("change", syncDatePickerVisuals);
  syncDatePickerVisuals();

  // --- In-Page Cyber Calendar Dropdown for Due Date (Desktop Wallpaper & Offline Reliable) ---
  const todoCalDropdown = document.getElementById("todo-calendar-dropdown");
  const dateCapsule = document.getElementById("date-picker-capsule");
  const todoCalTitle = document.getElementById("todo-cal-month-title");
  const todoCalGrid = document.getElementById("todo-cal-days-grid");

  let todoCalState = {
    year: new Date().getFullYear(),
    month: new Date().getMonth()
  };

  const MONTH_NAMES_FULL = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  function openTodoCalendar() {
    if (!todoCalDropdown) return;
    closeCategoryDropdown();
    if (taskDate && taskDate.value) {
      const parts = taskDate.value.split("-");
      if (parts.length === 3) {
        todoCalState.year = parseInt(parts[0], 10);
        todoCalState.month = parseInt(parts[1], 10) - 1;
      }
    } else {
      const now = new Date();
      todoCalState.year = now.getFullYear();
      todoCalState.month = now.getMonth();
    }
    renderTodoCalendar();
    todoCalDropdown.classList.remove("hidden");
    todoCalDropdown.classList.add("flex");
    safeCreateIcons();
  }

  function closeTodoCalendar() {
    if (!todoCalDropdown) return;
    todoCalDropdown.classList.add("hidden");
    todoCalDropdown.classList.remove("flex");
  }

  function renderTodoCalendar() {
    if (!todoCalGrid || !todoCalTitle) return;
    todoCalTitle.textContent = `${MONTH_NAMES_FULL[todoCalState.month]} ${todoCalState.year}`;
    todoCalGrid.innerHTML = "";

    const firstDayIndex = (new Date(todoCalState.year, todoCalState.month, 1).getDay() + 6) % 7; // Monday = 0
    const totalDays = new Date(todoCalState.year, todoCalState.month + 1, 0).getDate();

    const now = new Date();
    const todayYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const selectedYMD = taskDate ? taskDate.value : "";

    // Empty lead cells
    for (let i = 0; i < firstDayIndex; i++) {
      const emptyCell = document.createElement("div");
      emptyCell.className = "w-6 h-6";
      todoCalGrid.appendChild(emptyCell);
    }

    // Days of the month
    for (let d = 1; d <= totalDays; d++) {
      const dayYMD = `${todoCalState.year}-${String(todoCalState.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isToday = (dayYMD === todayYMD);
      const isSelected = (dayYMD === selectedYMD);

      const cell = document.createElement("button");
      cell.type = "button";
      cell.textContent = d;
      cell.className = `w-6 h-6 rounded text-[10px] font-mono flex items-center justify-center transition-all cursor-pointer select-none ${
        isSelected
          ? "bg-emerald-500 text-black font-bold shadow-md shadow-emerald-500/40 ring-1 ring-emerald-300"
          : isToday
          ? "border border-emerald-400 text-emerald-300 font-bold bg-emerald-950/40 hover:bg-emerald-500/30"
          : "text-gray-300 hover:bg-white/10 hover:text-white"
      }`;

      cell.addEventListener("click", (e) => {
        if (e) e.stopPropagation();
        if (taskDate) {
          taskDate.value = dayYMD;
          syncDatePickerVisuals();
        }
        closeTodoCalendar();
      });

      todoCalGrid.appendChild(cell);
    }
  }

  // Prev / Next month buttons
  document.getElementById("todo-cal-prev-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    todoCalState.month--;
    if (todoCalState.month < 0) {
      todoCalState.month = 11;
      todoCalState.year--;
    }
    renderTodoCalendar();
  });

  document.getElementById("todo-cal-next-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    todoCalState.month++;
    if (todoCalState.month > 11) {
      todoCalState.month = 0;
      todoCalState.year++;
    }
    renderTodoCalendar();
  });

  // Quick date shortcut buttons (Today, Tmrw, +2d, +1wk)
  document.querySelectorAll(".todo-quick-date-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      if (e) e.stopPropagation();
      const days = parseInt(btn.dataset.days || "0", 10);
      const target = new Date();
      target.setDate(target.getDate() + days);
      const ymd = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
      if (taskDate) {
        taskDate.value = ymd;
        syncDatePickerVisuals();
      }
      closeTodoCalendar();
    });
  });

  // Toggle calendar on capsule click
  let lastCalToggleTime = 0;
  const toggleDateCalendar = (e) => {
    if (e.target.closest("#clear-task-date-btn")) return;
    const now = Date.now();
    if (now - lastCalToggleTime < 250) return;
    lastCalToggleTime = now;
    if (e) e.stopPropagation();
    if (todoCalDropdown?.classList.contains("hidden")) {
      openTodoCalendar();
    } else {
      closeTodoCalendar();
    }
  };
  dateCapsule?.addEventListener("click", toggleDateCalendar);
  todoCalDropdown?.addEventListener("click", (e) => e.stopPropagation());

  // Clear date button
  const handleClearDate = (e) => {
    if (e) e.stopPropagation();
    if (taskDate) {
      taskDate.value = "";
      syncDatePickerVisuals();
    }
    closeTodoCalendar();
  };
  const clearBtn = document.getElementById("clear-task-date-btn");
  clearBtn?.addEventListener("click", handleClearDate);

  // Close when clicking outside
  document.addEventListener("click", (e) => {
    if (todoCalDropdown && !todoCalDropdown.contains(e.target) && !dateCapsule?.contains(e.target)) {
      closeTodoCalendar();
    }
    if (catDropdown && !catDropdown.contains(e.target) && !catCapsule?.contains(e.target)) {
      closeCategoryDropdown();
    }
  });

  // Proactive instant single-click focus for task typing
  if (taskInput) {
    const focusTaskInput = (e) => {
      window.focus();
      taskInput.focus();
    };
    taskInput.addEventListener("pointerdown", focusTaskInput);
    taskInput.addEventListener("mousedown", focusTaskInput);
    taskInput.addEventListener("touchstart", focusTaskInput);
    taskInput.addEventListener("click", focusTaskInput);
    taskInput.addEventListener("focus", () => {
      const len = taskInput.value.length;
      taskInput.setSelectionRange(len, len);
    });
  }

  const taskInputContainer = document.getElementById("task-input-container");
  taskInputContainer?.addEventListener("pointerdown", (e) => {
    if (!e.target.closest("button")) {
      window.focus();
      taskInput?.focus();
    }
  });

  const addBtn = document.getElementById("add-task-submit-btn") || taskForm?.querySelector('button[type="submit"]');

  let lastAddTaskTime = 0;
  const executeAddTask = (e) => {
    const now = Date.now();
    if (now - lastAddTaskTime < 250) return; // Prevent double trigger
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const val = taskInput ? taskInput.value.trim() : "";
    if (val) {
      lastAddTaskTime = now;
      addTask(val, taskCategory?.value || "College Task", taskDate?.value || "");
      if (taskInput) {
        taskInput.value = "";
        taskInput.focus();
      }
      if (taskCategory) taskCategory.value = "College Task";
      if (taskDate) taskDate.value = "";
      syncCategoryDropdownColor();
      syncDatePickerVisuals();
    }
  };

  taskForm?.addEventListener("submit", executeAddTask);
  addBtn?.addEventListener("click", executeAddTask);
  addBtn?.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    window.focus();
  });

  taskInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      executeAddTask(e);
    }
  });

  // Globally ensure text inputs receive immediate focus on initial press down
  document.addEventListener("pointerdown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
      e.target.focus();
    }
  }, { passive: true });

  // Task Filter Tabs - Instant single-click response
  document.querySelectorAll(".task-tab-btn").forEach(btn => {
    let lastTabSwitch = 0;
    const switchTab = (e) => {
      const now = Date.now();
      if (now - lastTabSwitch < 120) return;
      lastTabSwitch = now;
      if (e) e.stopPropagation();

      document.querySelectorAll(".task-tab-btn").forEach(b => {
        b.classList.remove("text-emerald-400", "border-emerald-400");
        b.classList.add("text-gray-400", "border-transparent");
      });
      btn.classList.add("text-emerald-400", "border-emerald-400");
      btn.classList.remove("text-gray-400", "border-transparent");
      state.activeTab = btn.getAttribute("data-tab");
      Storage.save();
      renderTasks();
    };

    btn.addEventListener("click", switchTab);
    btn.addEventListener("pointerdown", switchTab);
  });

  // Lively Wallpaper API compatibility hook (if running inside Lively Wallpaper)
  window.livelyPropertyListener = function (name, val) {
    switch (name) {
      case "userName":
        state.settings.userName = val;
        break;
      case "timeFormat":
        state.settings.timeFormat = val === 0 ? "12" : "24";
        break;
      case "bgMode":
        state.settings.bgMode = val;
        break;
    }
    Storage.save();
    updateClock();
    applyTimeBackground();
  };

  safeCreateIcons();
});
