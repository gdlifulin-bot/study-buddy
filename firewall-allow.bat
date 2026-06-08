@echo off
chcp 65001 >nul
title 防火墙放行 - 考研搭子

echo.
echo   ========================================
echo     防火墙放行 · 端口 3001 / 5173
echo   ========================================
echo.
echo   正在添加防火墙入站规则...

netsh advfirewall firewall add rule name="考研搭子-5173" dir=in action=allow protocol=TCP localport=5173 >nul 2>&1
netsh advfirewall firewall add rule name="考研搭子-3001" dir=in action=allow protocol=TCP localport=3001 >nul 2>&1

echo   防火墙规则已配置（如已存在则跳过）
echo.
echo   如需删除规则，运行：
echo   netsh advfirewall firewall delete rule name="考研搭子-5173"
echo   netsh advfirewall firewall delete rule name="考研搭子-3001"
echo.
pause
