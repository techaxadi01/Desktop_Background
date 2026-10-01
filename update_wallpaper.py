#!/usr/bin/env python3
"""
Desktop Wallpaper Data Synchronizer & Lively Restarter
Usage:
    python update_wallpaper.py
    python update_wallpaper.py --no-restart
    python update_wallpaper.py --scan
"""

import sys
import os
import json
import time
import hashlib
import subprocess
import shutil
import socket
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ANSI Colors
GREEN = "\033[92m"
CYAN = "\033[96m"
YELLOW = "\033[93m"
RED = "\033[91m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"

# Reconfigure stdout for UTF-8 on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    os.system("")

def log_info(msg):
    print(f"{CYAN}[INFO]{RESET} {msg}")

def log_ok(msg):
    print(f"{GREEN}[OK]{RESET} {msg}")

def log_warn(msg):
    print(f"{YELLOW}[WARN]{RESET} {msg}")

HAS_ERROR = False

def log_err(msg):
    global HAS_ERROR
    HAS_ERROR = True
    print(f"{RED}[ERROR]{RESET} {msg}")


def get_image_file():
    """Find timetable image candidate in project folder"""
    candidates = ["TT.jpeg", "TT.jpg", "TT.png", "TT1.jpeg"]
    for name in candidates:
        full = os.path.join(BASE_DIR, name)
        if os.path.exists(full):
            return full, name
    return None, None


