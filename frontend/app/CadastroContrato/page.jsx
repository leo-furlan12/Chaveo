"use client";
import { useState, useEffect } from "react";
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
const [contratoId, setContratoId] = useState(
  searchParams.get("contratoId")
);
  const [conviteToken, setConviteToken] = useState("");
  const [statusContrato, setStatusContrato] = useState("");
  const [gerandoConvite, setGerandoConvite] = useState(false);
  const [indiceReajuste, setIndiceReajuste] = useState("");
  const [imovel, setImovel] = useState(null);

  useEffect(() => {
    if (!imovelId) return;

    async function buscarImovel() {
      try {
        const resposta = await fetch(
          `http://localhost:4000/api/imoveis/${imovelId}`,
        );

        if (!resposta.ok) {
          throw new Error("Erro ao buscar imóvel");
        }

        const dados = await resposta.json();
        setImovel(dados);
      } catch (erro) {
        console.error("Erro ao carregar imóvel:", erro);
      }
    }

    buscarImovel();
  }, [imovelId]);

  const linkConvite = conviteToken
    ? `${window.location.origin}/ConviteContrato?token=${conviteToken}`
    : "";

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
    // verifica se o indice de reajuste foi escolhido
    if (!["IPCA", "IGP-M", "INCC"].includes(indiceReajuste)) {
      alert("Selecione um índice de reajuste.");
      setEtapa(1);
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
            indice_reajuste: indiceReajuste,
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
      await gerarConvite(dados.contrato.id);
      setContratoId(dados.contrato.id);
    } catch (erro) {
      setErro(true);
      setMensagem("Não foi possível conectar ao servidor.");
    } finally {
      setCarregando(false);
    }
  }

  async function gerarConvite(id) {
    if (!id) return;

    setGerandoConvite(true);
    setMensagem("");
    setErro(false);

    try {
      const token = sessionStorage.getItem("token");

      if (!token) {
        setErro(true);
        setMensagem("Você precisa fazer login novamente.");
        return;
      }

      const resposta = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/contratos/${id}/convite`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(true);
        setMensagem(dados.message || "Erro ao gerar convite.");
        return;
      }

      setConviteToken(dados.convite_token);
      setMensagem("Convite gerado com sucesso!");
    } catch (erro) {
      setErro(true);
      setMensagem("Não foi possível conectar ao servidor.");
    } finally {
      setGerandoConvite(false);
    }
  }

  async function copiarConvite() {
    const link = `${window.location.origin}/ConviteContrato?token=${conviteToken}`;

    try {
      await navigator.clipboard.writeText(link);
      setMensagem("Link copiado com sucesso!");
    } catch {
      setErro(true);
      setMensagem("Não foi possível copiar o link.");
    }
  }

useEffect(() => {
  if (!contratoId)  return;

    async function verificarStatus() {
      try {
       const token = sessionStorage.getItem("token");
        if (!token) return;

        const resposta = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/contratos/${contratoId}/dados`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!resposta.ok) return;

        const dados = await resposta.json();
        setStatusContrato(dados.status);
      } catch (erro) {
        console.error("Erro ao verificar status:", erro);
      }
    }

    verificarStatus();

    // verifica novamente a cada 5 segundos
    const intervalo = setInterval(verificarStatus, 5000);

    return () => clearInterval(intervalo);
  }, [contratoId]);

  if (conviteToken || contratoId) {
    return (
      <main className="min-h-screen bg-linear-to-b from-ink from-60% to-ink-soft flex justify-center items-center p-6">
        <div className="bg-paper text-slate-darker rounded-xl p-7 w-full max-w-lg">
          <h1 className="font-display text-2xl font-bold text-center">
            Contrato cadastrado!
          </h1>

          <p className="text-center mt-3">
            O cadastro do proprietário foi concluído. Agora estamos aguardando o
            inquilino.
          </p>

          <h2 className="font-bold mt-8 mb-3">Progresso do contrato</h2>

          <div className="flex gap-2">
            <div className="h-2 flex-1 bg-teal rounded-full"></div>

            <div
              className={`h-2 flex-1 rounded-full ${
                statusContrato === "AGUARDANDO_REVISAO" ||
                statusContrato === "AGUARDANDO_ASSINATURAS" ||
                statusContrato === "CONCLUIDO"
                  ? "bg-teal"
                  : "bg-gray-300"
              }`}
            ></div>

            <div className="h-2 flex-1 bg-gray-300 rounded-full"></div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-center">
            <p>✓ Proprietário</p>

            <p className="font-bold">
              {statusContrato === "AGUARDANDO_REVISAO" ||
              statusContrato === "AGUARDANDO_ASSINATURAS" ||
              statusContrato === "CONCLUIDO"
                ? "✓ Inquilino concluiu"
                : statusContrato === "PENDENTE_DADOS"
                  ? "Inquilino preenchendo"
                  : "Aguardando inquilino"}
            </p>

            <p>Finalização</p>
          </div>

          {statusContrato === "AGUARDANDO_REVISAO" && (
            <div className="mt-6">
              <p className="text-sm text-center mb-3">
                O inquilino concluiu o preenchimento. Agora você pode revisar o
                contrato.
              </p>

              <a
                href={`/RevisarContrato?id=${contratoId}`}
                className="block rounded-lg bg-teal p-3 text-center font-bold text-white"
              >
                Revisar contrato
              </a>
            </div>
          )}

          
{conviteToken && statusContrato !== "AGUARDANDO_REVISAO" && (
  <div>
    <h2 className="font-bold mt-8">Convite para o inquilino</h2>

    <p className="text-sm mt-2 mb-4">
      Copie o link e envie para o inquilino continuar o cadastro.
    </p>

    <Button
      texto="Copiar link do convite"
      onClick={copiarConvite}
    />
  </div>
)}


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
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-screen  bg-linear-to-b  from-ink from-60% to-ink-soft text-slate-darker flex flex-col">
      <section className="flex justify-center content-center ">
        <div className="w-100  bg-paper p-7 br-2 rounded-xl  ">
          {/* informações do imóvel selecionado */}
          <div className="mb-6 rounded-lg border border-slate-300 bg-slate-50 p-4">
            <h2 className="font-display font-bold text-lg mb-3">
              Imóvel selecionado
            </h2>

            {imovel ? (
              <div className="text-sm space-y-2">
                <p>
                  <strong>Tipo:</strong> {imovel.tipo}
                </p>

                <p>
                  <strong>Endereço:</strong> {imovel.logradouro},{" "}
                  {imovel.numero}
                  {imovel.complemento ? ` - ${imovel.complemento}` : ""}
                </p>

                <p>
                  <strong>Bairro:</strong> {imovel.bairro}
                </p>

                <p>
                  <strong>Cidade:</strong> {imovel.cidade}/{imovel.estado}
                </p>

                <p>
                  <strong>CEP:</strong> {imovel.cep}
                </p>

                <p>
                  <strong>Situação:</strong> {imovel.status}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Carregando informações do imóvel...
              </p>
            )}
          </div>

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
                <div className="mt-4 mb-4">
                  <h1 className={titulo}>Índice de reajuste anual:</h1>

                  <select
                    value={indiceReajuste}
                    onChange={(e) => setIndiceReajuste(e.target.value)}
                    className="bg-slate/10 p-3 rounded-lg w-full h-10"
                  >
                    <option value="">Selecione o índice</option>
                    <option value="IPCA">IPCA</option>
                    <option value="IGP-M">IGP-M</option>
                    <option value="INCC">INCC</option>
                  </select>

                  <p className="text-sm mt-2">
                    O índice escolhido será utilizado para o reajuste anual do
                    aluguel, quando aplicável.
                  </p>
                </div>
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
            {contratoId && !conviteToken && (
              <div className="mt-4">
                <Button
                  texto={
                    gerandoConvite ? "Gerando convite..." : "Gerar convite"
                  }
                  onClick={gerarConvite}
                  disabled={gerandoConvite}
                />
              </div>
            )}
            {conviteToken && (
              <div className="mt-4">
                <p className="font-bold">Convite gerado!</p>
                <p className="text-sm">
                  Envie o link para o inquilino indicado no contrato.
                </p>

                <Button
                  texto="Copiar link do convite"
                  onClick={copiarConvite}
                />
              </div>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}
