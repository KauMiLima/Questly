// Conversa com as tabelas do Supabase.
// No app os campos usam camelCase (xpGanho); no banco, snake_case (xp_ganho).
import { supabase } from './supabase'

const paraIso = (ms) => (ms == null ? null : new Date(ms).toISOString())
const paraMs = (iso) => (iso == null ? null : Date.parse(iso))

// ---------- Conversões app <-> banco ----------

export function tarefaParaLinha(t, userId) {
  return {
    id: t.id,
    user_id: userId,
    titulo: t.titulo,
    dificuldade: t.dificuldade,
    concluida: t.concluida,
    xp_ganho: t.xpGanho ?? 0,
    contou: t.contou ?? (t.xpGanho ?? 0) > 0,
    criada_em: paraIso(t.criadaEm),
    concluida_em: paraIso(t.concluidaEm),
  }
}

export function linhaParaTarefa(l) {
  return {
    id: l.id,
    titulo: l.titulo,
    dificuldade: l.dificuldade,
    concluida: l.concluida,
    xpGanho: l.xp_ganho,
    contou: l.contou,
    criadaEm: paraMs(l.criada_em),
    concluidaEm: paraMs(l.concluida_em),
  }
}

export function habitoParaLinha(h, userId) {
  return {
    id: h.id,
    user_id: userId,
    titulo: h.titulo,
    dificuldade: h.dificuldade,
    repeticao: h.repeticao,
    dias: h.dias,
    historico: h.historico,
    criado_em: paraIso(h.criadoEm),
  }
}

export function linhaParaHabito(l) {
  return {
    id: l.id,
    titulo: l.titulo,
    dificuldade: l.dificuldade,
    repeticao: l.repeticao,
    dias: l.dias ?? [],
    historico: l.historico ?? {},
    criadoEm: paraMs(l.criado_em),
  }
}

// JSON com as chaves em ordem alfabética (para comparar objetos como o jogador)
function jsonEstavel(valor) {
  if (Array.isArray(valor)) return `[${valor.map(jsonEstavel).join(',')}]`
  if (valor && typeof valor === 'object') {
    return `{${Object.keys(valor)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${jsonEstavel(valor[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(valor)
}

// ---------- Leitura ----------

async function checar(promessa) {
  const { data, error } = await promessa
  if (error) throw error
  return data
}

// Busca tudo do usuário. jogador vem null se a conta ainda não tem perfil.
export async function buscarTudo(userId) {
  const [perfil, tarefas, habitos] = await Promise.all([
    checar(supabase.from('perfis').select('jogador').eq('user_id', userId).maybeSingle()),
    checar(supabase.from('tarefas').select('*').eq('user_id', userId).order('criada_em', { ascending: false })),
    checar(supabase.from('habitos').select('*').eq('user_id', userId).order('criado_em', { ascending: false })),
  ])
  return {
    jogador: perfil?.jogador ?? null,
    tarefas: tarefas.map(linhaParaTarefa),
    habitos: habitos.map(linhaParaHabito),
  }
}

// ---------- Escrita ----------

// Compara uma lista do servidor com a local e diz o que precisa mudar
function diferencasDaLista(remota, local, paraLinha, userId) {
  // jsonEstavel: o Postgres pode reordenar as chaves de colunas jsonb (como historico)
  const remotaPorId = new Map(remota.map((x) => [x.id, jsonEstavel(paraLinha(x, userId))]))
  const salvar = []
  for (const item of local) {
    const linha = paraLinha(item, userId)
    if (remotaPorId.get(item.id) !== jsonEstavel(linha)) salvar.push(linha)
  }
  const idsLocais = new Set(local.map((x) => x.id))
  const apagar = remota.filter((x) => !idsLocais.has(x.id)).map((x) => x.id)
  return { salvar, apagar }
}

// O que falta enviar para o servidor ficar igual ao estado local
export function calcularMudancas(remoto, local, userId) {
  const tarefas = diferencasDaLista(remoto.tarefas, local.tarefas, tarefaParaLinha, userId)
  const habitos = diferencasDaLista(remoto.habitos, local.habitos, habitoParaLinha, userId)
  const perfil =
    remoto.jogador === null || jsonEstavel(remoto.jogador) !== jsonEstavel(local.jogador)
      ? { user_id: userId, jogador: local.jogador, atualizado_em: new Date().toISOString() }
      : null
  const vazio =
    !perfil && !tarefas.salvar.length && !tarefas.apagar.length && !habitos.salvar.length && !habitos.apagar.length
  return { tarefas, habitos, perfil, vazio }
}

// Envia as mudanças. Se der erro no meio, é seguro mandar tudo de novo:
// upsert e delete podem ser repetidos sem duplicar nada.
export async function enviarMudancas(m) {
  const operacoes = []
  if (m.perfil) operacoes.push(supabase.from('perfis').upsert(m.perfil))
  if (m.tarefas.salvar.length) operacoes.push(supabase.from('tarefas').upsert(m.tarefas.salvar))
  if (m.tarefas.apagar.length) operacoes.push(supabase.from('tarefas').delete().in('id', m.tarefas.apagar))
  if (m.habitos.salvar.length) operacoes.push(supabase.from('habitos').upsert(m.habitos.salvar))
  if (m.habitos.apagar.length) operacoes.push(supabase.from('habitos').delete().in('id', m.habitos.apagar))
  const resultados = await Promise.all(operacoes)
  const falha = resultados.find((r) => r.error)
  if (falha) throw falha.error
}
