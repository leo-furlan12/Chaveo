export default function Button({texto}) {
  
  return (
    <main className="">
       <button type="submit" className="w-full py-3 rounded-xl bg-teal text-ink text-paper py-2 px-4 border border-transparent text-center text-sm text-white transition-all shadow-md hover:shadow-lg focus:bg-slate-700 focus:shadow-none active:bg-slate-700 hover:bg-slate-700 active:shadow-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none ml-2">{texto}</button>
         </main>

  );
}