'use client'

import { useState } from 'react'
import { X, GripVertical } from 'lucide-react'
import type { CardConfig } from '@/app/api/dashboard/generate-card/route'

interface DashboardStats {
  total: number
  done_on_time: number
  done_late: number
  not_done: number
  execution_rate: number
  on_time_rate: number
  late_rate: number
  not_done_rate: number
}

interface CustomCardProps {
  id: string
  config: CardConfig
  stats: DashboardStats
  onRemove: (id: string) => void
  animationDelay?: number
}

// ─── Mini chart components ────────────────────────────────────────────────────

function SparklineChart({ value, max, color }: { value: number; max: number; color: string }) {
  // Generate fake sparkline points that end at the current value
  const points = [0.4, 0.55, 0.35, 0.6, 0.45, 0.7, 0.5, 0.8, 0.65, 1.0].map(
    (p) => p * Math.max(value, 1)
  )
  const w = 120
  const h = 40
  const maxVal = Math.max(...points, 1)
  const coords = points.map((v, i) => ({
    x: (i / (points.length - 1)) * w,
    y: h - (v / maxVal) * h * 0.85,
  }))
  const d = coords.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const fill = coords.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    + ` L${w},${h} L0,${h} Z`

  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#sg-${color.replace('#', '')})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="3" fill={color} />
    </svg>
  )
}

function BarsChart({ value, max, color }: { value: number; max: number; color: string }) {
  const bars = [0.3, 0.55, 0.4, 0.7, 0.5, 0.85, value / Math.max(max, 1)]
  const barW = 12
  const gap = 6
  const h = 40
  const w = bars.length * (barW + gap) - gap

  return (
    <svg width={w} height={h}>
      {bars.map((pct, i) => {
        const barH = Math.max(pct * h, 3)
        return (
          <rect
            key={i}
            x={i * (barW + gap)}
            y={h - barH}
            width={barW}
            height={barH}
            rx={3}
            fill={i === bars.length - 1 ? color : color + '55'}
          />
        )
      })}
    </svg>
  )
}

function DonutMini({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0
  const r = 22
  const circ = 2 * Math.PI * r
  const dash = pct * circ

  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--color-border)" strokeWidth="7" />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 28 28)"
        style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)' }}
      />
      <text x="28" y="33" textAnchor="middle" fill="var(--color-text-primary)" fontSize="11" fontWeight="700" fontFamily="inherit">
        {Math.round(pct * 100)}%
      </text>
    </svg>
  )
}

function RadialChart({ value, color }: { value: number; color: string }) {
  const pct = Math.min(Math.max(value, 0), 100) / 100
  const r = 22
  const circ = 2 * Math.PI * r
  const dash = pct * circ

  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--color-border)" strokeWidth="6" />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 28 28)"
        style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)' }}
      />
      <text x="28" y="33" textAnchor="middle" fill="var(--color-text-primary)" fontSize="11" fontWeight="700" fontFamily="inherit">
        {value}%
      </text>
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CustomCard({ id, config, stats, onRemove, animationDelay = 0 }: CustomCardProps) {
  const [hovered, setHovered] = useState(false)

  const rawValue = stats[config.metric]
  const isRate = config.metric.endsWith('_rate')
  const displayValue = isRate ? `${rawValue}%` : rawValue
  const maxValue = Math.max(stats.total, 1)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--color-surface)',
        border: `1px solid var(--color-border)`,
        borderRadius: '12px',
        padding: '18px 20px',
        boxShadow: 'var(--shadow-card)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        animation: `slideUp 0.4s cubic-bezier(0.16,1,0.3,1) ${animationDelay}ms both`,
        transition: 'box-shadow 0.2s, border-color 0.2s',
        borderColor: hovered ? config.color + '60' : 'var(--color-border)',
        boxShadow: hovered ? `0 4px 20px ${config.color}20, var(--shadow-card)` : 'var(--shadow-card)',
      } as React.CSSProperties}
    >
      {/* Accent bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '3px',
        height: '100%',
        background: config.color,
        borderRadius: '12px 0 0 12px',
      }} />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          lineHeight: 1.3,
        }}>
          {config.title}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: config.color,
            opacity: 0.8,
          }} />
          <button
            onClick={() => onRemove(id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              display: 'flex',
              padding: '2px',
              borderRadius: '4px',
              opacity: hovered ? 1 : 0,
              transition: 'opacity 0.15s',
            }}
            title="Remover card"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Chart / Value */}
      {config.chartType === 'number' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{
            fontSize: '36px',
            fontWeight: 800,
            color: config.color,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {displayValue}
          </span>
        </div>
      )}

      {config.chartType === 'sparkline' && (
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px' }}>
          <span style={{
            fontSize: '28px',
            fontWeight: 800,
            color: config.color,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {displayValue}
          </span>
          <SparklineChart value={rawValue} max={maxValue} color={config.color} />
        </div>
      )}

      {config.chartType === 'bars' && (
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px' }}>
          <span style={{
            fontSize: '28px',
            fontWeight: 800,
            color: config.color,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {displayValue}
          </span>
          <BarsChart value={rawValue} max={maxValue} color={config.color} />
        </div>
      )}

      {config.chartType === 'donut' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <DonutMini value={rawValue} max={maxValue} color={config.color} />
          <div>
            <span style={{
              fontSize: '24px',
              fontWeight: 800,
              color: config.color,
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {displayValue}
            </span>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              de {stats.total} tarefas
            </div>
          </div>
        </div>
      )}

      {config.chartType === 'radial' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <RadialChart value={isRate ? rawValue : Math.round((rawValue / maxValue) * 100)} color={config.color} />
          <span style={{
            fontSize: '24px',
            fontWeight: 800,
            color: config.color,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {displayValue}
          </span>
        </div>
      )}
    </div>
  )
}
