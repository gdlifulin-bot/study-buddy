@echo off
chcp 65001 >nul
title 考研搭子 - 异地访问模式

echo.
echo   ========================================
echo     考研搭子 · 异地访问模式
echo   ========================================
echo.
echo   [1/2] 启动本地服务器...
start "考研搭子-服务器" cmd /c "cd /d %~dp0 && npm run dev"
echo         等待服务器就绪（6秒）...
timeout /t 6 /nobreak >nul

echo   [2/2] 启动 Cloudflare 隧道...
echo.
echo   ========================================
echo   隧道启动后，将显示公网域名（https://xxx.trycloudflare.com）
echo   把域名发给对象即可访问
echo   ========================================
echo.
echo   按 Ctrl+C 可关闭隧道
echo   （服务器会继续在后台运行）
echo.
echo   ----------------------------------------

D:\app\cloudflared.exe tunnel --url http://localhost:5173

pause
