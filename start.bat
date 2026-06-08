@echo off
chcp 65001 >nul
title 考研搭子 - 学习监督网站

echo.
echo   ================================
echo     考研搭子 · 学习监督网站
echo   ================================
echo.
echo   正在启动服务器...
echo.

cd /d "%~dp0"
npm run dev

pause
