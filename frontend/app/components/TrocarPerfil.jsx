"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, UserRound } from "lucide-react";

const areas = [
  { perfil: "PROPRIETARIO", nome: "Proprietário", href: "/dashboard" },
  { perfil: "INQUILINO", nome: "Inquilino", href: "/dashboardInquilino" },
  { perfil: "PRESTADOR", nome: "Prestador", href: "/dashboardteste" },
];

export function listarAreas(perfis) {
  const nomes = (Array.isArray(perfis) ? perfis : [perfis])
    .map((perfil) => String(perfil).toUpperCase());
  return areas.filter(({ perfil }) => nomes.includes(perfil));
}

export function lerPerfisDoToken(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload)).perfis;
  } catch {
    return [];
  }
}

export function BotaoPerfil({
  perfilAtual,
  className = "mx-auto flex min-h-10 w-fit items-center justify-center gap-2 rounded-lg border border-teal-300/30 bg-teal-300/10 px-4 text-sm font-semibold text-teal-100 transition-colors hover:bg-teal-300/20",
}) {
  return (
    <Link
      href={`/perfil?area=${perfilAtual}`}
      className={`${className} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300`}
    >
      <UserRound size={18} aria-hidden="true" />
      Perfil
    </Link>
  );
}

export default function TrocarPerfil({ perfilAtual }) {
  const [outrasAreas, setOutrasAreas] = useState([]);

  useEffect(() => {
    const perfis = lerPerfisDoToken(sessionStorage.getItem("token"));
    setOutrasAreas(listarAreas(perfis).filter(({ perfil }) => perfil !== perfilAtual));
  }, [perfilAtual]);

  if (outrasAreas.length === 0) return null;

  return (
    <nav aria-label="Trocar de perfil" className="flex flex-wrap items-center justify-center gap-2">
      {outrasAreas.map(({ perfil, nome, href }) => (
        <Link
          key={perfil}
          href={href}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-center text-xs font-medium text-slate-300 transition-colors hover:bg-teal-300/10 hover:text-teal-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
        >
          <ArrowLeftRight size={14} className="shrink-0 text-teal-300" aria-hidden="true" />
          Trocar para {nome}
        </Link>
      ))}
    </nav>
  );
}
