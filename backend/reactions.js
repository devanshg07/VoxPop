import OpenAI from 'openai';
import { supabase } from './supabaseClient.js';
import 'dotenv/config';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const CONCURRENCY_LIMIT = 20;

async function generateHumanReaction(agent, matchEvent) {
  const isWinner = agent.country === matchEvent.winner;
  
  // Natural, unfiltered persona prompt
  const prompt = `
    You are ${agent.name}, a passionate ${agent.archetype} fan from ${agent.country}.
    Your current mood intensity is ${agent.current_mood_intensity}/10.
    Latest context: ${agent.memories?.slice(-2).join(' | ') || 'None'}.
    The match event: ${matchEvent.event_description}.

    Task: Express your immediate, raw reaction in one sentence.
    Rules: 
    - No robotic labels like "THOUGHT" or "REACTION".
    - Use slang, emojis, or fragmented speech. 
    - Sound like someone in a stadium or a bar.
    - Be biased based on your country.
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.85,
      messages: [{ role: 'system', content: prompt }]
    });

    return completion.choices[0]?.message?.content?.trim() || "!";
  } catch (err) {
    return isWinner ? "YESSS!" : "Unbelievable...";
  }
}

export async function reactToMatch(matchEvent) {
  const { data: agents } = await supabase.from('agents').select('*');
  if (!agents) return;

  // Process in chunks to avoid slamming the API
  for (let i = 0; i < agents.length; i += CONCURRENCY_LIMIT) {
    const batch = agents.slice(i, i + CONCURRENCY_LIMIT);
    
    await Promise.all(batch.map(async (agent) => {
      // 70% chance to react; some agents are just watching quietly
      const isParticipating = Math.random() > 0.3;
      const isAtEvent = agent.current_hub_id === matchEvent.hub_id;

      if (isAtEvent && isParticipating) {
        const reaction = await generateHumanReaction(agent, matchEvent);
        const isWinner = agent.country === matchEvent.winner;
        
        // Mood Decay/Growth: Keeps agents moody after a loss
        const moodChange = isWinner ? 2 : -2;
        const newMood = Math.max(0, Math.min(10, (agent.current_mood_intensity || 5) + moodChange));

        await supabase.from('agents').update({
          last_speech: reaction,
          current_mood_intensity: newMood,
          status_activity: isWinner ? 'Celebrating' : 'Mourning',
          memories: [...(agent.memories || []), `Event: ${matchEvent.event_description}`].slice(-5)
        }).eq('id', agent.id);
      } else if (isAtEvent) {
        // Agent is at the hub but staying quiet
        await supabase.from('agents').update({ status_activity: 'idle' }).eq('id', agent.id);
      }
    }));
  }
}