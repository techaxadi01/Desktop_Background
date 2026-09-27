@echo off
cd /d "%~dp0"
title Live Wallpaper Background Bridge Server
echo ========================================================
echo  Live Wallpaper Background Server (Port 5000)
echo  Provides Timetable Auto-Sync ^& Real-time Data Sync
echo ========================================================
node server.js
pause
