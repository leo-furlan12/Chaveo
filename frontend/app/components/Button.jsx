export default function Button({
  texto,
  disabled = false,
  icone,
  onClick,
  type = "button",
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3 rounded-xl bg-teal px-4 border border-transparent text-center text-sm text-white transition-all shadow-md hover:shadow-lg hover:bg-slate-700 disabled:pointer-events-none disabled:opacity-50 flex items-center justify-center gap-2"
    >
      {texto}
      {icone}
    </button>
  );
}