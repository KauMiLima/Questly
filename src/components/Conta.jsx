import { useEffect, useState } from 'react'
import { traduzirErro } from '../hooks/useAuth'

const TEXTO_STATUS = {
  carregando: { icone: '⟳', texto: 'Carregando sua conta…' },
  salvando: { icone: '⟳', texto: 'Salvando na nuvem…' },
  sincronizado: { icone: '☁', texto: 'Tudo salvo na nuvem' },
  erro: { icone: '⚠', texto: 'Sem conexão. Suas mudanças ficam aqui e serão enviadas quando der.' },
}

export default function Conta({ auth, status, pendente, onSair }) {
  const [modal, setModal] = useState(false)
  const [menu, setMenu] = useState(false)

  // Fecha o menu ao clicar fora
  useEffect(() => {
    if (!menu) return
    const fechar = (e) => !e.target.closest('.conta') && setMenu(false)
    document.addEventListener('click', fechar)
    return () => document.removeEventListener('click', fechar)
  }, [menu])

  if (!auth.disponivel || auth.carregando) return null

  if (!auth.usuario) {
    return (
      <div className="conta">
        <button className="btn-entrar" onClick={() => setModal(true)}>
          Entrar
        </button>
        {modal && <ModalLogin auth={auth} onFechar={() => setModal(false)} />}
      </div>
    )
  }

  const info = TEXTO_STATUS[status] ?? TEXTO_STATUS.sincronizado
  const email = auth.usuario.email ?? ''

  return (
    <div className="conta">
      <button
        className={`btn-conta status-${status}`}
        onClick={() => setMenu(!menu)}
        aria-expanded={menu}
        aria-label={`Conta ${email}. ${info.texto}`}
        title={info.texto}
      >
        <span className="conta-avatar">{email.charAt(0).toUpperCase()}</span>
        <span className="conta-status" aria-hidden="true">
          {info.icone}
        </span>
      </button>

      {menu && (
        <div className="conta-menu">
          <p className="conta-email">{email}</p>
          <p className={`conta-sinc status-${status}`}>
            {info.icone} {info.texto}
          </p>
          {pendente && status !== 'salvando' && (
            <p className="conta-aviso">
              Algumas mudanças ainda não chegaram à nuvem. Se sair agora, elas ficam perdidas.
            </p>
          )}
          <button
            className="btn-sair"
            onClick={() => {
              setMenu(false)
              onSair()
            }}
          >
            {pendente && status !== 'salvando' ? 'Sair mesmo assim' : 'Sair'}
          </button>
        </div>
      )}
    </div>
  )
}

function ModalLogin({ auth, onFechar }) {
  const [modo, setModo] = useState('entrar') // 'entrar' | 'cadastrar'
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [confirmarEmail, setConfirmarEmail] = useState(false)

  useEffect(() => {
    const fechar = (e) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', fechar)
    return () => window.removeEventListener('keydown', fechar)
  }, [onFechar])

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    if (senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.')
    setEnviando(true)
    try {
      const { data, error } =
        modo === 'entrar' ? await auth.entrar(email.trim(), senha) : await auth.cadastrar(email.trim(), senha)
      if (error) throw error
      // Cadastro com confirmação de e-mail ligada: ainda não tem sessão
      if (modo === 'cadastrar' && !data.session) setConfirmarEmail(true)
      else onFechar()
    } catch (err) {
      setErro(traduzirErro(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="modal-fundo" onClick={onFechar}>
      <div className="modal modal-login" role="dialog" aria-modal="true" aria-labelledby="titulo-login" onClick={(e) => e.stopPropagation()}>
        {confirmarEmail ? (
          <>
            <p className="modal-titulo" id="titulo-login">
              Confirme seu e-mail
            </p>
            <p className="backup-dica">
              Enviamos um link para <strong>{email}</strong>. Clique nele e depois volte aqui para entrar.
            </p>
            <button className="btn-adicionar" onClick={onFechar}>
              Entendi
            </button>
          </>
        ) : (
          <form onSubmit={enviar} className="form-login">
            <p className="modal-titulo" id="titulo-login">
              {modo === 'entrar' ? 'Entrar no Questly' : 'Criar conta'}
            </p>
            <p className="backup-dica">
              {modo === 'entrar'
                ? 'Seu progresso fica salvo na nuvem e aparece em qualquer aparelho.'
                : 'O progresso que já está neste navegador vai junto para a sua conta.'}
            </p>

            <label className="campo">
              <span>E-mail</span>
              <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </label>
            <label className="campo">
              <span>Senha</span>
              <input
                type="password"
                autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
                required
                minLength={6}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </label>

            {erro && (
              <p className="backup-erro" role="alert">
                {erro}
              </p>
            )}

            <button className="btn-adicionar" type="submit" disabled={enviando}>
              {enviando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
            </button>
            <button
              type="button"
              className="btn-trocar-modo"
              onClick={() => {
                setModo(modo === 'entrar' ? 'cadastrar' : 'entrar')
                setErro('')
              }}
            >
              {modo === 'entrar' ? 'Não tem conta? Criar conta' : 'Já tem conta? Entrar'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
