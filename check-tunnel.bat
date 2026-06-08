@echo off
chcp 65001 >nul
title 隧道状态检查

echo.
echo   ========================================
echo     隧道连接状态检查
echo   ========================================
echo.

echo   [1] 检查本地服务器...
curl -s -o nul -w "  服务器 3001: HTTP %%{http_code}" http://localhost:3001/api/config 2>nul
echo.
curl -s -o nul -w "  前端   5173: HTTP %%{http_code}" http://localhost:5173 2>nul
echo.

echo.
echo   [2] 检查 Cloudflare 隧道进程...
tasklist /fi "imagename eq cloudflared.exe" 2>nul | find "cloudflared" >nul
if %errorlevel%==0 (echo   隧道正在运行) else (echo   隧道未运行)

echo.
echo   [3] 局域网IP地址...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| find "IPv4"') do echo   http://%%a:5173

echo.
pause
