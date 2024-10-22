import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Carregar variáveis de ambiente do .env
dotenv.config();

export const SUPABASE_URL = "https://ogpwqkqsulbouecrnqlh.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncHdxa3FzdWxib3VlY3JucWxoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxMjA2ODYwNCwiZXhwIjoyMDI3NjQ0NjA0fQ.t7DCgAoaP4nvGO38GoDhYnd4ryotiGiwKo5qR_eG5r0";

// export const SUPABASE_URL = process.env.SUPABASE_URL!;
// export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
