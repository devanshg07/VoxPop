import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testSDK() {
  // Simple check to ping your project's auth/api health
  const { data, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('SDK Connection failed:', error.message);
  } else {
    console.log('Supabase SDK successfully integrated!');
  }
}

testSDK();