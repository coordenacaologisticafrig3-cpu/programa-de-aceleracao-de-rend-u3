import Link from 'next/link'
import { CheckSquare, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Termos de Uso — Tetra',
  description: 'Leia os termos de uso da plataforma Tetra.',
}

const SECTIONS = [
  {
    title: '1. Aceitacao dos Termos',
    content: `Ao acessar ou usar a plataforma Tetra, voce concorda em estar vinculado a estes Termos de Uso. Se voce nao concordar com qualquer parte destes termos, nao devera usar nossa plataforma. O uso continuado apos alteracoes nos termos constitui aceitacao das novas condicoes.`,
  },
  {
    title: '2. Descricao do Servico',
    content: `O Tetra e uma plataforma de gestao de tarefas e produtividade empresarial que permite criar, atribuir e acompanhar tarefas, gerenciar equipes e integrar com servicos de agenda como Google Calendar e Microsoft Outlook. Os servicos sao fornecidos "como estao" e podem ser alterados a qualquer momento.`,
  },
  {
    title: '3. Contas e Acesso',
    content: `Voce e responsavel por manter a confidencialidade de suas credenciais de acesso. Voce concorda em notificar imediatamente qualquer uso nao autorizado de sua conta. O Tetra nao e responsavel por perdas decorrentes do uso nao autorizado de sua conta. Cada usuario deve ter credenciais unicas — o compartilhamento de contas e proibido.`,
  },
  {
    title: '4. Uso Aceitavel',
    content: `Voce concorda em nao usar o Tetra para: (a) violar quaisquer leis aplicaveis; (b) transmitir conteudo ilegal, prejudicial ou ofensivo; (c) tentar obter acesso nao autorizado a sistemas; (d) interferir com a operacao da plataforma; (e) coletar dados de outros usuarios sem consentimento. O descumprimento pode resultar no encerramento imediato da conta.`,
  },
  {
    title: '5. Integracao com Servicos de Terceiros',
    content: `O Tetra oferece integracao com Google Calendar e Microsoft Outlook. Ao conectar esses servicos, voce autoriza o Tetra a acessar e criar eventos em sua agenda em seu nome. O uso desses servicos esta sujeito aos termos de uso do Google e da Microsoft, respectivamente. O Tetra nao e responsavel por falhas nesses servicos de terceiros.`,
  },
  {
    title: '6. Propriedade Intelectual',
    content: `Todo o conteudo da plataforma Tetra, incluindo software, design, textos e logotipos, e propriedade exclusiva do Tetra ou seus licenciadores. E vedada a reproducao, modificacao ou distribuicao de qualquer conteudo sem permissao previa por escrito. Os dados inseridos pelos usuarios permanecem de propriedade dos respectivos usuarios.`,
  },
  {
    title: '7. Privacidade e Protecao de Dados',
    content: `O tratamento de dados pessoais e regido por nossa Politica de Privacidade, que e parte integrante destes Termos. Ao usar o Tetra, voce consente com a coleta e uso de informacoes conforme descrito na Politica de Privacidade. Seguimos as diretrizes da LGPD (Lei Geral de Protecao de Dados Pessoais — Lei 13.709/2018).`,
  },
  {
    title: '8. Limitacao de Responsabilidade',
    content: `O Tetra nao sera responsavel por quaisquer danos indiretos, incidentais ou consequentes resultantes do uso ou incapacidade de usar a plataforma. Nossa responsabilidade maxima e limitada ao valor pago pelo usuario nos ultimos 3 meses de servico. Algumas jurisdicoes nao permitem limitacoes de responsabilidade; nesse caso, as limitacoes se aplicam na extensao permitida por lei.`,
  },
  {
    title: '9. Disponibilidade do Servico',
    content: `Embora nos esforcemos para manter o Tetra disponivel continuamente, nao garantimos disponibilidade ininterrupta. Manutencoes programadas serao comunicadas com antecedencia. Nao somos responsaveis por interrupcoes causadas por fatores fora do nosso controle.`,
  },
  {
    title: '10. Alteracoes nos Termos',
    content: `Reservamo-nos o direito de modificar estes Termos a qualquer momento. Notificaremos os usuarios sobre mudancas significativas por email ou por aviso na plataforma. O uso continuado apos a notificacao constitui aceitacao das mudancas. Recomendamos revisar periodicamente estes Termos.`,
  },
  {
    title: '11. Rescisao',
    content: `Podemos encerrar ou suspender seu acesso ao Tetra a nosso criterio, sem aviso previo, em caso de violacao destes Termos. Voce pode cancelar sua conta a qualquer momento atraves das configuracoes da plataforma. Apos o cancelamento, seus dados serao retidos por 30 dias antes da exclusao permanente.`,
  },
  {
    title: '12. Lei Aplicavel',
    content: `Estes Termos sao regidos pelas leis da Republica Federativa do Brasil. Qualquer disputa sera submetida ao foro da comarca de Sao Paulo, SP, renunciando as partes a qualquer outro, por mais privilegiado que seja.`,
  },
]

export default function TermosPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e8e8ee', fontFamily: 'var(--font-sans, system-ui)' }}>
      {/* Nav */}
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{ width: '28px', height: '28px', background: '#3B82F6', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckSquare size={14} color="#fff" />
            </div>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Tetra</span>
          </Link>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>
            <ArrowLeft size={14} />
            Voltar
          </Link>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '64px 24px 96px' }}>
        <div style={{ marginBottom: '48px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#3B82F6', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 12px' }}>Legal</p>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: '#fff', margin: '0 0 16px', letterSpacing: '-0.5px' }}>Termos de Uso</h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            Ultima atualizacao: {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: '0 0 12px' }}>{section.title}</h2>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.8 }}>{section.content}</p>
            </section>
          ))}
        </div>

        <div style={{ marginTop: '64px', padding: '24px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '12px' }}>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', margin: '0 0 8px' }}>Tem duvidas sobre nossos termos?</p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
            Entre em contato pelo email <span style={{ color: '#3B82F6' }}>suporte@tetraeducacao.com.br</span>
          </p>
        </div>

        <div style={{ marginTop: '32px', display: 'flex', gap: '16px' }}>
          <Link href="/privacidade" style={{ fontSize: '13px', color: '#3B82F6', textDecoration: 'none' }}>
            Ver Politica de Privacidade
          </Link>
          <Link href="/" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
            Voltar para o inicio
          </Link>
        </div>
      </main>
    </div>
  )
}
