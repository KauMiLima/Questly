import { useState } from 'react'
import ItemTarefa from './ItemTarefa'

const FILTROS = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'pendentes', rotulo: 'Pendentes' },
  { id: 'concluidas', rotulo: 'Concluídas' },
]

export default function ListaTarefas({ tarefas, onAlternar, onEditar, onExcluir, onLimparConcluidas }) {
  const [filtro, setFiltro] = useState('todas')

  const visiveis = tarefas.filter((t) => {
    if (filtro === 'pendentes') return !t.concluida
    if (filtro === 'concluidas') return t.concluida
    return true
  })

  // Pendentes primeiro, concluídas no fim
  const ordenadas = [...visiveis].sort((a, b) => Number(a.concluida) - Number(b.concluida))
  const pendentes = tarefas.filter((t) => !t.concluida).length
  const temConcluidas = tarefas.some((t) => t.concluida)

  return (
    <section className="lista">
      <div className="secao-topo">
        <h2 className="secao-titulo">Tarefas</h2>
      </div>
      <div className="lista-topo">
        <div className="filtros">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              className={filtro === f.id ? 'filtro ativo' : 'filtro'}
              onClick={() => setFiltro(f.id)}
            >
              {f.rotulo}
            </button>
          ))}
        </div>
        <span className="pendentes">
          {pendentes} {pendentes === 1 ? 'pendente' : 'pendentes'}
        </span>
      </div>

      {ordenadas.length === 0 ? (
        <div className="vazio">
          {tarefas.length === 0
            ? 'Nenhuma missão ainda. Adicione a primeira e comece a ganhar XP!'
            : 'Nada por aqui neste filtro.'}
        </div>
      ) : (
        <ul className="itens">
          {ordenadas.map((t) => (
            <ItemTarefa key={t.id} tarefa={t} onAlternar={onAlternar} onEditar={onEditar} onExcluir={onExcluir} />
          ))}
        </ul>
      )}

      {temConcluidas && (
        <button className="btn-limpar" onClick={onLimparConcluidas}>
          Limpar concluídas (o XP continua com você)
        </button>
      )}
    </section>
  )
}
