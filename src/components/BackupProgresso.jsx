import { useRef, useState } from 'react'
import { hoje, validarBackup } from '../game/regras'

export default function BackupProgresso({ tarefas, habitos, jogador, logado, onImportar }) {
  const inputArquivo = useRef(null)
  const [pendente, setPendente] = useState(null) // backup lido, esperando confirmação
  const [erro, setErro] = useState('')

  function exportar() {
    const dados = { versao: 2, exportadoEm: new Date().toISOString(), tarefas, habitos, jogador }
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `questly-progresso-${hoje()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function lerArquivo(e) {
    const arquivo = e.target.files[0]
    e.target.value = '' // permite escolher o mesmo arquivo de novo depois
    if (!arquivo) return
    setErro('')
    try {
      const dados = JSON.parse(await arquivo.text())
      if (!validarBackup(dados)) throw new Error('formato inválido')
      setPendente(dados)
    } catch {
      setErro('Esse arquivo não é um backup válido do Questly.')
    }
  }

  function confirmar() {
    onImportar(pendente)
    setPendente(null)
  }

  return (
    <footer className="backup">
      <div className="backup-botoes">
        <button onClick={exportar}>Exportar progresso</button>
        <button onClick={() => inputArquivo.current.click()}>Importar progresso</button>
        <input ref={inputArquivo} type="file" accept="application/json,.json" hidden onChange={lerArquivo} />
      </div>
      <p className="backup-dica">
        {logado
          ? 'Seu progresso está salvo na sua conta. O backup em arquivo é opcional.'
          : 'Sem conta, seu progresso fica salvo só neste navegador. Entre ou exporte de vez em quando para não perder.'}
      </p>
      {erro && <p className="backup-erro">{erro}</p>}

      {pendente && (
        <div className="modal-fundo" onClick={() => setPendente(null)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <p className="modal-titulo">Importar este backup?</p>
            <p className="backup-dica">
              {pendente.tarefas.length} tarefas, {(pendente.habitos ?? []).length} hábitos e{' '}
              {pendente.jogador.xp} XP. Isso substitui todo o progresso atual.
            </p>
            <div className="backup-botoes">
              <button onClick={() => setPendente(null)}>Cancelar</button>
              <button className="btn-adicionar" onClick={confirmar}>
                Importar
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  )
}
