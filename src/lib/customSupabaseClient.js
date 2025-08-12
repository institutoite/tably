import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://brnbousarmgwnfrxoare.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJybmJvdXNhcm1nd25mcnhvYXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTM5NTEsImV4cCI6MjA3MDQ2OTk1MX0.HzwZu5UW7OuU7DIdlgg8uA6pCV3QT-K76ElkLAkerEc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);