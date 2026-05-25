# OS1 Interface — Voice AI (Her-inspired)

A beautiful voice-first AI interface inspired by the movie *Her*, powered by ElevenLabs Conversational AI.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure your API key

Create a `.env` file:

```env
VITE_ELEVENLABS_AGENT_ID=your_agent_id_here
```

### 3. Run the dev server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### 4. Mobile Access (optional)

To access from your phone on the same network:

1. Find your local IP:
   ```bash
   ipconfig getifaddr en0
   ```

2. Generate SSL certificates (required for microphone access on mobile):
   ```bash
   brew install mkcert
   mkcert -install
   mkcert localhost 127.0.0.1 YOUR_LOCAL_IP ::1
   ```

3. Move the generated `.pem` files to the `certs/` directory.

4. Restart the dev server — it will automatically detect the certs and enable HTTPS.

5. Open `https://YOUR_LOCAL_IP:5173` on your phone.

## Features

- 🎙️ Voice-first conversational interface
- 🎨 Beautiful OS1-inspired Three.js animation
- 📊 Real-time audio visualization
- 💬 Optional chat transcript (toggle with chat button)
- 📱 Mobile-friendly, works on phones via HTTPS

## Tech Stack

- React + TypeScript + Vite
- Three.js (OS1 animation)
- ElevenLabs Conversational AI SDK
- Tailwind CSS

## Credits

- OS1 UI design inspired by [github.com/callbacked/os1](https://github.com/callbacked/os1)
