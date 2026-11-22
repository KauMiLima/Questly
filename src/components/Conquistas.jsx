import { CONQUISTAS } from '../game/regras'

export default function Conquistas({ desbloqueadas }) {
  return (
    <section className="conquistas">
      <p className="conquistas-resumo">
        {desbloqueadas.length} de {CONQUISTAS.length} conquistas desbloqueadas
      </p>
      <ul className="grade">
        {CONQUISTAS.map((c) => {
          const ok = desbloqueadas.includes(c.id)
          return (
            <li key={c.id} className={`medalha ${ok ? 'ganha' : 'bloqueada'}`}>
              <span className="medalha-icone">{ok ? c.icone : '🔒'}</span>
              <strong>{c.nome}</strong>
              <small>{c.descricao}</small>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
