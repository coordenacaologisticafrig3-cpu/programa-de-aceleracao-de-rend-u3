'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sun, Moon, CalendarDays, RefreshCcw, Tag, LayoutDashboard, Users, ClipboardList,
  Building2, LogOut, CheckSquare, ChevronLeft, Camera, X, Sparkles, Settings,
} from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import type { AppRole } from '@/lib/types'
import { useEffect, useState } from 'react'
import { useSidebarCollapse } from '@/hooks/use-sidebar-collapse'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles: AppRole[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Meu dia', href: '/meudia', icon: Sun, roles: ['owner', 'admin', 'gestor', 'funcionario'] },
  { label: 'Planejamento', href: '/planejamento', icon: CalendarDays, roles: ['owner', 'admin', 'gestor', 'funcionario'] },
  { label: 'Listas de recorrência', href: '/recorrencia', icon: RefreshCcw, roles: ['owner', 'admin', 'gestor', 'funcionario'] },
  { label: 'Cadastro de categorias', href: '/categorias', icon: Tag, roles: ['owner', 'admin', 'gestor', 'funcionario'] },
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['owner', 'admin', 'gestor', 'funcionario'] },
  { label: 'Time / Equipe', href: '/equipe', icon: Users, roles: ['owner', 'admin', 'gestor'] },
  { label: 'Atribuir tarefas', href: '/atribuir', icon: ClipboardList, roles: ['owner', 'admin', 'gestor'] },
  { label: 'Departamentos', href: '/departamentos', icon: Building2, roles: ['owner'] },
  { label: 'Assistente IA', href: '/chat', icon: Sparkles, roles: ['owner', 'admin', 'gestor'] },
  { label: 'Configuracoes', href: '/configuracoes', icon: Settings, roles: ['owner', 'admin', 'gestor', 'funcionario'] },
]

interface AppSidebarProps {
  userId: string
  role: AppRole
  userName: string
  userEmail: string
  avatarUrl?: string | null
}

function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme') as 'dark' | 'light'
    setTheme(current ?? 'dark')
  }, [])
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
    setTheme(next)
  }
  return <button onClick={toggle} aria-label="Alternar tema" style={iconBtn}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
}

