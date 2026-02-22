@echo off
chcp 65001 >nul
echo ━━━ Textry 월별 정산 ━━━
echo.
cd /d C:\Users\user\textry\collect
node settle_manual.js %1
echo.
echo ━━━ 완료 ━━━
pause
