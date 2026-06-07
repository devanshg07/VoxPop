import { supabase } from './supabaseClient.js';
import OpenAI from 'openai';
import 'dotenv/config';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function reactToMatch(matchEvent) {
  const { data: agents } = await supabase.from('agents').select('*');
  if (!agents) return;

  for (const agent of agents) {
    if (agent.current_hub_id === matchEvent.hub_id) {
      const isWinner = agent.country === matchEvent.winner;

      // 1. DYNAMIC SYSTEM PROMPT: Include memory context
      const prompt = `
        You are a football fan from ${agent.country}. 
        Archetype: ${agent.archetype}. 
        Recent Memories: ${agent.memories ? agent.memories.slice(-3).join(' | ') : 'None'}.
        Event: ${matchEvent.event_description}.
        Mood: ${isWinner ? 'Happy' : 'Angry'}.
        
        STEP 1: Write a short internal thought (monologue) about how this event affects your mood.
        STEP 2: Write a 1-sentence external reaction to the match.
        Format your response as: "THOUGHT: [text] | REACTION: [text]"
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: prompt }]
      });

      const response = completion.choices[0].message.content;
      const [thought, reaction] = response.split('|').map(s => s.trim().replace(/^THOUGHT: |^REACTION: /, ''));

      // 2. PERSISTENT STATE UPDATE: Append to memories, don't overwrite
      const newMemory = `Match Event: ${matchEvent.event_description}. Thought: ${thought}`;
      
      await supabase.from('agents').update({
        last_speech: reaction,
        current_mood_intensity: isWinner ? 10 : 1,
        status_activity: isWinner ? "Celebrating" : "Mourning",
        memories: [...(agent.memories || []), newMemory].slice(-5) // Keep only last 5
      }).eq('id', agent.id);

    } else {
      // 3. RESET ONLY IF NOT IN HUB
      await supabase.from('agents').update({
        last_speech: null,
        status_activity: 'idle',
        current_mood_intensity: 5 // Baseline
      }).eq('id', agent.id);
    }
  }
}