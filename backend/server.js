import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { reactToMatch } from './reactions.js'; 
import { updateAgentPositions } from './movement.js';

// IMPORTANT: Use the SERVICE_ROLE_KEY for backend administrative tasks.
// The ANON_KEY does not have permission to delete rows or batch-update agents.
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function processSimulation(event) {
  try {
    console.log(`[START] Processing: ${event.event_description}`);

    // 1. CLEAR PREVIOUS STATE: Reset everyone to idle first
    await supabase.from('agents').update({ 
      last_speech: null, 
      status_activity: 'idle' 
    }).neq('status_activity', 'idle'); // Only update those that need it

    // 2. TRIGGER LOGIC: Run AI and Movement
    // We await these so the UI doesn't get "flickering" data
    await reactToMatch(event);
    await updateAgentPositions(event.hub_id); 
    
    // 3. CLEANUP EVENT: Remove it so it doesn't process again
    await supabase.from('match_events').delete().eq('id', event.id);
    
    console.log(`[DONE] Simulation cycle finished for event ID: ${event.id}`);
  } catch (err) {
    console.error("Simulation failed:", err.message);
  }
}

async function simulationLoop() {
  // Use maybeSingle() to avoid errors when the table is empty
  const { data: latestEvent, error } = await supabase
    .from('match_events')
    .select('*')
    .order('created_at', { ascending: false }) 
    .limit(1)
    .maybeSingle();

  if (latestEvent) {
    await processSimulation(latestEvent);
  }
  
  // Poll every 5 seconds
  setTimeout(simulationLoop, 5000);
}

console.log("Simulation Engine Online...");
simulationLoop();