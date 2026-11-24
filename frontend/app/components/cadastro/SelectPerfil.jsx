export default function SelectPerfil({ onSelectRole }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white tracking-wide">Como você deseja usar a plataforma?</h2>
        <p className="text-xs text-[#00D9B5] mt-1">
          Escolha seu objetivo principal. Você poderá adicionar outros depois.
        </p>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => onSelectRole('INQUILINO')}
          className="w-full flex items-center p-4 bg-[#1A2333] border border-slate-800 rounded-xl hover:border-[#00D9B5] hover:bg-[#00D9B5]/10 transition-all text-left group"
        >
          <div className="ml-2">
            <h3 className="font-semibold text-slate-100 group-hover:text-[#00D9B5] transition-colors">
              Quero Alugar um Imóvel
            </h3>
            <p className="text-xs text-slate-400">Procurar casas ou apartamentos para morar</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelectRole('PROPRIETARIO')}
          className="w-full flex items-center p-4 bg-[#1A2333] border border-slate-800 rounded-xl hover:border-[#00D9B5] hover:bg-[#00D9B5]/10 transition-all text-left group"
        >
          <div className="ml-2">
            <h3 className="font-semibold text-slate-100 group-hover:text-[#00D9B5] transition-colors">
              Quero Anunciar meu Imóvel
            </h3>
            <p className="text-xs text-slate-400">Cadastrar imóveis para locação ou gestão</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelectRole('PRESTADOR')}
          className="w-full flex items-center p-4 bg-[#1A2333] border border-slate-800 rounded-xl hover:border-[#00D9B5] hover:bg-[#00D9B5]/10 transition-all text-left group"
        >
          <div className="ml-2">
            <h3 className="font-semibold text-slate-100 group-hover:text-[#00D9B5] transition-colors">
              Quero Prestar Serviços
            </h3>
            <p className="text-xs text-slate-400">Oferecer manutenção, vistorias ou reformas</p>
          </div>
        </button>
      </div>
    </div>
  );
}