'use client'

import { useState, useRef } from 'react'
import {
  X,
  Sparkles,
  BarChart2,
  Hash,
  TrendingUp,
  PieChart,
  Activity,
  Check,
} from 'lucide-react'
import type { CardConfig } from '@/app/api/dashboard/generate-card/route'

// ─── Types ────────────────────────────────────────────────────────────────────

type ChartType = CardConfig['chartType']
type Metric = CardConfig['metric']

interface MetricOption {
  value: Metric
  label: string
  category: 'Geral' | 'Taxas'
}

// ─── Constants ────────────────────────────────────────────────────────────────

const METRICS: MetricOption[] = [
  { value: 'total', label: 'Total de tarefas', category: 'Geral' },
  { value: 'done_on_time', label: 'Concluidas no prazo', category: 'Geral' },
  { value: 'done_late', label: 'Concluidas fora do prazo', category: 'Geral' },
  { value: 'not_done', label: 'Nao realizadas', category: 'Geral' },
  { value: 'execution_rate', label: 'Taxa de execucao', category: 'Taxas' },
  { value: 'on_time_rate', label: 'Taxa no prazo', category: 'Taxas' },
  { value: 'late_rate', label: 'Taxa fora do prazo', category: 'Taxas' },
  { value: 'not_done_rate', label: 'Taxa nao realizadas', category: 'Taxas' },
]

const CHART_TYPES: { value: ChartType; label: string; icon: React.ElementType }[] = [
  { value: 'sparkline', label: 'Sparkline', icon: TrendingUp },
  { value: 'bars', label: 'Barras', icon: BarChart2 },
  { value: 'donut', label: 'Donut', icon: PieChart },
  { value: 'radial', label: 'Radial', icon: Activity },
  { value: 'number', label: 'Numero', icon: Hash },
]

const COLORS = [
  '#3B82F6',
  '#00FF85',
  '#F59E0B',
  '#EF4444',
  '#A855F7',
  '#06B6D4',
  '#10B981',
  '#F97316',
]

const AI_EXAMPLES = [
  'Total de tarefas com grafico de barras',
  'Taxa de execucao em numero grande',
  'Nao realizadas em donut vermelho',
  'Concluidas no prazo em radial verde',
]

// ─── Component ────────────────────────────────────────────────────────────────

interface AddCardModalProps {
  onClose: () => void
  onAdd: (config: CardConfig) => void
}

