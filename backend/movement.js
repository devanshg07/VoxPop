import { supabase } from './supabaseClient.js';

export async function updateAgentPositions(hubId) {
  // 1. Get the target coordinates for this stadium
  const { data: hub } = await supabase
    .from('map_hubs')
    .select('center_x, center_z')
    .eq('id', hubId)
    .single();

  if (!hub) return;

  // 2. Fetch all agents in this stadium
  const { data: agents } = await supabase
    .from('agents')
    .select('id, pos_x, pos_z, speed')
    .eq('current_hub_id', hubId);

  // 3. Incrementally move agents toward center_x, center_z
  for (const agent of agents) {
    const dx = hub.center_x - agent.pos_x;
    const dz = hub.center_z - agent.pos_z;
    
    // Move 10% closer to the center each tick
    const newX = agent.pos_x + (dx * 0.1);
    const newZ = agent.pos_z + (dz * 0.1);

    await supabase.from('agents')
      .update({ pos_x: newX, pos_z: newZ })
      .eq('id', agent.id);
  }
}