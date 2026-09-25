import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminDashboard } from '@/components/dashboard/admin-dashboard'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin', 'gestor'].includes(profile.role)) redirect('/protected')

  // Busca membros do mesmo departamento (ou todos se owner)
  const query = supabase
    .from('profiles')
    .select('*, departments(name)')

  const { data: teamProfiles } = profile.department_id
    ? await query.eq('department_id', profile.department_id)
    : await query

  const { data: department } = profile.department_id
    ? await supabase.from('departments').select('*').eq('id', profile.department_id).single()
    : { data: null }

  return (
    <AdminDashboard
      currentUser={profile}
      teamProfiles={teamProfiles ?? []}
      department={department}
    />
  )
}
