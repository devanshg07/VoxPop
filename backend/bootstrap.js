import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function bootstrapLocations() {
  // Fetch all agents that don't have a position yet
  const { data: agents } = await supabase.from('agents').select('id');

  for (const agent of agents) {
    const updates = {
      pos_x: Math.floor(Math.random() * 1000), // Map width
      pos_z: Math.floor(Math.random() * 1000), // Map height
      current_hub_id: Math.floor(Math.random() * 16) + 1 // Assuming 16 hubs
    };
    
    await supabase.from('agents').update(updates).eq('id', agent.id);
  }
  console.log("Bootstrap complete: Agents are now positioned in the world.");
}

bootstrapLocations();