# VoxPop Integration Setup

## Backend Integration Complete ✓

The backend agent logic has been integrated with the frontend. Here's what changed:

### Backend Changes (`server.js`)
- Added **Express server** running on port 3000
- Added **CORS support** for frontend communication
- Added **POST `/api/simulate`** endpoint that accepts World Cup scenarios
- Integrated agent **movement** and **reaction** logic from existing modules
- Realtime event listener continues to run alongside REST API

### Frontend Changes (`agentropolis_voxpop.html`)
- **Removed hardcoded Claude API key and URL** ✓
- Updated to call `http://localhost:3000/api/simulate`
- Frontend calculates metrics from backend agent state
- Auto-detects local vs deployed backend URL

### New Files
- `metrics.js` - Calculates hype, sentiment, and surge from agent data

## Running VoxPop

### Prerequisites
Make sure your `.env` file in `/backend` has:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key (NOT exposed to frontend)
SUPABASE_ANON_KEY=your_anon_key
OPENAI_API_KEY=your_openai_key
```

### Start Backend
```bash
cd backend
npm install
node server.js
```
Backend will run on `http://localhost:3000`

### Serve Frontend
Option 1: Simple HTTP server
```bash
cd frontend
npx http-server
```

Option 2: VS Code Live Server Extension
- Right-click `agentropolis_voxpop.html` → "Open with Live Server"

Option 3: Python
```bash
cd frontend
python -m http.server 8000
```

## How It Works

1. **User submits scenario** in frontend (e.g., "USA gets grouped with Brazil")
2. **Frontend calls** `POST /api/simulate` with the scenario
3. **Backend processes** the simulation:
   - Updates agent positions toward event hub
   - Clears previous reactions
   - Generates new agent reactions using OpenAI
4. **Backend calculates metrics**:
   - Hype = average agent mood intensity
   - Sentiment = celebration vs disappointment ratio  
   - Surge = active agents percentage
5. **Frontend displays** animated metrics with visual feedback

## Security Notes ✓
- ✅ No API keys in frontend code
- ✅ No hardcoded URLs (uses relative paths)
- ✅ All credentials stay in backend `.env`
- ✅ CORS configured for local development
