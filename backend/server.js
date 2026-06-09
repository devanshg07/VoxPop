import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { reactToMatch } from './reactions.js'; 
import { updateAgentPositions } from './movement.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

let lastProcessedEventId = null;

async function simulationLoop() {
  console.log("Simulation Heartbeat Active...");

  const { data: latestEvent } = await supabase
    .from('match_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestEvent && latestEvent.id !== lastProcessedEventId) {
    console.log(`New Event: ${latestEvent.event_description}`);

    // 1. WIPE STATE: Reset only those that were active
    await supabase
      .from('agents')
      .update({ 
        last_speech: null, 
        status_activity: 'idle',
        current_mood_intensity: 5 
      })
      .neq('status_activity', 'idle');

    // 2. NOMADIC ASSIGNMENT: Assign fans of the match teams to travel to the hub
    // This moves them from wherever they are to the match location
    await supabase
      .from('agents')
      .update({ target_hub_id: latestEvent.hub_id })
      .in('country', [latestEvent.country_a, latestEvent.country_b]);

    console.log("Migration triggered: Fans are moving to the stadium.");

    // 3. RUN SIMULATION
    // Note: We move the agents toward their targets every tick
    await updateAgentPositions(); 
    await reactToMatch(latestEvent);

    // 4. CLEANUP
    await supabase.from('match_events').delete().eq('id', latestEvent.id);
    
    lastProcessedEventId = latestEvent.id;
    console.log("Cycle Complete.");
  } else {
    // Keep moving agents even when no new match event happens
    await updateAgentPositions();
  }

  setTimeout(simulationLoop, 5000);
}

simulationLoop();