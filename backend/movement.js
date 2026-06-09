import { supabase } from './supabaseClient.js';

const MOVEMENT_FACTOR = 0.05; // 5% per tick
const ARRIVAL_THRESHOLD = 1.0; // Distance at which they "arrive"

export async function updateAgentPositions() {
  try {
    // 1. Fetch agents who have an active target (where target_x is not 0)
    const { data: agents, error: agentError } = await supabase
      .from('agents')
      .select('id, pos_x, pos_z, target_x, target_z')
      .neq('target_x', 0); // Only select agents actively moving

    if (agentError || !agents || agents.length === 0) return 0;

    const updates = agents.map(agent => {
      const dx = agent.target_x - agent.pos_x;
      const dz = agent.target_z - agent.pos_z;

      // 2. Check if arrived
      if (Math.abs(dx) < ARRIVAL_THRESHOLD && Math.abs(dz) < ARRIVAL_THRESHOLD) {
        return { 
          id: agent.id, 
          pos_x: agent.target_x, 
          pos_z: agent.target_z, 
          target_x: 0, // Reset targets to 0 upon arrival
          target_z: 0 
        };
      }

      // 3. Calculate incremental movement
      return { 
        id: agent.id, 
        pos_x: agent.pos_x + (dx * MOVEMENT_FACTOR), 
        pos_z: agent.pos_z + (dz * MOVEMENT_FACTOR) 
      };
    });

    // 4. Batch upsert the movement
    if (updates.length > 0) {
      await supabase.from('agents').upsert(updates, { onConflict: 'id' });
    }

    return updates.length;
  } catch (error) {
    console.error('Movement update failed:', error);
    return 0;
  }
}