export function AppSidebar({ userId, role, userName, userEmail, avatarUrl }: AppSidebarProps) {
  const pathname = usePathname()
  const { collapsed, setCollapsed } = useSidebarCollapse()
  const isMobile = useIsMobile()
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role))
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [displayName, setDisplayName] = useState(userName)
  const [displayEmail, setDisplayEmail] = useState(userEmail)
  const [displayAvatar, setDisplayAvatar] = useState<string | null>(avatarUrl ?? null)

  const initials = displayName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  const isCollapsed = isMobile || collapsed
  const sidebarWidth = isCollapsed ? '60px' : '240px'

  return (
    <aside style={{ width: sidebarWidth, minWidth: sidebarWidth, height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-background)', borderRight: '1px solid var(--color-border-subtle)', transition: 'width var(--transition-fast)', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '20px 16px 18px', borderBottom: '1px solid var(--color-border-subtle)', justifyContent: collapsed ? 'center' : 'space-between' }}>
        {!isCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
            <div style={{ width: '28px', height: '28px', background: 'var(--color-primary)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckSquare size={14} color="#111111" /></div>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Tetra</span>
          </div>
        )}
        {isCollapsed && <div style={{ width: '28px', height: '28px', background: 'var(--color-primary)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckSquare size={14} color="#111111" /></div>}
        {!isMobile && <button onClick={() => setCollapsed(!collapsed)} style={{ ...iconBtn, transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0)' }}><ChevronLeft size={16} /></button>}
        {!isCollapsed && <ThemeToggle />}
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href} title={isCollapsed ? item.label : undefined} style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: isCollapsed ? 0 : '10px', padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: isActive ? 500 : 400, color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', background: isActive ? 'rgba(59,130,246,0.1)' : 'transparent', borderLeft: isActive ? '2px solid var(--color-accent-blue)' : '2px solid transparent', textDecoration: 'none' }}>
              <Icon size={16} style={{ color: isActive ? 'var(--color-accent-blue)' : 'var(--color-text-muted)', flexShrink: 0 }} />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div style={{ borderTop: '1px solid var(--color-border-subtle)', padding: '12px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row', gap: isCollapsed ? 0 : '10px', padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
          <button onClick={() => setShowProfileModal(true)} title="Editar perfil" style={{ width: '30px', height: '30px', borderRadius: 'var(--radius-full)', background: 'var(--color-accent-blue)', color: '#fff', border: 'none', cursor: 'pointer', overflow: 'hidden', display: 'grid', placeItems: 'center', padding: 0, flexShrink: 0 }}>
            {displayAvatar ? <img src={displayAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
          </button>

          {!isCollapsed && (
            <>
              <button onClick={() => setShowProfileModal(true)} style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0 }}>
                <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayEmail}</p>
              </button>
              <form action={signOut}><button type="submit" title="Sair" style={iconBtn}><LogOut size={14} /></button></form>
            </>
          )}
          {isCollapsed && (
            <form action={signOut} style={{ marginTop: isMobile ? '8px' : 0 }}>
              <button type="submit" title="Sair" style={iconBtn}><LogOut size={14} /></button>
            </form>
          )}
        </div>
      </div>

      {isCollapsed && <div style={{ borderTop: '1px solid var(--color-border-subtle)', padding: '8px', display: 'flex', justifyContent: 'center' }}><ThemeToggle /></div>}

      <ProfileEditModal
        open={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        userId={userId}
        initialName={displayName}
        initialEmail={displayEmail}
        initialAvatar={displayAvatar}
        onSaved={({ name, email, avatar }) => { setDisplayName(name); setDisplayEmail(email); setDisplayAvatar(avatar) }}
      />
    </aside>
  )
}

function ProfileEditModal({
  open, onClose, userId, initialName, initialEmail, initialAvatar, onSaved,
}: {
  open: boolean
  onClose: () => void
  userId: string
  initialName: string
  initialEmail: string
  initialAvatar: string | null
  onSaved: (payload: { name: string; email: string; avatar: string | null }) => void
}) {
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [avatar, setAvatar] = useState<string | null>(initialAvatar)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(initialName); setEmail(initialEmail); setAvatar(initialAvatar)
  }, [open, initialName, initialEmail, initialAvatar])

  async function pickFile(file: File | null) {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return toast.error('Imagem muito grande (maximo 2MB).')
    const reader = new FileReader()
    reader.onload = () => setAvatar(typeof reader.result === 'string' ? reader.result : null)
    reader.readAsDataURL(file)
  }

  async function saveProfile() {
    setSaving(true)
    const supabase = createClient()

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: name.trim() || null, avatar_url: avatar })
      .eq('id', userId)
    if (profileError) { setSaving(false); return toast.error(profileError.message) }

    if (email.trim() !== initialEmail.trim()) {
      const { error: emailError } = await supabase.auth.updateUser({ email: email.trim() })
      if (emailError) { setSaving(false); return toast.error(emailError.message) }
      toast.success('Email alterado. Confira seu email para confirmar.')
    } else {
      toast.success('Perfil atualizado.')
    }

    onSaved({ name: name.trim() || initialName, email: email.trim(), avatar })
    setSaving(false)
    onClose()
  }

  if (!open) return null
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '430px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--color-text-primary)' }}>Editar perfil</h3>
          <button onClick={onClose} style={iconBtn}><X size={14} /></button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--color-accent-blue)', overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
            {avatar ? <img src={avatar} alt="Foto de perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Camera size={18} color="#fff" />}
          </div>
          <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
            Alterar foto
            <input type="file" accept="image/*" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
          </label>
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" style={fieldStyle} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" style={fieldStyle} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button onClick={onClose} style={{ ...fieldBtn, background: 'transparent', color: 'var(--color-text-secondary)' }}>Cancelar</button>
          <button onClick={saveProfile} disabled={saving} style={{ ...fieldBtn, border: 'none', background: 'var(--color-btn-cta-bg)', color: 'var(--color-btn-cta-text)', opacity: saving ? 0.6 : 1 }}>Salvar</button>
        </div>
      </div>
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)',
  padding: '4px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center',
}

const fieldStyle: React.CSSProperties = {
  width: '100%', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
  background: 'var(--color-input-bg)', color: 'var(--color-input-text)', fontSize: '13px', padding: '8px 10px',
}

const fieldBtn: React.CSSProperties = {
  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '7px 12px',
  fontSize: '12px', cursor: 'pointer',
}

