# Hotel_EntrelinhasDB-Data_base-
Projeto que simula a inserção , busca, atualização e exclusão de dados usando uma ferramenta de banco de dados não relacional (NoSQL) MongoDb
# Hotel Entrelinhas: Banco de Dados Não Relacional (MongoDB)

Projeto de banco de dados para o **Hotel Entrelinhas**, um hotel pensado para escritores. Aqui as pessoas se hospedam para escrever, ter silêncio, participar de oficinas e até fazer residências literárias de várias semanas.

O hotel ainda guarda tudo de forma desorganizada (planilhas, anotações em caderno, mensagens). O objetivo deste projeto é organizar esses dados num banco **não relacional (MongoDB)**.

O trabalho tem três partes:

| Parte | Nome | Foco | Situação |
|---|---|---|---|
| 1 | Origem do Sistema | Planejar: modelagem e justificativas | 
| 2 | Montagem do Núcleo | Construir as coleções e inserir os dados | 
| 3 | Radar de Comando | Consultas para a gestão |

## Alguns termos : 

- **Coleção:** grupo de documentos do mesmo assunto, parecido com uma "tabela".
- **Documento:** um registro individual, escrito em formato JSON.
- **Array:** uma lista dentro de um campo, como `["mesa de escrita", "wifi"]`.
- **Subdocumento (ou documento embutido):** um documento guardado dentro de outro.
- **Referência:** guardar só o `_id` de outro documento, em vez de copiar os dados dele.

---

# Parte 1: Origem do Sistema

## 1.1 Compreensão do problema

O Hotel Entrelinhas recebe escritores que precisam de silêncio, tempo e inspiração. A maioria fica mais tempo que um hóspede comum de hotel: alguns ficam alguns dias, outros fazem uma **residência literária** de semanas, com meta de escrita e acompanhamento de um mentor.

Hoje as informações ficam espalhadas e isso dificulta saber quem está hospedado, o que cada quarto oferece, quanto o hotel fatura e o que os escritores acharam da experiência. O objetivo desta parte é **planejar como organizar tudo isso antes de construir o banco**.

O que torna o hotel diferente de um hotel comum:
- os quartos são escolhidos por características de escrita (silêncio, mesa, luz natural);
- existem serviços específicos (revisão de texto, mentoria, impressão);
- existem espaços coletivos (biblioteca, sala de escrita) e eventos (oficinas, saraus);
- o hóspede tem projetos de escrita em andamento.

## 1.2 Núcleos principais de informação

| Núcleo | O que representa |
|---|---|
| Hóspede (escritor) | Quem se hospeda, com seus gêneros e projetos de escrita |
| Quarto | Cada quarto, com suas características |
| Reserva | O pedido feito antes da chegada (datas e valor previstos) |
| Hospedagem | A estadia que realmente aconteceu (check-in e check-out reais) |
| Serviço | Serviços extras oferecidos (revisão, mentoria, impressão, café) |
| Consumo de serviço | O registro de que um hóspede usou um serviço na estadia |
| Pagamento | Cada pagamento feito por uma hospedagem |
| Funcionário | Equipe: recepção, mentores literários, bibliotecário, gerente |
| Feedback | Avaliação do hóspede depois da estadia |
| Espaço | Áreas comuns do hotel (biblioteca, sala de escrita, jardim) |
| Evento | Oficinas, saraus e lançamentos, com inscritos |

Uma diferença que me ajudou a entender: **reserva** é o que foi combinado (previsto) e **hospedagem** é o que de fato aconteceu (real).

## 1.3 Coleções definidas

Ficaram **10 coleções**:

`hospedes`, `quartos`, `reservas`, `hospedagens`, `servicos`, `pagamentos`, `funcionarios`, `feedbacks`, `espacos`, `eventos`

Duas coisas **não viraram coleção** de propósito:

- **Consumo de serviços:** fica como array `servicos_consumidos` dentro da hospedagem, porque só existe por causa daquela estadia e é sempre lido junto com ela (para somar a conta).
- **Projetos de escrita:** ficam como array `projetos` dentro do hóspede, porque pertencem a uma pessoa só e cada escritor tem poucos.

## 1.4 Como as coleções se relacionam

