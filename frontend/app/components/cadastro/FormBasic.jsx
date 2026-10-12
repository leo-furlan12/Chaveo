'use client';

import { useState } from 'react';

export default function FormBasic({ formData, setFormData, onBack, onNext }) {
  const [errors, setErrors] = useState({});

  const formatCPF = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')       .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const formatTelefone = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')       .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'cpf') {
      formattedValue = formatCPF(value);
    } else if (name === 'telefone') {
      formattedValue = formatTelefone(value);
    }

    setFormData({ ...formData, [name]: formattedValue });

    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nome || formData.nome.trim().length < 3) {
      newErrors.nome = 'Informe seu nome completo.';
    }

    const cpfDigits = (formData.cpf || '').replace(/\D/g, '');
    if (cpfDigits.length !== 11) {
      newErrors.cpf = 'O CPF deve ter exatamente 11 dígitos.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      newErrors.email = 'Informe um e-mail válido.';
    }

    const phoneDigits = (formData.telefone || '').replace(/\D/g, '');
    if (phoneDigits.length !== 11) {
      newErrors.telefone = 'Informe o telefone com DDD (11 dígitos).';
    }

    const password = formData.senha || '';
    const hasMinLength = password.length >= 6;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[^a-zA-Z0-9]/.test(password);

    if (!hasMinLength || !hasLetter || !hasNumber || !hasSpecialChar) {
      newErrors.senha = 'A senha deve ter no mínimo 6 caracteres, 1 letra, 1 número e 1 caractere especial.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      onNext();
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-white tracking-wide">Criar sua conta</h2>
        <p className="text-xs text-slate-400">Informe seus dados básicos de acesso</p>
      </div>


      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nome Completo</label>
        <input
          type="text"
          name="nome"
          value={formData.nome || ''}
          onChange={handleChange}
          placeholder="Ex: João Silva"
          className={`w-full px-4 py-2.5 bg-[#0D121F] border ${
            errors.nome ? 'border-red-500' : 'border-slate-800'
          } rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-[#00D9B5] focus:ring-1 focus:ring-[#00D9B5] transition-all`}
        />
        {errors.nome && <p className="text-xs text-red-500 mt-1">{errors.nome}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">CPF</label>
        <input
          type="text"
          name="cpf"
          value={formData.cpf || ''}
          onChange={handleChange}
          maxLength={14}
          placeholder="000.000.000-00"
          className={`w-full px-4 py-2.5 bg-[#0D121F] border ${
            errors.cpf ? 'border-red-500' : 'border-slate-800'
          } rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-[#00D9B5] focus:ring-1 focus:ring-[#00D9B5] transition-all`}
        />
        {errors.cpf && <p className="text-xs text-red-500 mt-1">{errors.cpf}</p>}
      </div>
   
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">E-mail</label>
        <input
          type="email"
          name="email"
          value={formData.email || ''}
          onChange={handleChange}
          placeholder="seu@email.com"
          className={`w-full px-4 py-2.5 bg-[#0D121F] border ${
            errors.email ? 'border-red-500' : 'border-slate-800'
          } rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-[#00D9B5] focus:ring-1 focus:ring-[#00D9B5] transition-all`}
        />
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Telefone / WhatsApp</label>
        <input
          type="tel"
          name="telefone"
          value={formData.telefone || ''}
          onChange={handleChange}
          maxLength={15}
          placeholder="(00) 90000-0000"
          className={`w-full px-4 py-2.5 bg-[#0D121F] border ${
            errors.telefone ? 'border-red-500' : 'border-slate-800'
          } rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-[#00D9B5] focus:ring-1 focus:ring-[#00D9B5] transition-all`}
        />
        {errors.telefone && <p className="text-xs text-red-500 mt-1">{errors.telefone}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Senha</label>
        <input
          type="password"
          name="senha"
          value={formData.senha || ''}
          onChange={handleChange}
          placeholder="••••••••"
          className={`w-full px-4 py-2.5 bg-[#0D121F] border ${
            errors.senha ? 'border-red-500' : 'border-slate-800'
          } rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-[#00D9B5] focus:ring-1 focus:ring-[#00D9B5] transition-all`}
        />
        {errors.senha && <p className="text-xs text-red-500 mt-1">{errors.senha}</p>}
      </div>

      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="px-6 py-2.5 bg-[#00D9B5] text-[#0A0D14] font-bold rounded-lg hover:bg-[#00c2a2] transition-all shadow-lg shadow-[#00D9B5]/20"
        >
          Continuar &rarr;
        </button>
      </div>
    </div>
  );
}