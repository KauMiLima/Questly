// Todas as regras do "jogo" ficam aqui, separadas da interface.

export const DIFICULDADES = {
  facil: { rotulo: 'Fácil', xp: 10 },
  media: { rotulo: 'Média', xp: 25 },
  dificil: { rotulo: 'Difícil', xp: 50 },
}

// Máximo de XP que dá para ganhar por dia. Impede "farmar" pontos
// criando e concluindo tarefas falsas sem parar.
export const LIMITE_XP_DIARIO = 400

export const JOGADOR_INICIAL = {
  xp: 0,
  streak: 0,
  maiorStreak: 0,
  ultimoDiaAtivo: null,
  totalConcluidas: 0,
  dificeisConcluidas: 0,
  habitosFeitos: 0,
  pomodoros: 0, // focos completos (só estatística, não dá XP)
  minutosFoco: 0,
  focosHoje: { dia: null, valor: 0 },
  conquistas: [],
  xpHoje: { dia: null, valor: 0 },
  // Como o streak estava antes da primeira tarefa do dia.
  // Serve para desfazer o streak se você desmarcar a única tarefa de hoje.
  backupStreak: null,
}

// ---------- Níveis ----------

// Para sair do nível N e ir para o N+1 são necessários N × 100 XP.
export function xpParaProximoNivel(nivel) {
  return nivel * 100
}

// A partir do XP total, descobre o nível atual e o progresso dentro dele.
export function calcularNivel(xpTotal) {
  let nivel = 1
  let resto = xpTotal
  while (resto >= xpParaProximoNivel(nivel)) {
    resto -= xpParaProximoNivel(nivel)
    nivel++
  }
  return { nivel, xpNoNivel: resto, xpNecessario: xpParaProximoNivel(nivel) }
}

const TITULOS = [
  { nivel: 1, titulo: 'Novato' },
  { nivel: 3, titulo: 'Aprendiz' },
  { nivel: 5, titulo: 'Aventureiro' },
  { nivel: 8, titulo: 'Veterano' },
  { nivel: 12, titulo: 'Mestre' },
  { nivel: 20, titulo: 'Lenda' },
]

export function tituloDoNivel(nivel) {
  let atual = TITULOS[0].titulo
  for (const t of TITULOS) if (nivel >= t.nivel) atual = t.titulo
  return atual
}

// ---------- Datas e streak ----------

function dataLocal(data) {
  const a = data.getFullYear()
  const m = String(data.getMonth() + 1).padStart(2, '0')
  const d = String(data.getDate()).padStart(2, '0')
  return `${a}-${m}-${d}`
}

export function hoje() {
  return dataLocal(new Date())
}

export function ontem() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return dataLocal(d)
}

// O streak só continua valendo se a última atividade foi hoje ou ontem.
export function streakAtual(jogador) {
  if (jogador.ultimoDiaAtivo === hoje() || jogador.ultimoDiaAtivo === ontem()) {
    return jogador.streak
  }
  return 0
}

// Chamado quando uma tarefa é concluída.
export function atualizarStreak(jogador) {
  const dia = hoje()
  if (jogador.ultimoDiaAtivo === dia) return jogador
  const novoStreak = jogador.ultimoDiaAtivo === ontem() ? jogador.streak + 1 : 1
  return {
    ...jogador,
    backupStreak: {
      dia,
      streak: jogador.streak,
      maiorStreak: jogador.maiorStreak,
      ultimoDiaAtivo: jogador.ultimoDiaAtivo,
    },
    streak: novoStreak,
    maiorStreak: Math.max(jogador.maiorStreak, novoStreak),
    ultimoDiaAtivo: dia,
  }
}

// Chamado ao desmarcar: se não sobrou nenhuma tarefa concluída hoje,
// o dia de hoje não conta mais para o streak.
export function reverterStreakSePreciso(jogador, aindaTemConcluidaHoje) {
  const b = jogador.backupStreak
  if (aindaTemConcluidaHoje || !b || b.dia !== hoje()) return jogador
  return {
    ...jogador,
    streak: b.streak,
    maiorStreak: b.maiorStreak,
    ultimoDiaAtivo: b.ultimoDiaAtivo,
    backupStreak: null,
  }
}

// Situação do streak para mostrar avisos no painel.
export function situacaoStreak(jogador) {
  if (jogador.ultimoDiaAtivo === hoje()) return { tipo: 'ok' }
  if (jogador.ultimoDiaAtivo === ontem() && jogador.streak > 0) {
    return { tipo: 'risco', dias: jogador.streak }
  }
  if (jogador.ultimoDiaAtivo && jogador.streak >= 2) {
    return { tipo: 'perdido', dias: jogador.streak }
  }
  return { tipo: 'nenhum' }
}

// ---------- Limite diário ----------

export function xpDeHoje(jogador) {
  return jogador.xpHoje?.dia === hoje() ? jogador.xpHoje.valor : 0
}

export function ehHoje(timestamp) {
  return timestamp != null && dataLocal(new Date(timestamp)) === hoje()
}

