'use client';

export default function FormPrestador({ formData, setFormData, onBack, onFinish }) {
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const isFormFilled =
    Boolean(formData.cidade?.trim()) &&
    Boolean(formData.estado?.trim()) &&
    Boolean(formData.descricao?.trim());
 
  const handleSkip = () => {
 
    setFormData((prev) => ({
      ...prev,
      cidade: '',
      estado: '',
      categoria_id: null,
      descricao: '',
    }));
    
    onFinish();
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <span className="inline-block px-3 py-1 bg-[#00D9B5]/10 text-[#00D9B5] border border-[#00D9B5]/30 text-xs font-semibold rounded-full mb-2">
          Perfil Prestador
        </span>
        <h2 className="text-xl font-bold text-white">Perfil do Profissional</h2>
        <p className="text-xs text-slate-400">Configure sua atuação na plataforma</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Cidade</label>
          <input
            type="text"
            name="cidade"
            value={formData.cidade || ''}
            onChange={handleChange}
            placeholder="Ex: São Paulo"
            className="w-full px-4 py-2.5 bg-[#0D121F] border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-[#00D9B5] focus:ring-1 focus:ring-[#00D9B5] transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">UF</label>
          <input
            type="text"
            name="estado"
            maxLength={2}
            value={formData.estado || ''}
            onChange={handleChange}
            placeholder="SP"
            className="w-full px-4 py-2.5 bg-[#0D121F] border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-[#00D9B5] focus:ring-1 focus:ring-[#00D9B5] transition-all uppercase"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Categoria Principal</label>
        <select
          name="categoria_id"
          value={formData.categoria_id || '1'}
          onChange={handleChange}
          className="w-full px-4 py-2.5 bg-[#0D121F] border border-slate-800 rounded-lg text-white focus:outline-none focus:border-[#00D9B5] focus:ring-1 focus:ring-[#00D9B5] transition-all"
        >
          <option value="1" className="bg-[#0D121F]">ELETRICISTA</option>
          <option value="2" className="bg-[#0D121F]">ENCANADOR</option>
          <option value="3" className="bg-[#0D121F]">PINTOR</option>
          <option value="4" className="bg-[#0D121F]">CHAVEIRO</option>
          <option value="5" className="bg-[#0D121F]">PEDREIRO</option>
          <option value="6" className="bg-[#0D121F]">LIMPEZA</option>
          <option value="7" className="bg-[#0D121F]">VISTORIA</option>
          <option value="8" className="bg-[#0D121F]">MANUTENCAO</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Resumo dos Serviços</label>
        <textarea
          name="descricao"
          rows={3}
          value={formData.descricao || ''}
          onChange={handleChange}
          placeholder="Conte brevemente quais serviços você realiza..."
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