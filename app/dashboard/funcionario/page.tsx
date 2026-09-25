import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FuncionarioDashboard } from '@/components/dashboard/funcionario-dashboard'

export default async function FuncionarioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/')

  const { data: department } = profile.department_id
    ? await supabase.from('departments').select('*').eq('id', profile.department_id).single()
    : { data: null }

  return (
    <FuncionarioDashboard
      currentUser={profile}
      department={department}
    />
  )
}