// Bônus de XP por manter a sequência de dias.
export function bonusStreak(streak) {
  if (streak >= 7) return 0.25
  if (streak >= 3) return 0.1
  return 0
}

// ---------- Conquistas ----------

export const CONQUISTAS = [
  { id: 'primeira', icone: '🎯', nome: 'Primeiro passo', descricao: 'Conclua sua primeira tarefa', check: (j) => j.totalConcluidas >= 1 },
  { id: 'dez', icone: '⚡', nome: 'Produtivo', descricao: 'Conclua 10 tarefas', check: (j) => j.totalConcluidas >= 10 },
  { id: 'cinquenta', icone: '🏆', nome: 'Máquina de tarefas', descricao: 'Conclua 50 tarefas', check: (j) => j.totalConcluidas >= 50 },
  { id: 'habito1', icone: '🌱', nome: 'Primeiro hábito', descricao: 'Cumpra um hábito pela primeira vez', check: (j) => j.habitosFeitos >= 1 },
  { id: 'habitos30', icone: '🌳', nome: 'Hábito formado', descricao: 'Cumpra hábitos 30 vezes', check: (j) => j.habitosFeitos >= 30 },
  { id: 'dificil', icone: '🐉', nome: 'Sem medo do difícil', descricao: 'Conclua 5 tarefas difíceis', check: (j) => j.dificeisConcluidas >= 5 },
  { id: 'streak3', icone: '🔥', nome: 'Pegando ritmo', descricao: 'Mantenha 3 dias seguidos', check: (j) => j.maiorStreak >= 3 },
  { id: 'streak7', icone: '📅', nome: 'Semana perfeita', descricao: 'Mantenha 7 dias seguidos', check: (j) => j.maiorStreak >= 7 },
  { id: 'nivel5', icone: '🛡️', nome: 'Aventureiro', descricao: 'Chegue ao nível 5', check: (j) => calcularNivel(j.xp).nivel >= 5 },
  { id: 'nivel10', icone: '👑', nome: 'Veterano', descricao: 'Chegue ao nível 10', check: (j) => calcularNivel(j.xp).nivel >= 10 },
]

// Retorna as conquistas que o jogador acabou de cumprir e ainda não tinha.
export function novasConquistas(jogador) {
  return CONQUISTAS.filter((c) => !jogador.conquistas.includes(c.id) && c.check(jogador))
}

// Retorna as conquistas que o jogador tinha mas não cumpre mais (ex.: desmarcou tarefas).
export function conquistasPerdidas(jogador) {
  return CONQUISTAS.filter((c) => jogador.conquistas.includes(c.id) && !c.check(jogador))
}

// ---------- Ganhar e perder XP ----------
// Usado tanto por tarefas quanto por hábitos.

// Base de tudo que dá XP: atualiza o streak, aplica o bônus e o limite diário
// e checa conquistas. "contadores" recebe (jogador, contou) e devolve os
// campos que devem mudar (ex.: totalConcluidas). Não mexe no React.
function ganharXp(jogador, xpBase, contadores) {
  let j = atualizarStreak(jogador)
  const bonus = bonusStreak(j.streak)
  const xpCheio = Math.round(xpBase * (1 + bonus))
  const restanteHoje = Math.max(0, LIMITE_XP_DIARIO - xpDeHoje(jogador))
  const ganho = Math.min(xpCheio, restanteHoje)
  // Só conta para as conquistas se deu XP (senão daria para farmar medalhas)
  const contou = ganho > 0

  j = {
    ...j,
    xp: j.xp + ganho,
    xpHoje: { dia: hoje(), valor: xpDeHoje(jogador) + ganho },
    ...contadores(j, contou),
  }

  const desbloqueadas = novasConquistas(j)
  j = { ...j, conquistas: [...j.conquistas, ...desbloqueadas.map((c) => c.id)] }

  const nivelAntes = calcularNivel(jogador.xp).nivel
  const nivelDepois = calcularNivel(j.xp).nivel

  return {
    jogador: j,
    ganho,
    xpCheio,
    bonus,
    contou,
    desbloqueadas,
    subiuPara: nivelDepois > nivelAntes ? nivelDepois : null,
  }
}

// Concluir uma tarefa ou hábito.
export function registrarConclusao(jogador, dificuldade, { ehHabito = false } = {}) {
  return ganharXp(jogador, DIFICULDADES[dificuldade].xp, (j, contou) => ({
    totalConcluidas: j.totalConcluidas + (contou ? 1 : 0),
    dificeisConcluidas: j.dificeisConcluidas + (contou && dificuldade === 'dificil' ? 1 : 0),
    habitosFeitos: j.habitosFeitos + (contou && ehHabito ? 1 : 0),
  }))
}

// ---------- Pomodoro ----------
// O Pomodoro é só uma ferramenta de foco: não dá XP, não conta para o streak
// nem para conquistas. O XP vem de concluir a tarefa em que você focou.

// Opções de duração (minutos)
export const OPCOES_POMODORO = {
  foco: [15, 25, 50],
  curta: [5, 10],
  longa: [15, 20, 30],
}

