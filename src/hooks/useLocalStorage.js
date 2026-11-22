import { useEffect, useState } from 'react'

// Funciona como useState, mas salva o valor no localStorage
// e recupera quando a página é recarregada.
export function useLocalStorage(chave, valorInicial) {
  const [valor, setValor] = useState(() => {
    try {
      const salvo = localStorage.getItem(chave)
      return salvo !== null ? JSON.parse(salvo) : valorInicial
    } catch {
      return valorInicial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(chave, JSON.stringify(valor))
    } catch {
      // localStorage indisponível (modo privado, por exemplo): segue só em memória
    }
  }, [chave, valor])

  return [valor, setValor]
}
