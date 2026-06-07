import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// The function we discussed
async function triggerMatchPost(match_event_id, agent_id, content) {
  // 1. Get the agent info to ensure we have the city context
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, current_city')
    .eq('id', agent_id)
    .single();

  if (agentError) {
    console.error("Error fetching agent:", agentError.message);
    return;
  }
  
  // 2. Insert into posts table
  const { error: postError } = await supabase.from('posts').insert({
    agent_id: agent.id,
    content: content,
    posted_at_tick: 1, 
    city_context: agent.current_city
  });

  if (postError) {
    console.error("Error inserting post:", postError.message);
  } else {
    console.log(`Successfully posted reaction for agent ${agent_id}: "${content}"`);
  }
}

// Execute the function with dummy data
// Replace '1' with an actual agent ID from your database
triggerMatchPost(1, 1, "This match is intense! Brazil is looking strong.");