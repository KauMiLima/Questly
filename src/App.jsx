import { useEffect, useRef, useState } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'
import {
  CONFIG_POMODORO_INICIAL,
  JOGADOR_INICIAL,
  LIMITE_XP_DIARIO,
  ehHoje,
  habitoNoDia,
  hoje,
  registrarConclusao,
  registrarDesmarcacao,
  registrarPomodoro,
} from './game/regras'
import { formatarTempo, usePomodoro } from './hooks/usePomodoro'
import { useAuth } from './hooks/useAuth'
import { useSincronizacao } from './hooks/useSincronizacao'
import PainelJogador from './components/PainelJogador'
import FormTarefa from './components/FormTarefa'
import ListaHabitos from './components/ListaHabitos'
import ListaTarefas from './components/ListaTarefas'
import Conquistas from './components/Conquistas'
import LevelUp from './components/LevelUp'
import Avisos from './components/Avisos'
import Desfazer from './components/Desfazer'
import BackupProgresso from './components/BackupProgresso'
import Pomodoro from './components/Pomodoro'
import Conta from './components/Conta'

const TEMPO_DESFAZER = 6000
const maisNovoPrimeiro = (a, b) => (b.criadaEm ?? b.criadoEm) - (a.criadaEm ?? a.criadoEm)

