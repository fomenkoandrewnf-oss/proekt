# Disrupt Design Brief App

This is a minimal Next.js 14 application for collecting a design brief, summarizing answers with OpenAI, and generating reference images and downloadable `.docx`/`.pdf` files.

## Setup
1. `npm install`
2. Create `.env.local` with `OPENAI_API_KEY=...`
3. `npm run dev`

The app exposes health check at `/api/health`.
