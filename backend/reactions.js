import { supabase } from './supabaseClient.js';
import OpenAI from 'openai';
import 'dotenv/config';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Define the missing helper function
function checkIfRival(countryA, countryB) {
  const rivalries = {
    "USA": ["Mexico"],
    "Mexico": ["USA"],
    "Argentina": ["Brazil"],
    "Brazil": ["Argentina"]
  };
  return rivalries[countryA]?.includes(countryB) || false;
}

// Ensure you use the 'export' keyword here
export async function reactToMatch(matchEvent) {
  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .eq('current_hub_id', matchEvent.hub_id);

  if (!agents) return;

  for (const agent of agents) {
    const isWinner = agent.country === matchEvent.winner;
    
    const reaction = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: `You are a football fan from ${agent.country}. 
                  Archetype: ${agent.archetype}. 
                  Event: ${matchEvent.event_description}. 
                  Mood: ${isWinner ? 'Happy' : 'Angry'}. 
                  Write a 1-sentence reaction.`
      }]
    });

    await supabase.from('agents').update({
      last_speech: reaction.choices[0].message.content,
      current_mood_intensity: isWinner ? 10 : 1,
      status_activity: isWinner ? "Celebrating" : "Mourning"
    }).eq('id', agent.id);
  }
}