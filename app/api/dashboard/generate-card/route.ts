import { generateText, Output } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const cardConfigSchema = z.object({
  title: z.string(),
  metric: z.enum([
    'total',
    'done_on_time',
    'done_late',
    'not_done',
    'execution_rate',
    'on_time_rate',
    'late_rate',
    'not_done_rate',
  ]),
  chartType: z.enum(['number', 'sparkline', 'bars', 'donut', 'radial']),
  color: z.string(),
})

export type CardConfig = z.infer<typeof cardConfigSchema>

const METRIC_DESCRIPTIONS = {
  total: 'Total de tarefas no periodo',
  done_on_time: 'Tarefas concluidas no prazo',
  done_late: 'Tarefas concluidas fora do prazo',
  not_done: 'Tarefas nao realizadas',
  execution_rate: 'Taxa de execucao geral (%)',
  on_time_rate: 'Taxa de conclusao no prazo (%)',
  late_rate: 'Taxa de conclusao fora do prazo (%)',
  not_done_rate: 'Taxa de nao realizadas (%)',
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { description } = await req.json()
  if (!description?.trim()) {
    return Response.json({ error: 'Descricao nao informada.' }, { status: 400 })
  }

  const metricsText = Object.entries(METRIC_DESCRIPTIONS)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n')

  const result = await generateText({
    model: 'openai/gpt-5-mini',
    output: Output.object({ schema: cardConfigSchema }),
    system: `Voce e um assistente que interpreta descricoes de cards de dashboard e retorna uma configuracao JSON.

Metricas disponiveis:
${metricsText}

Tipos de grafico disponiveis:
- number: numero grande simples, ideal para valores absolutos
- sparkline: linha de tendencia minimalista
- bars: grafico de barras horizontal
- donut: grafico donut/pizza
- radial: barra de progresso radial, ideal para percentuais

Cores aceitas (hex): escolha a mais adequada ao contexto da metrica.
- Verde: #00FF85 (boas metricas, prazo)
- Amarelo: #F59E0B (alertas, fora do prazo)
- Vermelho: #EF4444 (nao realizadas, critico)
- Azul: #3B82F6 (neutro, total, execucao)
- Ciano: #06B6D4
- Laranja: #F97316

Interprete a descricao do usuario e escolha a melhor combinacao de metrica, tipo de grafico e cor.
Se o usuario mencionar "grafico de barras", use bars. "donut" ou "pizza", use donut. "numero" ou "numero grande", use number. "linha" ou "sparkline", use sparkline. "radial" ou "progresso", use radial.
Retorne APENAS o JSON no schema especificado, sem texto adicional.`,
    messages: [{ role: 'user', content: description }],
  })

  return Response.json({ config: result.object })
}