export function AddCardModal({ onClose, onAdd }: AddCardModalProps) {
  const [tab, setTab] = useState<'describe' | 'manual'>('describe')

  // Describe tab state
  const [description, setDescription] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Manual tab state
  const [title, setTitle] = useState('')
  const [metric, setMetric] = useState<Metric>('total')
  const [chartType, setChartType] = useState<ChartType>('number')
  const [color, setColor] = useState(COLORS[0])
  const [metricFilter, setMetricFilter] = useState<'Todos' | 'Geral' | 'Taxas'>('Todos')

  const filteredMetrics = metricFilter === 'Todos'
    ? METRICS
    : METRICS.filter((m) => m.category === metricFilter)

  async function handleGenerate() {
    if (!description.trim() || generating) return
    setGenerating(true)
    setGenError(null)
    try {
      const res = await fetch('/api/dashboard/generate-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })
      const data = await res.json()
      if (!res.ok || !data.config) {
        setGenError(data.error ?? 'Falha ao gerar card.')
        return
      }
      onAdd(data.config)
    } catch {
      setGenError('Erro de conexao. Tente novamente.')
    } finally {
      setGenerating(false)
    }
  }

  function handleManualAdd() {
    const selectedMetric = METRICS.find((m) => m.value === metric)
    onAdd({
      title: title.trim() || selectedMetric?.label || metric,
      metric,
      chartType,
      color,
    })
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.18s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
          animation: 'slideUp 0.22s cubic-bezier(0.16,1,0.3,1)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px 0',
        }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Novo Card Personalizado
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              display: 'flex',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', padding: '16px 24px 0' }}>
          {[
            { value: 'describe' as const, label: 'Descrever', icon: Sparkles },
            { value: 'manual' as const, label: 'Manual', icon: BarChart2 },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '999px',
                border: '1px solid',
                borderColor: tab === value ? 'var(--color-accent-blue)' : 'var(--color-border)',
                background: tab === value ? 'var(--color-accent-blue)18' : 'transparent',
                color: tab === value ? 'var(--color-accent-blue)' : 'var(--color-text-secondary)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          {tab === 'describe' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                Descreva o card que voce quer ver no dashboard. O agente interpreta sua descricao e configura automaticamente a metrica, o tipo de grafico e a cor.
              </p>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                  Exemplos
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {AI_EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => { setDescription(ex); textareaRef.current?.focus() }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '999px',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface-elevated)',
                        color: 'var(--color-text-secondary)',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s, color 0.15s',
                      }}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  Descricao do card
                </label>
                <textarea
                  ref={textareaRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate() }}
                  placeholder="Ex: quero ver as tarefas nao realizadas com grafico donut em vermelho"
                  rows={3}
                  style={{
                    resize: 'none',
                    background: 'var(--color-input-bg)',
                    border: '1px solid var(--color-input-border)',
                    borderRadius: '10px',
                    color: 'var(--color-input-text)',
                    fontSize: '13px',
                    padding: '12px 14px',
                    outline: 'none',
                    lineHeight: 1.6,
                    fontFamily: 'inherit',
                    transition: 'border-color 0.15s',
                  }}
                />
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Ctrl+Enter para gerar</span>
              </div>

              {genError && (
                <p style={{ margin: 0, fontSize: '13px', color: '#EF4444' }}>{genError}</p>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Title */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  Titulo do card (opcional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Total de tarefas"
                  style={{
                    background: 'var(--color-input-bg)',
                    border: '1px solid var(--color-input-border)',
                    borderRadius: '10px',
                    color: 'var(--color-input-text)',
                    fontSize: '13px',
                    padding: '10px 14px',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Metric */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  Metrica
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {(['Todos', 'Geral', 'Taxas'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setMetricFilter(f)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '999px',
                        border: '1px solid',
                        borderColor: metricFilter === f ? 'var(--color-accent-blue)' : 'var(--color-border)',
                        background: metricFilter === f ? 'var(--color-accent-blue)' : 'transparent',
                        color: metricFilter === f ? '#fff' : 'var(--color-text-secondary)',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  maxHeight: '180px',
                  overflowY: 'auto',
                }}>
                  {filteredMetrics.map((m, i) => (
                    <button
                      key={m.value}
                      onClick={() => setMetric(m.value)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: metric === m.value ? 'var(--color-accent-blue)12' : (i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-elevated)'),
                        border: 'none',
                        borderTop: i > 0 ? '1px solid var(--color-border)' : 'none',
                        color: metric === m.value ? 'var(--color-accent-blue)' : 'var(--color-text-secondary)',
                        fontSize: '13px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontWeight: metric === m.value ? 600 : 400,
                        transition: 'background 0.12s',
                      }}
                    >
                      <span>{m.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{m.category}</span>
                        {metric === m.value && <Check size={14} style={{ color: 'var(--color-accent-blue)' }} />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart type */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  Tipo de grafico
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {CHART_TYPES.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setChartType(value)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 13px',
                        borderRadius: '999px',
                        border: '1px solid',
                        borderColor: chartType === value ? 'var(--color-accent-blue)' : 'var(--color-border)',
                        background: chartType === value ? 'var(--color-accent-blue)' : 'transparent',
                        color: chartType === value ? '#fff' : 'var(--color-text-secondary)',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <Icon size={13} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  Cor
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        background: c,
                        border: color === c ? '3px solid var(--color-text-primary)' : '2px solid transparent',
                        outline: color === c ? `2px solid ${c}` : 'none',
                        outlineOffset: '2px',
                        cursor: 'pointer',
                        transition: 'transform 0.12s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {color === c && <Check size={14} color="#fff" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          gap: '10px',
          padding: '0 24px 24px',
          borderTop: '1px solid var(--color-border)',
          paddingTop: '16px',
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '11px',
              borderRadius: '10px',
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.15s',
              fontFamily: 'inherit',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={tab === 'describe' ? handleGenerate : handleManualAdd}
            disabled={tab === 'describe' && (!description.trim() || generating)}
            style={{
              flex: 1,
              padding: '11px',
              borderRadius: '10px',
              border: 'none',
              background: generating ? 'var(--color-accent-blue)88' : 'var(--color-accent-blue)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: generating ? 'wait' : 'pointer',
              transition: 'opacity 0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontFamily: 'inherit',
              opacity: tab === 'describe' && !description.trim() ? 0.5 : 1,
            }}
          >
            {generating ? (
              <>
                <span style={{ width: '14px', height: '14px', border: '2px solid #fff4', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                Gerando...
              </>
            ) : tab === 'describe' ? (
              <>
                <Sparkles size={15} />
                Gerar card
              </>
            ) : (
              'Adicionar card'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
