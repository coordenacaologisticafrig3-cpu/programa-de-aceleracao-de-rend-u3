import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ChatView } from '@/components/chat/chat-view'
import type { AppRole } from '@/lib/types'
import { isStaffRole } from '@/lib/roles'

export const metadata = {
  title: 'Assistente IA | Tetra',
  description: 'Assistente inteligente para relatórios, tarefas e gestão da equipe.',
}

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  const role = (profile?.role ?? 'funcionario') as AppRole
  const name = profile?.full_name ?? user.email ?? 'Usuário'

  if (!isStaffRole(role)) redirect('/dashboard')

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <ChatView userName={name} role={role} />
    </div>
  )
}
