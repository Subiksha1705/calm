# Calm Sphere

> A safe, AI-powered space for people who want to talk anonymously and without judgment.

**Live App:** calm-mocha.vercel.app/chat

---

## About

Calm Sphere is a mental wellness chat application built for people who need someone (or something) to talk to. Whether you are processing your day, venting, or just want to be heard, Calm Sphere provides a warm and intelligent conversational experience powered by AI and supported by emotional and risk analysis.

---

## Features

- **Search Chat** — Find past conversations or search for topics across your chat history
- **Temporary Chat** — Have a session without saving, ideal for private one-time conversations
- **Emotional Analysis** — AI detects the emotional tone of messages in real time
- **Risk Analysis** — Identifies high-risk language patterns and responds with appropriate care
- **Google Sign-In** — Simple and secure authentication via Google OAuth
- **Gemini AI** — Powered by Google's Gemini model for empathetic, context-aware responses

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js |
| Backend | FastAPI (Python) |
| Database / Auth | Firebase (Firestore + Google Auth) |
| AI Model | Google Gemini |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |

---

## Project Structure

```
calm-sphere/
├── frontend/          # Next.js app (deployed on Vercel)
│   ├── app/
│   ├── components/
│   └── ...
├── backend/           # FastAPI server (deployed on Render)
│   ├── main.py
│   ├── routers/
│   ├── services/
│   │   ├── emotional_analysis.py
│   │   ├── risk_analysis.py
│   │   └── gemini_service.py
│   └── ...
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- Firebase project with Firestore and Google Auth enabled
- Google Gemini API key

### 1. Clone the Repository

```bash
git clone https://github.com/Subiksha1705/calm.git
cd calm
```

### 2. Frontend Setup

```bash
cd frontend
yarn install
```

Create a `.env.local` file in `frontend`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

```bash
yarn dev
```

### 3. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in `backend`:

```env
GEMINI_API_KEY=your_gemini_api_key
FIREBASE_CREDENTIALS=path/to/serviceAccountKey.json
```

```bash
uvicorn main:app --reload
```

---

## Deployment

### Frontend (Vercel)

- Connect the GitHub repo to [Vercel](https://vercel.com)
- Set environment variables in Vercel project settings
- Vercel auto-deploys on every push to `main`

### Backend (Render)

- Connect the GitHub repo to [Render](https://render.com)
- Set environment variables in Render service settings
- Start command: `uvicorn main:app --host 0.0.0.0 --port 10000`

---

## Privacy & Safety

Calm Sphere takes user safety seriously:

- **Temporary Chat** sessions are never persisted to the database
- **Risk Analysis** flags messages that may indicate distress, triggering appropriate responses
- All auth is handled via **Firebase + Google OAuth** — no passwords stored

---

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create your branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## Authors

- **Subiksha** — [GitHub](https://github.com/Subiksha1705)

---

## License

This project is open source. See [LICENSE](LICENSE) for details.

---

## Guidelines & Disclaimers

Calm Sphere is an AI-powered application and is here to support you, but please keep the following in mind:

- **AI can make mistakes** — Calm Spear uses Gemini AI, which may occasionally misunderstand your message, give an off-response, or miss context. Please don't rely on it as a substitute for professional advice.
- **Not a replacement for therapy** — Calm Spear is a space to talk and feel heard, but it is **not** a mental health service. If you're in crisis or need real support, please reach out to a licensed professional or a helpline in your country.
- **Risk detection is not perfect** — Our risk analysis does its best to flag distressing content, but it may not catch everything. If you or someone you know is in danger, please contact emergency services immediately.
- **Temporary chats are session-only** — Anything discussed in a temporary chat is not saved, but no system is 100% infallible. Avoid sharing sensitive personal information.
- **Be kind** — This platform is built for people who want to talk. Use it with empathy, for yourself and others.

---

> *"Sometimes you just need to talk. Calm Sphere is here for that."*