```
hospedes ─────┐
              ├──> reservas ───> hospedagens ───> pagamentos
quartos ──────┘                       │
                                      ├──> funcionarios (check-in e check-out)
                                      └──> servicos_consumidos[] ──> servicos

feedbacks ──> (hospedes, quartos, hospedagens)

espacos ──> eventos ──> participantes[] ──> hospedes
                  └───> funcionarios (responsável)
```

Em português: uma **reserva** liga um hóspede a um quarto. Quando o escritor chega, nasce uma **hospedagem**, que pode ter vários pagamentos e serviços consumidos. No fim, ele pode deixar um **feedback**. Em paralelo, o hotel organiza **eventos** em **espaços** comuns, e os hóspedes se inscrevem neles.

## 1.5 Embutir ou referenciar? (decisões)

Regra que usei:
- **Embutir** quando o dado pertence só àquele documento, é lido junto com ele e tem tamanho limitado.
- **Referenciar** (guardar só o `_id`) quando o dado é compartilhado, pode crescer muito ou muda com o tempo.

| Relação | Escolha | Justificativa |
|---|---|---|
| Reserva → hóspede | Referência (`hospede_id`) | O mesmo escritor volta várias vezes. Se mudar de e-mail, altero em um lugar só. |
| Reserva → quarto | Referência (`quarto_id`) | Um quarto aparece em muitas reservas. |
| Hospedagem → reserva | Referência (`reserva_id`) | Toda hospedagem nasce de uma reserva. |
| Hospedagem → funcionários | Referência (dois campos: check-in e check-out) | Podem ser pessoas diferentes, e o funcionário atende várias estadias. |
| Hospedagem → serviços consumidos | **Embutido** (array) | Existem só por causa da estadia e são lidos juntos para calcular a conta. |
| Consumo → serviço | Referência (`servico_id`) | O catálogo de serviços fica em coleção própria. |
| Pagamento → hospedagem | Referência, coleção própria | Uma estadia pode ter vários pagamentos (sinal e restante), e o financeiro consulta por data. |
| Feedback → hóspede, quarto, hospedagem | Referências, coleção própria | Ver pergunta 2 abaixo. |
| Hóspede → projetos de escrita | **Embutido** (array) | Pertencem a uma pessoa e são poucos por escritor. |
| Reserva → dados da residência | **Embutido** (subdocumento opcional) | Só existe em reservas de residência literária. |
| Evento → participantes | **Embutido** (array de inscritos) | O tamanho é limitado pelo número de vagas, e as inscrições são lidas junto com o evento. |
| Evento → espaço e responsável | Referências | O espaço e o funcionário são usados por muitos eventos. |

## 1.6 Respostas às perguntas do enunciado

**Uma reserva deve guardar dados do hóspede embutidos ou referenciados?**
Referenciados. A reserva guarda só o `hospede_id`, para os dados do escritor não ficarem repetidos em cada reserva. A desvantagem é que, para mostrar o nome na reserva, é preciso buscar na coleção `hospedes`, mas acho que compensa.

**Avaliações ficam dentro do documento do quarto ou em coleção própria?**
Em coleção própria (`feedbacks`). Um quarto recebe muitas avaliações ao longo dos anos e o documento dele ia crescer sem parar. Em coleção própria, fica mais fácil calcular médias e o feedback fica ligado também ao hóspede e à hospedagem.

**Serviços consumidos ficam dentro da hospedagem?**
Sim, como array embutido. O catálogo de serviços fica em `servicos`, mas cada consumo fica dentro da hospedagem, com o `valor_unitario` da época.

**Como representar histórico sem perder flexibilidade?**
- **Valores congelados:** o consumo guarda o `valor_unitario` e a reserva guarda o `valor_previsto`. Se o preço mudar depois, os registros antigos continuam corretos.
- **Previsto x real:** a reserva tem `data_checkin` e `data_checkout` previstos, e a hospedagem tem `checkin_real` e `checkout_real`.
- **Status:** reserva e hospedagem têm `status`, e nenhum documento é apagado, só muda de situação.
- **Projetos:** o status de cada projeto (`em_andamento`, `concluido`) mostra a evolução do escritor sem criar documentos novos.

## 1.7 Esquema inicial das coleções

> A versão detalhada, com o tipo de cada campo, o que é obrigatório e os valores possíveis, está em [`docs/ESQUEMA_COLECOES.md`](docs/ESQUEMA_COLECOES.md).

Campos que terminam em `_id` são **referências** para outra coleção. Campos marcados com `?` são **opcionais** (só existem em alguns documentos).

