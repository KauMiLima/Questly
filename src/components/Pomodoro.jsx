import { useState } from 'react'
import { FASES, formatarTempo } from '../hooks/usePomodoro'
import { FOCO_MAXIMO, FOCO_MINIMO, OPCOES_POMODORO, focosDeHoje } from '../game/regras'


function formatarMinutos(total) {
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}min` : `${m} min`
}

export default function Pomodoro({
  timer,
  config,
  onMudarConfig,
  jogador,
  opcoesFoco, // [{ chave, titulo, tipo }] tarefas e hábitos de hoje ainda não feitos
  focandoEm,
  onFocarEm,
  sugestao, // item focado quando o último foco terminou: { chave, titulo }
  onConcluirSugestao,
  onDispensarSugestao,
}) {
  const [mostrarConfig, setMostrarConfig] = useState(false)
  const { fase, rodando, ciclo, focosAtePausaLonga, restanteMs, progresso } = timer
  // Tempo digitado à mão (texto, para dar para apagar e digitar de novo)
  const [tempoDigitado, setTempoDigitado] = useState('')
  const ehAtalho = OPCOES_POMODORO.foco.includes(config.foco)
  // Só dá para trocar o tempo antes de começar o foco
  const podeEscolherTempo = fase === 'foco' && !rodando && progresso === 0

  function escolherTempo(minutos) {
    setTempoDigitado('')
    onMudarConfig({ foco: minutos })
  }

  function aplicarTempoDigitado() {
    const minutos = Math.round(Number(tempoDigitado))
    if (!tempoDigitado || Number.isNaN(minutos)) return setTempoDigitado('')
    const limitado = Math.min(FOCO_MAXIMO, Math.max(FOCO_MINIMO, minutos))
    onMudarConfig({ foco: limitado })
    setTempoDigitado('')
  }
  const itemFocado = opcoesFoco.find((o) => o.chave === focandoEm)

  function mudarNotificacao(ligar) {
    if (!ligar) return onMudarConfig({ notificar: false })
    if (!('Notification' in window)) return alert('Seu navegador não suporta notificações.')
    Notification.requestPermission().then((permissao) => {
      onMudarConfig({ notificar: permissao === 'granted' })
    })
  }

  return (
    <section className={`pomodoro fase-${fase}`}>
      <div className="fases" role="tablist" aria-label="Fase do Pomodoro">
        {Object.entries(FASES).map(([chave, f]) => (
          <button
            key={chave}
            role="tab"
            aria-selected={fase === chave}
            className={fase === chave ? 'fase ativa' : 'fase'}
            onClick={() => timer.irPara(chave)}
          >
            {f.rotulo}
          </button>
        ))}
      </div>

      {/* O anel de progresso é desenhado no CSS a partir de --progresso (0 a 1) */}
      <div className="relogio" style={{ '--progresso': progresso }}>
        <div className="relogio-centro">
          <span className="relogio-fase">{FASES[fase].rotulo}</span>
          <span className="relogio-tempo" role="timer" aria-live="off">
            {formatarTempo(restanteMs)}
          </span>
          <span className="ciclo" aria-label={`${ciclo} de ${focosAtePausaLonga} focos até a pausa longa`}>
            {Array.from({ length: focosAtePausaLonga }, (_, i) => (
              <i key={i} className={i < ciclo ? 'cheio' : ''} />
            ))}
          </span>
        </div>
      </div>

      {fase === 'foco' && (
        <div className="tempo-foco">
          <span className="tempo-foco-rotulo">Tempo de foco</span>
          <div className="tempos" role="radiogroup" aria-label="Tempo de foco">
            {OPCOES_POMODORO.foco.map((min) => (
              <button
                key={min}
                type="button"
                role="radio"
                aria-checked={config.foco === min}
                className={config.foco === min ? 'tempo selecionado' : 'tempo'}
                disabled={!podeEscolherTempo}
                onClick={() => escolherTempo(min)}
              >
                {min} min
              </button>
            ))}
            <label className={!ehAtalho ? 'tempo tempo-outro selecionado' : 'tempo tempo-outro'}>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={String(FOCO_MAXIMO).length}
                placeholder={!ehAtalho ? String(config.foco) : 'Outro'}
                value={tempoDigitado}
                disabled={!podeEscolherTempo}
                aria-label={`Outro tempo em minutos (de ${FOCO_MINIMO} a ${FOCO_MAXIMO})`}
                // Só números, com no máximo 3 dígitos (o limite é 180 min)
                onChange={(e) => setTempoDigitado(e.target.value.replace(/\D/g, '').slice(0, String(FOCO_MAXIMO).length))}
                onBlur={aplicarTempoDigitado}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              />
              <span>min</span>
            </label>
          </div>
          {!podeEscolherTempo && (
            <span className="tempo-foco-dica">Para mudar o tempo, reinicie o timer (↺).</span>
          )}
        </div>
      )}

      <div className="controles">
        <button className="ctrl-secundario" onClick={timer.reiniciar} aria-label="Reiniciar">
          ↺
        </button>
        {rodando ? (
          <button className="btn-adicionar ctrl-principal" onClick={timer.pausar}>
            Pausar
          </button>
        ) : (
          <button className="btn-adicionar ctrl-principal" onClick={timer.iniciar}>
            {progresso > 0 ? 'Continuar' : 'Iniciar'}
          </button>
        )}
        <button className="ctrl-secundario" onClick={timer.pular} aria-label="Pular para a próxima fase">
          ⏭
        </button>
      </div>

      <p className="pomodoro-dica">
        {fase === 'foco'
          ? 'Foque só nisso até o timer acabar. O XP vem de concluir a tarefa, não do timer.'
          : 'Pausa: levante, beba água, descanse os olhos.'}
      </p>

      {sugestao && (
        <div className="sugestao">
          <span>
            Terminou <strong>{sugestao.titulo}</strong>?
          </span>
          <div className="sugestao-botoes">
            <button onClick={onDispensarSugestao}>Ainda não</button>
            <button className="btn-adicionar" onClick={onConcluirSugestao}>
              Marcar como feita
            </button>
          </div>
        </div>
      )}

      <label className="focando">
        <span>Focando em</span>
        <select value={itemFocado ? focandoEm : ''} onChange={(e) => onFocarEm(e.target.value || null)}>
          <option value="">Nada específico</option>
          {opcoesFoco.some((o) => o.tipo === 'habito') && (
            <optgroup label="Hábitos de hoje">
              {opcoesFoco
                .filter((o) => o.tipo === 'habito')
                .map((o) => (
                  <option key={o.chave} value={o.chave}>
                    {o.titulo}
                  </option>
                ))}
            </optgroup>
          )}
          {opcoesFoco.some((o) => o.tipo === 'tarefa') && (
            <optgroup label="Tarefas">
              {opcoesFoco
                .filter((o) => o.tipo === 'tarefa')
                .map((o) => (
                  <option key={o.chave} value={o.chave}>
                    {o.titulo}
                  </option>
                ))}
            </optgroup>
          )}
        </select>
      </label>

      <dl className="pomodoro-stats">
        <div>
          <dt>Focos hoje</dt>
          <dd>{focosDeHoje(jogador)}</dd>
        </div>
        <div>
          <dt>Focos no total</dt>
          <dd>{jogador.pomodoros}</dd>
        </div>
        <div>
          <dt>Tempo focado</dt>
          <dd>{formatarMinutos(jogador.minutosFoco)}</dd>
        </div>
      </dl>

      <button className="btn-outros" onClick={() => setMostrarConfig(!mostrarConfig)} aria-expanded={mostrarConfig}>
        {mostrarConfig ? '▾' : '▸'} Configurações do timer
      </button>
      {mostrarConfig && (
        <div className="pomodoro-config">
          {[
            ['curta', 'Pausa curta'],
            ['longa', 'Pausa longa'],
          ].map(([chave, rotulo]) => (
            <label key={chave} className="config-linha">
              <span>{rotulo}</span>
              <select value={config[chave]} onChange={(e) => onMudarConfig({ [chave]: Number(e.target.value) })}>
                {OPCOES_POMODORO[chave].map((min) => (
                  <option key={min} value={min}>
                    {min} min
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label className="config-linha">
            <span>Começar a próxima fase sozinho</span>
            <input type="checkbox" checked={config.autoIniciar} onChange={(e) => onMudarConfig({ autoIniciar: e.target.checked })} />
          </label>
          <label className="config-linha">
            <span>Som ao terminar</span>
            <input type="checkbox" checked={config.som} onChange={(e) => onMudarConfig({ som: e.target.checked })} />
          </label>
          <label className="config-linha">
            <span>Notificação ao terminar</span>
            <input type="checkbox" checked={config.notificar} onChange={(e) => mudarNotificacao(e.target.checked)} />
          </label>
          <p className="backup-dica">Se o timer já começou, a nova duração vale a partir da próxima fase.</p>
        </div>
      )}
    </section>
  )
}
