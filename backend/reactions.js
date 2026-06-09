import { supabase } from './supabaseClient.js';
import OpenAI from 'openai';
import 'dotenv/config';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const CONCURRENCY_LIMIT = 40; // Increased for higher throughput

async function processAgent(agent, matchEvent) {
  const isWinner = agent.country === matchEvent.winner;
  const prompt = `
    You are a football fan from ${agent.country}. 
    Archetype: ${agent.archetype}. 
    Recent Memories: ${agent.memories ? agent.memories.slice(-3).join(' | ') : 'None'}.
    Event: ${matchEvent.event_description}.
    Mood: ${isWinner ? 'Happy' : 'Angry'}.
    
    STEP 1: Write a short internal thought about this event.
    STEP 2: Write a 1-sentence external reaction.
    Format as: "THOUGHT: [text] | REACTION: [text]"
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }]
    });

    const response = completion.choices[0].message.content;
    const [thought, reaction] = response.split('|').map(s => s.trim().replace(/^THOUGHT: |^REACTION: /, ''));

    return {
      id: agent.id,
      update: {
        last_speech: reaction,
        current_mood_intensity: isWinner ? 10 : 1,
        status_activity: isWinner ? "Celebrating" : "Mourning",
        memories: [...(agent.memories || []), `Event: ${matchEvent.event_description}. Thought: ${thought}`].slice(-5)
      }
    };
  } catch (err) {
    return { id: agent.id, update: { last_speech: "...", status_activity: 'idle' } };
  }
}

export async function reactToMatch(matchEvent) {
  const { data: agents } = await supabase.from('agents').select('*');
  if (!agents) return;

  // Split agents into those at the hub and those not
  const atHub = agents.filter(a => a.current_hub_id === matchEvent.hub_id);
  const notAtHub = agents.filter(a => a.current_hub_id !== matchEvent.hub_id);

  // 1. Process "At Hub" agents in parallel batches
  for (let i = 0; i < atHub.length; i += CONCURRENCY_LIMIT) {
    const batch = atHub.slice(i, i + CONCURRENCY_LIMIT);
    const results = await Promise.all(batch.map(agent => processAgent(agent, matchEvent)));
    
    // Update batch in DB
    for (const res of results) {
      await supabase.from('agents').update(res.update).eq('id', res.id);
    }
  }

  await supabase.from('agents')
    .update({ last_speech: null, status_activity: 'idle', current_mood_intensity: 5 })
    .neq('current_hub_id', matchEvent.hub_id);
}