```
hospedes:
  _id, nome, email, cpf?, passaporte?, telefone, data_nascimento, data_cadastro, ativo,
  nome_literario?, generos [ ], endereco { cidade, estado?, pais },
  projetos? [ { titulo, genero, status, meta_palavras } ]

quartos:
  _id, numero, nome, tipo, capacidade, preco_diaria, status, andar, vista,
  comodidades [ ]

reservas:
  _id, hospede_id → hospedes, quarto_id → quartos, data_reserva,
  data_checkin, data_checkout, status, canal, valor_previsto, tipo_estadia,
  residencia? { tema, meta_palavras, mentor_id → funcionarios },
  observacoes?

hospedagens:
  _id, reserva_id → reservas,
  funcionario_checkin_id → funcionarios, funcionario_checkout_id → funcionarios,
  checkin_real, checkout_real, status,
  total_diarias, total_servicos, total_geral,
  servicos_consumidos [ { servico_id → servicos, data_consumo,
                          quantidade, valor_unitario, valor_total } ]

servicos:
  _id, nome, categoria, preco, disponivel

pagamentos:
  _id, hospedagem_id → hospedagens, valor, metodo, status,
  data_pagamento, transacao_id

funcionarios:
  _id, nome, cargo, departamento, email, telefone, ativo

feedbacks:
  _id, hospede_id → hospedes, quarto_id → quartos, hospedagem_id → hospedagens,
  nota_geral, comentario, data_avaliacao,
  notas_detalhadas? { silencio, inspiracao, atendimento }

espacos:
  _id, nome, tipo, capacidade, horario_abertura, horario_fechamento,
  regras [ ], ativo

eventos:
  _id, espaco_id → espacos, responsavel_id → funcionarios,
  titulo, tipo, data_hora, vagas, preco,
  participantes [ { hospede_id → hospedes, data_inscricao, presente } ]
```

## 1.8 Exemplos de documentos JSON

> Estes são documentos reais da minha base. No MongoDB as datas são do tipo `Date`; aqui aparecem como texto só para facilitar a leitura.

**hospedes** (array, subdocumento e projetos embutidos)
```json
{
  "_id": 1,
  "nome": "Mariana Teixeira",
  "nome_literario": "M. Teixeira",
  "email": "mariana.teixeira@email.com",
  "cpf": "321.654.987-01",
  "telefone": "+55 11 98765-4321",
  "data_nascimento": "1985-03-22",
  "data_cadastro": "2025-11-10",
  "ativo": true,
  "generos": [
    "romance",
    "crônica"
  ],
  "endereco": {
    "cidade": "São Paulo",
    "estado": "SP",
    "pais": "Brasil"
  },
  "projetos": [
    {
      "titulo": "A Casa dos Ventos",
      "genero": "romance",
      "status": "em_andamento",
      "meta_palavras": 80000
    }
  ]
}
```

**quartos** (array de comodidades)
```json
{
  "_id": 3,
  "numero": "201",
  "nome": "Quarto Clarice",
  "tipo": "estudio",
  "capacidade": 1,
  "preco_diaria": 420,
  "status": "disponivel",
  "andar": 2,
  "vista": "jardim",
  "comodidades": [
    "mesa de escrita",
    "isolamento acústico",
    "luz natural",
    "wifi",
    "cafeteira"
  ]
}
```

**reservas** (residência literária: subdocumento opcional)
```json
{
  "_id": 6,
  "hospede_id": 1,
  "quarto_id": 3,
  "data_reserva": "2026-02-15T09:00:00Z",
  "data_checkin": "2026-03-01",
  "data_checkout": "2026-03-22",
  "status": "concluida",
  "canal": "site_proprio",
  "valor_previsto": 8820,
  "tipo_estadia": "residencia",
  "residencia": {
    "tema": "Romance",
    "meta_palavras": 30000,
    "mentor_id": 3
  }
}
```

