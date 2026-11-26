import { useEffect, useRef, useState } from 'react'
import { useLocalStorage } from './useLocalStorage'

export const FASES = {
  foco: { rotulo: 'Foco' },
  curta: { rotulo: 'Pausa curta' },
  longa: { rotulo: 'Pausa longa' },
}

const FOCOS_ATE_PAUSA_LONGA = 4

const ESTADO_INICIAL = {
  fase: 'foco',
  rodando: false,
  fimEm: null, // horário (ms) em que a fase termina, quando está rodando
  restanteMs: null, // tempo que sobrou, quando está pausado (null = fase cheia)
  totalMs: null, // duração desta fase, fixada ao iniciar (mudar a config no meio não afeta)
  ciclo: 0, // focos completos desde a última pausa longa
}

// ---------- Som ----------
// O navegador só deixa tocar áudio depois de um clique, por isso o
// AudioContext é criado em "iniciar" e reaproveitado no fim da fase.
let audio = null

function prepararAudio() {
  try {
    audio = audio ?? new (window.AudioContext || window.webkitAudioContext)()
    if (audio.state === 'suspended') audio.resume()
  } catch {
    audio = null
  }
}

function tocarAlarme() {
  if (!audio) return
  const inicio = audio.currentTime
  ;[0, 0.25, 0.5].forEach((atraso, i) => {
    const osc = audio.createOscillator()
    const vol = audio.createGain()
    osc.type = 'square'
    osc.frequency.value = [660, 880, 1100][i]
    vol.gain.setValueAtTime(0.08, inicio + atraso)
    vol.gain.exponentialRampToValueAtTime(0.0001, inicio + atraso + 0.22)
    osc.connect(vol).connect(audio.destination)
    osc.start(inicio + atraso)
    osc.stop(inicio + atraso + 0.23)
  })
}

function notificar(texto) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Questly', { body: texto })
    }
  } catch {
    // alguns navegadores (ex.: Safari no iPhone) não suportam: ignora
  }
}

export function formatarTempo(ms) {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Controla o timer do Pomodoro.
 * - config: durações em minutos ({ foco, curta, longa }) e opções (autoIniciar, som, notificar)
 * - onFimDoFoco(minutos): chamado uma única vez quando um foco chega ao zero
 */
export function usePomodoro(config, onFimDoFoco) {
  const [estado, setEstado] = useLocalStorage('questly:pomodoro', ESTADO_INICIAL)
  const [agora, setAgora] = useState(Date.now())

  // Guarda a versão mais recente do callback (ele muda a cada render)
  const callback = useRef(onFimDoFoco)
  callback.current = onFimDoFoco
  // Evita processar o fim da mesma fase duas vezes (StrictMode roda efeitos 2x)
  const ultimoFimProcessado = useRef(null)

  const duracaoMs = (fase) => config[fase] * 60 * 1000
  const restanteMs = estado.rodando
    ? Math.max(0, estado.fimEm - agora)
    : estado.restanteMs ?? duracaoMs(estado.fase)
  const totalMs = estado.totalMs ?? duracaoMs(estado.fase)
  const progresso = 1 - restanteMs / totalMs

  // Enquanto roda, atualiza o relógio 4x por segundo
  useEffect(() => {
    if (!estado.rodando) return
    setAgora(Date.now())
    const id = setInterval(() => setAgora(Date.now()), 250)
    return () => clearInterval(id)
  }, [estado.rodando])

  // Chegou a zero: fecha a fase e passa para a próxima
  useEffect(() => {
    if (!estado.rodando || Date.now() < estado.fimEm) return
    if (ultimoFimProcessado.current === estado.fimEm) return
    ultimoFimProcessado.current = estado.fimEm

    let proxima
    let ciclo = estado.ciclo
    if (estado.fase === 'foco') {
      callback.current(Math.round(totalMs / 60000))
      ciclo += 1
      proxima = ciclo >= FOCOS_ATE_PAUSA_LONGA ? 'longa' : 'curta'
      notificar(`Foco concluído! Hora de uma ${FASES[proxima].rotulo.toLowerCase()}.`)
    } else {
      if (estado.fase === 'longa') ciclo = 0
      proxima = 'foco'
      notificar('Pausa terminada. Bora focar!')
    }
    if (config.som) tocarAlarme()

    setEstado({
      fase: proxima,
      ciclo,
      rodando: config.autoIniciar,
      fimEm: config.autoIniciar ? Date.now() + duracaoMs(proxima) : null,
      restanteMs: null,
      totalMs: config.autoIniciar ? duracaoMs(proxima) : null,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agora, estado])

  // Mostra o tempo no título da aba
  useEffect(() => {
    document.title = estado.rodando
      ? `${formatarTempo(restanteMs)} · ${FASES[estado.fase].rotulo} — Questly`
      : 'Questly — Lista de tarefas gamificada'
  }, [estado.rodando, estado.fase, restanteMs])

  function iniciar() {
    prepararAudio()
    setEstado({ ...estado, rodando: true, fimEm: Date.now() + restanteMs, restanteMs: null, totalMs })
  }

  function pausar() {
    setEstado({ ...estado, rodando: false, fimEm: null, restanteMs: Math.max(0, estado.fimEm - Date.now()) })
  }

  function reiniciar() {
    setEstado({ ...estado, rodando: false, fimEm: null, restanteMs: null, totalMs: null })
  }

  // Trocar de fase à mão (ou pular) não dá XP
  function irPara(fase) {
    setEstado({ ...estado, fase, rodando: false, fimEm: null, restanteMs: null, totalMs: null, ciclo: fase === 'foco' && estado.fase === 'longa' ? 0 : estado.ciclo })
  }

  function pular() {
    if (estado.fase === 'foco') irPara(estado.ciclo + 1 >= FOCOS_ATE_PAUSA_LONGA ? 'longa' : 'curta')
    else irPara('foco')
  }

  return {
    fase: estado.fase,
    rodando: estado.rodando,
    ciclo: estado.ciclo,
    focosAtePausaLonga: FOCOS_ATE_PAUSA_LONGA,
    restanteMs,
    progresso,
    iniciar,
    pausar,
    reiniciar,
    irPara,
    pular,
  }
}
