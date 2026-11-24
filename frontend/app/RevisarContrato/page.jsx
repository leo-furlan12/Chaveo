"use client";
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RedirecionarAnalise() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  useEffect(() => {
    router.replace(id ? `/AnaliseCadastral?id=${id}` : "/dashboard");
  }, [id, router]);

  return <div className="min-h-screen bg-ink" />;
}

export default function RevisarContrato() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink" />}>
      <RedirecionarAnalise />
    </Suspense>
  );
}