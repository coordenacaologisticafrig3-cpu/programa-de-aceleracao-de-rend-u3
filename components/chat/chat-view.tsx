'use client'

import { useRef, useEffect, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Send, Loader2, Sparkles, BarChart2, Users, ListTodo, RefreshCw, Search, PlusSquare, Bot } from 'lucide-react'
import { ChatMessage } from './chat-message'
import type { AppRole } from '@/lib/types'
import { toast } from 'sonner'

const SUGGESTIONS = [
  { icon: BarChart2, label: 'Relatório da semana', prompt: 'Gere um relatório de desempenho da equipe para esta semana.' },
  { icon: Search, label: 'Tarefas urgentes', prompt: 'Mostre todas as tarefas com prioridade urgente em aberto.' },
  { icon: ListTodo, label: 'Pendentes atrasadas', prompt: 'Quais tarefas estão atrasadas e ainda não foram concluídas?' },
  { icon: PlusSquare, label: 'Criar tarefas em lote', prompt: 'Quero criar uma lista de tarefas para um ou mais usuários.' },
  { icon: Users, label: 'Listar equipe', prompt: 'Liste todos os membros da equipe com seus departamentos.' },
  { icon: RefreshCw, label: 'Tarefa recorrente', prompt: 'Quero criar uma tarefa recorrente semanal para minha equipe.' },
]

interface ChatViewProps {
  userName: string
  role: AppRole
}

interface ChatUserOption {
  id: string
  name: string
  role?: string | null
  departmentId?: string | null
}

