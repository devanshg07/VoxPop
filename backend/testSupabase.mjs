import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('agents').select('*').limit(1);
  if (error) {
    console.error("CRITICAL ERROR:", error);
  } else {
    console.log("Connection successful. Found data:", data);
  }
}
check();