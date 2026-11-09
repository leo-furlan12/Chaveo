
export default function Checkbox({ texto, value, checked, onChange }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 p-2">
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          value={value}
          checked={checked}
          onChange={onChange}
          className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-slate-300 shadow-sm transition-all checked:border-slate-800 checked:bg-slate-800"
        />

        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="pointer-events-none absolute h-3.5 w-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </span>

      <span className="text-teal">{texto}</span>
    </label>
  );
}
