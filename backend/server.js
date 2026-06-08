import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

import { reactToMatch } from './reactions.js';
import { updateAgentPositions } from './movement.js';
import { calculateMetrics } from './metrics.js';

const app = express();
const PORT = process.env.PORT || 3000;
const DEFAULT_HUB_ID = 1;

// Middleware
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeCountry(country, knownCountries) {
  if (!country || typeof country !== 'string') {
    return null;
  }

  const cleanCountry = country.trim();
  return knownCountries.find(c => c.toLowerCase() === cleanCountry.toLowerCase()) || cleanCountry;
}

function getMentionedCountries(text, knownCountries) {
  const lowerText = (text || '').toLowerCase();
  return knownCountries
    .filter(country => lowerText.includes(country.toLowerCase()))
    .sort((a, b) => b.length - a.length);
}

function inferWinnerFromText(text, knownCountries) {
  const lowerText = (text || '').toLowerCase();

  for (const country of knownCountries) {
    const countryText = country.toLowerCase();
    const winnerPatterns = [
      `${countryText} wins`,
      `${countryText} won`,
      `${countryText} beats`,
      `${countryText} beat`,
      `${countryText} defeats`,
      `${countryText} defeated`
    ];

    if (winnerPatterns.some(pattern => lowerText.includes(pattern))) {
      return country;
    }
  }

  for (const winner of knownCountries) {
    const winnerText = winner.toLowerCase();
    for (const loser of knownCountries) {
      if (winner === loser) continue;
      const loserText = loser.toLowerCase();
      if (lowerText.includes(`${loserText} loses to ${winnerText}`) || lowerText.includes(`${loserText} lost to ${winnerText}`)) {
        return winner;
      }
    }
  }

  return null;
}

async function getKnownCountries() {
  const { data, error } = await supabase
    .from('agents')
    .select('country');

  if (error || !data) {
    console.error('[Event] Failed to load countries:', error?.message);
    return [];
  }

  return unique(data.map(agent => agent.country));
}

async function resolveHubId(event) {
  if (event.hub_id) {
    return event.hub_id;
  }

  const candidateCountries = unique([event.country_a, event.country_b, event.winner]);
  for (const country of candidateCountries) {
    const { data: hub } = await supabase
      .from('map_hubs')
      .select('id')
      .eq('country', country)
      .limit(1)
      .maybeSingle();

    if (hub?.id) {
      return hub.id;
    }
  }

  return DEFAULT_HUB_ID;
}

async function normalizeEvent(event, knownCountries = []) {
  const countries = knownCountries.length > 0 ? knownCountries : await getKnownCountries();
  const eventDescription = event.event_description || event.scenario || 'Match event';
  const mentionedCountries = getMentionedCountries(eventDescription, countries);
  const countryA = normalizeCountry(event.country_a, countries) || mentionedCountries[0] || null;
  const countryB = normalizeCountry(event.country_b, countries) || mentionedCountries.find(country => country !== countryA) || null;
  const winner = normalizeCountry(event.winner, countries) || inferWinnerFromText(eventDescription, countries);
  const participantCountries = unique([countryA, countryB, winner, ...mentionedCountries]);

  return {
    ...event,
    event_description: eventDescription,
    country_a: countryA,
    country_b: countryB,
    winner,
    hub_id: await resolveHubId({ ...event, country_a: countryA, country_b: countryB, winner }),
    participant_countries: participantCountries
  };
}

