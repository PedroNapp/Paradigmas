// =========================
// CONFIGURAÇÃO SUPABASE
// =========================

const SUPABASE_URL = "https://mkylyczeakkgksrzffca.supabase.co";

const SUPABASE_KEY = "sb_publishable_LD9drZgiFn7iQ5FK-PhHOA_Uuv7YeqP";

export const clienteSupabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
);