**hospedagens** (referências + array embutido de serviços)
```json
{
  "_id": 6,
  "reserva_id": 6,
  "funcionario_checkin_id": 1,
  "funcionario_checkout_id": 2,
  "checkin_real": "2026-03-01T14:30:00Z",
  "checkout_real": "2026-03-22T11:00:00Z",
  "status": "encerrada",
  "total_diarias": 8820,
  "total_servicos": 2065,
  "total_geral": 10885,
  "servicos_consumidos": [
    {
      "servico_id": 1,
      "data_consumo": "2026-03-01T08:00:00Z",
      "quantidade": 21,
      "valor_unitario": 35,
      "valor_total": 735
    },
    {
      "servico_id": 3,
      "data_consumo": "2026-03-01T16:00:00Z",
      "quantidade": 3,
      "valor_unitario": 200,
      "valor_total": 600
    },
    {
      "servico_id": 8,
      "data_consumo": "2026-03-02",
      "quantidade": 21,
      "valor_unitario": 30,
      "valor_total": 630
    },
    {
      "servico_id": 5,
      "data_consumo": "2026-03-02T08:00:00Z",
      "quantidade": 1,
      "valor_unitario": 100,
      "valor_total": 100
    }
  ]
}
```

**servicos**
```json
{
  "_id": 2,
  "nome": "Revisão de texto",
  "categoria": "escrita",
  "preco": 150,
  "disponivel": true
}
```

**pagamentos**
```json
{
  "_id": 9,
  "hospedagem_id": 6,
  "valor": 10885,
  "metodo": "cartao_credito",
  "status": "aprovado",
  "data_pagamento": "2026-03-22T11:00:00Z",
  "transacao_id": "TXN-00009"
}
```

**funcionarios**
```json
{
  "_id": 3,
  "nome": "Patrícia Gomes",
  "cargo": "Mentora literária",
  "departamento": "Programa de Residência",
  "email": "patricia.gomes@hotelentrelinhas.com",
  "telefone": "+55 11 97777-2222",
  "ativo": true
}
```

**feedbacks** (subdocumento opcional de notas)
```json
{
  "_id": 5,
  "hospede_id": 1,
  "quarto_id": 3,
  "hospedagem_id": 6,
  "nota_geral": 5,
  "comentario": "Silêncio perfeito, consegui escrever todos os dias.",
  "data_avaliacao": "2026-03-23T09:00:00Z",
  "notas_detalhadas": {
    "silencio": 5,
    "inspiracao": 5,
    "atendimento": 5
  }
}
```

**espacos** (array de regras)
```json
{
  "_id": 1,
  "nome": "Biblioteca Central",
  "tipo": "biblioteca",
  "capacidade": 20,
  "horario_abertura": "08:00",
  "horario_fechamento": "22:00",
  "regras": [
    "silêncio absoluto",
    "sem alimentos",
    "celular no modo silencioso"
  ],
  "ativo": true
}
```

**eventos** (participantes embutidos)
```json
{
  "_id": 2,
  "espaco_id": 2,
  "responsavel_id": 3,
  "titulo": "Oficina de Diálogos",
  "tipo": "oficina",
  "data_hora": "2026-03-12T16:00:00Z",
  "vagas": 12,
  "preco": 60,
  "participantes": [
    {
      "hospede_id": 1,
      "data_inscricao": "2026-03-05T10:00:00Z",
      "presente": true
    },
    {
      "hospede_id": 6,
      "data_inscricao": "2026-03-06T10:00:00Z",
      "presente": true
    }
  ]
}
```

## 1.9 Considerações finais

- A modelagem mistura **referências** (para o que é compartilhado ou cresce) e **embutimento** (para o que pertence a um único documento e tem tamanho limitado).
- O que é específico de escritores (projetos, residência, notas de silêncio) aparece como **campo opcional**, aproveitando a flexibilidade do NoSQL.
- Os quartos usam o array `comodidades`, o que deve facilitar as consultas da Parte 3 (por exemplo, quartos com "mesa de escrita" e "isolamento acústico").

---

# Parte 2: Montagem do Núcleo

Nesta parte coloquei o plano da Parte 1 no MongoDB de verdade. O banco se chama **`hotel_entrelinhas`**.

## 2.1 Como criei as coleções e inseri os documentos

Usei o **MongoDB Compass** e o terminal dele (`>_MONGOSH`). Antes, esvaziei as coleções de uma versão anterior do projeto.

Montei um script (`scripts/02_insercao.js`) que, para cada coleção:
1. esvazia a coleção (`deleteMany`), para o script poder ser rodado mais de uma vez;
2. insere os documentos com `insertMany`.

No final ele cria os índices e imprime a contagem de documentos. Também exportei cada coleção em `.json` (pasta `data/colecoes/`).

