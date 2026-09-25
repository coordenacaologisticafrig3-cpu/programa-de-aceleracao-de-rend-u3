import Link from 'next/link'
import {
  CheckSquare, CalendarDays, Users, LayoutDashboard,
  Sparkles, RefreshCcw, ArrowRight, Calendar, Mail,
  Shield, Clock, TrendingUp, ChevronRight,
} from 'lucide-react'

export const metadata = {
  title: 'Tetra — Plataforma de Gestao de Tarefas Empresarial',
  description: 'Gerencie tarefas, equipes e metas com integracao ao Google Calendar e Outlook. O sistema completo para times de alta performance.',
}

const FEATURES = [
  {
    icon: CheckSquare,
    title: 'Gestao de Tarefas',
    description: 'Crie, atribua e acompanhe tarefas individuais e de equipe com prazos, prioridades e categorias.',
  },
  {
    icon: Users,
    title: 'Gestao de Equipes',
    description: 'Organize departamentos, atribua papeis e monitore o desempenho de cada membro da equipe.',
  },
  {
    icon: LayoutDashboard,
    title: 'Dashboard Analitico',
    description: 'Visualize metricas de execucao, taxa de conclusao e desempenho com cards personalizaveis.',
  },
  {
    icon: RefreshCcw,
    title: 'Tarefas Recorrentes',
    description: 'Automatize tarefas que se repetem diariamente, semanalmente ou mensalmente.',
  },
  {
    icon: Sparkles,
    title: 'Assistente IA',
    description: 'Crie e gerencie tarefas atraves de linguagem natural com nosso assistente inteligente.',
  },
  {
    icon: CalendarDays,
    title: 'Integracao com Agendas',
    description: 'Sincronize tarefas automaticamente com Google Calendar e Microsoft Outlook.',
  },
]

const INTEGRATIONS = [
  {
    name: 'Google Calendar',
    description: 'Toda tarefa criada aparece automaticamente no seu Google Calendar, com data, hora e descricao.',
    color: '#4285F4',
    icon: Calendar,
    badge: 'Disponivel',
  },
  {
    name: 'Microsoft Outlook',
    description: 'Sincronize com sua agenda do Outlook e tenha visibilidade total dos seus compromissos e tarefas.',
    color: '#0078D4',
    icon: Mail,
    badge: 'Disponivel',
  },
]

