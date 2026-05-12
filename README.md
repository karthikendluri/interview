# Interview AI Assistant 🎙️

A voice-powered interview assistant that captures questions from Zoom or Microsoft Teams and generates AI-suggested answers in real time using Claude.

## Features
- 🎙️ Voice capture via browser Speech Recognition
- 🤖 AI-powered STAR-method answers via Claude API
- 💼 Customizable profile and job description
- 📋 Session history with one-click reload
- 🌙 Dark mode support
- 📱 Mobile responsive

## Setup

### 1. Get your Anthropic API Key
- Go to [console.anthropic.com](https://console.anthropic.com)
- Create an API key

### 2. Deploy to Vercel
- Fork or upload this repo to GitHub
- Connect to [vercel.com](https://vercel.com)
- Import the repo — no env vars needed (key is entered in the app)

### 3. Use the App
1. Open the deployed URL
2. Enter your Anthropic API key in the app and click **Save**
3. Select your source: **Zoom**, **Teams**, or **Direct Mic**
4. Click the mic button and speak (or type) the interview question
5. Get your AI-generated answer instantly

## Voice Capture Tips

### Windows (Zoom/Teams audio)
- Use **Stereo Mix** in Sound settings as your mic input
- Or install [VB-Cable](https://vb-audio.com/Cable/) for virtual audio routing

### Mac (Zoom/Teams audio)
- Install [BlackHole](https://existential.audio/blackhole/) or [Loopback](https://rogueamoeba.com/loopback/)
- Route system audio into your mic input

## Tech Stack
- Vanilla HTML, CSS, JavaScript
- Web Speech API (built into Chrome/Edge)
- Anthropic Claude API (`claude-sonnet-4-20250514`)
- Deployed on Vercel (static hosting)

## License
MIT
