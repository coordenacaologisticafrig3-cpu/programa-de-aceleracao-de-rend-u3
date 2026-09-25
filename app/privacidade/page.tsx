import Link from 'next/link'
import { CheckSquare, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Politica de Privacidade — Tetra',
  description: 'Saiba como o Tetra coleta, usa e protege seus dados pessoais.',
}

const SECTIONS = [
  {
    title: '1. Introducao',
    content: `Esta Politica de Privacidade descreve como o Tetra coleta, usa, armazena e protege suas informacoes pessoais. Estamos comprometidos com a transparencia e com o cumprimento da Lei Geral de Protecao de Dados (LGPD — Lei 13.709/2018) e demais normas aplicaveis.`,
  },
  {
    title: '2. Dados que Coletamos',
    content: `Coletamos os seguintes tipos de dados: (a) Dados de cadastro: nome completo, endereco de email e senha (armazenada de forma criptografada); (b) Dados de uso: tarefas criadas, datas, categorias, historico de conclusao e interacoes com a plataforma; (c) Dados de integracao: tokens de acesso para Google Calendar e Outlook, que sao armazenados de forma criptografada; (d) Dados tecnicos: endereco IP, tipo de navegador, sistema operacional e logs de acesso.`,
  },
  {
    title: '3. Como Usamos seus Dados',
    content: `Utilizamos seus dados para: (a) Fornecer, manter e melhorar os servicos do Tetra; (b) Autenticar usuarios e garantir a seguranca das contas; (c) Sincronizar tarefas com Google Calendar e Microsoft Outlook quando a integracao for habilitada; (d) Enviar notificacoes relevantes sobre suas tarefas e prazos; (e) Analisar padroes de uso para melhorar a experiencia do usuario; (f) Cumprir obrigacoes legais e regulatorias.`,
  },
  {
    title: '4. Integracao com Google Calendar',
    content: `Ao conectar sua conta Google, o Tetra solicita permissao para criar e gerenciar eventos em seu Google Calendar. Apenas tokens de acesso necessarios para essa funcionalidade sao armazenados. Voce pode revogar esse acesso a qualquer momento nas configuracoes da plataforma ou diretamente nas configuracoes da sua conta Google. O Tetra nao acessa outros dados da sua conta Google alem do calendario.`,
  },
  {
    title: '5. Integracao com Microsoft Outlook',
    content: `Ao conectar sua conta Microsoft, o Tetra solicita permissao para criar e gerenciar eventos em sua agenda do Outlook. Os tokens de acesso sao armazenados de forma segura e criptografada. Voce pode desconectar a qualquer momento nas configuracoes. O Tetra nao acessa emails, contatos ou outros dados da sua conta Microsoft alem da agenda.`,
  },
  {
    title: '6. Compartilhamento de Dados',
    content: `Nao vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins comerciais. Podemos compartilhar dados apenas: (a) Com provedores de servico que nos auxiliam a operar a plataforma (Supabase para banco de dados e autenticacao, Vercel para hospedagem); (b) Quando exigido por lei, ordem judicial ou autoridade regulatoria; (c) Para proteger os direitos, propriedade ou seguranca do Tetra ou de seus usuarios.`,
  },
  {
    title: '7. Seguranca dos Dados',
    content: `Implementamos medidas tecnicas e organizacionais para proteger seus dados, incluindo: (a) Criptografia em transito (TLS/HTTPS); (b) Criptografia em repouso para tokens de autenticacao e dados sensiveis; (c) Controle de acesso baseado em funcoes (RBAC); (d) Row Level Security (RLS) no banco de dados; (e) Monitoramento continuo de acessos. Nenhum sistema e 100% seguro; em caso de incidente, notificaremos os afetados conforme exige a LGPD.`,
  },
  {
    title: '8. Retencao de Dados',
    content: `Seus dados sao retidos enquanto sua conta estiver ativa. Apos o cancelamento da conta, os dados sao mantidos por 30 dias para possibilitar recuperacao, apos o que sao excluidos permanentemente. Dados anonimizados podem ser retidos indefinidamente para fins de analise e melhoria do servico.`,
  },
  {
    title: '9. Seus Direitos (LGPD)',
    content: `Conforme a LGPD, voce tem direito a: (a) Confirmar a existencia de tratamento dos seus dados; (b) Acessar seus dados; (c) Corrigir dados incompletos ou incorretos; (d) Solicitar a anonimizacao, bloqueio ou eliminacao de dados desnecessarios; (e) Solicitar a portabilidade dos seus dados; (f) Revogar o consentimento a qualquer momento; (g) Opor-se a tratamento que viole a legislacao. Para exercer seus direitos, entre em contato pelo email suporte@tetraeducacao.com.br.`,
  },
  {
    title: '10. Cookies e Rastreamento',
    content: `O Tetra utiliza cookies essenciais para autenticacao e funcionamento da plataforma. Nao utilizamos cookies de rastreamento publicitario de terceiros. Os cookies de sessao sao excluidos ao fechar o navegador; os cookies persistentes tem validade maxima de 30 dias.`,
  },
  {
    title: '11. Menores de Idade',
    content: `O Tetra e destinado a usuarios com 18 anos ou mais, ou a empresas e organizacoes que utilizem a plataforma para fins profissionais. Nao coletamos intencionalmente dados de menores de 18 anos. Se tomarmos conhecimento de que dados de menores foram coletados, os excluiremos imediatamente.`,
  },
  {
    title: '12. Alteracoes nesta Politica',
    content: `Podemos atualizar esta Politica de Privacidade periodicamente. Notificaremos sobre mudancas significativas por email ou aviso na plataforma. Recomendamos revisar esta politica regularmente. A data de "ultima atualizacao" indica quando a versao mais recente foi publicada.`,
  },
  {
    title: '13. Contato e DPO',
    content: `Para questoes sobre privacidade, exercicio de direitos ou duvidas sobre esta politica, entre em contato com nosso encarregado de dados (DPO) pelo email privacidade@tetraeducacao.com.br ou pelo endereco da sede da empresa. Respondemos a solicitacoes em ate 15 dias uteis, conforme exige a LGPD.`,
  },
]

export default function PrivacidadePage() {
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
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: '#fff', margin: '0 0 16px', letterSpacing: '-0.5px' }}>Politica de Privacidade</h1>
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
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', margin: '0 0 8px' }}>Duvidas sobre privacidade?</p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
            Fale com nosso DPO: <span style={{ color: '#3B82F6' }}>privacidade@tetraeducacao.com.br</span>
          </p>
        </div>

        <div style={{ marginTop: '32px', display: 'flex', gap: '16px' }}>
          <Link href="/termos" style={{ fontSize: '13px', color: '#3B82F6', textDecoration: 'none' }}>
            Ver Termos de Uso
          </Link>
          <Link href="/" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
            Voltar para o inicio
          </Link>
        </div>
      </main>
    </div>
  )
}