export const CONFIG_POMODORO_INICIAL = {
  foco: 25,
  curta: 5,
  longa: 15,
  autoIniciar: false,
  som: true,
  notificar: false,
}

export function focosDeHoje(jogador) {
  return jogador.focosHoje?.dia === hoje() ? jogador.focosHoje.valor : 0
}

// Um foco chegou ao fim: só atualiza as estatísticas.
export function registrarPomodoro(jogador, minutos) {
  return {
    ...jogador,
    pomodoros: jogador.pomodoros + 1,
    minutosFoco: jogador.minutosFoco + minutos,
    focosHoje: { dia: hoje(), valor: focosDeHoje(jogador) + 1 },
  }
}

// Desmarcar algo: devolve o XP, desconta do limite do dia, ajusta contadores,
// reverte o streak se preciso e remove conquistas que deixaram de valer.
export function registrarDesmarcacao(jogador, { xpGanho, contou, dificuldade, foiHoje, ehHabito = false }, aindaTemAlgoHoje) {
  let j = {
    ...jogador,
    xp: Math.max(0, jogador.xp - xpGanho),
    xpHoje: foiHoje ? { dia: hoje(), valor: Math.max(0, xpDeHoje(jogador) - xpGanho) } : jogador.xpHoje,
    totalConcluidas: Math.max(0, jogador.totalConcluidas - (contou ? 1 : 0)),
    dificeisConcluidas: Math.max(0, jogador.dificeisConcluidas - (contou && dificuldade === 'dificil' ? 1 : 0)),
    habitosFeitos: Math.max(0, jogador.habitosFeitos - (contou && ehHabito ? 1 : 0)),
  }
  j = reverterStreakSePreciso(j, aindaTemAlgoHoje)

  const perdidas = conquistasPerdidas(j)
  j = { ...j, conquistas: j.conquistas.filter((id) => !perdidas.some((c) => c.id === id)) }
  return { jogador: j, perdidas }
}

// ---------- Hábitos (tarefas recorrentes) ----------

export const DIAS_SEMANA = [
  { curto: 'D', nome: 'Domingo' },
  { curto: 'S', nome: 'Segunda' },
  { curto: 'T', nome: 'Terça' },
  { curto: 'Q', nome: 'Quarta' },
  { curto: 'Q', nome: 'Quinta' },
  { curto: 'S', nome: 'Sexta' },
  { curto: 'S', nome: 'Sábado' },
]

// O hábito acontece nesse dia? (repeticao 'diaria' ou 'semanal' com lista de dias 0-6)
export function habitoNoDia(habito, data = new Date()) {
  return habito.repeticao === 'diaria' || habito.dias.includes(data.getDay())
}

export function habitoFeitoHoje(habito) {
  return habito.historico[hoje()] !== undefined
}

// Quantos dias programados seguidos o hábito foi cumprido.
// Calculado a partir do histórico, então desmarcar já corrige sozinho.
export function streakHabito(habito) {
  const criadoEm = dataLocal(new Date(habito.criadoEm))
  const d = new Date()
  let seguidos = 0
  for (let i = 0; i < 400; i++) {
    const chave = dataLocal(d)
    if (chave < criadoEm) break
    if (habitoNoDia(habito, d)) {
      if (habito.historico[chave] !== undefined) seguidos++
      else if (i > 0) break // hoje ainda não feito não quebra a sequência
    }
    d.setDate(d.getDate() - 1)
  }
  return seguidos
}

// Texto curto da repetição: "Todo dia", "Dias úteis", "Seg, Qua, Sex"...
export function descreverRepeticao(habito) {
  if (habito.repeticao === 'diaria' || habito.dias.length === 7) return 'Todo dia'
  const dias = [...habito.dias].sort()
  if (dias.join() === '1,2,3,4,5') return 'Dias úteis'
  if (dias.join() === '0,6') return 'Fins de semana'
  return dias.map((i) => DIAS_SEMANA[i].nome.slice(0, 3)).join(', ')
}

// ---------- Backup ----------

function habitoValido(h) {
  return (
    typeof h.id === 'string' &&
    typeof h.titulo === 'string' &&
    h.dificuldade in DIFICULDADES &&
    (h.repeticao === 'diaria' || h.repeticao === 'semanal') &&
    Array.isArray(h.dias) &&
    h.historico &&
    typeof h.historico === 'object'
  )
}

// Confere se um arquivo importado tem o formato certo antes de usar.
// Backups antigos (sem hábitos) continuam válidos.
export function validarBackup(dados) {
  return (
    dados &&
    Array.isArray(dados.tarefas) &&
    dados.tarefas.every((t) => typeof t.id === 'string' && typeof t.titulo === 'string' && t.dificuldade in DIFICULDADES) &&
    (dados.habitos === undefined || (Array.isArray(dados.habitos) && dados.habitos.every(habitoValido))) &&
    dados.jogador &&
    typeof dados.jogador.xp === 'number' &&
    Array.isArray(dados.jogador.conquistas)
  )
}
