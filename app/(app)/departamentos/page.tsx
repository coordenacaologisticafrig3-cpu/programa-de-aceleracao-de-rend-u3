import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DepartmentsView } from '@/components/departments/departments-view'

export default async function DepartamentosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'owner') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: 'var(--color-background)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontSize: '20px',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            margin: '0 0 8px',
          }}>
            Acesso negado
          </h1>
          <p style={{
            fontSize: '14px',
            color: 'var(--color-text-muted)',
            margin: 0,
          }}>
            Apenas owner pode acessar departamentos
          </p>
        </div>
      </div>
    )
  }

  const { data: departments } = await supabase
    .from('departments')
    .select('*')
    .order('name')

  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .order('full_name')

  return <DepartmentsView initialDepartments={departments || []} managers={allProfiles || []} />
}