export default function App() {
  const [tarefas, setTarefas] = useLocalStorage('missoes:tarefas', [])
  const [habitos, setHabitos] = useLocalStorage('missoes:habitos', [])
  const [jogadorSalvo, setJogador] = useLocalStorage('missoes:jogador', JOGADOR_INICIAL)
  // Garante que dados salvos por uma versão antiga do app tenham os campos novos
  const jogador = { ...JOGADOR_INICIAL, ...jogadorSalvo }

  const [aba, setAba] = useState('tarefas')
  const [levelUp, setLevelUp] = useState(null)
  const [avisos, setAvisos] = useState([])
  const [desfazer, setDesfazer] = useState(null)
  const proximoAviso = useRef(1)
  const timerDesfazer = useRef(null)

  // ---------- Conta e sincronização com o Supabase ----------
  const auth = useAuth()

  function aplicarDados({ tarefas: t, habitos: h, jogador: j }) {
    setTarefas(t)
    setHabitos(h)
    setJogador({ ...JOGADOR_INICIAL, ...(j ?? {}) })
  }

  const sinc = useSincronizacao(auth.usuario, { tarefas, habitos, jogador }, aplicarDados)

  async function sair() {
    await auth.sair()
    // Este navegador volta ao modo visitante, começando do zero
    sinc.esquecerConta()
    aplicarDados({ tarefas: [], habitos: [], jogador: null })
    setDesfazer(null)
    setSugestao(null)
    setFocandoEm(null)
    avisar('Você saiu da conta.', 'info')
  }

  // ---------- Pomodoro ----------
  const [configSalva, setConfigPomodoro] = useLocalStorage('questly:pomodoro-config', CONFIG_POMODORO_INICIAL)
  const configPomodoro = { ...CONFIG_POMODORO_INICIAL, ...configSalva }
  // Item em que você está focando: 'tarefa:<id>' ou 'habito:<id>'
  const [focandoEm, setFocandoEm] = useLocalStorage('questly:focando-em', null)
  const [sugestao, setSugestao] = useState(null)

  const timer = usePomodoro(configPomodoro, (minutos) => {
    // O Pomodoro não dá XP: só registra as estatísticas de foco
    setJogador(registrarPomodoro(jogador, minutos))
    avisar('⏱️ Foco concluído! Hora da pausa.', 'info')

    const item = opcoesFoco.find((o) => o.chave === focandoEm)
    if (item) setSugestao(item)
  })

  // Tarefas pendentes e hábitos de hoje ainda não feitos, para escolher no Pomodoro
  const opcoesFoco = [
    ...habitos
      .filter((h) => habitoNoDia(h) && h.historico[hoje()] === undefined)
      .map((h) => ({ chave: `habito:${h.id}`, titulo: h.titulo, tipo: 'habito' })),
    ...tarefas
      .filter((t) => !t.concluida)
      .map((t) => ({ chave: `tarefa:${t.id}`, titulo: t.titulo, tipo: 'tarefa' })),
  ]

  function concluirSugestao() {
    const [tipo, id] = sugestao.chave.split(':')
    // Só marca se ainda estiver pendente (pode ter sido feita em outra aba)
    if (opcoesFoco.some((o) => o.chave === sugestao.chave)) {
      if (tipo === 'tarefa') alternarTarefa(id)
      else alternarHabito(id)
    }
    setSugestao(null)
    setFocandoEm(null)
  }

  // Se o app ficar aberto na virada do dia, redesenha para os hábitos "renovarem"
  const [, setDiaAtual] = useState(hoje())
  useEffect(() => {
    const id = setInterval(() => setDiaAtual(hoje()), 60 * 1000)
    return () => clearInterval(id)
  }, [])

  function avisar(texto, tipo = 'xp') {
    const id = proximoAviso.current++
    setAvisos((lista) => [...lista, { id, texto, tipo }])
    setTimeout(() => setAvisos((lista) => lista.filter((a) => a.id !== id)), 2600)
  }

  // ---------- Mensagens de ganho/perda (iguais para tarefas e hábitos) ----------

  function anunciarConclusao(r) {
    if (r.ganho === 0) {
      avisar(`Limite de ${LIMITE_XP_DIARIO} XP de hoje atingido. Volte amanhã!`, 'info')
    } else if (r.ganho < r.xpCheio) {
      avisar(`+${r.ganho} XP (limite diário atingido)`)
    } else {
      avisar(r.bonus > 0 ? `+${r.ganho} XP (bônus de streak!)` : `+${r.ganho} XP`)
    }
    r.desbloqueadas.forEach((c) => avisar(`${c.icone} Conquista: ${c.nome}`, 'conquista'))
    if (r.subiuPara) setLevelUp(r.subiuPara)
  }

  function anunciarDesmarcacao(xpGanho, perdidas) {
    if (xpGanho > 0) avisar(`-${xpGanho} XP`, 'perda')
    perdidas.forEach((c) => avisar(`Conquista perdida: ${c.nome}`, 'perda'))
  }

  // Ainda sobrou alguma coisa feita hoje? (para saber se o streak do dia continua)
  function temAlgoFeitoHoje(listaTarefas, listaHabitos) {
    return (
      listaTarefas.some((t) => t.concluida && ehHoje(t.concluidaEm)) ||
      listaHabitos.some((h) => h.historico[hoje()] !== undefined)
    )
  }

  // ---------- Criar ----------

  function adicionar({ titulo, dificuldade, repeticao, dias }) {
    if (repeticao === 'unica') {
      const nova = {
        id: crypto.randomUUID(),
        titulo,
        dificuldade,
        concluida: false,
        xpGanho: 0,
        contou: false,
        criadaEm: Date.now(),
        concluidaEm: null,
      }
      setTarefas([nova, ...tarefas])
    } else {
      const novo = {
        id: crypto.randomUUID(),
        titulo,
        dificuldade,
        repeticao, // 'diaria' | 'semanal'
        dias, // 0 = domingo ... 6 = sábado (usado só no 'semanal')
        historico: {}, // { 'AAAA-MM-DD': { xp, contou } }
        criadoEm: Date.now(),
      }
      setHabitos([novo, ...habitos])
      avisar('Hábito criado!', 'info')
    }
  }

  // ---------- Tarefas únicas ----------

  function editarTarefa(id, titulo) {
    setTarefas(tarefas.map((t) => (t.id === id ? { ...t, titulo } : t)))
  }

  function alternarTarefa(id) {
    const tarefa = tarefas.find((t) => t.id === id)
    if (!tarefa) return

    if (!tarefa.concluida) {
      const r = registrarConclusao(jogador, tarefa.dificuldade)
      setJogador(r.jogador)
      setTarefas(
        tarefas.map((t) =>
          t.id === id ? { ...t, concluida: true, xpGanho: r.ganho, contou: r.contou, concluidaEm: Date.now() } : t
        )
      )
      anunciarConclusao(r)
    } else {
      const novasTarefas = tarefas.map((t) =>
        t.id === id ? { ...t, concluida: false, xpGanho: 0, contou: false, concluidaEm: null } : t
      )
      const { jogador: j, perdidas } = registrarDesmarcacao(
        jogador,
        {
          xpGanho: tarefa.xpGanho,
          // Tarefas antigas (de antes do limite diário) não têm "contou"
          contou: tarefa.contou ?? tarefa.xpGanho > 0,
          dificuldade: tarefa.dificuldade,
          foiHoje: ehHoje(tarefa.concluidaEm),
        },
        temAlgoFeitoHoje(novasTarefas, habitos)
      )
      setJogador(j)
      setTarefas(novasTarefas)
      anunciarDesmarcacao(tarefa.xpGanho, perdidas)
    }
  }

  // ---------- Hábitos ----------

  function editarHabito(id, titulo) {
    setHabitos(habitos.map((h) => (h.id === id ? { ...h, titulo } : h)))
  }

  function alternarHabito(id) {
    const habito = habitos.find((h) => h.id === id)
    if (!habito) return
    const dia = hoje()
    const registro = habito.historico[dia]

    if (registro === undefined) {
      const r = registrarConclusao(jogador, habito.dificuldade, { ehHabito: true })
      setJogador(r.jogador)
      setHabitos(
        habitos.map((h) =>
          h.id === id ? { ...h, historico: { ...h.historico, [dia]: { xp: r.ganho, contou: r.contou } } } : h
        )
      )
      anunciarConclusao(r)
    } else {
      const { [dia]: _removido, ...historicoSemHoje } = habito.historico
      const novosHabitos = habitos.map((h) => (h.id === id ? { ...h, historico: historicoSemHoje } : h))
      const { jogador: j, perdidas } = registrarDesmarcacao(
        jogador,
        { xpGanho: registro.xp, contou: registro.contou, dificuldade: habito.dificuldade, foiHoje: true, ehHabito: true },
        temAlgoFeitoHoje(tarefas, novosHabitos)
      )
      setJogador(j)
      setHabitos(novosHabitos)
      anunciarDesmarcacao(registro.xp, perdidas)
    }
  }

  // ---------- Excluir com opção de desfazer ----------
  // Excluir algo já concluído não tira o XP ganho (o limite diário impede abusos).

  function removerComDesfazer(tipo, removidos, texto) {
    if (removidos.length === 0) return
    const ids = new Set(removidos.map((x) => x.id))
    if (tipo === 'tarefas') setTarefas(tarefas.filter((t) => !ids.has(t.id)))
    else setHabitos(habitos.filter((h) => !ids.has(h.id)))

    clearTimeout(timerDesfazer.current)
    // Se havia um "desfazer" anterior pendente, ele é descartado (a exclusão fica valendo)
    setDesfazer({ tipo, texto, removidos })
    timerDesfazer.current = setTimeout(() => setDesfazer(null), TEMPO_DESFAZER)
  }

  function excluirTarefa(id) {
    const tarefa = tarefas.find((t) => t.id === id)
    if (tarefa) removerComDesfazer('tarefas', [tarefa], 'Tarefa excluída')
  }

  function limparConcluidas() {
    const concluidas = tarefas.filter((t) => t.concluida)
    removerComDesfazer(
      'tarefas',
      concluidas,
      `${concluidas.length} ${concluidas.length === 1 ? 'tarefa removida' : 'tarefas removidas'}`
    )
  }

  function excluirHabito(id) {
    const habito = habitos.find((h) => h.id === id)
    if (habito) removerComDesfazer('habitos', [habito], 'Hábito excluído')
  }

  function desfazerExclusao() {
    if (!desfazer) return
    clearTimeout(timerDesfazer.current)
    // Junta de volta e reordena do mais novo para o mais antigo
    if (desfazer.tipo === 'tarefas') setTarefas([...desfazer.removidos, ...tarefas].sort(maisNovoPrimeiro))
    else setHabitos([...desfazer.removidos, ...habitos].sort(maisNovoPrimeiro))
    setDesfazer(null)
  }

  // ---------- Backup ----------

  function importarProgresso(dados) {
    setTarefas(dados.tarefas)
    setHabitos(dados.habitos ?? [])
    setJogador({ ...JOGADOR_INICIAL, ...dados.jogador })
    setDesfazer(null)
    avisar('Progresso importado!', 'info')
  }

  return (
    <div className="app">
      <header className="topo">
        <h1 className="logo">Questly</h1>
        <Conta auth={auth} status={sinc.status} pendente={sinc.pendente} onSair={sair} />
        <nav className="abas">
          <button className={aba === 'tarefas' ? 'ativa' : ''} onClick={() => setAba('tarefas')}>
            Tarefas
          </button>
          <button className={aba === 'foco' ? 'ativa' : ''} onClick={() => setAba('foco')}>
            {timer.rodando && aba !== 'foco' ? `⏱ ${formatarTempo(timer.restanteMs)}` : 'Foco'}
          </button>
          <button className={aba === 'conquistas' ? 'ativa' : ''} onClick={() => setAba('conquistas')}>
            Conquistas <span className="contador">{jogador.conquistas.length}</span>
          </button>
        </nav>
      </header>

      <PainelJogador jogador={jogador} />

      {aba === 'tarefas' ? (
        <main>
          <FormTarefa onAdicionar={adicionar} />
          <ListaHabitos
            habitos={habitos}
            onAlternar={alternarHabito}
            onEditar={editarHabito}
            onExcluir={excluirHabito}
          />
          <ListaTarefas
            tarefas={tarefas}
            onAlternar={alternarTarefa}
            onEditar={editarTarefa}
            onExcluir={excluirTarefa}
            onLimparConcluidas={limparConcluidas}
          />
        </main>
      ) : aba === 'foco' ? (
        <Pomodoro
          timer={timer}
          config={configPomodoro}
          onMudarConfig={(mudanca) => setConfigPomodoro({ ...configPomodoro, ...mudanca })}
          jogador={jogador}
          opcoesFoco={opcoesFoco}
          focandoEm={focandoEm}
          onFocarEm={setFocandoEm}
          sugestao={sugestao}
          onConcluirSugestao={concluirSugestao}
          onDispensarSugestao={() => setSugestao(null)}
        />
      ) : (
        <Conquistas desbloqueadas={jogador.conquistas} />
      )}

      <BackupProgresso tarefas={tarefas} habitos={habitos} jogador={jogador} logado={Boolean(auth.usuario)} onImportar={importarProgresso} />

      {levelUp && <LevelUp nivel={levelUp} onFechar={() => setLevelUp(null)} />}
      <Avisos avisos={avisos} />
      {desfazer && <Desfazer texto={desfazer.texto} onDesfazer={desfazerExclusao} />}
    </div>
  )
}
