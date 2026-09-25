'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Calendar, Mail, CheckCircle2, AlertCircle, ExternalLink, Link2Off, Loader2, Shield, Bell, User, ClipboardList } from 'lucide-react'
import type { AppRole } from '@/lib/types'
import { disconnectCalendar } from '@/app/actions/calendar-integrations'
import { toast } from 'sonner'
import { LogsTab } from '@/components/configuracoes/logs-tab'

interface CalendarIntegration {
  provider: string
  is_active: boolean
  connected_at: string
  calendar_id: string | null
}

interface ConfiguracoesViewProps {
  userId: string
  userEmail: string
  role: AppRole
  googleIntegration: CalendarIntegration | null
  outlookIntegration: CalendarIntegration | null
}

type Tab = 'integracoes' | 'conta' | 'notificacoes' | 'logs'

const isManagerOrOwner = (role: AppRole) => ['owner', 'admin', 'gestor'].includes(role)

export function ConfiguracoesView({ userId, userEmail, role, googleIntegration: initialGoogle, outlookIntegration: initialOutlook }: ConfiguracoesViewProps) {
  const [tab, setTab] = useState<Tab>('integracoes')
  const [googleIntegration, setGoogleIntegration] = useState(initialGoogle)
  const [outlookIntegration, setOutlookIntegration] = useState(initialOutlook)
  const [disconnecting, setDisconnecting] = useState<'google' | 'outlook' | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    const detail = searchParams.get('detail')

    if (success === 'google') {
      toast.success('Google Calendar conectado com sucesso!')
      // Recarrega dados de integracao apos conectar
      window.history.replaceState({}, '', '/configuracoes')
      window.location.reload()
    } else if (success === 'outlook') {
      toast.success('Microsoft Outlook conectado com sucesso!')
      window.history.replaceState({}, '', '/configuracoes')
      window.location.reload()
    } else if (error === 'outlook_denied') {
      toast.error('Conexao com Microsoft Outlook cancelada.')
      window.history.replaceState({}, '', '/configuracoes')
    } else if (error === 'outlook_token') {
      toast.error(detail ? `Erro Outlook: ${detail}` : 'Erro ao obter token do Outlook. Verifique as credenciais no Azure Portal.')
      window.history.replaceState({}, '', '/configuracoes')
    } else if (error === 'outlook_db') {
      toast.error('Erro ao salvar integracao do Outlook no banco de dados.')
      window.history.replaceState({}, '', '/configuracoes')
    } else if (error === 'google_denied') {
      toast.error('Conexao com Google Calendar cancelada.')
      window.history.replaceState({}, '', '/configuracoes')
    } else if (error === 'google_token') {
      toast.error(detail ? `Erro Google: ${detail}` : 'Erro ao obter token do Google. Verifique o redirect URI no Google Cloud Console.')
      window.history.replaceState({}, '', '/configuracoes')
    } else if (error === 'google_db') {
      toast.error('Erro ao salvar integracao no banco de dados.')
      window.history.replaceState({}, '', '/configuracoes')
    } else if (error) {
      toast.error('Erro ao conectar agenda. Tente novamente.')
      window.history.replaceState({}, '', '/configuracoes')
    }
  }, [searchParams])

  async function handleDisconnect(provider: 'google' | 'outlook') {
    setDisconnecting(provider)
    const res = await disconnectCalendar(provider)
    if (res.error) {
      toast.error(res.error)
    } else {
      if (provider === 'google') setGoogleIntegration(null)
      else setOutlookIntegration(null)
      toast.success(`${provider === 'google' ? 'Google Calendar' : 'Outlook'} desconectado.`)
    }
    setDisconnecting(null)
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'integracoes', label: 'Integracoes', icon: Link2Off },
    { id: 'conta', label: 'Conta', icon: User },
    { id: 'notificacoes', label: 'Notificacoes', icon: Bell },
    ...(isManagerOrOwner(role) ? [{ id: 'logs' as Tab, label: 'Logs do Sistema', icon: ClipboardList }] : []),
  ]

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--color-background)' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '32px 24px 64px' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>Configuracoes</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>Gerencie sua conta, integracoes e preferencias</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--color-border)', marginBottom: '32px' }}>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '10px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: tab === id ? '2px solid var(--color-accent-blue)' : '2px solid transparent',
                color: tab === id ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                fontSize: '13px', fontWeight: tab === id ? 600 : 400,
                cursor: 'pointer',
                marginBottom: '-1px',
                transition: 'color 0.15s',
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Integracoes Tab */}
        {tab === 'integracoes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ marginBottom: '4px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>Integracoes de Agenda</h2>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
                Conecte sua agenda para sincronizar automaticamente as tarefas criadas no Tetra.
              </p>
            </div>

            {/* Google Calendar */}
            <CalendarCard
              name="Google Calendar"
              description="Sincronize tarefas com sua conta do Google. Cada tarefa criada aparece automaticamente no seu calendario."
              icon={Calendar}
              color="#4285F4"
              integration={googleIntegration}
              provider="google"
              connectHref="/api/auth/google-calendar"
              onDisconnect={() => handleDisconnect('google')}
              disconnecting={disconnecting === 'google'}
            />

            {/* Outlook */}
            <CalendarCard
              name="Microsoft Outlook"
              description="Integre com sua agenda do Outlook e tenha visibilidade total de compromissos e tarefas em um so lugar."
              icon={Mail}
              color="#0078D4"
              integration={outlookIntegration}
              provider="outlook"
              connectHref="/api/auth/outlook-calendar"
              onDisconnect={() => handleDisconnect('outlook')}
              disconnecting={disconnecting === 'outlook'}
            />

            {/* Info */}
            <div style={{ padding: '16px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '10px', display: 'flex', gap: '12px' }}>
              <Shield size={16} color="var(--color-accent-blue)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>Seus dados estao seguros</p>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.6 }}>
                  O Tetra armazena apenas os tokens necessarios para criar eventos em sua agenda. Nenhum email, contato ou outro dado e acessado. Voce pode revogar o acesso a qualquer momento.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Conta Tab */}
        {tab === 'conta' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ padding: '24px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 16px' }}>Informacoes da conta</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <InfoRow label="Email" value={userEmail} />
                <InfoRow label="Funcao" value={{ owner: 'Owner', admin: 'Admin', gestor: 'Gestor', funcionario: 'Funcionario' }[role]} />
                <InfoRow label="ID do usuario" value={userId} mono />
              </div>
            </div>
            <div style={{ padding: '16px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '10px' }}>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#EF4444', margin: '0 0 4px' }}>Zona de perigo</p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 12px' }}>Para excluir sua conta ou alterar dados sensiveis, entre em contato com o administrador.</p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>Email: <span style={{ color: 'var(--color-accent-blue)' }}>suporte@tetraeducacao.com.br</span></p>
            </div>
          </div>
        )}

        {/* Notificacoes Tab */}
        {tab === 'notificacoes' && (
          <div style={{ padding: '24px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-text-muted)' }}>
              <Bell size={20} />
              <div>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>Configuracoes de notificacao</p>
                <p style={{ fontSize: '13px', margin: 0 }}>Em breve — notificacoes via email e push para prazos e tarefas atribuidas.</p>
              </div>
            </div>
          </div>
        )}

        {/* Logs Tab — apenas owner/admin/gestor */}
        {tab === 'logs' && isManagerOrOwner(role) && (
          <LogsTab />
        )}
      </div>
    </div>
  )
}

