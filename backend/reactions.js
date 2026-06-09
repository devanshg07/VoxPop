import OpenAI from 'openai';
import { supabase } from './supabaseClient.js';
<<<<<<< HEAD
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
=======

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const CONCURRENCY_LIMIT = 25;

async function generateReaction(agent, matchEvent) {
  try {
    const isWinner = agent.country === matchEvent.winner;
    const hasWinner = Boolean(matchEvent.winner && matchEvent.winner.toLowerCase() !== 'draw');
    const isLoser = hasWinner && matchEvent.participant_countries?.includes(agent.country) && !isWinner;
    const mood = isWinner ? 10 : isLoser ? 2 : 6;
    const status = isWinner ? 'Celebrating' : isLoser ? 'Disappointed' : 'Reacting';
    const outcome = isWinner ? 'won' : isLoser ? 'lost' : 'was affected';
    const prompt = `You are ${agent.name}. Country: ${agent.country}. Archetype: ${agent.archetype}. Event: ${matchEvent.event_description}. Your country ${outcome}. Respond in one biased, emotional sentence.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: prompt }],
      timeout: 5000
    });

    const reaction = completion.choices[0]?.message?.content?.trim() || 'No reaction.';

    await supabase
      .from('agents')
      .update({
        last_speech: reaction,
        current_mood_intensity: mood,
        status_activity: status,
        memories: [...(agent.memories || []).slice(-4), matchEvent.event_description]
      })
      .eq('id', agent.id);

    return true;
  } catch (error) {
    console.error(`[Reaction] Agent ${agent.id} error:`, error.message);
    const isWinner = agent.country === matchEvent.winner;
    const hasWinner = Boolean(matchEvent.winner && matchEvent.winner.toLowerCase() !== 'draw');
    const isLoser = hasWinner && matchEvent.participant_countries?.includes(agent.country) && !isWinner;
    const { error: updateError } = await supabase
      .from('agents')
      .update({
        last_speech: 'Silent reaction.',
        current_mood_intensity: isWinner ? 8 : isLoser ? 3 : 6,
        status_activity: isWinner ? 'Celebrating' : isLoser ? 'Disappointed' : 'Reacting'
      })
      .eq('id', agent.id);

    if (updateError) {
      console.error(`[Reaction] Failed to update agent ${agent.id}:`, updateError.message);
    }

    return false;
>>>>>>> 67029392f7d3ac5b7a14cae10e234cd1644b984d
  }
}

export async function reactToMatch(matchEvent) {
  try {
    const participantCountries = matchEvent.participant_countries || [];
    let query = supabase.from('agents').select('*');

<<<<<<< HEAD
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
=======
    if (participantCountries.length > 0) {
      query = query.in('country', participantCountries);
    }

    const { data: agents, error } = await query;

    if (error) {
      console.error('[Reactions] Failed to fetch agents:', error.message);
      return 0;
    }

    if (!agents || agents.length === 0) {
      console.warn('[Reactions] No agents to process');
      return 0;
    }

    console.log(`[Reactions] Processing ${agents.length} agents`);

    let processed = 0;
    for (let i = 0; i < agents.length; i += CONCURRENCY_LIMIT) {
      const results = await Promise.all(
        agents.slice(i, i + CONCURRENCY_LIMIT).map(agent => generateReaction(agent, matchEvent))
      );
      processed += results.length;
    }

    console.log('[Reactions] All agents processed');
    return processed;
  } catch (error) {
    console.error('[Reactions] Fatal error:', error.message);
    return 0;
>>>>>>> 67029392f7d3ac5b7a14cae10e234cd1644b984d
  }
}
