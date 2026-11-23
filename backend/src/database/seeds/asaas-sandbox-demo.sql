-- Dados fictícios para validar o dashboard e a geração de cobrança no Asaas Sandbox.
-- Execute uma vez no banco `chaveo`; o script reaproveita os usuários/perfis/imóvel/contrato em execuções seguintes.
-- Acessos de teste (senha para ambos: ChaveoTeste123!):
-- proprietario.teste@example.com e inquilino.teste@example.com

CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

WITH
perfil_proprietario AS (
  INSERT INTO "perfis" ("nome")
  VALUES ('PROPRIETARIO')
  ON CONFLICT ("nome") DO UPDATE SET "nome" = EXCLUDED."nome"
  RETURNING "id"
),
perfil_inquilino AS (
  INSERT INTO "perfis" ("nome")
  VALUES ('INQUILINO')
  ON CONFLICT ("nome") DO UPDATE SET "nome" = EXCLUDED."nome"
  RETURNING "id"
),
proprietario AS (
  INSERT INTO "usuarios" (
    "nome", "cpf", "email", "telefone", "senha_hash",
    "nacionalidade", "estado_civil", "profissao"
  )
  VALUES (
    'Proprietário Sandbox', '52998224725', 'proprietario.teste@example.com',
    '11999990001', crypt('ChaveoTeste123!', gen_salt('bf', 10)),
    'Brasileira', 'SOLTEIRO', 'Administrador'
  )
  ON CONFLICT ("cpf") DO UPDATE SET
    "nome" = EXCLUDED."nome",
    "email" = EXCLUDED."email",
    "telefone" = EXCLUDED."telefone",
    "senha_hash" = EXCLUDED."senha_hash"
  RETURNING "id", "cpf"
),
inquilino AS (
  INSERT INTO "usuarios" (
    "nome", "cpf", "email", "telefone", "senha_hash",
    "nacionalidade", "estado_civil", "profissao"
  )
  VALUES (
    'Inquilino Sandbox', '11144477735', 'inquilino.teste@example.com',
    '11999990002', crypt('ChaveoTeste123!', gen_salt('bf', 10)),
    'Brasileira', 'SOLTEIRO', 'Analista'
  )
  ON CONFLICT ("cpf") DO UPDATE SET
    "nome" = EXCLUDED."nome",
    "email" = EXCLUDED."email",
    "telefone" = EXCLUDED."telefone",
    "senha_hash" = EXCLUDED."senha_hash"
  RETURNING "id", "cpf"
),
vinculo_proprietario AS (
  INSERT INTO "usuarios_perfis" ("usuario_id", "perfil_id")
  SELECT proprietario."id", perfil_proprietario."id"
  FROM proprietario CROSS JOIN perfil_proprietario
  ON CONFLICT ("usuario_id", "perfil_id") DO NOTHING
  RETURNING "usuario_id"
),
vinculo_inquilino AS (
  INSERT INTO "usuarios_perfis" ("usuario_id", "perfil_id")
  SELECT inquilino."id", perfil_inquilino."id"
  FROM inquilino CROSS JOIN perfil_inquilino
  ON CONFLICT ("usuario_id", "perfil_id") DO NOTHING
  RETURNING "usuario_id"
),
imovel_novo AS (
  INSERT INTO "imoveis" (
    "proprietario_id", "cep", "logradouro", "numero", "complemento",
    "bairro", "cidade", "estado", "tipo_imovel", "status"
  )
  SELECT
    proprietario."id", '01310100', 'Rua Sandbox', '100', 'Apto 12',
    'Bela Vista', 'São Paulo', 'SP', 'APARTAMENTO', 'DISPONIVEL'
  FROM proprietario
  WHERE NOT EXISTS (
    SELECT 1 FROM "imoveis" existente
    WHERE existente."proprietario_id" = proprietario."id"
      AND existente."logradouro" = 'Rua Sandbox'
      AND existente."numero" = '100'
      AND existente."cidade" = 'São Paulo'
      AND existente."estado" = 'SP'
  )
  RETURNING "id", "proprietario_id"
),
imovel_existente AS (
  SELECT existente."id", existente."proprietario_id"
  FROM "imoveis" existente
  JOIN proprietario ON proprietario."id" = existente."proprietario_id"
  WHERE existente."logradouro" = 'Rua Sandbox'
    AND existente."numero" = '100'
    AND existente."cidade" = 'São Paulo'
    AND existente."estado" = 'SP'
    AND NOT EXISTS (SELECT 1 FROM imovel_novo)
),
imovel AS (
  SELECT "id", "proprietario_id" FROM imovel_novo
  UNION ALL
  SELECT "id", "proprietario_id" FROM imovel_existente
),
contrato_novo AS (
  INSERT INTO "contratos" (
    "imovel_id", "locador_id", "locatario_id", "status", "valor_aluguel",
    "data_inicio", "data_fim", "dia_vencimento", "cpf_locatario",
    "despesas_inclusas", "garantia", "indice_reajuste"
  )
  SELECT
    imovel."id", proprietario."id", inquilino."id", 'AGUARDANDO_ASSINATURAS',
    1500.00, CURRENT_DATE, (CURRENT_DATE + INTERVAL '12 months')::date,
    28, inquilino."cpf", 'agua,luz', 'nenhuma', 'IPCA'
  FROM imovel CROSS JOIN proprietario CROSS JOIN inquilino
  WHERE NOT EXISTS (
    SELECT 1 FROM "contratos" existente
    WHERE existente."imovel_id" = imovel."id"
      AND existente."locador_id" = proprietario."id"
      AND existente."locatario_id" = inquilino."id"
  )
  RETURNING "id", "imovel_id", "locador_id", "locatario_id", "status"
),
contrato_existente AS (
  SELECT existente."id", existente."imovel_id",
         existente."locador_id", existente."locatario_id", existente."status"
  FROM "contratos" existente
  JOIN imovel ON imovel."id" = existente."imovel_id"
  CROSS JOIN proprietario
  CROSS JOIN inquilino
  WHERE existente."locador_id" = proprietario."id"
    AND existente."locatario_id" = inquilino."id"
    AND NOT EXISTS (SELECT 1 FROM contrato_novo)
),
contrato AS (
  SELECT * FROM contrato_novo
  UNION ALL
  SELECT * FROM contrato_existente
)
SELECT
  proprietario."id" AS "proprietario_id",
  proprietario."cpf" AS "cpf_proprietario",
  inquilino."id" AS "inquilino_id",
  inquilino."cpf" AS "cpf_inquilino",
  imovel."id" AS "imovel_id",
  contrato."id" AS "contrato_id",
  contrato."status" AS "status_contrato"
FROM proprietario
CROSS JOIN inquilino
CROSS JOIN imovel
CROSS JOIN contrato;

COMMIT;
