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

// ---------- Backup ----------

// Confere se um arquivo importado tem o formato certo antes de usar.
export function validarBackup(dados) {
  return (
    dados &&
    Array.isArray(dados.tarefas) &&
    dados.tarefas.every((t) => typeof t.id === 'string' && typeof t.titulo === 'string' && t.dificuldade in DIFICULDADES) &&
    dados.jogador &&
    typeof dados.jogador.xp === 'number' &&
    Array.isArray(dados.jogador.conquistas)
  )
}
