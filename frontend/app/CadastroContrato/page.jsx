"use client";

import { useState } from "react";
import Checkbox from "../components/Checkbox";
import Radio from "../components/Radio";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Button from "../components/Button";
import { useSearchParams } from "next/navigation";

export default function CadastroContrato() {
  const titulo = "font-display font-bold";
  const tituloCentrado = "font-display font-bold text-2xl text-center";
  const [etapa, setEtapa] = useState(1);
  const [valorAluguel, setValorAluguel] = useState("");
  const [despesas, setDespesas] = useState([]);
  const [cpfInquilino, setCpfInquilino] = useState("");
  const [garantia, setGarantia] = useState("");
  const [tipoCaucao, setTipoCaucao] = useState("");
  const [valorCaucao, setValorCaucao] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [diaVencimento, setDiaVencimento] = useState("");
  const searchParams = useSearchParams();
  const imovelId = searchParams.get("imovelId");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(false);

  function alterarDespesa(despesa) {
    if (despesas.includes(despesa)) {
      setDespesas(despesas.filter((item) => item !== despesa));
    } else {
      setDespesas([...despesas, despesa]);
    }
  }
  function validarContrato() {
    if (!imovelId) {
      alert("Nenhum imóvel foi selecionado.");
      return false;
    }

    if (!valorAluguel || Number(valorAluguel) <= 0) {
      alert("Informe um valor de aluguel válido.");
      setEtapa(1);
      return false;
    }

    if (cpfInquilino.length !== 11) {
      alert("Informe um CPF com 11 dígitos.");
      setEtapa(2);
      return false;
    }

    if (!garantia) {
      alert("Selecione uma garantia locatícia.");
      setEtapa(3);
      return false;
    }

    if (garantia === "caucao" && !tipoCaucao) {
      alert("Selecione o tipo de caução.");
      setEtapa(3);
      return false;
    }

    if (garantia === "caucao" && tipoCaucao === "negociado") {
      if (
        !valorCaucao ||
        Number(valorCaucao) <= 0 ||
        Number(valorCaucao) > Number(valorAluguel) * 3
      ) {
        alert(
          "A caução deve ser maior que zero e não ultrapassar três aluguéis.",
        );
        setEtapa(3);
        return false;
      }
    }

    if (!dataInicio || !dataFim || dataFim <= dataInicio) {
      alert("Informe datas válidas para a locação.");
      setEtapa(4);
      return false;
    }

    if (
      !diaVencimento ||
      Number(diaVencimento) < 1 ||
      Number(diaVencimento) > 31
    ) {
      alert("Informe um dia de vencimento válido.");
      setEtapa(4);
      return false;
    }

    return true;
  }

  async function cadastrarContrato() {
    if (!validarContrato()) return;

    setMensagem("");
    setErro(false);
    setCarregando(true);

    try {
      const token = sessionStorage.getItem("token");

      if (!token) {
        setErro(true);
        setMensagem("Você precisa fazer login novamente.");
        return;
      }
      console.log("Dados enviados:", {
        imovel_id: imovelId,
        despesas_inclusas: despesas,
        garantia: garantia,
        tipo_caucao: tipoCaucao,
        valor_caucao: valorCaucao,
      });
      const resposta = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/contratos`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            imovel_id: imovelId,
            cpf_locatario: cpfInquilino,
            valor_aluguel: Number(valorAluguel),
            data_inicio: dataInicio,
            data_fim: dataFim,
            dia_vencimento: Number(diaVencimento),

            despesas_inclusas: despesas,
            garantia: garantia,
            tipo_caucao: garantia === "caucao" ? tipoCaucao : null,
            valor_caucao:
              garantia === "caucao" && tipoCaucao === "negociado"
                ? Number(valorCaucao)
                : null,
          }),
        },
      );

      const dados = await resposta.json();
      if (!resposta.ok) {
        setErro(true);
        setMensagem(
          Array.isArray(dados.message)
            ? dados.message.join(", ")
            : dados.message || "Erro ao cadastrar contrato.",
        );
        return;
      }

      setMensagem(`Contrato cadastrado com sucesso! ID: ${dados.contrato.id}`);
    } catch (erro) {
      setErro(true);
      setMensagem("Não foi possível conectar ao servidor.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="min-h-screen  bg-linear-to-b  from-ink from-60% to-ink-soft text-slate-darker flex flex-col">
      <section className="flex justify-center content-center ">
        <div className="w-100  bg-paper p-7 br-2 rounded-xl  ">
          <div className="mb-6">
            <p>Etapa {etapa} de 4</p>

            <div className="w-full h-2 bg-slate-200 rounded-full">
              <div
                className="h-full bg-teal rounded-full transition-all duration-300"
                style={{ width: `${(etapa / 4) * 100}%` }}
              />
            </div>
          </div>
          <form>
            {etapa === 1 && (
              <div>
                <h1 className={tituloCentrado}>Despesas e Valores</h1>
                <h1 className={titulo}>Valor Mensal do Aluguel:</h1>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={valorAluguel}
                  onChange={(e) => setValorAluguel(e.target.value)}
                  className="bg-slate/10 p-3 rounded-lg w-full h-10"
                />
                <h1 className={titulo}>Despesas Inclusas:</h1>
                <Checkbox
                  texto="Água"
                  value="agua"
                  checked={despesas.includes("agua")}
                  onChange={() => alterarDespesa("agua")}
                />

                <Checkbox
                  texto="Luz"
                  value="luz"
                  checked={despesas.includes("luz")}
                  onChange={() => alterarDespesa("luz")}
                />

                <Checkbox
                  texto="Internet"
                  value="internet"
                  checked={despesas.includes("internet")}
                  onChange={() => alterarDespesa("internet")}
                />

                <Checkbox
                  texto="Gás"
                  value="gas"
                  checked={despesas.includes("gas")}
                  onChange={() => alterarDespesa("gas")}
                />

                <Checkbox
                  texto="Condomínio"
                  value="condominio"
                  checked={despesas.includes("condominio")}
                  onChange={() => alterarDespesa("condominio")}
                />

                <Checkbox
                  texto="IPTU"
                  value="iptu"
                  checked={despesas.includes("iptu")}
                  onChange={() => alterarDespesa("iptu")}
                />
                <p>Despesas selecionadas: {despesas.join(", ")}</p>
              </div>
            )}

            {etapa === 2 && (
              <div>
                <h1 className={tituloCentrado}>Inquilino</h1>
                <h1 className={titulo}>CPF do inquilino:</h1>
                <input
                  type="text"
                  maxLength={11}
                  value={cpfInquilino}
                  onChange={(e) =>
                    setCpfInquilino(e.target.value.replace(/\D/g, ""))
                  }
                  className="bg-slate/10 p-3 rounded-lg w-full h-10"
                />
              </div>
            )}

            {etapa === 3 && (
              <div>
                <h1 className={tituloCentrado}>Garantia Locatária</h1>
                <h1 className={titulo}>Escolha Garantia:</h1>

                <Radio
                  texto="Fiador"
                  name="garantia"
                  value="fiador"
                  checked={garantia === "fiador"}
                  onChange={() => setGarantia("fiador")}
                />

                <Radio
                  texto="Seguro-fiança"
                  name="garantia"
                  value="seguro"
                  checked={garantia === "seguro"}
                  onChange={() => setGarantia("seguro")}
                />

                <Radio
                  texto="Caução"
                  name="garantia"
                  value="caucao"
                  checked={garantia === "caucao"}
                  onChange={() => setGarantia("caucao")}
                />

                <Radio
                  texto="Sem garantia"
                  name="garantia"
                  value="nenhuma"
                  checked={garantia === "nenhuma"}
                  onChange={() => setGarantia("nenhuma")}
                />
                {garantia === "caucao" && (
                  <div>
                    <h1 className={titulo}>Escolher Caução:</h1>

                    <Radio
                      texto="Caução 3 Aluguéis"
                      name="tipoCaucao"
                      value="3"
                      checked={tipoCaucao === "3"}
                      onChange={() => setTipoCaucao("3")}
                    />

                    <Radio
                      texto="Caução 2 Aluguéis"
                      name="tipoCaucao"
                      value="2"
                      checked={tipoCaucao === "2"}
                      onChange={() => setTipoCaucao("2")}
                    />

                    <Radio
                      texto="Valor Negociado"
                      name="tipoCaucao"
                      value="negociado"
                      checked={tipoCaucao === "negociado"}
                      onChange={() => setTipoCaucao("negociado")}
                    />

                    {tipoCaucao === "negociado" && (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={valorCaucao}
                        onChange={(e) => setValorCaucao(e.target.value)}
                        className="bg-slate/10 p-3 rounded-lg w-full h-10"
                        placeholder="Valor da caução"
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {etapa === 4 && (
              <div>
                <h1 className={tituloCentrado}>Prazos</h1>
                <h1 className={titulo}>Data de início da locação:</h1>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />

                <h1 className={titulo}>Data de término da locação:</h1>
                <input
                  type="date"
                  min={dataInicio || undefined}
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
                <h1 className={titulo}>Dia do vencimento do aluguel:</h1>

                <input
                  type="number"
                  min="1"
                  max="31"
                  value={diaVencimento}
                  onChange={(e) => setDiaVencimento(e.target.value)}
                  className="bg-slate/10 p-3 rounded-lg w-full h-10"
                />
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <Button
                texto="Voltar"
                icone={<ArrowLeft size={18} />}
                onClick={() => setEtapa(etapa - 1)}
                disabled={etapa === 1}
              />

              {etapa < 4 ? (
                <Button
                  texto="Próximo"
                  icone={<ArrowRight size={18} />}
                  onClick={() => setEtapa(etapa + 1)}
                />
              ) : (
                <Button
                  texto={carregando ? "Cadastrando..." : "Cadastrar contrato"}
                  onClick={cadastrarContrato}
                  disabled={carregando}
                />
              )}
            </div>
            {mensagem && (
              <p
                role={erro ? "alert" : "status"}
                className={`text-center text-sm mt-3 ${
                  erro ? "text-red-500" : "text-teal"
                }`}
              >
                {mensagem}
              </p>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}
