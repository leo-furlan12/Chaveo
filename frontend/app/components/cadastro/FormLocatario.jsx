'use client';

export default function FormLocatario({ formData, setFormData, onBack, onFinish }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    const formattedValue = name === 'rg' ? formatRG(value) : value;

    setFormData({ ...formData, [name]: formattedValue });
  };
  const isFormFilled =
    Boolean(formData.rg?.trim()) &&
    Boolean(formData.nacionalidade?.trim()) &&
    Boolean(formData.estado_civil?.trim()) &&
    Boolean(formData.profissao?.trim());

  const handleSkip = () => {
    setFormData((prev) => ({
      ...prev,
      rg: '',
      nacionalidade: '',
      estado_civil: '',
      profissao: '',
    
    }));
    
    onFinish();
  };

  const formatRG = (value) => {
    if (!value) return '';
    
    const cleaned = value.replace(/\D/g, '').slice(0, 9);

    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 5) return cleaned.replace(/^(\d{2})(\d+)/, '$1.$2');
    if (cleaned.length <= 8) return cleaned.replace(/^(\d{2})(\d{3})(\d+)/, '$1.$2.$3');
    
    return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{1})/, '$1.$2.$3-$4');
  };


  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <span className="inline-block px-3 py-1 bg-[#00D9B5]/10 text-[#00D9B5] border border-[#00D9B5]/30 text-xs font-semibold rounded-full mb-2">
          Perfil Locatário
        </span>
        <h2 className="text-xl font-bold text-white">Qualificação do Inquilino</h2>
        <p className="text-xs text-slate-400">Dados exigidos para os contratos de locação</p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">RG (rg)</label>
        <input
          type="text"
          name="rg"
          value={formData.rg || ''}
          onChange={handleChange}
          placeholder="00.000.000-0"
          maxLength={12}
          className="w-full px-4 py-2.5 bg-[#0D121F] border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-[#00D9B5] focus:ring-1 focus:ring-[#00D9B5] transition-all"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nacionalidade (nacionalidade)</label>
        <input
          type="text"
          name="nacionalidade"
          value={formData.nacionalidade || 'Brasileira'}
          onChange={handleChange}
          className="w-full px-4 py-2.5 bg-[#0D121F] border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-[#00D9B5] focus:ring-1 focus:ring-[#00D9B5] transition-all"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Estado Civil (estado_civil)</label>
        <select
          name="estado_civil"
          value={formData.estado_civil || 'SOLTEIRO'}
          onChange={handleChange}
          className="w-full px-4 py-2.5 bg-[#0D121F] border border-slate-800 rounded-lg text-white focus:outline-none focus:border-[#00D9B5] focus:ring-1 focus:ring-[#00D9B5] transition-all"
        >
          <option value="SOLTEIRO" className="bg-[#0D121F]">Solteiro(a)</option>
          <option value="CASADO" className="bg-[#0D121F]">Casado(a)</option>
          <option value="DIVORCIADO" className="bg-[#0D121F]">Divorciado(a)</option>
          <option value="VIUVO" className="bg-[#0D121F]">Viúvo(a)</option>
          <option value="UNIAO_ESTAVEL" className="bg-[#0D121F]">União Estável</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Profissão (profissao)</label>
        <input
          type="text"
          name="profissao"
          value={formData.profissao || ''}
          onChange={handleChange}
          placeholder="Ex: Desenvolvedor, Contador..."
          className="w-full px-4 py-2.5 bg-[#0D121F] border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-[#00D9B5] focus:ring-1 focus:ring-[#00D9B5] transition-all"
        />
      </div>

      <div className="pt-4 space-y-3">
        <button
          type="button"
          onClick={onFinish}
          disabled={!isFormFilled}
          className="w-full py-3 bg-[#00D9B5] text-[#0A0D14] font-bold rounded-lg hover:bg-[#00c2a2] transition-all shadow-lg shadow-[#00D9B5]/20 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed disabled:shadow-none disabled:border disabled:border-slate-800/80"
        >
          Finalizar Cadastro
        </button>

        <div className="flex items-center justify-between text-sm px-1">
          <button
            type="button"
            onClick={onBack}
            className="text-slate-400 hover:text-white transition-colors"
          >
            &larr; Voltar
          </button>

          <button
            type="button"
            onClick={handleSkip}
            className="text-slate-400 hover:text-[#00D9B5] transition-colors font-medium underline-offset-4 hover:underline"
          >
            Preencher depois
          </button>
        </div>
      </div>
 
    </div>
  );
}