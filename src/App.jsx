import { useRef, useState } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'
import {
  DIFICULDADES,
  JOGADOR_INICIAL,
  LIMITE_XP_DIARIO,
  atualizarStreak,
  bonusStreak,
  calcularNivel,
  conquistasPerdidas,
  ehHoje,
  hoje,
  novasConquistas,
  reverterStreakSePreciso,
  xpDeHoje,
} from './game/regras'
import PainelJogador from './components/PainelJogador'
import FormTarefa from './components/FormTarefa'
import ListaTarefas from './components/ListaTarefas'
import Conquistas from './components/Conquistas'
import LevelUp from './components/LevelUp'
import Avisos from './components/Avisos'
import Desfazer from './components/Desfazer'
import BackupProgresso from './components/BackupProgresso'

const TEMPO_DESFAZER = 6000

export default function App() {
  const [tarefas, setTarefas] = useLocalStorage('missoes:tarefas', [])
  const [jogadorSalvo, setJogador] = useLocalStorage('missoes:jogador', JOGADOR_INICIAL)
  // Garante que dados salvos por uma versão antiga do app tenham os campos novos
  const jogador = { ...JOGADOR_INICIAL, ...jogadorSalvo }

  const [aba, setAba] = useState('tarefas')
  const [levelUp, setLevelUp] = useState(null)
  const [avisos, setAvisos] = useState([])
  const [desfazer, setDesfazer] = useState(null)
  const proximoAviso = useRef(1)
  const timerDesfazer = useRef(null)

  function avisar(texto, tipo = 'xp') {
    const id = proximoAviso.current++
    setAvisos((lista) => [...lista, { id, texto, tipo }])
    setTimeout(() => setAvisos((lista) => lista.filter((a) => a.id !== id)), 2600)
  }

  // ---------- Criar / editar ----------

  function adicionarTarefa(titulo, dificuldade) {
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
  }

  function editarTarefa(id, titulo) {
    setTarefas(tarefas.map((t) => (t.id === id ? { ...t, titulo } : t)))
  }

  // ---------- Concluir / desmarcar ----------

  function concluir(tarefa) {
    let j = atualizarStreak(jogador)
    const bonus = bonusStreak(j.streak)
    const xpCheio = Math.round(DIFICULDADES[tarefa.dificuldade].xp * (1 + bonus))
    const restanteHoje = Math.max(0, LIMITE_XP_DIARIO - xpDeHoje(jogador))
    const ganho = Math.min(xpCheio, restanteHoje)
    // Só conta para as conquistas se a tarefa deu XP (senão daria para farmar medalhas)
    const contou = ganho > 0
    const nivelAntes = calcularNivel(jogador.xp).nivel

    j = {
      ...j,
      xp: j.xp + ganho,
      xpHoje: { dia: hoje(), valor: xpDeHoje(jogador) + ganho },
      totalConcluidas: j.totalConcluidas + (contou ? 1 : 0),
      dificeisConcluidas: j.dificeisConcluidas + (contou && tarefa.dificuldade === 'dificil' ? 1 : 0),
    }

    const desbloqueadas = novasConquistas(j)
    j = { ...j, conquistas: [...j.conquistas, ...desbloqueadas.map((c) => c.id)] }

    setJogador(j)
    setTarefas(
      tarefas.map((t) =>
        t.id === tarefa.id
          ? { ...t, concluida: true, xpGanho: ganho, contou, concluidaEm: Date.now() }
          : t
      )
    )

    if (ganho === 0) {
      avisar(`Limite de ${LIMITE_XP_DIARIO} XP de hoje atingido. Volte amanhã!`, 'info')
    } else if (ganho < xpCheio) {
      avisar(`+${ganho} XP (limite diário atingido)`)
    } else {
      avisar(bonus > 0 ? `+${ganho} XP (bônus de streak!)` : `+${ganho} XP`)
    }
    desbloqueadas.forEach((c) => avisar(`${c.icone} Conquista: ${c.nome}`, 'conquista'))

    const nivelDepois = calcularNivel(j.xp).nivel
    if (nivelDepois > nivelAntes) setLevelUp(nivelDepois)
  }

  function desmarcar(tarefa) {
    const novasTarefas = tarefas.map((t) =>
      t.id === tarefa.id ? { ...t, concluida: false, xpGanho: 0, contou: false, concluidaEm: null } : t
    )
    const foiHoje = ehHoje(tarefa.concluidaEm)
    // Tarefas antigas (de antes desta versão) não têm "contou": nelas, qualquer XP contava
    const contou = tarefa.contou ?? tarefa.xpGanho > 0

    let j = {
      ...jogador,
      xp: Math.max(0, jogador.xp - tarefa.xpGanho),
      xpHoje: foiHoje
        ? { dia: hoje(), valor: Math.max(0, xpDeHoje(jogador) - tarefa.xpGanho) }
        : jogador.xpHoje,
      totalConcluidas: Math.max(0, jogador.totalConcluidas - (contou ? 1 : 0)),
      dificeisConcluidas: Math.max(
        0,
        jogador.dificeisConcluidas - (contou && tarefa.dificuldade === 'dificil' ? 1 : 0)
      ),
    }

    const aindaTemHoje = novasTarefas.some((t) => t.concluida && ehHoje(t.concluidaEm))
    j = reverterStreakSePreciso(j, aindaTemHoje)

    const perdidas = conquistasPerdidas(j)
    j = { ...j, conquistas: j.conquistas.filter((id) => !perdidas.some((c) => c.id === id)) }

    setJogador(j)
    setTarefas(novasTarefas)
    if (tarefa.xpGanho > 0) avisar(`-${tarefa.xpGanho} XP`, 'perda')
    perdidas.forEach((c) => avisar(`Conquista perdida: ${c.nome}`, 'perda'))
  }

  function alternarTarefa(id) {
    const tarefa = tarefas.find((t) => t.id === id)
    if (!tarefa) return
    if (tarefa.concluida) desmarcar(tarefa)
    else concluir(tarefa)
  }

  // ---------- Excluir com opção de desfazer ----------

  function removerComDesfazer(removidas, texto) {
    if (removidas.length === 0) return
    const ids = new Set(removidas.map((t) => t.id))
    setTarefas(tarefas.filter((t) => !ids.has(t.id)))

    clearTimeout(timerDesfazer.current)
    // Se havia um "desfazer" anterior pendente, ele é descartado (a exclusão fica valendo)
    setDesfazer({ texto, removidas })
    timerDesfazer.current = setTimeout(() => setDesfazer(null), TEMPO_DESFAZER)
  }

  function excluirTarefa(id) {
    // Excluir uma tarefa concluída não tira o XP já ganho
    // (o limite diário é o que impede abusar disso).
    const tarefa = tarefas.find((t) => t.id === id)
    if (tarefa) removerComDesfazer([tarefa], 'Tarefa excluída')
  }

  function limparConcluidas() {
    const concluidas = tarefas.filter((t) => t.concluida)
    removerComDesfazer(
      concluidas,
      `${concluidas.length} ${concluidas.length === 1 ? 'tarefa removida' : 'tarefas removidas'}`
    )
  }

  function desfazerExclusao() {
    if (!desfazer) return
    clearTimeout(timerDesfazer.current)
    // Junta de volta e reordena da mais nova para a mais antiga
    const restauradas = [...desfazer.removidas, ...tarefas].sort((a, b) => b.criadaEm - a.criadaEm)
    setTarefas(restauradas)
    setDesfazer(null)
  }

  // ---------- Backup ----------

  function importarProgresso(dados) {
    setTarefas(dados.tarefas)
    setJogador({ ...JOGADOR_INICIAL, ...dados.jogador })
    setDesfazer(null)
    avisar('Progresso importado!', 'info')
  }

  return (
    <div className="app">
      <header className="topo">
        <h1 className="logo">Questly</h1>
        <nav className="abas">
          <button className={aba === 'tarefas' ? 'ativa' : ''} onClick={() => setAba('tarefas')}>
            Tarefas
          </button>
          <button className={aba === 'conquistas' ? 'ativa' : ''} onClick={() => setAba('conquistas')}>
            Conquistas <span className="contador">{jogador.conquistas.length}</span>
          </button>
        </nav>
      </header>

      <PainelJogador jogador={jogador} />

      {aba === 'tarefas' ? (
        <main>
          <FormTarefa onAdicionar={adicionarTarefa} />
          <ListaTarefas
            tarefas={tarefas}
            onAlternar={alternarTarefa}
            onEditar={editarTarefa}
            onExcluir={excluirTarefa}
            onLimparConcluidas={limparConcluidas}
          />
        </main>
      ) : (
        <Conquistas desbloqueadas={jogador.conquistas} />
      )}

      <BackupProgresso tarefas={tarefas} jogador={jogador} onImportar={importarProgresso} />

      {levelUp && <LevelUp nivel={levelUp} onFechar={() => setLevelUp(null)} />}
      <Avisos avisos={avisos} />
      {desfazer && <Desfazer texto={desfazer.texto} onDesfazer={desfazerExclusao} />}
    </div>
  )
}