export function ChatView({ userName, role }: ChatViewProps) {
  const taskIntentRegex = /\b(adicionar|adiciona|criar|cadastrar|atribuir)\b.*\b(task|tarefa|tarefas)\b|\b(task|tarefa|tarefas)\b.*\b(adicionar|adiciona|criar|cadastrar|atribuir)\b/i
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [input, setInput] = useState('')
  const [showBatchBuilder, setShowBatchBuilder] = useState(false)
  const [taskLines, setTaskLines] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRecurrence, setSelectedRecurrence] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  const [users, setUsers] = useState<ChatUserOption[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingUsersError, setLoadingUsersError] = useState<string | null>(null)
  const [userSearch, setUserSearch] = useState('')

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Falha ao responder no chat.'
      toast.error(message)
    },
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function loadUsers() {
    setLoadingUsers(true)
    setLoadingUsersError(null)
    fetch('/api/chat/users')
      .then((res) => res.json())
      .then((payload) => {
        if (payload?.error) {
          const message = String(payload.error)
          setLoadingUsersError(message)
          toast.error(message)
          return
        }
        const list = Array.isArray(payload?.users) ? payload.users : []
        setUsers(list)
        if (list.length === 0) {
          setLoadingUsersError('Nenhum usuário encontrado.')
        }
      })
      .catch(() => {
        const message = 'Não foi possível carregar os usuários.'
        setLoadingUsersError(message)
        toast.error(message)
      })
      .finally(() => setLoadingUsers(false))
  }

  useEffect(() => {
    if (!showBatchBuilder || users.length > 0) return
    loadUsers()
  }, [showBatchBuilder, users.length])

  function autoResizeTextarea() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    if (taskIntentRegex.test(text)) {
      const extractedLines = text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => /^[-*•]/.test(line) || /^\d+[.)]/.test(line))
        .map((line) => line.replace(/^[-*•\d.)\s]+/, '').trim())
        .filter(Boolean)
      if (extractedLines.length > 0) {
        setTaskLines(extractedLines.join('\n'))
      }
      setCurrentStep(1)
      setShowBatchBuilder(true)
    }
    sendMessage({ text })
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handleSuggestion(prompt: string) {
    if (isLoading) return
    sendMessage({ text: prompt })
  }

  function handleSubmitBatchBuilder() {
    const lines = taskLines
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    if (!lines.length) {
      toast.error('Cole ao menos uma tarefa (uma por linha).')
      return
    }
    if (!selectedUserId) {
      toast.error('Selecione o usuário de destino.')
      return
    }
    const selectedUser = users.find((u) => u.id === selectedUserId)
    const recurrencePt =
      selectedRecurrence === 'daily'
        ? 'diariamente'
        : selectedRecurrence === 'weekly'
          ? 'semanalmente'
          : 'mensalmente'
    const prompt = [
      `Crie as tarefas abaixo para o usuário "${selectedUser?.name || selectedUserId}" (id: ${selectedUserId}), de forma recorrente ${recurrencePt}.`,
      'Considere cada linha como uma tarefa independente.',
      'Use a tool adequada para criar todas as tarefas em lote e me devolva um resumo final de sucesso/falha por item.',
      '',
      ...lines.map((line) => `- ${line}`),
    ].join('\n')

    sendMessage({ text: prompt })
    setShowBatchBuilder(false)
    setTaskLines('')
    setSelectedUserId('')
    setSelectedRecurrence('daily')
    setUserSearch('')
    setCurrentStep(1)
  }

  const isEmpty = messages.length === 0
  const filteredUsers = users.filter((u) => u.name.toLowerCase().includes(userSearch.toLowerCase()))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-background)', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '12px 16px',
        borderBottom: '1px solid var(--color-border-subtle)',
        flexShrink: 0,
      }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: 'var(--radius-md)',
          background: 'rgba(0,255,133,0.12)', border: '1px solid rgba(0,255,133,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Sparkles size={16} color="var(--color-primary)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Assistente Tetra</p>
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)' }}>
            {isLoading ? 'Processando...' : 'Pronto para ajudar'}
          </p>
        </div>
        {isLoading && (
          <Loader2 size={14} color="var(--color-primary)" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
        )}
      </div>

      {/* Messages area */}
      <div
        style={{
          flex: 1, overflowY: 'auto',
          padding: '16px',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {isEmpty ? (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            flex: 1, gap: '24px',
            minHeight: 0,
            padding: '16px 0',
          }}>
            {/* Welcome */}
            <div style={{ textAlign: 'center', padding: '0 16px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: 'var(--radius-xl)',
                background: 'rgba(0,255,133,0.1)', border: '1px solid rgba(0,255,133,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <Sparkles size={24} color="var(--color-primary)" />
              </div>
              <h2 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Olá, {userName.split(' ')[0]}
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.5', maxWidth: '340px' }}>
                Gero relatórios, crio tarefas em lote, configuro recorrências e consulto dados da sua equipe.
              </p>
            </div>

            {/* Suggestions */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
              width: '100%',
              maxWidth: '520px',
            }}>
              {SUGGESTIONS.map((s) => {
                const Icon = s.icon
                return (
                  <button
                    key={s.label}
                    onClick={() => handleSuggestion(s.prompt)}
                    disabled={isLoading}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '10px 12px',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'border-color 0.15s, background 0.15s',
                      minWidth: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(0,255,133,0.35)'
                      e.currentTarget.style.background = 'var(--color-surface-elevated)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-border)'
                      e.currentTarget.style.background = 'var(--color-surface)'
                    }}
                  >
                    <div style={{
                      width: '28px', height: '28px', borderRadius: 'var(--radius-sm)',
                      background: 'rgba(0,255,133,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon size={14} color="var(--color-primary)" />
                    </div>
                    <span style={{
                      fontSize: '12px', color: 'var(--color-text-secondary)',
                      fontWeight: 500, lineHeight: '1.3',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical' as any,
                    }}>
                      {s.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 0' }}>
                <div style={{
                  width: '26px', height: '26px', borderRadius: 'var(--radius-full)',
                  background: 'rgba(0,255,133,0.12)', border: '1px solid rgba(0,255,133,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Bot size={13} color="var(--color-primary)" />
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '8px 12px',
                  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)', marginTop: '2px',
                }}>
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <span key={i} style={{
                      width: '5px', height: '5px', borderRadius: '50%',
                      background: 'var(--color-text-muted)',
                      animation: `bounce 1.2s infinite ${delay}s`,
                    }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{
        padding: '12px 16px 16px',
        borderTop: '1px solid var(--color-border-subtle)',
        flexShrink: 0,
      }}>
        {showBatchBuilder && (
          <div
            style={{
              margin: '0 0 10px',
              padding: '12px',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              background: 'var(--color-surface)',
              display: 'grid',
              gap: '10px',
            }}
          >
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              Montar solicitação em passos ({currentStep}/3)
            </p>
            {currentStep === 1 && (
              <textarea
                value={taskLines}
                onChange={(e) => setTaskLines(e.target.value)}
                placeholder={'1) Cole as tarefas (uma por linha)\n- Disparos do dia\n- Treinamento as 8h\n- ...'}
                rows={5}
                style={{
                  width: '100%',
                  background: 'var(--color-input-bg)',
                  border: '1px solid var(--color-input-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  padding: '8px 10px',
                  fontSize: '12px',
                  resize: 'vertical',
                }}
              />
            )}
            {currentStep === 2 && (
              <div style={{ display: 'grid', gap: '8px' }}>
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Buscar usuário por nome..."
                  style={{
                    background: 'var(--color-input-bg)',
                    border: '1px solid var(--color-input-border)',
                    borderRadius: '8px',
                    color: 'var(--color-input-text)',
                    fontSize: '12px',
                    padding: '8px 10px',
                  }}
                />
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  disabled={loadingUsers}
                  style={{
                    background: 'var(--color-input-bg)',
                    border: '1px solid var(--color-input-border)',
                    borderRadius: '8px',
                    color: 'var(--color-input-text)',
                    fontSize: '12px',
                    padding: '8px 10px',
                    minHeight: '38px',
                  }}
                >
                  <option value="">{loadingUsers ? 'Carregando usuários...' : '2) Selecione o usuário'}</option>
                  {filteredUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    {filteredUsers.length} usuário(s) exibido(s)
                  </span>
                  <button
                    type="button"
                    onClick={loadUsers}
                    disabled={loadingUsers}
                    style={{
                      border: '1px solid var(--color-border)',
                      background: 'transparent',
                      color: 'var(--color-text-secondary)',
                      borderRadius: '8px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      opacity: loadingUsers ? 0.6 : 1,
                    }}
                  >
                    Recarregar lista
                  </button>
                </div>
                {loadingUsersError && (
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-error)' }}>
                    {loadingUsersError}
                  </p>
                )}
              </div>
            )}
            {currentStep === 3 && (
              <select
                value={selectedRecurrence}
                onChange={(e) => setSelectedRecurrence(e.target.value as 'daily' | 'weekly' | 'monthly')}
                style={{
                  background: 'var(--color-input-bg)',
                  border: '1px solid var(--color-input-border)',
                  borderRadius: '8px',
                  color: 'var(--color-input-text)',
                  fontSize: '12px',
                  padding: '8px 10px',
                }}
              >
                <option value="daily">3) Diariamente</option>
                <option value="weekly">3) Semanalmente</option>
                <option value="monthly">3) Mensalmente</option>
              </select>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowBatchBuilder(false)
                  setCurrentStep(1)
                }}
                style={{
                  border: '1px solid var(--color-border)',
                  background: 'transparent',
                  color: 'var(--color-text-secondary)',
                  borderRadius: '8px',
                  padding: '7px 10px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3)}
                    style={{
                      border: '1px solid var(--color-border)',
                      background: 'transparent',
                      color: 'var(--color-text-secondary)',
                      borderRadius: '8px',
                      padding: '7px 10px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Voltar
                  </button>
                )}
                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (currentStep === 1 && !taskLines.trim()) {
                        toast.error('Cole ao menos uma tarefa para continuar.')
                        return
                      }
                      if (currentStep === 2 && !selectedUserId) {
                        toast.error('Selecione o usuário para continuar.')
                        return
                      }
                      setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3)
                    }}
                    style={{
                      border: 'none',
                      background: 'var(--color-primary)',
                      color: '#111111',
                      borderRadius: '8px',
                      padding: '7px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Próximo
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmitBatchBuilder}
                    disabled={isLoading}
                    style={{
                      border: 'none',
                      background: 'var(--color-primary)',
                      color: '#111111',
                      borderRadius: '8px',
                      padding: '7px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      opacity: isLoading ? 0.6 : 1,
                    }}
                  >
                    Enviar para assistente criar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex', alignItems: 'flex-end', gap: '8px',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', padding: '8px 10px',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(0,255,133,0.4)'}
          onBlur={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); autoResizeTextarea() }}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte, crie tarefas ou solicite relatórios..."
            rows={1}
            disabled={isLoading}
            style={{
              flex: 1, resize: 'none',
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--color-text-primary)',
              fontSize: '13px', lineHeight: '1.5',
              fontFamily: 'inherit',
              overflowY: 'hidden', maxHeight: '140px', minHeight: '20px',
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            aria-label="Enviar mensagem"
            style={{
              width: '30px', height: '30px',
              borderRadius: 'var(--radius-sm)',
              background: !input.trim() || isLoading ? 'var(--color-surface-elevated)' : 'var(--color-primary)',
              border: 'none',
              cursor: !input.trim() || isLoading ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.15s',
            }}
          >
            <Send size={13} color={!input.trim() || isLoading ? 'var(--color-text-muted)' : '#111111'} />
          </button>
        </form>
        <p style={{ margin: '6px 0 0', fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
          Enter para enviar · Shift+Enter para nova linha
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
        @media (max-width: 480px) {
          .chat-suggestions-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
