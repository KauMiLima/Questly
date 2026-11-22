import { useState } from 'react'
import { DIAS_SEMANA, DIFICULDADES } from '../game/regras'

const REPETICOES = [
  { id: 'unica', rotulo: 'Uma vez' },
  { id: 'diaria', rotulo: 'Todo dia' },
  { id: 'semanal', rotulo: 'Alguns dias' },
]

export default function FormTarefa({ onAdicionar }) {
  const [titulo, setTitulo] = useState('')
  const [dificuldade, setDificuldade] = useState('facil')
  const [repeticao, setRepeticao] = useState('unica')
  const [dias, setDias] = useState([1, 3, 5]) // seg, qua, sex como sugestão

  const faltaDia = repeticao === 'semanal' && dias.length === 0
  const podeEnviar = titulo.trim() !== '' && !faltaDia

  function alternarDia(i) {
    setDias(dias.includes(i) ? dias.filter((d) => d !== i) : [...dias, i].sort())
  }

  function enviar(e) {
    e.preventDefault()
    if (!podeEnviar) return
    onAdicionar({ titulo: titulo.trim(), dificuldade, repeticao, dias: repeticao === 'semanal' ? dias : [] })
    setTitulo('')
  }

  return (
    <form className="form" onSubmit={enviar}>
      <input
        className="form-input"
        type="text"
        placeholder={repeticao === 'unica' ? 'Nova missão… ex.: estudar React por 30 min' : 'Novo hábito… ex.: beber 2 L de água'}
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        maxLength={120}
      />

      <div className="form-linha">
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

        <div className="repeticoes" role="radiogroup" aria-label="Repetição">
          {REPETICOES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={repeticao === r.id}
              className={repeticao === r.id ? 'rep selecionada' : 'rep'}
              onClick={() => setRepeticao(r.id)}
            >
              {r.rotulo}
            </button>
          ))}
        </div>
      </div>

      {repeticao === 'semanal' && (
        <div className="dias-semana" role="group" aria-label="Dias da semana">
          {DIAS_SEMANA.map((d, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={dias.includes(i)}
              aria-label={d.nome}
              title={d.nome}
              className={dias.includes(i) ? 'dia selecionado' : 'dia'}
              onClick={() => alternarDia(i)}
            >
              {d.curto}
            </button>
          ))}
          {faltaDia && <span className="form-aviso">Escolha pelo menos um dia</span>}
        </div>
      )}

      <button className="btn-adicionar" type="submit" disabled={!podeEnviar}>
        {repeticao === 'unica' ? 'Adicionar tarefa' : 'Criar hábito'}
      </button>
    </form>
  )
}