function CalendarCard({
  name, description, icon: Icon, color, integration, provider, connectHref, onDisconnect, disconnecting,
}: {
  name: string
  description: string
  icon: React.ElementType
  color: string
  integration: CalendarIntegration | null
  provider: string
  connectHref: string
  onDisconnect: () => void
  disconnecting: boolean
}) {
  const connected = !!integration?.is_active

  return (
    <div style={{ padding: '24px', background: 'var(--color-surface)', border: `1px solid ${connected ? color + '33' : 'var(--color-border)'}`, borderRadius: '12px', transition: 'border-color 0.2s' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={22} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>{name}</h3>
            {connected ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#4ADE80', background: 'rgba(74,222,128,0.12)', padding: '2px 8px', borderRadius: '999px', border: '1px solid rgba(74,222,128,0.25)' }}>
                <CheckCircle2 size={10} />
                Conectado
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 500, color: 'var(--color-text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '999px', border: '1px solid var(--color-border)' }}>
                <AlertCircle size={10} />
                Nao conectado
              </span>
            )}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '0 0 16px', lineHeight: 1.5 }}>{description}</p>

          {connected && integration?.connected_at && (
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 16px' }}>
              Conectado em {new Date(integration.connected_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          )}

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {connected ? (
              <button
                onClick={onDisconnect}
                disabled={disconnecting}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: '8px',
                  color: '#EF4444',
                  fontSize: '13px', fontWeight: 500,
                  cursor: disconnecting ? 'not-allowed' : 'pointer',
                  opacity: disconnecting ? 0.6 : 1,
                }}
              >
                {disconnecting ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Link2Off size={13} />}
                Desconectar
              </button>
            ) : (
              <a
                href={connectHref}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px',
                  background: color,
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px', fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <ExternalLink size={13} />
                Conectar {name}
              </a>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '10px 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
      <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ fontSize: '13px', color: 'var(--color-text-primary)', fontFamily: mono ? 'monospace' : undefined, wordBreak: 'break-all', textAlign: 'right' }}>{value}</span>
    </div>
  )
}
