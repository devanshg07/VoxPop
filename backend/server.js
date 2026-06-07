import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';

import { reactToMatch } from './reactions.js';
import { updateAgentPositions } from './movement.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function clearPreviousReactions() {
  const { error } = await supabase
    .from('agents')
    .update({
      last_speech: null,
      status_activity: 'idle'
    })
    .not('last_speech', 'is', null);

  if (error) {
    console.error('Failed to clear reactions:', error);
  }
}

async function processEvent(event) {
  try {
    console.log(
      `Processing Event: ${event.event_description}`
    );

    await updateAgentPositions(event.hub_id);

    await clearPreviousReactions();

    await reactToMatch(event);

    if (event.source !== 'user') {
      await supabase
        .from('match_events')
        .delete()
        .eq('id', event.id);
    }

    console.log('Event processing completed.');
  } catch (error) {
    console.error('Event processing failed:', error);
  }
}

supabase
  .channel('match_events_channel')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'match_events'
    },
    payload => {
      processEvent(payload.new);
    }
  )
  .subscribe(status => {
    console.log(
      `Realtime subscription status: ${status}`
    );
  });

console.log('Simulation engine listening for events.');