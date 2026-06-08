@echo off
chcp 65001 >nul
title 考研搭子 - Ngrok 备用隧道

echo.
echo   ========================================
echo     考研搭子 · Ngrok 备用通道
echo   ========================================
echo.
echo   [提醒] 使用前需先配置 ngrok authtoken（仅需一次）：
echo   1. 注册 https://dashboard.ngrok.com/signup
echo   2. 获取 authtoken
echo   3. 运行: ngrok config add-authtoken 你的token
echo.
echo   [1/2] 启动本地服务器...
start "考研搭子-服务器" cmd /c "cd /d %~dp0 && npm run dev"
echo         等待服务器就绪...
timeout /t 6 /nobreak >nul

echo   [2/2] 启动 Ngrok 隧道...
echo.
echo   ========================================
echo   公网地址将显示在下方
echo   Forwarding 行即为对象访问地址
echo   免费版每 2 小时会断开，需重新运行此脚本
echo   ========================================
echo.

ngrok http 5173

pause
