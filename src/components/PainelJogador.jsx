import {
  LIMITE_XP_DIARIO,
  bonusStreak,
  calcularNivel,
  situacaoStreak,
  streakAtual,
  tituloDoNivel,
  xpDeHoje,
} from '../game/regras'

export default function PainelJogador({ jogador }) {
  const { nivel, xpNoNivel, xpNecessario } = calcularNivel(jogador.xp)
  const progresso = Math.round((xpNoNivel / xpNecessario) * 100)
  const streak = streakAtual(jogador)
  const bonus = bonusStreak(streak)
  const situacao = situacaoStreak(jogador)
  const hojeXp = xpDeHoje(jogador)

  return (
    <section className="painel-bloco">
      <div className="painel">
        <div className="emblema" aria-label={`Nível ${nivel}`}>
          <span className="emblema-rotulo">NV</span>
          <span className="emblema-numero">{nivel}</span>
        </div>

        <div className="painel-info">
          <div className="painel-linha">
            <strong className="titulo-nivel">{tituloDoNivel(nivel)}</strong>
            <span className="xp-texto">
              {xpNoNivel} / {xpNecessario} XP
            </span>
          </div>

          <div className="barra" role="progressbar" aria-valuenow={progresso} aria-valuemin={0} aria-valuemax={100}>
            <div className="barra-preenchida" style={{ width: `${progresso}%` }} />
          </div>

          <div className="stats">
            <span className={streak > 0 ? 'stat stat-fogo' : 'stat'}>
              🔥 {streak} {streak === 1 ? 'dia seguido' : 'dias seguidos'}
              {bonus > 0 && <em> · +{Math.round(bonus * 100)}% XP</em>}
            </span>
            <span className={hojeXp >= LIMITE_XP_DIARIO ? 'stat stat-limite' : 'stat'}>
              Hoje: {hojeXp}/{LIMITE_XP_DIARIO} XP
            </span>
            <span className="stat">✔ {jogador.totalConcluidas} concluídas</span>
          </div>
        </div>
      </div>

      {situacao.tipo === 'risco' && (
        <p className="alerta alerta-risco">
          🔥 Seu streak de {situacao.dias} {situacao.dias === 1 ? 'dia' : 'dias'} está em risco! Conclua
          uma tarefa hoje para manter.
        </p>
      )}
      {situacao.tipo === 'perdido' && (
        <p className="alerta alerta-perdido">
          Você perdeu um streak de {situacao.dias} dias. Conclua uma tarefa hoje para começar de novo!
        </p>
      )}
    </section>
  )
}