| Coleção | Documentos |
|---|---|
| hospedes | 8 |
| quartos | 8 |
| reservas | 21 |
| hospedagens | 18 |
| servicos | 8 |
| pagamentos | 27 |
| funcionarios | 6 |
| feedbacks | 14 |
| espacos | 4 |
| eventos | 6 |

## 2.2 Como os dados foram pensados

Os documentos foram criados de forma que **as referências sempre existam** (toda reserva aponta para um hóspede e um quarto que existem, toda hospedagem aponta para uma reserva concluída etc.) e que **as contas fechem**: o `total_servicos` de cada hospedagem é a soma do seu array `servicos_consumidos`, e o `total_geral` é igual à soma dos pagamentos aprovados daquela hospedagem.

Variedade intencional nos dados:
- **3 tipos de quarto** (`standard`, `estudio`, `suite`), com comodidades diferentes.
- **Estadias curtas e residências literárias** (de 10 a 21 noites).
- **Pagamento de uma vez ou em duas partes** (sinal no Pix e resto no cartão).
- **Um pagamento recusado** (cartão), seguido de um aprovado, para treinar filtros por `status`.
- **1 reserva cancelada** e **2 reservas confirmadas** para o futuro.
- **1 hóspede inativo** sem reservas e **1 estrangeiro** (com `passaporte`, sem `cpf`).

## 2.3 Dados aninhados, arrays e flexibilidade

| O que | Onde | Para que serve |
|---|---|---|
| Array `comodidades` | `quartos` | Buscar quartos por característica de escrita |
| Array `servicos_consumidos` | `hospedagens` | Guardar a conta da estadia junto com ela |
| Array `projetos` | `hospedes` | Guardar o que o escritor está escrevendo (nem todos têm) |
| Array `participantes` | `eventos` | Inscritos de cada evento, limitado pelas vagas |
| Array `generos`, `regras` | `hospedes`, `espacos` | Listas simples de texto |
| Subdocumento `endereco` | `hospedes` | Agrupa cidade, estado e país |
| Subdocumento `residencia` | `reservas` | Só existe em residências (tema, meta de palavras e mentor) |
| Subdocumento `notas_detalhadas` | `feedbacks` | Só existe em alguns feedbacks |

A **flexibilidade** aparece nos campos que existem só em alguns documentos da mesma coleção: `nome_literario` e `projetos` (hóspedes), `observacoes` e `residencia` (reservas), `notas_detalhadas` (feedbacks) e `passaporte` no lugar de `cpf`. O MongoDB aceita isso sem quebrar nada.

## 2.4 Índices (escalabilidade)

| Coleção | Índice | Motivo |
|---|---|---|
| `hospedes` | `email` único | Evitar dois cadastros com o mesmo e-mail |
| `hospedes` | `cpf` único (só para quem tem CPF) | Evitar duplicados sem barrar estrangeiros |
| `quartos` | `numero` único | Não existir dois quartos com o mesmo número |
| `quartos` | `comodidades` | Acelerar busca por característica |
| `reservas` | `hospede_id` e (`quarto_id`, `data_checkin`) | Buscar reservas de um hóspede ou de um quarto |
| `pagamentos` | (`data_pagamento`, `status`) | Consultas de faturamento por período |
| `feedbacks` | `quarto_id` | Calcular média de notas por quarto |

## 2.5 Explicação da arquitetura adotada

- **Referências** entre hóspedes, quartos, reservas, hospedagens, pagamentos e feedbacks, porque são assuntos que se relacionam de formas variadas e cresceriam demais se fossem embutidos.
- **Embutimento** só onde o dado pertence a um único documento e tem tamanho limitado: serviços da estadia, projetos do escritor, participantes de um evento.
- **Escalabilidade:** o que pode crescer sem limite (reservas, pagamentos, feedbacks) fica em coleção própria.
- **Datas** guardadas como tipo `Date`, o que permite agrupar por mês e por dia da semana nas consultas.

## 2.6 Entregáveis desta parte

- `data/colecoes/*.json`: as 10 coleções exportadas
- `scripts/02_insercao.js`: script de inserção
- Exemplos de documentos (seção 1.8) e explicação da arquitetura (seção 2.5)

---

# Parte 3: Radar de Comando

Consultas para responder perguntas de gestão. Todas rodam no `>_MONGOSH` do Compass. Antes de começar:

```js
use hotel_entrelinhas
```

Os resultados abaixo são os que obtive com os dados do projeto.

## 3.1 Quais quartos possuem determinadas características?

