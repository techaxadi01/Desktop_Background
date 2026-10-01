/**
 * Zero-Dependency Local Background Bridge Server for Live Wallpaper
 * Powered by Node.js native http + AGY CLI Auto-Sync
 * Runs on http://localhost:5000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { runSync } = require('./sync_timetable');
const { exec, spawn } = require('child_process');

const PORT = process.env.PORT || 5000;
const ROOT = __dirname;
const BACKUP_PATH = path.join(ROOT, 'data-backup.json');

process.on('uncaughtException', (err) => {
  try { fs.appendFileSync(path.join(ROOT, 'server_error.log'), `[${new Date().toISOString()}] Uncaught: ${err.stack}\n`); } catch(e){}
});
process.on('unhandledRejection', (err) => {
  try { fs.appendFileSync(path.join(ROOT, 'server_error.log'), `[${new Date().toISOString()}] Rejection: ${err}\n`); } catch(e){}
});
process.on('exit', (code) => {
  try { fs.appendFileSync(path.join(ROOT, 'server_error.log'), `[${new Date().toISOString()}] Exit code: ${code}\n`); } catch(e){}
});

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8'
};

const TRANSPARENT_1PX_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

function sendJSON(res, statusCode, data, req) {
  const origin = (req && req.headers && req.headers.origin) ? req.headers.origin : '*';
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Access-Control-Request-Private-Network',
    'Access-Control-Allow-Private-Network': 'true',
    'Access-Control-Max-Age': '86400'
  });
  res.end(JSON.stringify(data));
}

// Automatically sync plain-text config files to their JS counterparts for standalone file:/// compatibility
function syncDailyTasksTxtToJs() {
  const txtPath = path.join(ROOT, 'daily_tasks.txt');
  const jsPath = path.join(ROOT, 'daily_tasks.js');
  if (!fs.existsSync(txtPath)) return;
  try {
    const raw = fs.readFileSync(txtPath, 'utf8');
    const tasks = raw.split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));
    const jsContent = `// Auto-synced from daily_tasks.txt\nwindow.DAILY_TASKS = ${JSON.stringify(tasks, null, 2)};\n`;
    fs.writeFileSync(jsPath, jsContent, 'utf8');
  } catch (e) {
    console.error('[Server] Failed to sync daily_tasks.txt to daily_tasks.js:', e.message);
  }
}

function syncLinksTxtToJs() {
  const txtPath = path.join(ROOT, 'links.txt');
  const jsPath = path.join(ROOT, 'links.js');
  if (!fs.existsSync(txtPath)) return;
  try {
    const raw = fs.readFileSync(txtPath, 'utf8');
    const lines = raw.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    const links = [];
    for (const line of lines) {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 2) {
        links.push({ name: parts[0], url: parts[1], icon: parts[2] || 'link' });
      }
    }
    const jsContent = `// Auto-synced from links.txt\nwindow.CONSOLE_LINKS = ${JSON.stringify(links, null, 2)};\n`;
    fs.writeFileSync(jsPath, jsContent, 'utf8');
  } catch (e) {
    console.error('[Server] Failed to sync links.txt to links.js:', e.message);
  }
}

function syncTimetableJsonToJs() {
  const jsonPath = path.join(ROOT, 'timetable.json');
  const jsPath = path.join(ROOT, 'timetable.js');
  if (!fs.existsSync(jsonPath)) return null;
  try {
    const raw = fs.readFileSync(jsonPath, 'utf8');
    const parsed = JSON.parse(raw);
    const jsContent = `// Auto-synced from timetable.json\nwindow.TIMETABLE_CACHE = ${JSON.stringify(parsed, null, 2)};\n`;
    fs.writeFileSync(jsPath, jsContent, 'utf8');
    return parsed;
  } catch (e) {
    console.error('[Server] Failed to sync timetable.json to timetable.js:', e.message);
    return null;
  }
}

function syncStreakHistoryTxtToJs(fromBackup = false) {
  const txtPath = path.join(ROOT, 'streak_history.txt');
  const jsPath = path.join(ROOT, 'streak_history.js');
  const backupPath = path.join(ROOT, 'data-backup.json');

  const streakData = {};

  if (fs.existsSync(txtPath)) {
    try {
      const raw = fs.readFileSync(txtPath, 'utf8');
      const lines = raw.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('//') && !trimmed.startsWith('[')) {
          const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})\s*[:=]\s*(\d+)/);
          if (match) {
            streakData[match[1]] = Math.min(100, Math.max(0, parseInt(match[2], 10)));
          }
        }
      }
    } catch (e) {
      console.error('[Server] Failed to read streak_history.txt:', e.message);
    }
  }

  // Merge from data-backup.json if called from /api/sync
  let mergedNew = false;
  if (fromBackup && fs.existsSync(backupPath)) {
    try {
      const rawBackup = fs.readFileSync(backupPath, 'utf8');
      const backup = JSON.parse(rawBackup);
      const dailyHistory = backup?.streak?.dailyHistory || {};
      for (const [dateStr, pct] of Object.entries(dailyHistory)) {
        const val = Math.min(100, Math.max(0, Number(pct) || 0));
        if (streakData[dateStr] === undefined || streakData[dateStr] !== val) {
          streakData[dateStr] = val;
          mergedNew = true;
        }
      }
    } catch (e) { }
  }

  if (mergedNew && fs.existsSync(txtPath)) {
    try {
      const header = (
        "# ====================================================================\n" +
        "# STREAK HISTORY (Daily Task Completion %)\n" +
        "# ====================================================================\n" +
        "# Format: YYYY-MM-DD: percentage (0 to 100)\n" +
        "# Lines starting with # are comments.\n" +
        "# ====================================================================\n\n"
      );
      const sortedDates = Object.keys(streakData).sort();
      const content = header + sortedDates.map(d => `${d}: ${streakData[d]}`).join('\n') + '\n';
      fs.writeFileSync(txtPath, content, 'utf8');
    } catch (e) { }
  }

  try {
    const jsContent = `// Auto-synced from streak_history.txt\nwindow.STREAK_HISTORY = ${JSON.stringify(streakData, null, 2)};\n`;
    fs.writeFileSync(jsPath, jsContent, 'utf8');
  } catch (e) {
    console.error('[Server] Failed to write streak_history.js:', e.message);
  }

  // Also ensure data-backup.json streak.dailyHistory matches streak_history.txt when edited manually
  if (!fromBackup && fs.existsSync(backupPath)) {
    try {
      const rawBackup = fs.readFileSync(backupPath, 'utf8');
      const backup = JSON.parse(rawBackup);
      if (backup && backup.streak) {
        backup.streak.dailyHistory = { ...(backup.streak.dailyHistory || {}), ...streakData };
        if (backup.streak.previousMonthsHistory) {
          backup.streak.previousMonthsHistory = { ...backup.streak.previousMonthsHistory, ...streakData };
        }
        const updatedBackupJson = JSON.stringify(backup, null, 2);
        fs.writeFileSync(backupPath, updatedBackupJson, 'utf8');
        fs.writeFileSync(path.join(ROOT, 'data-backup.js'), `// Auto-generated backup data for offline file:/// recovery\nwindow.BACKUP_DATA = ${updatedBackupJson};\n`, 'utf8');
      }
    } catch (e) { }
  }
}

// Run initial sync on startup
syncDailyTasksTxtToJs();
syncLinksTxtToJs();
syncTimetableJsonToJs();
syncStreakHistoryTxtToJs();

// Watch for changes in plain text / json config files
try {
  const tasksTxt = path.join(ROOT, 'daily_tasks.txt');
  if (fs.existsSync(tasksTxt)) {
    fs.watch(tasksTxt, () => syncDailyTasksTxtToJs());
  }
  const linksTxt = path.join(ROOT, 'links.txt');
  if (fs.existsSync(linksTxt)) {
    fs.watch(linksTxt, () => syncLinksTxtToJs());
  }
  const ttJson = path.join(ROOT, 'timetable.json');
  if (fs.existsSync(ttJson)) {
    fs.watch(ttJson, () => syncTimetableJsonToJs());
  }
  const streakTxt = path.join(ROOT, 'streak_history.txt');
  if (fs.existsSync(streakTxt)) {
    fs.watch(streakTxt, () => syncStreakHistoryTxtToJs());
  }
} catch (e) { }

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin || '*';
    res.writeHead(204, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Access-Control-Request-Private-Network',
      'Access-Control-Allow-Private-Network': 'true',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // 1. Health check
  if (pathname === '/api/health' || pathname === '/api/status') {
    return sendJSON(res, 200, { status: 'online', agyAvailable: true, port: PORT }, req);
  }

  // 2. Timetable Sync (Scans TT.jpeg with AGY AI vision and syncs timetable.json & timetable.js)
  if (pathname === '/api/sync-timetable') {
    try {
      console.log('[Server] Received AGY AI vision timetable scan request from TT.jpeg...');
      const timetable = await runSync();
      return sendJSON(res, 200, {
        success: true,
        message: 'Timetable synchronized successfully with AGY from TT.jpeg',
        timetable
      }, req);
    } catch (err) {
      console.error('[Server] Timetable scan error:', err.message);
      // Fallback: reload existing timetable.json
      const fallbackTT = syncTimetableJsonToJs();
      if (fallbackTT) {
        return sendJSON(res, 200, {
          success: true,
          message: 'AI scan failed, synchronized from timetable.json',
          timetable: fallbackTT
        }, req);
      }
      return sendJSON(res, 500, {
        success: false,
        error: err.message
      }, req);
    }
  }

  // 3. GET current timetable.json
  if (pathname === '/api/timetable') {
    const timetable = syncTimetableJsonToJs();
    if (timetable) {
      return sendJSON(res, 200, timetable, req);
    } else {
      return sendJSON(res, 404, { error: 'timetable.json not found' }, req);
    }
  }

  // 4. Save / Backup sync state
  if (pathname === '/api/sync' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = body ? JSON.parse(body) : {};
        const backupJson = JSON.stringify({
          updatedAt: new Date(),
          ...data
        }, null, 2);
        fs.writeFileSync(BACKUP_PATH, backupJson, 'utf8');
        fs.writeFileSync(path.join(ROOT, 'data-backup.js'), `// Auto-generated backup data for offline file:/// recovery\nwindow.BACKUP_DATA = ${backupJson};\n`, 'utf8');
        syncStreakHistoryTxtToJs(true);
        return sendJSON(res, 200, { success: true, message: 'Saved to local backup' }, req);
      } catch (err) {
        return sendJSON(res, 400, { error: err.message }, req);
      }
    });
    return;
  }

  // Helper for responding to /api/open (supports both JSON and Image Beacon)
  function sendOpenResponse(message) {
    const origin = req.headers.origin || '*';
    const isImageBeacon = req.headers.accept && req.headers.accept.includes('image');
    if (isImageBeacon) {
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Private-Network': 'true',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      });
      res.end(TRANSPARENT_1PX_PNG);
    } else {
      sendJSON(res, 200, { success: true, message }, req);
    }
  }

  // 5. Open files / folders in Windows Explorer / default apps
  if (pathname === '/api/open') {
    const target = parsedUrl.searchParams.get('target');
    const customPath = parsedUrl.searchParams.get('path') || parsedUrl.searchParams.get('file') || parsedUrl.searchParams.get('url');

    if (target === 'healthcheck' || target === 'ping') {
      return sendJSON(res, 200, { success: true, status: 'ok' }, req);
    }

    // Robust file / folder / URL opener for Windows desktop
    const openVisibly = (targetPath) => {
      if (!targetPath) return;
      let cleanPath = targetPath.trim();
      if (cleanPath.startsWith('file:///')) {
        cleanPath = cleanPath.slice(8);
      } else if (cleanPath.startsWith('file://')) {
        cleanPath = cleanPath.slice(7);
      }
      try { cleanPath = decodeURIComponent(cleanPath); } catch (e) {}

      // 1. If it's a web URL
      if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
        spawn('cmd.exe', ['/c', 'start', '', cleanPath], { detached: true, stdio: 'ignore' }).unref();
        return;
      }

      // 2. If relative path, resolve relative to project ROOT
      if (!path.isAbsolute(cleanPath)) {
        cleanPath = path.resolve(ROOT, cleanPath);
      }

      // 3. If directory, open in Windows Explorer
      try {
        if (fs.existsSync(cleanPath) && fs.statSync(cleanPath).isDirectory()) {
          spawn('explorer.exe', [cleanPath], { detached: true, stdio: 'ignore' }).unref();
          return;
        }
      } catch (e) {}

      // 4. Open file with default viewer/editor via PowerShell Start-Process
      spawn('powershell.exe', ['-NoProfile', '-Command', `Start-Process -FilePath '${cleanPath.replace(/'/g, "''")}'`], {
        detached: true,
        stdio: 'ignore'
      }).unref();
    };

    if (customPath) {
      openVisibly(customPath);
      return sendOpenResponse(`Opening ${path.basename(customPath) || 'path'}`);
    }

    if (target === 'folder') {
      openVisibly(ROOT);
      return sendOpenResponse('Opening project directory in Explorer');
    }
    if (target === 'links') {
      openVisibly(path.join(ROOT, 'links.txt'));
      return sendOpenResponse('Opening links.txt');
    }
    if (target === 'tasks') {
      openVisibly(path.join(ROOT, 'daily_tasks.txt'));
      return sendOpenResponse('Opening daily_tasks.txt');
    }
    if (target === 'update') {
      console.log('[Server] Executing update_wallpaper.py via /api/open...');
      exec('python update_wallpaper.py', { cwd: ROOT }, (err) => {
        if (err) console.error('[Server] update_wallpaper.py error:', err.message);
      });
      return sendOpenResponse('Running update_wallpaper.py & restarting Lively...');
    }
    if (target === 'timetable') {
      openVisibly(path.join(ROOT, 'timetable.json'));
      return sendOpenResponse('Opening timetable.json');
    }
    return sendJSON(res, 400, { error: 'Unknown target or path' }, req);
  }

  // 6. Run update_wallpaper.py on demand & restart Lively Wallpaper (supports GET & POST)
  if (pathname === '/api/run-update') {
    console.log('[Server] Executing update_wallpaper.py on demand...');
    exec('python update_wallpaper.py', { cwd: ROOT }, (err, stdout, stderr) => {
      if (err) {
        console.error('[Server] update_wallpaper.py error:', err.message);
      } else {
        console.log('[Server] update_wallpaper.py completed.');
      }
    });
    return sendOpenResponse('Running update_wallpaper.py & restarting Lively...');
  }

  // 7. Static File Server (serves index.html, TT.jpeg, app.js, etc.)
  let filePath = path.join(ROOT, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end('404 Not Found');
      return;
    }

    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Private-Network': 'true',
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Wallpaper Server] Listening on http://0.0.0.0:${PORT} (http://localhost:${PORT})`);
  console.log(`[Wallpaper Server] AGY Timetable endpoint ready at http://localhost:${PORT}/api/sync-timetable`);
});
