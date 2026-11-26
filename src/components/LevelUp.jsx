import { useEffect } from 'react'
import { tituloDoNivel } from '../game/regras'

export default function LevelUp({ nivel, onFechar }) {
  useEffect(() => {
    const fechar = (e) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', fechar)
    return () => window.removeEventListener('keydown', fechar)
  }, [onFechar])

  return (
    <div className="modal-fundo" onClick={onFechar}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="confete" aria-hidden="true">
          {Array.from({ length: 24 }, (_, i) => (
            <i key={i} style={{ '--i': i }} />
          ))}
        </div>
        <p className="modal-sub">Subiu de nível!</p>
        <div className="modal-nivel">{nivel}</div>
        <p className="modal-titulo">
          {tituloDoNivel(nivel) !== tituloDoNivel(nivel - 1)
            ? `Novo título: ${tituloDoNivel(nivel)}!`
            : 'Continue assim, rumo ao próximo nível!'}
        </p>
        <button className="btn-adicionar" onClick={onFechar} autoFocus>
          Continuar
        </button>
      </div>
    </div>
  )
}