async function getAgentState(countries = []) {
  let query = supabase
    .from('agents')
    .select('id, name, country, current_city, current_mood_intensity, status_activity, last_speech, pos_x, pos_z, current_hub_id')
    .order('id', { ascending: true });

  if (countries.length > 0) {
    query = query.in('country', countries);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return data || [];
}

async function clearPreviousReactions() {
  const { error } = await supabase
    .from('agents')
    .update({
      last_speech: null,
      status_activity: 'idle'
    })
    .not('last_speech', 'is', null);

  if (error) {
    console.error('Failed to clear reactions:', error);
  }
}

async function processEvent(event) {
  try {
    const normalizedEvent = await normalizeEvent(event);
    console.log(`[Event] Processing: ${normalizedEvent.event_description}`);
    console.log(`[Event] Countries: ${normalizedEvent.participant_countries.join(', ') || 'all'} | Winner: ${normalizedEvent.winner || 'unknown'}`);

    await updateAgentPositions(normalizedEvent.hub_id, normalizedEvent.participant_countries);
    console.log('[Event] Positions updated');

    await clearPreviousReactions();
    console.log('[Event] Previous reactions cleared');

    const agentsProcessed = await reactToMatch(normalizedEvent);
    console.log(`[Event] Agent reactions generated: ${agentsProcessed}`);

    if (normalizedEvent.id && normalizedEvent.source !== 'user') {
      await supabase
        .from('match_events')
        .delete()
        .eq('id', normalizedEvent.id);
      console.log('[Event] Event deleted from queue');
    }

    console.log('[Event] Processing completed successfully');
    return {
      ...normalizedEvent,
      agents_processed: agentsProcessed
    };
  } catch (error) {
    console.error('[Event] Processing failed:', error.message);
    throw error;
  }
}

// REST API endpoint for simulations
app.post('/api/simulate', async (req, res) => {
  try {
    const { scenario, country_a: countryA, country_b: countryB, winner } = req.body;

    if (!scenario || typeof scenario !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid scenario' });
    }

    console.log(`[API] Simulating: ${scenario}`);

    // Fetch agents first to ensure they exist
    const { data: agents, error: fetchError } = await supabase
      .from('agents')
      .select('id, country, current_mood_intensity, status_activity');

    if (fetchError) {
      console.error('[API] Failed to fetch agents:', fetchError);
      return res.status(500).json({ error: 'Database connection failed', details: fetchError.message });
    }

    if (!agents || agents.length === 0) {
      console.warn('[API] No agents found in database');
      // Return mock data if no agents
      return res.json({
        hype: 65,
        sentiment: 72,
        surge: 58,
        active_agents: 0,
        total_agents: 0,
        note: 'No agents in database yet'
      });
    }

    console.log(`[API] Found ${agents.length} agents`);

    const matchEvent = {
      event_description: scenario,
      country_a: countryA,
      country_b: countryB,
      winner,
      source: 'user'
    };

    const processedEvent = await processEvent(matchEvent);

    const countriesToScore = processedEvent.participant_countries.length > 0
      ? processedEvent.participant_countries
      : unique(agents.map(agent => agent.country));

    const updatedAgents = await getAgentState(countriesToScore);

    const metrics = calculateMetrics(updatedAgents);
    console.log('[API] Metrics calculated:', metrics);

    res.json({
      ...metrics,
      scenario_submitted: true,
      agents_processed: processedEvent.agents_processed,
      winner: processedEvent.winner,
      participant_countries: processedEvent.participant_countries,
      agents: updatedAgents
    });
  } catch (error) {
    console.error('[API] Simulation error:', error);
    res.status(500).json({ 
      error: 'Simulation failed',
      details: error.message 
    });
  }
});

app.get('/api/state', async (req, res) => {
  try {
    const agents = await getAgentState();
    res.json({
      ...calculateMetrics(agents),
      agents
    });
  } catch (error) {
    console.error('[API] State fetch failed:', error);
    res.status(500).json({
      error: 'State fetch failed',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'VoxPop Backend API',
    endpoints: {
      health: 'GET /health',
      simulate: 'POST /api/simulate',
      state: 'GET /api/state'
    }
  });
});

// Start Express server
app.listen(PORT, () => {
  console.log(`✓ VoxPop API server running on http://localhost:${PORT}`);
  console.log(`✓ POST /api/simulate - Start a simulation`);
  console.log(`✓ GET /health - Health check`);
  console.log(`✓ GET / - API info`);
});

// Setup realtime listener (non-blocking)
try {
  supabase
    .channel('match_events_channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'match_events'
      },
      payload => {
        console.log('[Realtime] New match event:', payload.new.event_description);
        processEvent(payload.new).catch(err => {
          console.error('[Realtime] Event processing failed:', err);
        });
      }
    )
    .subscribe(status => {
      console.log(`[Realtime] Subscription status: ${status}`);
    });

  console.log('✓ Simulation engine listening for realtime events.');
} catch (err) {
  console.warn('⚠ Realtime listener setup warning:', err.message);
}