def compute_file_md5(filepath):
    """Compute MD5 hash of a file"""
    h = hashlib.md5()
    with open(filepath, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()


def check_and_sync_image(force_scan=False):
    """Detect if TT.jpeg was updated and run AGY AI vision scan if so"""
    img_path, img_name = get_image_file()
    if not img_path:
        return False

    hash_file = os.path.join(BASE_DIR, ".tt_image_hash")
    current_hash = compute_file_md5(img_path)
    last_hash = ""

    if os.path.exists(hash_file):
        try:
            with open(hash_file, "r", encoding="utf-8") as f:
                last_hash = f.read().strip()
        except Exception:
            pass

    has_changed = (current_hash != last_hash)

    if has_changed or force_scan:
        log_info(f"Detected updated {img_name}! Running Antigravity AI vision scan...")
        try:
            proc = subprocess.run(["node", "sync_timetable.js"], cwd=BASE_DIR, capture_output=True, text=True)
            if proc.returncode == 0:
                log_ok(f"Antigravity AI extracted timetable from {img_name} successfully!")
                with open(hash_file, "w", encoding="utf-8") as f:
                    f.write(current_hash)
                return True
            else:
                log_err(f"AI extraction failed: {proc.stderr}")
                return False
        except Exception as e:
            log_err(f"Failed to execute sync_timetable.js: {e}")
            return False
    else:
        log_ok(f"{img_name} unchanged since last scan (hash verified).")
        return False


def sync_timetable():
    """Sync timetable.json -> timetable.js & update data-backup.json/js"""
    json_path = os.path.join(BASE_DIR, "timetable.json")
    js_path = os.path.join(BASE_DIR, "timetable.js")

    if not os.path.exists(json_path):
        log_warn("timetable.json not found, skipping timetable sync.")
        return False

    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if not isinstance(data, dict):
            raise ValueError("timetable.json must be a JSON object with day names as keys.")

        # Write timetable.js for standalone file:/// compatibility
        js_content = f"// Auto-synced from timetable.json by update_wallpaper.py\nwindow.TIMETABLE_CACHE = {json.dumps(data, indent=2)};\n"
        with open(js_path, "w", encoding="utf-8") as f:
            f.write(js_content)

        day_count = len([k for k in data.keys() if data[k]])
        slot_count = sum(len(v) for v in data.values() if isinstance(v, list))
        log_ok(f"Timetable: Synced {day_count} active days ({slot_count} slots) -> timetable.js")

        # Update backup files if they exist
        backup_json_path = os.path.join(BASE_DIR, "data-backup.json")
        backup_js_path = os.path.join(BASE_DIR, "data-backup.js")
        if os.path.exists(backup_json_path):
            try:
                with open(backup_json_path, "r", encoding="utf-8") as bf:
                    backup_data = json.load(bf)
                backup_data["timetable"] = data
                backup_data["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                with open(backup_json_path, "w", encoding="utf-8") as bf:
                    json.dump(backup_data, bf, indent=2)
                with open(backup_js_path, "w", encoding="utf-8") as bjf:
                    bjf.write(f"// Auto-generated backup data for offline file:/// recovery\nwindow.BACKUP_DATA = {json.dumps(backup_data, indent=2)};\n")
            except Exception as e:
                log_warn(f"Failed to update data-backup files: {e}")

        return True
    except Exception as e:
        log_err(f"Failed to sync timetable.json: {e}")
        return False


def sync_daily_tasks():
    """Sync daily_tasks.txt -> daily_tasks.js"""
    txt_path = os.path.join(BASE_DIR, "daily_tasks.txt")
    js_path = os.path.join(BASE_DIR, "daily_tasks.js")

    if not os.path.exists(txt_path):
        log_warn("daily_tasks.txt not found, skipping daily tasks sync.")
        return False

    try:
        tasks = []
        with open(txt_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    tasks.append(line)

        js_content = f"// Auto-synced from daily_tasks.txt by update_wallpaper.py\nwindow.DAILY_TASKS = {json.dumps(tasks, indent=2)};\n"
        with open(js_path, "w", encoding="utf-8") as f:
            f.write(js_content)

        log_ok(f"Daily Tasks: Synced {len(tasks)} tasks -> daily_tasks.js")
        return True
    except Exception as e:
        log_err(f"Failed to sync daily_tasks.txt: {e}")
        return False


def sync_links():
    """Sync links.txt -> links.js & links.json"""
    txt_path = os.path.join(BASE_DIR, "links.txt")
    js_path = os.path.join(BASE_DIR, "links.js")
    json_path = os.path.join(BASE_DIR, "links.json")

    if not os.path.exists(txt_path):
        return True

    try:
        links = []
        with open(txt_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    parts = [p.strip() for p in line.split("|")]
                    if len(parts) >= 2:
                        icon = parts[2] if len(parts) >= 3 else "link"
                        links.append({"name": parts[0], "url": parts[1], "icon": icon})

        js_content = f"// Auto-synced from links.txt by update_wallpaper.py\nwindow.CONSOLE_LINKS = {json.dumps(links, indent=2)};\n"
        with open(js_path, "w", encoding="utf-8") as f:
            f.write(js_content)

        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(links, f, indent=2)

        log_ok(f"Console Links: Synced {len(links)} quick links -> links.js & links.json")
        return True
    except Exception as e:
        log_err(f"Failed to sync links.txt: {e}")
        return False


def sync_streak_history():
    """Sync streak_history.txt <-> streak_history.js & merge with data-backup.json"""
    txt_path = os.path.join(BASE_DIR, "streak_history.txt")
    js_path = os.path.join(BASE_DIR, "streak_history.js")
    backup_path = os.path.join(BASE_DIR, "data-backup.json")

    streak_data = {}

    # 1. Read existing entries from streak_history.txt if available
    if os.path.exists(txt_path):
        try:
            with open(txt_path, "r", encoding="utf-8") as f:
                for line in f:
                    stripped = line.strip()
                    if stripped and not stripped.startswith(("#", "//", "[")):
                        m = re.match(r"^(\d{4}-\d{2}-\d{2})\s*[:=]\s*(\d+)", stripped)
                        if m:
                            date_str = m.group(1)
                            val = min(100, max(0, int(m.group(2))))
                            streak_data[date_str] = val
        except Exception as e:
            log_err(f"Error reading streak_history.txt: {e}")

    # 2. Merge dailyHistory recorded in data-backup.json
    merged_new = False
    if os.path.exists(backup_path):
        try:
            with open(backup_path, "r", encoding="utf-8") as f:
                backup = json.load(f)
                daily_history = backup.get("streak", {}).get("dailyHistory", {})
                for date_str, percent in daily_history.items():
                    val = min(100, max(0, int(percent)))
                    if date_str not in streak_data or streak_data[date_str] != val:
                        streak_data[date_str] = val
                        merged_new = True
        except Exception as e:
            log_warn(f"Could not merge streak from backup: {e}")

    # 3. If new entries were merged from backup, update streak_history.txt
    if merged_new or not os.path.exists(txt_path):
        try:
            header = (
                "# ====================================================================\n"
                "# STREAK HISTORY (Daily Task Completion %)\n"
                "# ====================================================================\n"
                "# Format: YYYY-MM-DD: percentage (0 to 100)\n"
                "# Lines starting with # are comments.\n"
                "# ====================================================================\n\n"
            )
            sorted_dates = sorted(streak_data.keys())
            content = header + "\n".join(f"{d}: {streak_data[d]}" for d in sorted_dates) + "\n"
            with open(txt_path, "w", encoding="utf-8") as f:
                f.write(content)
        except Exception as e:
            log_err(f"Failed to update streak_history.txt: {e}")

    # 4. Write streak_history.js
    try:
        js_content = f"// Auto-synced from streak_history.txt by update_wallpaper.py\nwindow.STREAK_HISTORY = {json.dumps(streak_data, indent=2)};\n"
        with open(js_path, "w", encoding="utf-8") as f:
            f.write(js_content)

        log_ok(f"Streak History: Synced {len(streak_data)} history entries -> streak_history.js")
        return True
    except Exception as e:
        log_err(f"Failed to sync streak_history.txt: {e}")
        return False


def ensure_server_running():
    """Ensure background server.js is running silently on port 5000"""
    import urllib.request
    import urllib.error

    # 1. Kill any existing visible bridge server windows
    if sys.platform == "win32":
        try:
            subprocess.run(
                ["taskkill", "/F", "/FI", "WINDOWTITLE eq Live Wallpaper Background Bridge Server*"],
                capture_output=True,
                timeout=5
            )
        except Exception:
            pass

    # 2. Check if already running and responding on port 5000
    is_running = False
    try:
        req = urllib.request.Request("http://127.0.0.1:5000/api/open?target=healthcheck")
        with urllib.request.urlopen(req, timeout=1.0) as resp:
            if resp.status == 200:
                is_running = True
    except urllib.error.HTTPError as e:
        if e.code in (200, 400):
            is_running = True
    except Exception:
        is_running = False

    if is_running:
        log_ok("Background bridge server is running on port 5000.")
        return True

    # 3. Kill any stale process on port 5000
    if sys.platform == "win32":
        try:
            subprocess.run(
                ["powershell", "-NoProfile", "-Command", "Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"],
                capture_output=True,
                timeout=5
            )
            time.sleep(0.5)
        except Exception:
            pass

    server_js = os.path.join(BASE_DIR, "server.js")
    if os.path.exists(server_js) and shutil.which("node"):
        try:
            log_info("Starting background bridge server silently (port 5000)...")
            if sys.platform == "win32":
                subprocess.run(
                    ["powershell", "-NoProfile", "-Command", f"Start-Process node -ArgumentList 'server.js' -WorkingDirectory '{BASE_DIR}' -WindowStyle Hidden"],
                    cwd=BASE_DIR,
                    capture_output=True
                )
            else:
                subprocess.Popen(
                    ["node", "server.js"],
                    cwd=BASE_DIR,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    stdin=subprocess.DEVNULL
                )
            time.sleep(1.2)
            log_ok("Background bridge server started silently.")
            return True
        except Exception as e:
            log_warn(f"Could not start background server: {e}")
    return False


def find_lively_app_id():
    """Find the Microsoft Store AppID for Lively Wallpaper"""
    try:
        res = subprocess.run(
            ["powershell", "-NoProfile", "-Command", "Get-StartApps *lively* | Select-Object -ExpandProperty AppID"],
            capture_output=True, text=True, timeout=5
        )
        for line in res.stdout.splitlines():
            line = line.strip()
            if "Lively" in line or "12030rocksdanister" in line:
                return line
    except Exception:
        pass
    return "12030rocksdanister.LivelyWallpaper_97hta09mmv6hy!App"


def restart_lively():
    """Cleanly restart Lively Wallpaper to reload files on desktop"""
    log_info("Restarting Lively Wallpaper...")

    # 1. Kill any active Lively processes
    procs_to_kill = [
        "Lively.Player.WebView2.exe",
        "Lively.Watchdog.exe",
        "Lively.UI.WinUI.exe",
        "Lively.exe"
    ]

    cmd = ["taskkill", "/F", "/T"]
    for p in procs_to_kill:
        cmd.extend(["/IM", p])

    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.5)

    # Clear WebView2 code/disk cache to guarantee fresh wallpaper load
    try:
        wv_cache_base = os.path.expandvars(r"%LOCALAPPDATA%\Packages\12030rocksdanister.LivelyWallpaper_97hta09mmv6hy\LocalCache\Local\Lively Wallpaper\WebView2\Lively.Player.WebView2\Duplicate\EBWebView\Default")
        for cname in ["Cache", "Code Cache", "GPUCache", "DawnGraphiteCache"]:
            cpath = os.path.join(wv_cache_base, cname)
            if os.path.exists(cpath):
                shutil.rmtree(cpath, ignore_errors=True)
    except Exception:
        pass

    # 2. Launch Lively
    app_id = find_lively_app_id()
    launched = False

    if app_id:
        try:
            subprocess.Popen(["explorer.exe", f"shell:AppsFolder\\{app_id}"])
            launched = True
        except Exception as e:
            log_warn(f"Failed to launch via shell:AppsFolder: {e}")

    # Fallback: check typical standalone installer path
    if not launched:
        local_app_data = os.environ.get("LOCALAPPDATA", "")
        fallback_exe = os.path.join(local_app_data, "Programs", "Lively Wallpaper", "Lively.exe")
        if os.path.exists(fallback_exe):
            subprocess.Popen([fallback_exe])
            launched = True

    # 3. Verify Lively is running
    time.sleep(3.0)
    try:
        chk = subprocess.run(["tasklist", "/FI", "IMAGENAME eq Lively.exe"], capture_output=True, text=True)
        if "Lively.exe" in chk.stdout:
            log_ok("Lively Wallpaper restarted successfully! Fresh data is active.")
            return True
        else:
            log_warn("Lively Wallpaper command executed, waiting for process initialization.")
            return True
    except Exception:
        return True


def main():
    global HAS_ERROR
    print(f"\n{BOLD}{CYAN}======================================================{RESET}")
    print(f"{BOLD}{CYAN}   CYBER COMBAT DESKTOP - WALLPAPER SYNC & RESTART    {RESET}")
    print(f"{BOLD}{CYAN}======================================================{RESET}\n")

    args = sys.argv[1:]
    no_restart = "--no-restart" in args or "-n" in args
    force_scan = "--scan" in args or "--ai" in args or "--image" in args

    try:
        # Step 1: Detect TT.jpeg update and extract timetable if changed
        check_and_sync_image(force_scan=force_scan)

        # Step 2: Sync all data files to JS caches
        log_info("Syncing data files to offline cache...")
        ok1 = sync_timetable()
        ok2 = sync_daily_tasks()
        ok3 = sync_links()
        ok4 = sync_streak_history()

        if not (ok1 and ok2 and ok3 and ok4):
            HAS_ERROR = True

        # Step 3: Ensure bridge server is running silently in background
        ensure_server_running()

        # Step 4: Restart Lively Wallpaper
        if not no_restart:
            print()
            restart_ok = restart_lively()
            if not restart_ok:
                HAS_ERROR = True
        else:
            log_info("Skipping Lively restart (--no-restart passed).")

    except Exception as e:
        log_err(f"Fatal error during sync: {e}")
        HAS_ERROR = True

    # Auto-close on success; stay open only if there is an error
    if HAS_ERROR:
        print(f"\n{RED}{BOLD}[ERROR] One or more operations encountered an issue. Window kept open for inspection.{RESET}\n")
        if sys.stdin and sys.stdin.isatty():
            try:
                input(f"{YELLOW}Press Enter to exit...{RESET}")
            except Exception:
                pass
        sys.exit(1)
    else:
        print(f"\n{GREEN}{BOLD}All operations completed successfully! Auto-closing in 1s...{RESET}\n")
        time.sleep(1.0)
        sys.exit(0)


if __name__ == "__main__":
    main()
