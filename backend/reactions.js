import OpenAI from 'openai';
import { supabase } from './supabaseClient.js';
import 'dotenv/config';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const CONCURRENCY_LIMIT = 25;

async function generateReaction(agent, matchEvent) {
  const isWinner = agent.country === matchEvent.winner;

  const prompt = `
You are ${agent.name}.

Country: ${agent.country}
Fan Archetype: ${agent.archetype}

Traits:
${agent.traits?.join(', ') || 'None'}

Recent Memories:
${agent.memories?.slice(-3).join('; ') || 'No significant memories'}

Current Event:
${matchEvent.event_description}

Rules:
- Respond in exactly one sentence.
- Sound like a real football fan.
- Use emotion.
- Show bias.
- Use slang naturally if appropriate.
- Never mention being an AI.
- Never explain your reasoning.

Output only the reaction.
`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.9,
    presence_penalty: 0.6,
    messages: [
      {
        role: 'system',
        content: prompt
      }
    ]
  });

  const reaction =
    completion.choices[0]?.message?.content?.trim() ||
    'No reaction.';

  await supabase
    .from('agents')
    .update({
      last_speech: reaction,
      current_mood_intensity: isWinner ? 10 : 2,
      status_activity: isWinner ? 'Celebrating' : 'Disappointed',
      memories: [
        ...(agent.memories || []),
        `Event: ${matchEvent.event_description}`
      ].slice(-5)
    })
    .eq('id', agent.id);
}

async function processBatch(batch, matchEvent) {
  await Promise.all(
    batch.map(async agent => {
      try {
        if (agent.current_hub_id !== matchEvent.hub_id) {
          await supabase
            .from('agents')
            .update({
              last_speech: null,
              status_activity: 'idle',
              current_mood_intensity: 5
            })
            .eq('id', agent.id);

          return;
        }

        await generateReaction(agent, matchEvent);
      } catch (error) {
        console.error(
          `Agent ${agent.id} failed:`,
          error.message
        );
      }
    })
  );
}

export async function reactToMatch(matchEvent) {
  const { data: agents, error } = await supabase
    .from('agents')
    .select('*');

  if (error || !agents) {
    console.error('Failed to fetch agents:', error);
    return;
  }

  for (let i = 0; i < agents.length; i += CONCURRENCY_LIMIT) {
    const batch = agents.slice(i, i + CONCURRENCY_LIMIT);

    await processBatch(batch, matchEvent);
  }
}