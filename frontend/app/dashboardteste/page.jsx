"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
export default function Dashboard() {
const router = useRouter();

function handleLogout() {
  sessionStorage.removeItem("token");
  router.replace("/login");
}

const [verificando, setVerificando] = useState(true);

useEffect(() => {
  async function verificarAutenticacao() {
    const token = sessionStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const resposta = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/perfil`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      if (!resposta.ok) {
        sessionStorage.removeItem("token");
        router.replace("/login");
        return;
      }

      setVerificando(false);
    } catch (erro) {
      console.error("Erro ao verificar autenticação:", erro);
      router.replace("/login");
    }
  }

  verificarAutenticacao();
}, [router]);

if (verificando) {
  return <p>Verificando autenticação...</p>;
}
    
  return (
    <main className="min-h-screen bg-ink text-paper flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold text-teal">
        Dashboard Chaveo
      </h1>

      <p className="mt-4">
        Bem-vindo ao Chaveo!
      </p>

      <p className="mt-2">
        Esta página está em desenvolvimento.
      </p>
      <button
  type="button"
  onClick={handleLogout}
  className="mt-8 px-6 py-3 bg-teal text-ink rounded-lg font-semibold cursor-pointer"
>
  Sair
</button>
    </main>
  );
}