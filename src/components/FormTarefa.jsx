import { useState } from 'react'
import { DIFICULDADES } from '../game/regras'

export default function FormTarefa({ onAdicionar }) {
  const [titulo, setTitulo] = useState('')
  const [dificuldade, setDificuldade] = useState('facil')

  function enviar(e) {
    e.preventDefault()
    const texto = titulo.trim()
    if (!texto) return
    onAdicionar(texto, dificuldade)
    setTitulo('')
  }

  return (
    <form className="form" onSubmit={enviar}>
      <input
        className="form-input"
        type="text"
        placeholder="Nova missão… ex.: estudar React por 30 min"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        maxLength={120}
      />

      <div className="dificuldades" role="radiogroup" aria-label="Dificuldade">
        {Object.entries(DIFICULDADES).map(([chave, d]) => (
          <button
            key={chave}
            type="button"
            role="radio"
            aria-checked={dificuldade === chave}
            className={`dif dif-${chave} ${dificuldade === chave ? 'selecionada' : ''}`}
            onClick={() => setDificuldade(chave)}
          >
            {d.rotulo} <small>+{d.xp}</small>
          </button>
        ))}
      </div>

      <button className="btn-adicionar" type="submit" disabled={!titulo.trim()}>
        Adicionar
      </button>
    </form>
  )
}
