'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAuditLogs, type AuditLogEntry } from '@/app/actions/audit-logs'
import { Loader2, RefreshCw, Search, ChevronDown, ChevronUp, MessageSquare, Zap, Bot } from 'lucide-react'

// ---------------------------------------------------------------------------
// Mapeamento de labels e cores por action
// ---------------------------------------------------------------------------
const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  'task.assigned':             { label: 'Tarefa atribuida',        color: '#4ADE80' },
  'task.updated':              { label: 'Tarefa editada',          color: '#60A5FA' },
  'task.deleted':              { label: 'Tarefa excluida',         color: '#F87171' },
  'task.completed':            { label: 'Tarefa concluida',        color: '#4ADE80' },
  'task.recurring_deleted':    { label: 'Recorrencia excluida',    color: '#F87171' },
  'task.all_deleted':          { label: 'Todas tasks excluidas',   color: '#F87171' },
  'user.created':              { label: 'Usuario criado',          color: '#4ADE80' },
  'user.updated':              { label: 'Usuario editado',         color: '#60A5FA' },
  'user.deleted':              { label: 'Usuario excluido',        color: '#F87171' },
  'user.role_changed':         { label: 'Role alterada',           color: '#FBBF24' },
  'user.signed_in':            { label: 'Login',                   color: '#A78BFA' },
  'user.signed_out':           { label: 'Logout',                  color: '#A78BFA' },
  'department.created':        { label: 'Depto criado',            color: '#4ADE80' },
  'department.updated':        { label: 'Depto editado',           color: '#60A5FA' },
  'department.deleted':        { label: 'Depto excluido',          color: '#F87171' },
  'department.user_assigned':  { label: 'Usuario ao depto',        color: '#60A5FA' },
  'category.created':          { label: 'Categoria criada',        color: '#4ADE80' },
  'category.updated':          { label: 'Categoria editada',       color: '#60A5FA' },
  'category.deleted':          { label: 'Categoria excluida',      color: '#F87171' },
  'integration.connected':     { label: 'Integracao conectada',    color: '#4ADE80' },
  'integration.disconnected':  { label: 'Integracao desconectada', color: '#F87171' },
  'ai.message':                { label: 'Solicitacao ao assistente', color: '#A78BFA' },
  'ai.task_created':           { label: 'IA criou tarefa',         color: '#FBBF24' },
  'ai.task_updated':           { label: 'IA editou tarefa',        color: '#60A5FA' },
  'ai.task_completed':         { label: 'IA concluiu tarefa',      color: '#4ADE80' },
  'ai.task_deleted':           { label: 'IA excluiu tarefa',       color: '#F87171' },
  'ai.user_created':           { label: 'IA criou usuario',        color: '#FBBF24' },
  'ai.user_updated':           { label: 'IA editou usuario',       color: '#60A5FA' },
  'ai.user_deleted':           { label: 'IA excluiu usuario',      color: '#F87171' },
  'ai.department_created':     { label: 'IA criou departamento',   color: '#FBBF24' },
  'ai.category_created':       { label: 'IA criou categoria',      color: '#FBBF24' },
  'ai.report_requested':       { label: 'IA gerou relatorio',      color: '#34D399' },
  'recurrence.created':        { label: 'Recorrencia criada',      color: '#4ADE80' },
  'recurrence.deleted':        { label: 'Recorrencia excluida',    color: '#F87171' },
}

