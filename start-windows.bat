@echo off
cd /d %~dp0
if not exist server\.env (
  echo Copy server\.env.example to server\.env and add your OpenAI API key and two unique secrets.
  pause
  exit /b 1
)
start "AI Commander API" cmd /k "cd /d %~dp0server && npm run dev"
start "AI Commander Web" cmd /k "cd /d %~dp0client && npm run dev"
