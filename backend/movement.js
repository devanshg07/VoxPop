import { supabase } from './supabaseClient.js';

const MOVEMENT_FACTOR = 0.1;

export async function updateAgentPositions(hubId) {
  try {
    const { data: hub, error: hubError } = await supabase
      .from('map_hubs')
      .select('center_x, center_z')
      .eq('id', hubId)
      .single();

    if (hubError || !hub) {
      console.error('Failed to load hub:', hubError);
      return;
    }

    const { data: agents, error: agentError } = await supabase
      .from('agents')
      .select('id, pos_x, pos_z');

    if (agentError || !agents) {
      console.error('Failed to load agents:', agentError);
      return;
    }

    await Promise.all(
      agents.map(agent =>
        supabase
          .from('agents')
          .update({
            pos_x:
              agent.pos_x +
              (hub.center_x - agent.pos_x) * MOVEMENT_FACTOR,

            pos_z:
              agent.pos_z +
              (hub.center_z - agent.pos_z) * MOVEMENT_FACTOR
          })
          .eq('id', agent.id)
      )
    );
  } catch (error) {
    console.error('Position update failed:', error);
  }
}