import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wzhiaqicasixmbuhxysz.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_yPOYJSfMO8jGMkUax2bFGA_DIp2Ih9Q';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase URL or Key is missing. Check your .env configuration.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
