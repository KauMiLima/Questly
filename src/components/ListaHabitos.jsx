import { useState } from 'react'
import { habitoFeitoHoje, habitoNoDia } from '../game/regras'
import ItemHabito from './ItemHabito'

export default function ListaHabitos({ habitos, onAlternar, onEditar, onExcluir }) {
  const [mostrarOutros, setMostrarOutros] = useState(false)
  if (habitos.length === 0) return null

  const deHoje = habitos
    .filter((h) => habitoNoDia(h))
    .sort((a, b) => Number(habitoFeitoHoje(a)) - Number(habitoFeitoHoje(b)))
  const outros = habitos.filter((h) => !habitoNoDia(h))
  const feitos = deHoje.filter(habitoFeitoHoje).length

  return (
    <section className="habitos">
      <div className="secao-topo">
        <h2 className="secao-titulo">Hábitos de hoje</h2>
        {deHoje.length > 0 && (
          <span className={feitos === deHoje.length ? 'habitos-progresso completo' : 'habitos-progresso'}>
            {feitos}/{deHoje.length} {feitos === deHoje.length ? '· tudo feito!' : 'feitos'}
          </span>
        )}
      </div>

      {deHoje.length === 0 ? (
        <div className="vazio vazio-pequeno">Nenhum hábito programado para hoje. Aproveite o descanso!</div>
      ) : (
        <ul className="itens">
          {deHoje.map((h) => (
            <ItemHabito key={h.id} habito={h} onAlternar={onAlternar} onEditar={onEditar} onExcluir={onExcluir} />
          ))}
        </ul>
      )}

      {outros.length > 0 && (
        <>
          <button className="btn-outros" onClick={() => setMostrarOutros(!mostrarOutros)} aria-expanded={mostrarOutros}>
            {mostrarOutros ? '▾' : '▸'} Outros dias ({outros.length})
          </button>
          {mostrarOutros && (
            <ul className="itens">
              {outros.map((h) => (
                <ItemHabito key={h.id} habito={h} foraDoDia onEditar={onEditar} onExcluir={onExcluir} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
