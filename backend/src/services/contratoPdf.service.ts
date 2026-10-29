import PDFDocument from 'pdfkit';
import { Contrato } from '../database/entities/contrato.entity';

// escreve o inicio do contrato no pdf
export function gerarConteudoContrato(
  pdf: PDFKit.PDFDocument,
  contrato: Contrato,
) {
  const locador = contrato.locador;
  const locatario = contrato.locatario;

  // titulo do documento
  pdf
    .font('Helvetica-Bold')
    .fontSize(15)
    .text('CONTRATO DE LOCAÇÃO RESIDENCIAL', {
      align: 'center',
    });

  pdf.moveDown(2);

  // identificacao do proprietario
  pdf
    .font('Helvetica')
    .fontSize(11)
    .text(
      `LOCADOR: ${locador.nome}, ${locador.nacionalidade}, ` +
      `${locador.estado_civil}, ${locador.profissao}, ` +
      `RG nº ${locador.rg}, CPF nº ${locador.cpf}.`,
      { align: 'justify' },
    );

  pdf.moveDown();

  // identificacao do inquilino
  if (locatario) {
    pdf.text(
      `LOCATÁRIO: ${locatario.nome}, ${locatario.nacionalidade}, ` +
      `${locatario.estado_civil}, ${locatario.profissao}, ` +
      `RG nº ${locatario.rg}, CPF nº ${locatario.cpf}.`,
      { align: 'justify' },
    );
  }

  pdf.moveDown();

  // introducao do contrato
  pdf.text(
    'As partes acima qualificadas celebram o presente Contrato de ' +
    'Locação Residencial, regido pela Lei do Inquilinato ' +
    '(Lei nº 8.245/1991), mediante as seguintes cláusulas e condições:',
    { align: 'justify' },
  );

  pdf.moveDown(2);
    // clausula 1 - objeto e destinacao
  const imovel = contrato.imovel;

  // monta o endereco completo do imovel
  const endereco = [
    `${imovel.logradouro}, nº ${imovel.numero}`,
    imovel.complemento,
    imovel.bairro,
    `${imovel.cidade}/${imovel.estado}`,
    `CEP ${imovel.cep}`,
  ]
    .filter(Boolean)
    .join(', ');

  pdf
    .font('Helvetica-Bold')
    .fontSize(11)
    .text('CLÁUSULA 1ª – DO OBJETO E DESTINAÇÃO');

  pdf.moveDown(0.5);

  pdf
    .font('Helvetica')
    .fontSize(11)
    .text(
      `1.1. O LOCADOR cede em locação ao LOCATÁRIO o imóvel localizado na ${endereco}.`,
      { align: 'justify' },
    );

  pdf.moveDown(0.5);

  pdf.text(
    '1.2. O imóvel destina-se exclusivamente para fins residenciais do ' +
      'LOCATÁRIO e de sua família, sendo proibida a alteração de sua ' +
      'finalidade sem prévia autorização por escrito do LOCADOR.',
    { align: 'justify' },
  );

  pdf.moveDown(0.5);

  pdf.text(
    '1.3. É vedada a sublocação, cessão, empréstimo ou transferência ' +
      'deste contrato sem o consentimento prévio e expresso do LOCADOR.',
    { align: 'justify' },
  );

  pdf.moveDown(1.5);
    // clausula 2 - prazo do contrato
  const formatarData = (data: string) => {
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const dataInicio = formatarData(contrato.data_inicio!);
  const dataFim = formatarData(contrato.data_fim!);

  pdf
    .font('Helvetica-Bold')
    .fontSize(11)
    .text('CLÁUSULA 2ª – DO PRAZO');

  pdf.moveDown(0.5);

  pdf
    .font('Helvetica')
    .fontSize(11)
    .text(
      `2.1. O prazo desta locação inicia-se em ${dataInicio} ` +
      `e encerra-se em ${dataFim}.`,
      { align: 'justify' },
    );

  pdf.moveDown(1.5);
    // clausula 3 - aluguel e encargos
  const valorAluguel = Number(contrato.valor_aluguel);

  const aluguelFormatado = valorAluguel.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const nomesDespesas: Record<string, string> = {
    agua: 'água',
    luz: 'energia elétrica',
    internet: 'internet',
    gas: 'gás',
    condominio: 'condomínio',
    iptu: 'IPTU',
  };

  const despesasInclusas = contrato.despesas_inclusas || [];

  const despesasPagasPeloLocador = despesasInclusas.map(
    (despesa) => nomesDespesas[despesa],
  );

  const despesasPagasPeloLocatario = Object.keys(nomesDespesas)
    .filter((despesa) => !despesasInclusas.includes(despesa))
    .map((despesa) => nomesDespesas[despesa]);

  pdf
    .font('Helvetica-Bold')
    .fontSize(11)
    .text('CLÁUSULA 3ª – DO ALUGUEL, ENCARGOS E REAJUSTE');

  pdf.moveDown(0.5);

  pdf
    .font('Helvetica')
    .fontSize(11)
    .text(
      `3.1. O aluguel mensal ajustado é de R$ ${aluguelFormatado}, ` +
      `a ser pago até o dia ${contrato.dia_vencimento} de cada mês.`,
      { align: 'justify' },
    );

  pdf.moveDown(0.5);

  pdf.text(
    '3.2. O LOCATÁRIO responde pelo pagamento pontual das seguintes ' +
    `despesas: ${despesasPagasPeloLocatario.join(', ') || 'nenhuma das despesas listadas'}. ` +
    'As despesas extraordinárias de condomínio e obras estruturais ' +
    'cabem ao LOCADOR.',
    { align: 'justify' },
  );

  if (despesasPagasPeloLocador.length > 0) {
    pdf.moveDown(0.5);

    pdf.text(
      'As seguintes despesas estão incluídas no valor do aluguel, ' +
      `conforme acordado entre as partes: ${despesasPagasPeloLocador.join(', ')}.`,
      { align: 'justify' },
    );
  }
// clausula 3.3 - reajuste anual
pdf.moveDown(0.5);

if (contrato.indice_reajuste) {
  pdf.text(
    '3.3. O valor do aluguel será reajustado anualmente pela ' +
    `variação acumulada do ${contrato.indice_reajuste}, ` +
    'respeitada a periodicidade mínima de 12 meses prevista em lei.',
    { align: 'justify' },
  );
}
  pdf.moveDown(1.5);
  // clausula 4 - garantia locaticia
pdf.font('Helvetica-Bold').fontSize(11)
  .text('CLÁUSULA 4ª – DA GARANTIA LOCATÍCIA');

pdf.moveDown(0.5);
pdf.font('Helvetica').fontSize(11);

if (contrato.garantia === 'nenhuma') {
  pdf.text(
    '4.1. A presente locação é celebrada sem garantia locatícia. ' +
    'Nessa hipótese, o LOCADOR poderá exigir o pagamento do aluguel ' +
    'e dos encargos até o sexto dia útil do mês vincendo, ' +
    'conforme previsto na Lei nº 8.245/1991.',
    { align: 'justify' },
  );
}
// garantia por caucao
if (contrato.garantia === 'caucao') {
  const valorCaucao = Number(contrato.valor_caucao);

  const caucaoFormatada = valorCaucao.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  pdf.text(
    '4.1. Como garantia desta locação, o LOCATÁRIO prestará caução ' +
    `em dinheiro no valor de R$ ${caucaoFormatada}, ` +
    'a ser depositada em caderneta de poupança, conforme a ' +
    'Lei nº 8.245/1991. Ao término da locação, o valor será ' +
    'devolvido com os rendimentos correspondentes, descontados ' +
    'eventuais débitos de responsabilidade do LOCATÁRIO.',
    { align: 'justify' },
  );
}
// garantia por fiador
if (contrato.garantia === 'fiador') {
    // assinaturas das testemunhas
pdf.font('Helvetica-Bold').fontSize(11)
  .text('TESTEMUNHAS:');

pdf.moveDown(1.5);

pdf.font('Helvetica').fontSize(11);

pdf.text('________________________________________');
pdf.text('Testemunha 1');
pdf.text('Nome: __________________________________');
pdf.text('CPF: ___________________________________');

pdf.moveDown(2);

pdf.text('________________________________________');
pdf.text('Testemunha 2');
pdf.text('Nome: __________________________________');
pdf.text('CPF: ___________________________________');
  pdf.text(
    '4.1. A presente locação terá como garantia a fiança prestada por ' +
    `${contrato.fiador_nome}, CPF nº ${contrato.fiador_cpf}, ` +
    `${contrato.fiador_qualificacao}, ` +
    `com o seguinte imóvel informado: ${contrato.fiador_imovel}. ` +
    'O FIADOR assume as obrigações da fiança nos termos deste contrato.',
    { align: 'justify' },
  );
}
// garantia por seguro fianca
if (contrato.garantia === 'seguro') {
  pdf.text(
    '4.1. A presente locação terá como garantia o seguro-fiança ' +
    `contratado junto à seguradora ${contrato.seguro_seguradora}, ` +
    `conforme apólice nº ${contrato.seguro_apolice}. ` +
    'A cobertura e as condições da garantia serão aquelas ' +
    'estabelecidas na respectiva apólice.',
    { align: 'justify' },
  );
}
pdf.moveDown(1.5);

// clausula 5 - estado do imovel e vistoria
pdf.font('Helvetica-Bold').fontSize(11)
  .text('CLÁUSULA 5ª – DO ESTADO DO IMÓVEL E VISTORIA');

pdf.moveDown(0.5);
pdf.font('Helvetica').fontSize(11);

pdf.text(
  '5.1. O LOCADOR se compromete a entregar o imóvel em condições ' +
  'adequadas de habitabilidade, com suas instalações em funcionamento.',
  { align: 'justify' },
);

pdf.moveDown(0.5);

pdf.text(
  '5.2. As partes formalizarão um laudo de vistoria de entrada, ' +
  'acompanhado de fotografias datadas, que integrará este contrato ' +
  'como anexo.',
  { align: 'justify' },
);

pdf.moveDown(0.5);

pdf.text(
  '5.3. Ao término da locação, o LOCATÁRIO deverá devolver o imóvel ' +
  'no estado em que o recebeu, ressalvado o desgaste natural ' +
  'decorrente do uso regular.',
  { align: 'justify' },
);

pdf.moveDown(1.5);
// clausula 6 - benfeitorias e reformas
pdf.font('Helvetica-Bold').fontSize(11)
  .text('CLÁUSULA 6ª – DAS BENFEITORIAS E REFORMAS');

pdf.moveDown(0.5);
pdf.font('Helvetica').fontSize(11);

pdf.text(
  '6.1. As benfeitorias necessárias realizadas pelo LOCATÁRIO ' +
  'serão indenizáveis, observadas as disposições legais aplicáveis.',
  { align: 'justify' },
);

pdf.moveDown(0.5);

pdf.text(
  '6.2. As benfeitorias úteis dependerão de autorização prévia ' +
  'e por escrito do LOCADOR para que sejam indenizáveis.',
  { align: 'justify' },
);

pdf.moveDown(0.5);

pdf.text(
  '6.3. As benfeitorias voluptuárias não serão indenizadas, ' +
  'podendo ser retiradas pelo LOCATÁRIO ao término da locação, ' +
  'desde que sua retirada não prejudique a estrutura do imóvel.',
  { align: 'justify' },
);

pdf.moveDown(1.5);
// clausula 7 - direito de preferencia e vistorias
pdf.font('Helvetica-Bold').fontSize(11)
  .text('CLÁUSULA 7ª – DO DIREITO DE PREFERÊNCIA E VISTORIAS');

pdf.moveDown(0.5);
pdf.font('Helvetica').fontSize(11);

pdf.text(
  '7.1. Em caso de venda do imóvel, o LOCADOR deverá comunicar ' +
  'ao LOCATÁRIO as condições da negociação, garantindo-lhe ' +
  'o direito de preferência para aquisição, no prazo de 30 ' +
  '(trinta) dias, conforme a Lei nº 8.245/1991.',
  { align: 'justify' },
);

pdf.moveDown(0.5);

pdf.text(
  '7.2. O LOCADOR poderá realizar vistorias periódicas no imóvel, ' +
  'mediante combinação prévia de dia e horário com o LOCATÁRIO, ' +
  'com antecedência mínima de 72 (setenta e duas) horas.',
  { align: 'justify' },
);

pdf.moveDown(1.5);
// clausula 8 - rescisao e multa
pdf.font('Helvetica-Bold').fontSize(11)
  .text('CLÁUSULA 8ª – DA RESCISÃO E MULTA');

pdf.moveDown(0.5);
pdf.font('Helvetica').fontSize(11);

pdf.text(
  '8.1. Caso o LOCATÁRIO devolva o imóvel antes do término do prazo ' +
  'contratual, ficará sujeito a uma multa equivalente a 3 (três) ' +
  'aluguéis mensais, calculada proporcionalmente ao período ' +
  'restante do contrato, ressalvadas as hipóteses de dispensa ' +
  'previstas em lei.',
  { align: 'justify' },
);

pdf.moveDown(0.5);

pdf.text(
  '8.2. Ao término do prazo contratual, a desocupação do imóvel ' +
  'não estará sujeita à multa por devolução antecipada, ' +
  'observadas as regras legais aplicáveis e as condições ' +
  'de comunicação entre as partes.',
  { align: 'justify' },
);

pdf.moveDown(0.5);

pdf.text(
  '8.3. A falta de pagamento do aluguel ou o descumprimento ' +
  'das obrigações contratuais poderá justificar a rescisão ' +
  'da locação e a adoção das medidas legais cabíveis.',
  { align: 'justify' },
);

pdf.moveDown(1.5);
// clausula 9 - foro
pdf.font('Helvetica-Bold').fontSize(11)
  .text('CLÁUSULA 9ª – DO FORO');

pdf.moveDown(0.5);
pdf.font('Helvetica').fontSize(11);

pdf.text(
  '9.1. As partes elegem o foro da Comarca de ' +
  `${contrato.imovel.cidade}/${contrato.imovel.estado} ` +
  'para dirimir eventuais controvérsias decorrentes deste contrato, ' +
  'observadas as disposições legais aplicáveis.',
  { align: 'justify' },
);

pdf.moveDown(1.5);
// finalizacao do contrato
pdf.font('Helvetica').fontSize(11);

pdf.text(
  'E, por estarem de acordo com as condições estabelecidas, ' +
  'as partes firmam o presente contrato, juntamente com as testemunhas.',
  { align: 'justify' },
);

pdf.moveDown(1.5);

// local e data da assinatura
const dataAtual = new Date().toLocaleDateString('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
});

pdf.text(
  `${contrato.imovel.cidade}/${contrato.imovel.estado}, ${dataAtual}.`,
  { align: 'center' },
);

pdf.moveDown(2);
// assinaturas do locador e locatario
pdf.font('Helvetica').fontSize(11);

pdf.text('________________________________________', {
  align: 'center',
});

pdf.text(contrato.locador.nome, {
  align: 'center',
});

pdf.text('LOCADOR', {
  align: 'center',
});

pdf.moveDown(2);

pdf.text('________________________________________', {
  align: 'center',
});

pdf.text(contrato.locatario!.nome, {
  align: 'center',
});

pdf.text('LOCATÁRIO', {
  align: 'center',
});

pdf.moveDown(2);
// assinatura do fiador, quando houver
if (contrato.garantia === 'fiador') {
  pdf.text('________________________________________', {
    align: 'center',
  });

  pdf.text(contrato.fiador_nome || 'Nome do fiador', {
    align: 'center',
  });

  pdf.text('FIADOR', {
    align: 'center',
  });

  pdf.moveDown(2);
}
}