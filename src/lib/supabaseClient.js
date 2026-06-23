// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://awqqmvxtwghlmemgdnpe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3cXFtdnh0d2dobG1lbWdkbnBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNTMxMjcsImV4cCI6MjA5NzcyOTEyN30.Ms0SkECya8YrbYKKOxXh26mRjxfJT089U_h8fygc0s4'; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Añade esta línea al final para permitir importaciones por defecto:
export default supabase;