# Disrupt Design Brief App

Next.js 14 scaffold for collecting design-brief data, summarising it with OpenAI and exporting the result to DOCX/PDF alongside reference images.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Add environment variables**
   Create `.env.local` and set your OpenAI key:
   ```env
   OPENAI_API_KEY=sk-...
   ```
3. **Run the development server**
   ```bash
   npm run dev
   ```
   The app will be available at http://localhost:3000.

## Scripts

- `npm run dev` – start Next.js in development mode
- `npm run build` – create an optimized production build
- `npm start` – run the production build locally

## Notes

- `.npmrc` pins the registry to npmjs.org to avoid mirror issues.
- Never commit real API keys; `.env.local` is already ignored.
