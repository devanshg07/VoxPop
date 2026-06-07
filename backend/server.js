import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { reactToMatch } from './reactions.js'; 
import { updateAgentPositions } from './movement.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
let lastProcessedEventId = null;

// Ensure this function is async and correctly invokes the imported module
async function simulationLoop() {
  const { data: latestEvent } = await supabase
    .from('match_events')
    .select('*')
    .order('match_date', { ascending: false })
    .limit(1)
    .single();

  if (latestEvent && latestEvent.id !== lastProcessedEventId) {
    console.log(`📡 New Event: ${latestEvent.event_description}`);
    
    await reactToMatch(latestEvent);
    await updateAgentPositions(latestEvent.hub_id); 
    
    // THE CLEANUP: Delete all events EXCEPT the one we just processed
    await supabase
      .from('match_events')
      .delete()
      .neq('id', latestEvent.id);
      
    lastProcessedEventId = latestEvent.id;
  }
  
  setTimeout(simulationLoop, 10000);
}

simulationLoop();