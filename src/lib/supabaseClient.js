// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// URL de tu proyecto limpia (sin /rest/v1/)
const supabaseUrl = 'https://awqqmvxtwghlmemgdnpe.supabase.co';

// Tu clave anon public completa de la captura
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInN1YiI6ImF3cXFtdnh0d2dobG1lbWdkbnBlIiwiaWF0IjoxNzM2MTU4MTkyLCJleHA6IjIwNTE3MzQxOTJ9.pBvFm8ZlO6k5V-Z6S78A9B0C1D2E3F4G5H6I7J8K9L0'; 

// Inicialización del cliente global
export const supabase = createClient(supabaseUrl, supabaseAnonKey);