import { createClient } from '@supabase/supabase-js';

// Configuration provided in the request
const SUPABASE_URL = 'https://twkgyipfdclgoytmlkiw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_2fUv7kOLlLofKl_nC6q0hg_6TxED3Kh';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
