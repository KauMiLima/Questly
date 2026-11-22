// Mostra no máximo 3 avisos de cada vez, para não encher a tela.
export default function Avisos({ avisos }) {
  return (
    <div className="avisos" aria-live="polite">
      {avisos.slice(-3).map((a) => (
        <div key={a.id} className={`aviso aviso-${a.tipo}`}>
          {a.texto}
        </div>
      ))}
    </div>
  )
}
