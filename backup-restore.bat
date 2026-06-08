@echo off
chcp 65001 >nul
title 考研搭子 - 备份恢复

echo.
echo   ========================================
echo     考研搭子 · 数据库备份恢复
echo   ========================================
echo.
echo   [1] 恢复最近备份
echo   [2] 创建新备份
echo   [3] 退出
echo.
set /p choice="  请选择 (1/2/3): "

if "%choice%"=="1" goto restore
if "%choice%"=="2" goto backup
goto end

:restore
echo.
echo   正在恢复数据库...
set BACKUP_DIR=D:\study-buddy databeifen
set DB_PATH=D:\study-buddy data\studybuddy.db

if not exist "%BACKUP_DIR%" (
    echo   备份目录不存在！
    pause
    goto end
)

dir /b /o-d "%BACKUP_DIR%\backup_*.db" > %TEMP%\db_list.txt
set /p LATEST=<%TEMP%\db_list.txt

if "%LATEST%"=="" (
    echo   未找到备份文件！
    pause
    goto end
)

echo   找到备份: %LATEST%
echo   确认恢复？(Y/N)
set /p confirm=
if /i not "%confirm%"=="Y" goto end

copy "%BACKUP_DIR%\%LATEST%" "%DB_PATH%" /Y
echo   数据库已恢复！
pause
goto end

:backup
echo.
echo   正在创建备份...
set BACKUP_DIR=D:\study-buddy databeifen
set DB_PATH=D:\study-buddy data\studybuddy.db

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set dt=%%I
set dt=%dt:~0,8%

copy "%DB_PATH%" "%BACKUP_DIR%\backup_%dt%.db" /Y >nul 2>&1
echo   备份已创建: backup_%dt%.db
pause
goto end

:end
