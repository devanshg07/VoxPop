import { createClient } from '@supabase/supabase-js';
import { computeAgentAction } from './agentCore.js';
import 'dotenv/config';

// 1. Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// 2. The function you already have
async function runAgent(agent) {
  const heartbeat = 30000 + Math.random() * 10000; // Lowered to 30s for testing

  setTimeout(async () => {
    try {
      const worldEvent = "Brazil is currently leading 1-0 against Morocco.";
      console.log(`[DEBUG] ${agent.name} is thinking...`);
      
      const action = await computeAgentAction(agent, worldEvent);
      console.log(`[DEBUG] ${agent.name} decided:`, action);

      const { data, error } = await supabase.from('agents').update({
        last_speech: action.speech,
        status_activity: action.status,
        current_goal: action.new_goal,
        current_mood_intensity: Math.min(100, Math.max(1, agent.current_mood_intensity + action.mood_change))
      }).eq('id', agent.id);

      if (error) {
        console.error(`[CRITICAL] DB Update Error for ${agent.name}:`, error);
      } else {
        console.log(`[SUCCESS] ${agent.name} updated.`);
      }
    } catch (err) {
      console.error(`[ERROR] AI processing failed for ${agent.name}:`, err.message);
    }
    runAgent(agent);
  }, heartbeat);
}

// 3. THE MISSING PART: The trigger
async function startSimulation() {
  console.log("Starting simulation...");
  const { data: agents, error } = await supabase.from('agents').select('*');
  
  if (error) {
    console.error("Database fetch error:", error);
    return;
  }

  for (const agent of agents) {
    console.log(`Launching agent: ${agent.name}`);
    runAgent(agent);
  }
}

// Run the simulation
startSimulation();