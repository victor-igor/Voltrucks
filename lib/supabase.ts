import { createClient } from '@supabase/supabase-js';

// Fallback values used because .env.local is gitignored and cannot be written by the agent directly.
// In production, these should be environment variables.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gdjgydxjgkgbcsvltmqr.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkamd5ZHhqZ2tnYmNzdmx0bXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNzYwNTAsImV4cCI6MjA3OTk1MjA1MH0.qAzC3HC31b32Vv-Q0lN8n64E8mEShilTq5XEAgm557g';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
