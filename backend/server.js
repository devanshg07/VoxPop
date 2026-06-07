import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { reactToMatch } from './reactions.js'; 
import { updateAgentPositions } from './movement.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
let lastProcessedEventId = null;

async function simulationLoop() {
  console.log("Simulation Heartbeat Active...");
  
  const { data: latestEvent } = await supabase
    .from('match_events')
    .select('*')
    .order('created_at', { ascending: false }) 
    .limit(1)
    .single();

  if (latestEvent && latestEvent.id !== lastProcessedEventId) {
    console.log(`New Event: ${latestEvent.event_description}`);
    
    // 1. FORCE CLEAR: Nullify all fields that hold history
    // We use .not() to target rows that have data to ensure a clean wipe
    await supabase
      .from('agents')
      .update({ 
        last_speech: null, 
        status_activity: 'idle' 
      })
      .not('last_speech', 'is', null);

    console.log("Agents table wiped clean.");

    // 2. SAFETY DELAY: 500ms pause to ensure DB handles the wipe
    await new Promise(resolve => setTimeout(resolve, 500));

    // 3. TRIGGER NEW REACTIONS
    await reactToMatch(latestEvent);
    console.log("Reactions generated.");
    
    await updateAgentPositions(latestEvent.hub_id); 
    
    // 4. CLEANUP EVENT LOG
    await supabase
      .from('match_events')
      .delete()
      .neq('id', latestEvent.id);
      
    lastProcessedEventId = latestEvent.id;
  }
  
  setTimeout(simulationLoop, 10000);
}

simulationLoop();