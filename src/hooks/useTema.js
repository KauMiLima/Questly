import { useEffect } from 'react'
import { useLocalStorage } from './useLocalStorage'

// 'sistema' segue o tema do celular/computador; 'claro' e 'escuro' fixam um
const ORDEM = ['sistema', 'claro', 'escuro']

export const TEMAS = {
  sistema: { icone: '◐', rotulo: 'Tema: automático' },
  claro: { icone: '☀', rotulo: 'Tema: claro' },
  escuro: { icone: '☾', rotulo: 'Tema: escuro' },
}

export function useTema() {
  const [tema, setTema] = useLocalStorage('questly:tema', 'sistema')

  // O CSS lê o atributo data-tema do <html>
  useEffect(() => {
    const raiz = document.documentElement
    if (tema === 'sistema') delete raiz.dataset.tema
    else raiz.dataset.tema = tema
  }, [tema])

  function trocarTema() {
    setTema(ORDEM[(ORDEM.indexOf(tema) + 1) % ORDEM.length])
  }

  return { tema, trocarTema }
}
