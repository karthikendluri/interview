INTERVIEW AI - SETUP GUIDE
==========================

WHY A SERVER?
-------------
Browsers block direct calls to external APIs (CORS policy).
This tiny Node.js server acts as a local proxy - no data leaves your machine except the API call to Anthropic.

REQUIREMENTS
------------
- Node.js installed (https://nodejs.org - download LTS version)
- Chrome or Edge browser

SETUP (one time only)
----------------------
1. Install Node.js from https://nodejs.org
2. Extract this folder anywhere (e.g. Desktop)

START THE APP
-------------
Windows: Double-click  start.bat
Mac/Linux: Open terminal in this folder and run:  node server.js

Then open Chrome and go to:  http://localhost:3000

USAGE
-----
1. Enter your Anthropic API key (get one free at console.anthropic.com)
2. Fill in your name, role, and paste your resume/background
3. Click "Start Listening"
4. Chrome will ask for microphone permission - click Allow (only once)
5. Speak - answers appear automatically after you stop talking

MIC PERMISSION - ONE TIME FIX
------------------------------
If Chrome keeps asking for mic permission:
1. Go to chrome://settings/content/microphone
2. Make sure localhost is NOT in the "Blocked" list
3. After clicking Allow once on the app, Chrome remembers it permanently

NOTES
-----
- Use Chrome or Edge (not Firefox - no speech recognition support)
- Keep this server running in the background during your interview
- The server only runs locally - nothing is stored anywhere