**Quartos com vista para o lago:**
```js
db.quartos.find({ vista: "lago" }, { _id: 0, numero: 1, nome: 1, tipo: 1, preco_diaria: 1 })
```
**Resultado:** 202 (Drummond), 301 (Guimarães), 401 (Cora)

**Suítes (quartos de luxo):**
```js
db.quartos.find({ tipo: "suite" }, { _id: 0, numero: 1, nome: 1, vista: 1, preco_diaria: 1 })
```
**Resultado:** 301 (Guimarães), 302 (Hilst), 401 (Cora)

**Quartos com banheira** (procura dentro do array `comodidades`):
```js
db.quartos.find({ comodidades: "banheira" }, { _id: 0, numero: 1, nome: 1, tipo: 1 })
```
**Resultado:** 202 (Drummond), 301 (Guimarães), 302 (Hilst), 401 (Cora)

**Quartos silenciosos para escrever** (mesa de escrita **e** isolamento acústico):
```js
db.quartos.find(
  { comodidades: { $all: ["mesa de escrita", "isolamento acústico"] } },
  { _id: 0, numero: 1, nome: 1, preco_diaria: 1 }
)
```
**Resultado:** 201 (Clarice), 202 (Drummond), 203 (Conceição), 301 (Guimarães), 302 (Hilst), 401 (Cora)

**Suíte com vista para o lago e banheira, juntos:**
```js
db.quartos.find({ tipo: "suite", vista: "lago", comodidades: "banheira" }, { _id: 0, numero: 1, nome: 1 })
```
**Resultado:** 301 (Guimarães), 401 (Cora)

*O que aprendi:* o `find` filtra documentos, e o segundo argumento escolhe quais campos mostrar. Quando o campo é uma lista, escrever o valor direto já procura dentro dela, e o `$all` exige que **todos** os valores existam.

## 3.2 Quais hóspedes reservaram mais de uma vez?

```js
db.reservas.aggregate([
  { $match: { status: { $ne: "cancelada" } } },
  { $group: { _id: "$hospede_id", total_reservas: { $sum: 1 } } },
  { $match: { total_reservas: { $gt: 1 } } },
  { $lookup: { from: "hospedes", localField: "_id", foreignField: "_id", as: "hospede" } },
  { $unwind: "$hospede" },
  { $project: { _id: 0, nome: "$hospede.nome", total_reservas: 1 } },
  { $sort: { total_reservas: -1, nome: 1 } }
])
```

Passo a passo: tiro as reservas canceladas, agrupo por hóspede e conto, fico só com quem tem mais de 1, busco o nome na coleção `hospedes` (é assim que se usa uma referência) e ordeno.

**Resultado:**

| Hóspede | Reservas |
|---|---|
| Mariana Teixeira | 4 |
| Beatriz Nogueira | 3 |
| Lucas Oliveira | 3 |
| Ricardo Alves | 3 |
| Thiago Ramos | 3 |
| Camila Duarte | 2 |
| Daniel Fischer | 2 |

## 3.3 Quanto o hotel faturou em um período?

Considerei como faturamento só os pagamentos **aprovados** (o pagamento recusado fica de fora).

**Faturamento em março de 2026:**
```js
db.pagamentos.aggregate([
  { $match: { status: "aprovado",
              data_pagamento: { $gte: ISODate("2026-03-01"), $lt: ISODate("2026-04-01") } } },
  { $group: { _id: null, faturamento: { $sum: "$valor" } } }
])
```
**Resultado:** R$ 24.710

**Faturamento mês a mês:**
```js
db.pagamentos.aggregate([
  { $match: { status: "aprovado" } },
  { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$data_pagamento" } },
              faturamento: { $sum: "$valor" } } },
  { $sort: { _id: 1 } }
])
```
**Resultado:**

| Mês | Faturamento (R$) |
|---|---|
| 2026-01 | 8.900 |
| 2026-02 | 11.075 |
| 2026-03 | 24.710 |
| 2026-04 | 3.805 |
| 2026-05 | 5.705 |
| 2026-06 | 9.950 |
| 2026-07 | 7.975 |
| 2026-09 | 19.210 |
| 2026-10 | 3.360 |

**Faturamento anual de 2026:**
```js
db.pagamentos.aggregate([
  { $match: { status: "aprovado",
              data_pagamento: { $gte: ISODate("2026-01-01"), $lt: ISODate("2027-01-01") } } },
  { $group: { _id: null, faturamento_2026: { $sum: "$valor" } } }
])
```
**Resultado:** R$ 94.690

