import IndexCadastro from '../components/cadastro/IndexCadastro'
import { Suspense } from 'react'

export const metadata = {
  title: 'Cadastro | Chaveo',
  description: 'Crie sua conta na plataforma',
}

export default function CadastroPage() {
  return (
    <Suspense fallback={<div>Carregando cadastro...</div>}>
      <IndexCadastro />
    </Suspense>
  )
}
