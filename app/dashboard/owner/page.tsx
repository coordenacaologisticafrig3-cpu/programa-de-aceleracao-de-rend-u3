import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OwnerDashboard } from '@/components/dashboard/owner-dashboard'

export default async function OwnerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'owner') redirect('/protected')

  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('*, departments(name)')
    .order('created_at', { ascending: false })

  const { data: departments } = await supabase
    .from('departments')
    .select('*')
    .order('name')

  return (
    <OwnerDashboard
      currentUser={profile}
      profiles={allProfiles ?? []}
      departments={departments ?? []}
    />
  )
}
