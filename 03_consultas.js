// ============================================================
// Hotel Entrelinhas - Parte 3: consultas
// Como usar: no >_MONGOSH do Compass, rode primeiro:  use hotel_entrelinhas
// e depois cole UMA consulta de cada vez.
// ============================================================

// ---- 3.1 Vista para o lago ----
db.quartos.find({ vista: "lago" }, { _id: 0, numero: 1, nome: 1, tipo: 1, preco_diaria: 1 })

// ---- 3.1 Suítes ----
db.quartos.find({ tipo: "suite" }, { _id: 0, numero: 1, nome: 1, vista: 1, preco_diaria: 1 })

// ---- 3.1 Quartos com banheira ----
db.quartos.find({ comodidades: "banheira" }, { _id: 0, numero: 1, nome: 1, tipo: 1 })

// ---- 3.1 Mesa de escrita + isolamento acústico ----
db.quartos.find(
  { comodidades: { $all: ["mesa de escrita", "isolamento acústico"] } },
  { _id: 0, numero: 1, nome: 1, preco_diaria: 1 }
)

// ---- 3.1 Suíte + lago + banheira ----
db.quartos.find({ tipo: "suite", vista: "lago", comodidades: "banheira" }, { _id: 0, numero: 1, nome: 1 })

// ---- 3.2 Hóspedes com mais de uma reserva ----
db.reservas.aggregate([
  { $match: { status: { $ne: "cancelada" } } },
  { $group: { _id: "$hospede_id", total_reservas: { $sum: 1 } } },
  { $match: { total_reservas: { $gt: 1 } } },
  { $lookup: { from: "hospedes", localField: "_id", foreignField: "_id", as: "hospede" } },
  { $unwind: "$hospede" },
  { $project: { _id: 0, nome: "$hospede.nome", total_reservas: 1 } },
  { $sort: { total_reservas: -1, nome: 1 } }
])

// ---- 3.3 Faturamento em março de 2026 ----
db.pagamentos.aggregate([
  { $match: { status: "aprovado",
              data_pagamento: { $gte: ISODate("2026-03-01"), $lt: ISODate("2026-04-01") } } },
  { $group: { _id: null, faturamento: { $sum: "$valor" } } }
])

// ---- 3.3 Faturamento mês a mês ----
db.pagamentos.aggregate([
  { $match: { status: "aprovado" } },
  { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$data_pagamento" } },
              faturamento: { $sum: "$valor" } } },
  { $sort: { _id: 1 } }
])

// ---- 3.3 Faturamento anual 2026 ----
db.pagamentos.aggregate([
  { $match: { status: "aprovado",
              data_pagamento: { $gte: ISODate("2026-01-01"), $lt: ISODate("2027-01-01") } } },
  { $group: { _id: null, faturamento_2026: { $sum: "$valor" } } }
])

// ---- 3.4 Meses com mais reservas ----
db.reservas.aggregate([
  { $match: { status: { $ne: "cancelada" } } },
  { $group: { _id: { $month: "$data_checkin" }, total_reservas: { $sum: 1 } } },
  { $sort: { total_reservas: -1, _id: 1 } }
])

// ---- 3.4 Dias da semana mais movimentados ----
db.reservas.aggregate([
  { $match: { status: { $ne: "cancelada" } } },
  { $group: { _id: { $dayOfWeek: "$data_checkin" }, total_reservas: { $sum: 1 } } },
  { $sort: { total_reservas: -1, _id: 1 } }
])

// ---- 3.5 Serviços que mais rendem ----
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

