import { useState } from 'react'
import { DIFICULDADES } from '../game/regras'

export default function ItemTarefa({ tarefa, onAlternar, onEditar, onExcluir }) {
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(tarefa.titulo)
  const dif = DIFICULDADES[tarefa.dificuldade]

  function salvar() {
    const novo = texto.trim()
    if (novo && novo !== tarefa.titulo) onEditar(tarefa.id, novo)
    else setTexto(tarefa.titulo)
    setEditando(false)
  }

  function teclas(e) {
    if (e.key === 'Enter') salvar()
    if (e.key === 'Escape') {
      setTexto(tarefa.titulo)
      setEditando(false)
    }
  }

  return (
    <li className={`item ${tarefa.concluida ? 'concluida' : ''}`}>
      <button
        className="check"
        onClick={() => onAlternar(tarefa.id)}
        aria-label={tarefa.concluida ? 'Desmarcar tarefa' : 'Concluir tarefa'}
      >
        {tarefa.concluida ? '✔' : ''}
      </button>

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
        <span
          className="item-titulo"
          onDoubleClick={() => !tarefa.concluida && setEditando(true)}
          title={tarefa.concluida ? '' : 'Clique duas vezes para editar'}
        >
          {tarefa.titulo}
        </span>
      )}

      <span className={`tag dif-${tarefa.dificuldade}`}>
        {tarefa.concluida ? `+${tarefa.xpGanho} XP` : `${dif.rotulo} · ${dif.xp} XP`}
      </span>

      <button className="excluir" onClick={() => onExcluir(tarefa.id)} aria-label="Excluir tarefa">
        ✕
      </button>
    </li>
  )
}