const STATS = [
  { value: '99%', label: 'de uptime garantido' },
  { value: '3x', label: 'mais rapido que email' },
  { value: '100%', label: 'seguro e criptografado' },
  { value: '24h', label: 'de suporte dedicado' },
]

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e8e8ee', fontFamily: 'var(--font-sans, system-ui)', overflowX: 'hidden' }}>

      {/* Nav */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', background: 'rgba(10,10,15,0.85)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '30px', height: '30px', background: '#3B82F6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckSquare size={16} color="#fff" />
            </div>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Tetra</span>
          </div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link href="/termos" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', textDecoration: 'none', padding: '6px 12px' }}>Termos</Link>
            <Link href="/privacidade" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', textDecoration: 'none', padding: '6px 12px' }}>Privacidade</Link>
            <Link href="/login" style={{ fontSize: '13px', fontWeight: 600, color: '#fff', textDecoration: 'none', padding: '7px 18px', background: '#3B82F6', borderRadius: '8px' }}>Entrar</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '100px 24px 80px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '999px', marginBottom: '32px' }}>
          <div style={{ width: '6px', height: '6px', background: '#3B82F6', borderRadius: '50%' }} />
          <span style={{ fontSize: '12px', color: '#93C5FD', fontWeight: 500 }}>Integracao com Google Calendar e Outlook disponivel</span>
        </div>
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 68px)', fontWeight: 800, lineHeight: 1.1, color: '#fff', margin: '0 0 24px', letterSpacing: '-1.5px' }}>
          Gestao de tarefas para<br />
          <span style={{ color: '#3B82F6' }}>times de alta performance</span>
        </h1>
        <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'rgba(255,255,255,0.55)', maxWidth: '600px', margin: '0 auto 40px', lineHeight: 1.6 }}>
          Centralize tarefas, acompanhe metas, gerencie equipes e sincronize com sua agenda. Tudo em um unico lugar.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 28px', background: '#3B82F6', color: '#fff', borderRadius: '10px', fontSize: '15px', fontWeight: 600, textDecoration: 'none' }}>
            Comecar agora
            <ArrowRight size={16} />
          </Link>
          <Link href="#features" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 28px', background: 'rgba(255,255,255,0.07)', color: '#fff', borderRadius: '10px', fontSize: '15px', fontWeight: 500, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.12)' }}>
            Conhecer funcionalidades
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '32px' }}>
          {STATS.map((s) => (
            <div key={s.value} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '36px', fontWeight: 800, color: '#fff', margin: '0 0 4px', letterSpacing: '-1px' }}>{s.value}</p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ maxWidth: '1100px', margin: '0 auto', padding: '96px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#3B82F6', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 12px' }}>Funcionalidades</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: '#fff', margin: '0 0 16px', letterSpacing: '-0.5px', lineHeight: 1.15 }}>
            Tudo que sua equipe precisa
          </h2>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.45)', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
            Uma plataforma completa para organizar, delegar e acompanhar o trabalho do seu time.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.title} style={{ padding: '28px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', transition: 'border-color 0.2s' }}>
                <div style={{ width: '44px', height: '44px', background: 'rgba(59,130,246,0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <Icon size={20} color="#3B82F6" />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: '0 0 8px' }}>{f.title}</h3>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.6 }}>{f.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Integrations */}
      <section style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '96px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#3B82F6', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 12px' }}>Integracoes</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: '#fff', margin: '0 0 16px', letterSpacing: '-0.5px', lineHeight: 1.15 }}>
              Conectado com suas agendas
            </h2>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.45)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>
              Cada tarefa criada no Tetra e sincronizada automaticamente com a agenda do usuario.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {INTEGRATIONS.map((integ) => {
              const Icon = integ.icon
              return (
                <div key={integ.name} style={{ padding: '36px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ width: '52px', height: '52px', background: `${integ.color}22`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={24} color={integ.color} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#4ADE80', background: 'rgba(74,222,128,0.12)', padding: '4px 10px', borderRadius: '999px', border: '1px solid rgba(74,222,128,0.25)' }}>{integ.badge}</span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>{integ.name}</h3>
                    <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.6 }}>{integ.description}</p>
                  </div>
                  <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500, color: integ.color, textDecoration: 'none', marginTop: 'auto' }}>
                    Conectar agora
                    <ChevronRight size={14} />
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Security */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '96px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {[
            { icon: Shield, title: 'Seguranca de dados', desc: 'Todos os dados sao criptografados em transito e em repouso. Autenticacao segura via Supabase Auth.' },
            { icon: Clock, title: 'Historico completo', desc: 'Cada acao e registrada. Acompanhe o historico de tarefas, atribuicoes e alteracoes com rastreabilidade total.' },
            { icon: TrendingUp, title: 'Relatorios avancados', desc: 'Metricas de desempenho individual e por equipe com dashboards personalizaveis e filtros por periodo.' },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div key={item.title} style={{ padding: '28px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px' }}>
                <div style={{ width: '40px', height: '40px', background: 'rgba(59,130,246,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                  <Icon size={18} color="#3B82F6" />
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: '0 0 8px' }}>{item.title}</h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'rgba(59,130,246,0.08)', borderTop: '1px solid rgba(59,130,246,0.15)', borderBottom: '1px solid rgba(59,130,246,0.15)' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '96px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: '#fff', margin: '0 0 16px', letterSpacing: '-0.5px' }}>
            Pronto para comecar?
          </h2>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.45)', margin: '0 0 40px', lineHeight: 1.6 }}>
            Acesse a plataforma e transforme a forma como sua equipe trabalha.
          </p>
          <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 32px', background: '#3B82F6', color: '#fff', borderRadius: '10px', fontSize: '15px', fontWeight: 600, textDecoration: 'none' }}>
            Acessar o Tetra
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '24px', height: '24px', background: '#3B82F6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckSquare size={12} color="#fff" />
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Tetra</span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginLeft: '8px' }}>© {new Date().getFullYear()}</span>
          </div>
          <div style={{ display: 'flex', gap: '24px' }}>
            <Link href="/termos" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>Termos de Uso</Link>
            <Link href="/privacidade" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>Politica de Privacidade</Link>
            <Link href="/login" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>Entrar</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
