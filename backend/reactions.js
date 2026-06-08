import OpenAI from 'openai';
import { supabase } from './supabaseClient.js';

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
  }
}

export async function reactToMatch(matchEvent) {
  try {
    const participantCountries = matchEvent.participant_countries || [];
    let query = supabase.from('agents').select('*');

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
  }
}
