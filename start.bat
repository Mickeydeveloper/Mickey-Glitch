@echo off
:loop
echo Starting Mickey Glitch Bot...
node server.js
echo Bot crashed or stopped. Restarting in 5 seconds...
timeout /t 5 /nobreak > nul
goto loop