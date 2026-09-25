import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarProvider } from '@/hooks/use-sidebar-collapse'
import type { AppRole } from '@/lib/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, avatar_url')
    .eq('id', user.id)
    .single()

  const role = (profile?.role ?? 'funcionario') as AppRole
  const name = profile?.full_name ?? user.email ?? 'Usuário'

  return (
    <SidebarProvider>
      <div style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--color-background)',
      }}>
        <AppSidebar
          userId={user.id}
          role={role}
          userName={name}
          userEmail={user.email ?? ''}
          avatarUrl={profile?.avatar_url ?? null}
        />
        <main style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
}