*O que aprendi:* o `$match` filtra o período e o `$group` com `$sum` soma os valores. O `$dateToString` transforma a data em "ano-mês" para agrupar. Como os pagamentos de uma estadia podem cair em meses diferentes (sinal no check-in e resto no check-out), o faturamento é contado **no mês em que o dinheiro entrou**.

## 3.4 Quais períodos têm mais ocupação?

Usei as reservas não canceladas, pela data de check-in.

**Meses com mais reservas:**
```js
db.reservas.aggregate([
  { $match: { status: { $ne: "cancelada" } } },
  { $group: { _id: { $month: "$data_checkin" }, total_reservas: { $sum: 1 } } },
  { $sort: { total_reservas: -1, _id: 1 } }
])
```
**Resultado** (o `_id` é o número do mês):

| Mês | Reservas |
|---|---|
| 1 (janeiro) | 3 |
| 3 (março) | 3 |
| 2 (fevereiro) | 2 |
| 4 (abril) | 2 |
| 5 (maio) | 2 |
| 7 (julho) | 2 |
| 6 (junho) | 1 |
| 8 (agosto) | 1 |
| 9 (setembro) | 1 |
| 10 (outubro) | 1 |
| 11 (novembro) | 1 |
| 12 (dezembro) | 1 |

**Dias da semana mais movimentados** (dia do check-in):
```js
db.reservas.aggregate([
  { $match: { status: { $ne: "cancelada" } } },
  { $group: { _id: { $dayOfWeek: "$data_checkin" }, total_reservas: { $sum: 1 } } },
  { $sort: { total_reservas: -1, _id: 1 } }
])
```
Legenda do `_id`: 1 = domingo, 2 = segunda, 3 = terça, 4 = quarta, 5 = quinta, 6 = sexta, 7 = sábado.

**Resultado:**

| Dia | Reservas |
|---|---|
| 6 (sexta) | 10 |
| 5 (quinta) | 4 |
| 7 (sábado) | 3 |
| 1 (domingo) | 1 |
| 2 (segunda) | 1 |
| 3 (terça) | 1 |

*O que aprendi:* como as datas são do tipo `Date`, o MongoDB extrai mês e dia da semana direto com `$month` e `$dayOfWeek`. Essa contagem é por **reservas**; uma análise mais fiel de ocupação somaria as noites de cada estadia.

## 3.5 Extra: quais serviços mais rendem?

Esta consulta usa o array embutido `servicos_consumidos`: o `$unwind` "abre" a lista, transformando cada consumo em uma linha.

```js
db.hospedagens.aggregate([
  { $unwind: "$servicos_consumidos" },
  { $group: { _id: "$servicos_consumidos.servico_id",
              quantidade: { $sum: "$servicos_consumidos.quantidade" },
              receita: { $sum: "$servicos_consumidos.valor_total" } } },
  { $lookup: { from: "servicos", localField: "_id", foreignField: "_id", as: "servico" } },
  { $unwind: "$servico" },
  { $project: { _id: 0, servico: "$servico.nome", quantidade: 1, receita: 1 } },
  { $sort: { receita: -1 } }
])
```
**Resultado:**

| Serviço | Quantidade | Receita (R$) |
|---|---|---|
| Café da manhã | 140 | 4900 |
| Modo silêncio (sem limpeza diária) | 80 | 2400 |
| Mentoria com autor (sessão) | 11 | 2200 |
| Revisão de texto | 6 | 900 |
| Encadernação de manuscrito | 5 | 500 |
| Massagem relaxante | 2 | 360 |
| Impressão de manuscrito | 6 | 360 |
| Jantar com leitura | 3 | 270 |

## 3.6 Entregáveis desta parte

- `scripts/03_consultas.js` com todas as consultas
- Resultados de cada consulta (tabelas acima)

---

# Considerações finais

- O projeto seguiu a ordem natural de um sistema: **planejar** (Parte 1), **construir** (Parte 2) e **consultar** (Parte 3).
- O principal aprendizado foi a decisão entre **embutir e referenciar**: não existe resposta única, e cada escolha tem vantagem e desvantagem.
- Guardar as datas como `Date` simplificou muito as consultas por período.
- Como evolução, a ideia citada no enunciado: criar uma **API** em cima desse banco.