const ACTION_GROUPS = [
  { label: 'Todas', value: 'all' },
  { label: 'Tarefas', value: 'task' },
  { label: 'Usuarios', value: 'user' },
  { label: 'Departamentos', value: 'department' },
  { label: 'Categorias', value: 'category' },
  { label: 'Integracoes', value: 'integration' },
  { label: 'Assistente IA', value: 'ai' },
]

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------
function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function ActionBadge({ action }: { action: string }) {
  const info = ACTION_LABELS[action]
  const color = info?.color ?? '#94A3B8'
  const label = info?.label ?? action
  return (
    <span style={{
      display: 'inline-block',
      fontSize: '11px', fontWeight: 600,
      color,
      background: color + '1A',
      border: `1px solid ${color}33`,
      padding: '2px 8px',
      borderRadius: '999px',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

// Card expandível para linha de log genérica
function LogRow({ log, isLast }: { log: AuditLogEntry; isLast: boolean }) {
  const [open, setOpen] = useState(false)
  const isAiMessage = log.action === 'ai.message'
  const isCompleted = log.action === 'task.completed'
  // description e fullMessage ficam dentro de details (JSONB)
  const description = (log.details?.description as string) ?? log.action
  const fullMessage = log.details?.fullMessage as string | undefined
  const completedTime = log.details?.completedTime as string | undefined
  const completedDate = log.details?.completedDate as string | undefined

  const isExpandable = (isAiMessage && !!fullMessage) || isCompleted
  const bgColor = open
    ? isCompleted ? 'rgba(74,222,128,0.04)' : 'rgba(167,139,250,0.04)'
    : 'transparent'

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid var(--color-border)' }}>
      {/* Linha principal */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '155px 150px 1fr 110px',
          gap: '12px',
          padding: '11px 16px',
          cursor: isExpandable ? 'pointer' : 'default',
          background: bgColor,
          transition: 'background 0.1s',
        }}
        onClick={() => { if (isExpandable) setOpen((v) => !v) }}
      >
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums', paddingTop: '2px' }}>
          {formatDate(log.created_at)}
        </span>
        <div style={{ paddingTop: '2px' }}>
          <ActionBadge action={log.action} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', minWidth: 0 }}>
          {isAiMessage && (
            <MessageSquare size={13} style={{ color: '#A78BFA', marginTop: '2px', flexShrink: 0 }} />
          )}
          {log.action.startsWith('ai.') && log.action !== 'ai.message' && (
            <Zap size={13} style={{ color: '#FBBF24', marginTop: '2px', flexShrink: 0 }} />
          )}
          <span style={{ fontSize: '12px', color: 'var(--color-text-primary)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: open ? 'normal' : 'nowrap' }}>
            {description}
          </span>
          {isExpandable && (
            <span style={{ marginLeft: 'auto', color: isCompleted ? '#4ADE80' : '#A78BFA', flexShrink: 0 }}>
              {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </span>
          )}
        </div>
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', paddingTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {log.profile?.full_name ?? log.user_name ?? (log.user_id?.slice(0, 8) + '...')}
        </span>
      </div>

      {/* Expansao: horario de conclusao para task.completed */}
      {isCompleted && open && (
        <div style={{
          margin: '0 16px 12px 16px',
          padding: '10px 14px',
          background: 'rgba(74,222,128,0.06)',
          border: '1px solid rgba(74,222,128,0.2)',
          borderRadius: '8px',
          fontSize: '12px',
          color: 'var(--color-text-primary)',
          lineHeight: 1.6,
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          flexWrap: 'wrap',
        }}>
          <div>
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#4ADE80', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '2px' }}>Data de conclusao</span>
            <span style={{ fontWeight: 500 }}>{completedDate ?? '—'}</span>
          </div>
          <div>
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#4ADE80', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '2px' }}>Horario</span>
            <span style={{ fontWeight: 600, fontSize: '14px' }}>{completedTime ?? '—'}</span>
          </div>
        </div>
      )}

      {/* Expansao: mensagem completa para ai.message */}
      {isAiMessage && open && fullMessage && (
        <div style={{
          margin: '0 16px 12px 16px',
          padding: '12px 14px',
          background: 'rgba(167,139,250,0.06)',
          border: '1px solid rgba(167,139,250,0.2)',
          borderRadius: '8px',
          fontSize: '12px',
          color: 'var(--color-text-primary)',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#A78BFA', fontSize: '11px', fontWeight: 600 }}>
            <Bot size={12} />
            Mensagem completa enviada ao assistente
          </div>
          {fullMessage}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export function LogsTab() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const PAGE_SIZE = 50

  // Debounce na busca
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  const fetchLogs = useCallback(async (group: string, pageNum: number, searchTerm: string) => {
    setLoading(true)
    const result = await getAuditLogs({
      limit: PAGE_SIZE + 1,
      offset: pageNum * PAGE_SIZE,
      action: group === 'all' ? undefined : group,
      search: searchTerm.trim() || undefined,
    })
    if (result.error) { setLoading(false); return }
    const fetched = result.logs ?? []
    setHasMore(fetched.length > PAGE_SIZE)
    setLogs(fetched.slice(0, PAGE_SIZE))
    setLoading(false)
  }, [])

  useEffect(() => {
    setPage(0)
    fetchLogs(filter, 0, debouncedSearch)
  }, [filter, debouncedSearch, fetchLogs])

  // Contagem por grupo (apenas no que foi carregado)
  const aiCount = logs.filter((l) => l.action === 'ai.message').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
          Registro de Atividades
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
          Todas as acoes e solicitacoes ao assistente sao registradas aqui. Clique em uma linha do tipo "Solicitacao ao assistente" para ver a mensagem completa.
        </p>
      </div>

      {/* Filtros de grupo */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        {ACTION_GROUPS.map((g) => (
          <button
            key={g.value}
            onClick={() => setFilter(g.value)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 12px',
              fontSize: '12px', fontWeight: filter === g.value ? 600 : 400,
              background: filter === g.value ? 'var(--color-primary)' : 'var(--color-surface)',
              color: filter === g.value ? 'var(--color-primary-foreground)' : 'var(--color-text-muted)',
              border: `1px solid ${filter === g.value ? 'var(--color-primary)' : 'var(--color-border)'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {g.value === 'ai' && <Bot size={11} />}
            {g.label}
            {g.value === 'ai' && filter === 'ai' && aiCount > 0 && (
              <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '999px', padding: '0 5px', fontSize: '10px' }}>
                {aiCount}
              </span>
            )}
          </button>
        ))}

        {/* Busca */}
        <div style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px',
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: '8px', padding: '6px 10px', minWidth: '220px',
        }}>
          <Search size={13} color="var(--color-text-muted)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por descricao..."
            style={{
              background: 'none', border: 'none', outline: 'none',
              fontSize: '12px', color: 'var(--color-text-primary)', width: '100%',
            }}
          />
        </div>

        {/* Refresh */}
        <button
          onClick={() => fetchLogs(filter, page, debouncedSearch)}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '6px 12px',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--color-text-muted)',
          }}
        >
          <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Atualizar
        </button>
      </div>

      {/* Dica quando filtro for IA */}
      {filter === 'ai' && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '8px',
          padding: '10px 14px',
          background: 'rgba(167,139,250,0.07)',
          border: '1px solid rgba(167,139,250,0.2)',
          borderRadius: '8px',
          fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.5,
        }}>
          <Bot size={14} style={{ color: '#A78BFA', marginTop: '1px', flexShrink: 0 }} />
          <span>
            Linhas marcadas como <strong style={{ color: '#A78BFA' }}>Solicitacao ao assistente</strong> mostram o que o usuario digitou. Clique nelas para ver a mensagem completa. Linhas com <strong style={{ color: '#FBBF24' }}>raio</strong> sao acoes que o assistente executou automaticamente.
          </span>
        </div>
      )}

      {/* Tabela */}
      <div style={{ border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '155px 150px 1fr 110px',
          gap: '12px', padding: '10px 16px',
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          <span>Data / Hora</span>
          <span>Tipo</span>
          <span>Descricao</span>
          <span>Usuario</span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px', gap: '8px', color: 'var(--color-text-muted)' }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '13px' }}>Carregando...</span>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', color: 'var(--color-text-muted)', fontSize: '13px', gap: '8px' }}>
            <Search size={20} style={{ opacity: 0.4 }} />
            Nenhum registro encontrado.
          </div>
        ) : (
          logs.map((log, i) => (
            <LogRow key={log.id} log={log} isLast={i === logs.length - 1} />
          ))
        )}
      </div>

      {/* Paginacao */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
          {logs.length} registro(s) exibido(s)
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          {page > 0 && (
            <button
              onClick={() => { const p = page - 1; setPage(p); fetchLogs(filter, p, debouncedSearch) }}
              style={{ padding: '5px 12px', fontSize: '12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--color-text-muted)' }}
            >
              Anterior
            </button>
          )}
          {hasMore && (
            <button
              onClick={() => { const p = page + 1; setPage(p); fetchLogs(filter, p, debouncedSearch) }}
              style={{ padding: '5px 12px', fontSize: '12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--color-text-muted)' }}
            >
              Proxima
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
