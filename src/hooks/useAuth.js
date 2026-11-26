import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Traduz os erros mais comuns do Supabase Auth
export function traduzirErro(erro) {
  const msg = erro?.message ?? ''
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.'
  if (/already registered|already exists/i.test(msg)) return 'Já existe uma conta com esse e-mail. Tente entrar.'
  if (/email not confirmed/i.test(msg)) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.'
  if (/at least 6|password.*short|weak/i.test(msg)) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (/invalid.*email|unable to validate email/i.test(msg)) return 'Esse e-mail não parece válido.'
  if (/rate limit|too many/i.test(msg)) return 'Muitas tentativas. Espere um pouco e tente de novo.'
  if (/fetch|network/i.test(msg)) return 'Sem conexão com o servidor. Confira sua internet.'
  return 'Algo deu errado. Tente de novo.'
}

export function useAuth() {
  const [sessao, setSessao] = useState(null)
  const [carregando, setCarregando] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      setCarregando(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, novaSessao) => setSessao(novaSessao))
    return () => data.subscription.unsubscribe()
  }, [])

  return {
    disponivel: Boolean(supabase),
    carregando,
    usuario: sessao?.user ?? null,
    entrar: (email, senha) => supabase.auth.signInWithPassword({ email, password: senha }),
    cadastrar: (email, senha) =>
      supabase.auth.signUp({ email, password: senha, options: { emailRedirectTo: window.location.origin } }),
    sair: () => supabase.auth.signOut(),
  }
}
