'use client';

import { useState } from 'react';
import FormBasic from './FormBasic';
import FormLocador from './FormLocador';
import FormLocatario from './FormLocatario';
import FormPrestador from './FormPrestador';
import SelectPerfil from './SelectPerfil';

export const TIPOS_PERFIL = ['INQUILINO', 'PROPRIETARIO', 'PRESTADOR'];

export default function IndexCadastro() {
  const [step, setStep] = useState(1);
  const [perfil, setPerfil] = useState(null);

  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
 
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    email: '',
    telefone: '',
    senha: '',
    rg: '',
    nacionalidade: 'Brasileira',
    estado_civil: 'SOLTEIRO',
    profissao: '',
    chave_pix: '',
    cidade: '',
    estado: '',
    categoria_id: '1',
    descricao: ''
  });

  const handleSelectPerfil = (role) => {
    setPerfil(role);
    setStep(2);
  };

  const handleFinish = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('http://localhost:4000/api/cadastro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          perfil,  
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao realizar o registro.');
      }

      alert('Conta criada com sucesso!');
      window.location.href = '/';

    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0A0D14] min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-['Consolas',_monospace] text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <h1 className="text-4xl font-extrabold text-[#00D9B5] tracking-wider drop-shadow-[0_0_12px_rgba(0,217,181,0.3)]">
          &lt;Chaveo /&gt;
        </h1>
        <p className="mt-2 text-sm text-slate-400">Crie a sua conta em poucos passos</p>

        <div className="mt-6 flex justify-center items-center gap-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className={`h-2 rounded-full transition-all duration-300 ${
                step >= item
                  ? 'w-12 bg-[#00D9B5] shadow-[0_0_8px_rgba(0,217,181,0.6)]'
                  : 'w-4 bg-slate-800'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-[#131926] py-8 px-6 shadow-2xl shadow-black/80 rounded-2xl border border-slate-800/80 sm:px-10 backdrop-blur-sm">
       
          {errorMessage && (
            <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg text-center font-sans">
              {errorMessage}
            </div>
          )}

        
          {loading ? (
            <div className="text-center py-10 space-y-3 font-sans">
              <div className="inline-block w-8 h-8 border-4 border-[#00D9B5] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-slate-400">Criando sua conta, aguarde...</p>
            </div>
          ) : (
            <>
              {step === 1 && <SelectPerfil onSelectRole={handleSelectPerfil} />}

              {step === 2 && (
                <FormBasic
                  formData={formData}
                  setFormData={setFormData}
                  onBack={() => setStep(1)}
                  onNext={() => setStep(3)}
                />
              )}

              {step === 3 && perfil === 'INQUILINO' && (
                <FormLocatario
                  formData={formData}
                  setFormData={setFormData}
                  onBack={() => setStep(2)}
                  onFinish={handleFinish}
                />
              )}

              {step === 3 && perfil === 'PROPRIETARIO' && (
                <FormLocador
                  formData={formData}
                  setFormData={setFormData}
                  onBack={() => setStep(2)}
                  onFinish={handleFinish}
                />
              )}

              {step === 3 && perfil === 'PRESTADOR' && (
                <FormPrestador
                  formData={formData}
                  setFormData={setFormData}
                  onBack={() => setStep(2)}
                  onFinish={handleFinish}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}