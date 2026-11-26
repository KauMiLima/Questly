import { useEffect, useRef, useState } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { buscarTudo, calcularMudancas, enviarMudancas } from '../lib/banco'

const ESPERA_ANTES_DE_ENVIAR = 800 // ms: junta várias mudanças seguidas num envio só
const TENTAR_DE_NOVO_EM = 15000 // ms, quando dá erro (ex.: sem internet)

/**
 * Mantém o estado local (tarefas, hábitos, jogador) igual ao do Supabase.
 *
 * - Ao entrar: se a conta é nova, o progresso deste navegador sobe para ela.
 *   Se a conta já tem dados, eles substituem os locais (o local vira um backup).
 * - Depois: cada mudança local é enviada (só o que mudou).
 * - Sem internet: o app segue funcionando e reenvia quando der.
 *
 * status: 'local' (sem login) | 'carregando' | 'salvando' | 'sincronizado' | 'erro'
 */
export function useSincronizacao(usuario, dados, aplicarDados) {
  const [status, setStatus] = useState('local')
  const [pronto, setPronto] = useState(false)
  // De quem são os dados guardados neste navegador (null = visitante)
  const [donoDoCache, setDonoDoCache] = useLocalStorage('questly:dono-do-cache', null)
  // Tem mudança que ainda não chegou ao servidor? (sobrevive a fechar a aba)
  const [pendente, setPendente] = useLocalStorage('questly:pendente', false)

  const remoto = useRef(null) // último estado confirmado no servidor
  const atual = useRef(dados)
  atual.current = dados
  const enviando = useRef(false)
  const enviarDeNovo = useRef(false)
  const userId = usuario?.id ?? null
  // Muda para forçar o carregamento a rodar de novo (quando falhou)
  const [tentativa, setTentativa] = useState(0)

  // ---------- Carregar ao entrar ----------
  useEffect(() => {
    remoto.current = null
    setPronto(false)
    if (!userId) {
      setStatus('local')
      return
    }

    let cancelado = false
    setStatus('carregando')
    buscarTudo(userId)
      .then((servidor) => {
        if (cancelado) return
        const local = atual.current
        const contaNova = servidor.jogador === null && servidor.tarefas.length === 0 && servidor.habitos.length === 0

        if (contaNova) {
          // Conta nova: o progresso local sobe (se for do visitante ou desta conta)
          remoto.current = { tarefas: [], habitos: [], jogador: null }
          if (donoDoCache && donoDoCache !== userId) aplicarDados({ tarefas: [], habitos: [], jogador: null })
        } else if (donoDoCache === userId && pendente) {
          // Mudanças feitas offline nesta conta: o local vale e será enviado
          remoto.current = servidor
        } else {
          // Conta com dados: eles valem. Guarda o progresso do visitante, por segurança.
          if (!donoDoCache && (local.tarefas.length || local.habitos.length || local.jogador.xp > 0)) {
            try {
              localStorage.setItem('questly:backup-visitante', JSON.stringify(local))
            } catch {
              // sem espaço ou sem localStorage: segue sem o backup
            }
          }
          remoto.current = servidor
          aplicarDados(servidor)
        }
        setDonoDoCache(userId)
        setStatus('sincronizado') // se tiver algo para enviar, o envio troca para 'salvando'
        setPronto(true)
      })
      .catch(() => {
        if (!cancelado) setStatus('erro')
      })
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, tentativa])

  // ---------- Enviar mudanças ----------
  async function enviar() {
    if (!userId || !remoto.current) return
    if (enviando.current) {
      enviarDeNovo.current = true // termina o envio atual e manda de novo
      return
    }
    const alvo = atual.current
    const mudancas = calcularMudancas(remoto.current, alvo, userId)
    if (mudancas.vazio) {
      setStatus('sincronizado')
      setPendente(false)
      return
    }

    enviando.current = true
    setStatus('salvando')
    try {
      await enviarMudancas(mudancas)
      remoto.current = alvo
      setStatus('sincronizado')
      // Só limpa o "pendente" se nada mudou enquanto enviava
      if (JSON.stringify(alvo) === JSON.stringify(atual.current)) setPendente(false)
    } catch {
      setStatus('erro')
    } finally {
      enviando.current = false
      if (enviarDeNovo.current) {
        enviarDeNovo.current = false
        enviar()
      }
    }
  }

  // Cada mudança local agenda um envio (com uma pequena espera)
  const assinatura = JSON.stringify(dados)
  useEffect(() => {
    if (!userId || !pronto) return
    if (!calcularMudancas(remoto.current, atual.current, userId).vazio && !pendente) setPendente(true)
    const id = setTimeout(enviar, ESPERA_ANTES_DE_ENVIAR)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, pronto, assinatura])

  // Deu erro: tenta de novo sozinho, e também quando a internet volta
  useEffect(() => {
    if (status !== 'erro' || !userId) return
    // Se já carregou, reenvia; se nem o carregamento deu certo, carrega de novo
    const tentar = () => (pronto ? enviar() : setTentativa((n) => n + 1))
    const id = setInterval(tentar, TENTAR_DE_NOVO_EM)
    window.addEventListener('online', tentar)
    return () => {
      clearInterval(id)
      window.removeEventListener('online', tentar)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, userId, pronto])

  // Chamado ao sair da conta: este navegador volta a ser do visitante
  function esquecerConta() {
    setDonoDoCache(null)
    setPendente(false)
    remoto.current = null
  }

  return { status, pendente, esquecerConta }
}
