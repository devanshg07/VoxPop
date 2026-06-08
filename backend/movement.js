import { supabase } from './supabaseClient.js';
const MOVEMENT_FACTOR = 0.1;

export async function updateAgentPositions(hubId, countries = []) {
  try {
    const { data: hub, error: hubError } = await supabase
      .from('map_hubs')
      .select('center_x, center_z')
      .eq('id', hubId)
      .single();

    if (hubError || !hub) {
      console.error('Failed to load hub:', hubError?.message);
      return 0;
    }

    let query = supabase.from('agents').select('id, pos_x, pos_z');
    if (countries.length > 0) {
      query = query.in('country', countries);
    }

    const { data: agents, error: agentError } = await query;
    if (agentError || !agents) {
      console.error('Failed to load agents:', agentError?.message);
      return 0;
    }

    const updates = agents.map(agent => ({
      id: agent.id,
      pos_x: agent.pos_x + (hub.center_x - agent.pos_x) * MOVEMENT_FACTOR,
      pos_z: agent.pos_z + (hub.center_z - agent.pos_z) * MOVEMENT_FACTOR
    }));

    if (updates.length === 0) {
      return 0;
    }

    const { error: updateError } = await supabase
      .from('agents')
      .upsert(updates, { onConflict: 'id' });

    if (updateError) {
      console.error('Failed to update movement:', updateError.message);
      return 0;
    }

    return updates.length;
  } catch (error) {
    console.error('Movement update failed:', error);
    return 0;
  }
}
