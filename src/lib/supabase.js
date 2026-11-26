import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const chave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Sem as variáveis de ambiente o app funciona só no navegador (sem login).
export const supabase = url && chave ? createClient(url, chave) : null
