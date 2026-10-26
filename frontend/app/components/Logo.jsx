export default function Logo({tamanho}) {
  
  return (
    <main className="">
        <div>
             <svg
           className={`icone-logo ${tamanho}`}
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18 40 V22 a4 4 0 0 1 4 -4 H40"
              stroke="#00D9B5"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d="M102 40 V22 a4 4 0 0 0 -4 -4 H80"
              stroke="#00D9B5"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d="M18 80 V98 a4 4 0 0 0 4 4 H40"
              stroke="#00D9B5"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d="M102 80 V98 a4 4 0 0 1 -4 4 H80"
              stroke="#00D9B5"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <circle cx="60" cy="52" r="14" fill="#00D9B5" />
            <path d="M60 64 L50 86 H70 Z" fill="#00D9B5" />
          </svg></div>
         </main>

  );
}