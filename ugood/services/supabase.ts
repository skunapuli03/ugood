import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://tvhmhxactejbocbdedom.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2aG1oeGFjdGVqYm9jYmRlZG9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMjE3MzEsImV4cCI6MjA3ODg5NzczMX0.kMcEh86Ksa1IOSDTdvNgkPOO9mebxpgzyIh-LDWX3Pk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


