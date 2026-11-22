import { useState } from 'react'
import { DIFICULDADES, descreverRepeticao, hoje, streakHabito } from '../game/regras'

// Um hábito na lista. Com "foraDoDia", aparece só para consulta (não dá para marcar hoje).
export default function ItemHabito({ habito, foraDoDia = false, onAlternar, onEditar, onExcluir }) {
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(habito.titulo)
  const dif = DIFICULDADES[habito.dificuldade]
  const registro = habito.historico[hoje()]
  const feito = registro !== undefined
  const streak = streakHabito(habito)

  function salvar() {
    const novo = texto.trim()
    if (novo && novo !== habito.titulo) onEditar(habito.id, novo)
    else setTexto(habito.titulo)
    setEditando(false)
  }

  function teclas(e) {
    if (e.key === 'Enter') salvar()
    if (e.key === 'Escape') {
      setTexto(habito.titulo)
      setEditando(false)
    }
  }

  return (
    <li className={`item item-habito ${feito ? 'concluida' : ''} ${foraDoDia ? 'fora-do-dia' : ''}`}>
      {foraDoDia ? (
        <span className="check check-inativo" aria-hidden="true" />
      ) : (
        <button
          className="check"
          onClick={() => onAlternar(habito.id)}
          aria-label={feito ? 'Desmarcar hábito de hoje' : 'Cumprir hábito de hoje'}
        >
          {feito ? '✔' : ''}
        </button>
      )}

      <div className="item-corpo">
        {editando ? (
          <input
            className="item-editar"
            value={texto}
            autoFocus
            onChange={(e) => setTexto(e.target.value)}
            onBlur={salvar}
            onKeyDown={teclas}
            maxLength={120}
          />
        ) : (
          <span className="item-titulo" onDoubleClick={() => setEditando(true)} title="Clique duas vezes para editar">
            {habito.titulo}
          </span>
        )}
        <span className="habito-info">
          ↻ {descreverRepeticao(habito)}
          {streak > 0 && <span className="habito-streak"> · 🔥 {streak} {streak === 1 ? 'vez' : 'seguidas'}</span>}
        </span>
      </div>

      <span className={`tag dif-${habito.dificuldade}`}>
        {feito ? `+${registro.xp} XP` : `${dif.rotulo} · ${dif.xp} XP`}
      </span>

      <button className="excluir" onClick={() => onExcluir(habito.id)} aria-label="Excluir hábito">
        ✕
      </button>
    </li>
  )
}
