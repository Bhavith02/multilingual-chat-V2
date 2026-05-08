# Multilingual Chat

A real-time multilingual chat application with two modes:

- **AI Chatbot** — one-on-one conversation with an AI assistant that responds in your chosen language
- **Group Chat** — real-time rooms where everyone speaks their own language and sees messages translated into theirs automatically

Built with Next.js, Socket.io, and Groq AI (free tier).

---

## Features

### AI Chatbot (`/chat`)
- Pick your language from 16 options before starting — the AI always responds in that language
- Type in English **or** your selected language — both are understood
- Full conversation memory (last 20 messages kept for context)
- **English meaning** panel on every AI response — see what the AI said in plain English
- **Learn** panel — pronunciation guide for the AI response in your language
- Voice input via Web Speech API (Chrome)
- Trash icon to clear session and start fresh
- Messages capped at 2000 characters

### Group Chat (`/`)
- Create a room — get a 6-character room code to share with others
- Join any room with the code
- Each participant picks their own language on join
- Every message is automatically translated into each participant language in real-time
- Type in English **or** your selected language — the system detects and translates correctly
- **English meaning** panel on received messages (when your language is not English)
- **Learn** panel on received messages — pronunciation guide in the sender language
- Voice input on the message box
- Up to 20 participants per room, 200 rooms at a time
- Room auto-closes when the last person leaves

### What stays the same for everyone
- The original message text is always preserved alongside the translation
- Your own messages are never re-translated back to you
- All translation and AI is done server-side via Groq — no API key needed on the client

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, custom server) |
| Real-time | Socket.io 4.8 |
| AI (chat + translation + pronunciation) | Groq SDK — llama-3.3-70b-versatile / llama-3.1-8b-instant |
| Styling | Tailwind CSS v4 |
| Language | TypeScript |
| Runtime | Node.js via tsx |

---

## Getting Started (local development)

**Prerequisites:** Node.js 20+, a free Groq API key from https://console.groq.com

```bash
# 1. Clone the repo
git clone https://github.com/Bhavith02/multilingual-chat-V2.git
cd multilingual-chat-V2

# 2. Install dependencies
npm install

# 3. Add your Groq API key
echo "GROQ_API_KEY=your_key_here" > .env.local

# 4. Start the dev server
npm run dev
```

Open http://localhost:3000

---

## Deployment

### Render (free, no credit card)

1. Push to GitHub
2. Go to render.com -> New Web Service -> connect repo
3. Settings:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. Add environment variable: `GROQ_API_KEY=your_key_here`
5. Deploy — get a yourapp.onrender.com URL

Note: Render free tier sleeps after 15 min of inactivity. First request after sleep takes ~30s.

### Docker (Fly.io or any container host)

A Dockerfile is included for container-based deployment.

```bash
docker build -t multilingual-chat .
docker run -p 3000:3000 -e GROQ_API_KEY=your_key_here multilingual-chat
```

---

## Project Structure

```
app/
  page.tsx                  Landing page
  chat/page.tsx             AI chatbot page
  room/[roomId]/            Group chat room page
  api/
    chat/route.ts           AI chatbot SSE endpoint
    translate/route.ts      English meaning translation endpoint
    learn/route.ts          Pronunciation guide endpoint

components/
  LandingPage.tsx           Home screen with mode selection
  ChatWindow.tsx            AI chatbot UI + language picker
  MessageList.tsx           Chat message list
  MessageBubble.tsx         Individual message with Learn + English meaning panels
  ChatInput.tsx             Text input with voice support
  RoomPage.tsx              Group chat room UI
  JoinModal.tsx             Create/join room modal
  LearnPanel.tsx            Pronunciation panel (group chat)
  TypingIndicator.tsx       AI typing animation

lib/
  session.ts                In-memory AI conversation sessions (24h TTL, max 500)
  socket-handlers.ts        Socket.io group chat logic
  room-store.ts             In-memory room/user store (max 200 rooms, 20 users/room)
  translation.ts            Language detection + translation via Groq
  openai.ts                 AI response via Groq (llama-3.3-70b-versatile)

types/
  index.ts                  Shared TypeScript types
  socket.ts                 Socket.io event payload types
```

---

## Supported Languages

English, Hindi, Spanish, French, German, Japanese, Korean, Chinese, Arabic, Portuguese, Russian, Italian, Tamil, Telugu, Kannada, Malayalam, Bengali, Gujarati, Marathi, Punjabi, Turkish, Polish, Dutch, Vietnamese, Thai, Indonesian, Swedish, Ukrainian

---

## Security and Limits

- Messages capped at 2000 characters (API + socket)
- Display names capped at 50 characters
- Language codes validated (must be 2-letter ISO 639-1)
- Room size: max 20 participants
- System-wide room cap: max 200 concurrent rooms
- Socket rate limit: 1 message per 500ms per connection
- Session cookie: HttpOnly, SameSite=Strict, 24h TTL
- API keys never exposed to the client
