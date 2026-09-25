'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { refreshGoogleToken, refreshOutlookToken } from '@/app/actions/token-refresh'

interface CalendarEvent {
  summary: string
  description?: string
  start: { date?: string; dateTime?: string }
  end: { date?: string; dateTime?: string }
}

export async function syncTaskToCalendars(taskData: {
  taskId: string
  title: string
  description?: string
  dueDate: string
  dueTime?: string
  priority: string
  assignedToUserId: string
}) {
  const admin = createAdminClient()
  console.log('[v0] syncTaskToCalendars start for user:', taskData.assignedToUserId, 'task:', taskData.taskId)

  const results = {
    google: { success: false, eventId: null, error: null as string | null },
    outlook: { success: false, eventId: null, error: null as string | null },
  }

  // Buscar integrações do usuário que recebeu a tarefa
  const { data: integrations } = await admin
    .from('calendar_integrations')
    .select('provider, access_token, refresh_token, token_expiry, is_active')
    .eq('user_id', taskData.assignedToUserId)

  console.log('[v0] Found integrations:', integrations?.length ?? 0)

  const googleIntegration = integrations?.find((i) => i.provider === 'google' && i.is_active)
  const outlookIntegration = integrations?.find((i) => i.provider === 'outlook' && i.is_active)

  // Preparar dados do evento
  const eventDescription = `${taskData.description || ''}\n\nID da Tarefa: ${taskData.taskId}\nPrioridade: ${taskData.priority}`

  // Sincronizar com Google Calendar
  if (googleIntegration?.access_token) {
    try {
      console.log('[v0] Starting Google Calendar sync with token:', googleIntegration.access_token.substring(0, 20) + '...')
      
      let event: any
      
      if (taskData.dueTime) {
        // Evento com hora específica
        event = {
          summary: taskData.title,
          description: eventDescription,
          start: { dateTime: `${taskData.dueDate}T${taskData.dueTime}:00Z` },
          end: { dateTime: `${taskData.dueDate}T${String(parseInt(taskData.dueTime.split(':')[0]) + 1).padStart(2, '0')}:00:00Z` },
        }
      } else {
        // Evento de dia inteiro
        event = {
          summary: taskData.title,
          description: eventDescription,
          start: { date: taskData.dueDate },
          end: { date: new Date(new Date(taskData.dueDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
        }
      }

      console.log('[v0] Google event payload:', JSON.stringify(event))

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${googleIntegration.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      })

      const responseData = await response.json()
      console.log('[v0] Google response status:', response.status)
      console.log('[v0] Google response:', JSON.stringify(responseData))

      if (response.status === 401 && googleIntegration.refresh_token) {
        console.log('[v0] Google token expired, refreshing...')
        const refreshResult = await refreshGoogleToken(taskData.assignedToUserId, googleIntegration.refresh_token)
        if (refreshResult.success) {
          console.log('[v0] Token refreshed, retrying event creation...')
          const retryResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${refreshResult.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
          })
          const retryData = await retryResponse.json()
          if (retryResponse.ok) {
            results.google.success = true
            results.google.eventId = retryData.id
            console.log('[v0] Google Calendar event created after refresh:', retryData.id)
          } else {
            results.google.error = retryData.error?.message ?? 'Erro após refresh'
            console.log('[v0] Google Calendar error after refresh:', results.google.error)
          }
        } else {
          results.google.error = 'Erro ao refrescar token: ' + refreshResult.error
        }
      } else if (response.ok) {
        results.google.success = true
        results.google.eventId = responseData.id
        console.log('[v0] Google Calendar event created:', responseData.id)
      } else {
        results.google.error = responseData.error?.message ?? 'Erro desconhecido'
        console.log('[v0] Google Calendar error:', results.google.error)
      }
    } catch (err) {
      results.google.error = err instanceof Error ? err.message : 'Erro ao sincronizar com Google Calendar'
      console.log('[v0] Google Calendar sync exception:', results.google.error)
    }
  } else {
    console.log('[v0] Google integration not found or not active')
  }

  // Sincronizar com Outlook
  if (outlookIntegration?.access_token) {
    try {
      console.log('[v0] Starting Outlook Calendar sync...')
      const outlookEvent = {
        subject: taskData.title,
        bodyPreview: taskData.description || '',
        body: {
          contentType: 'HTML',
          content: `${taskData.description || ''}<br><br>ID da Tarefa: ${taskData.taskId}<br>Prioridade: ${taskData.priority}`,
        },
        start: {
          dateTime: taskData.dueTime ? `${taskData.dueDate}T${taskData.dueTime}:00` : `${taskData.dueDate}T09:00:00`,
          timeZone: 'America/Sao_Paulo',
        },
        end: {
          dateTime: taskData.dueTime
            ? `${taskData.dueDate}T${String(parseInt(taskData.dueTime.split(':')[0]) + 1).padStart(2, '0')}:00:00`
            : `${taskData.dueDate}T10:00:00`,
          timeZone: 'America/Sao_Paulo',
        },
        categories: [taskData.priority],
        isReminderOn: true,
        reminderMinutesBeforeStart: 15,
      }

      console.log('[v0] Outlook event payload:', JSON.stringify(outlookEvent))

      const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${outlookIntegration.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(outlookEvent),
      })

      const responseData = await response.json()
      console.log('[v0] Outlook response status:', response.status)
      console.log('[v0] Outlook response:', JSON.stringify(responseData))

      if (response.status === 401 && outlookIntegration.refresh_token) {
        console.log('[v0] Outlook token expired, refreshing...')
        const refreshResult = await refreshOutlookToken(taskData.assignedToUserId, outlookIntegration.refresh_token)
        if (refreshResult.success) {
          console.log('[v0] Outlook token refreshed, retrying event creation...')
          const retryResponse = await fetch('https://graph.microsoft.com/v1.0/me/events', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${refreshResult.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(outlookEvent),
          })
          const retryData = await retryResponse.json()
          if (retryResponse.ok) {
            results.outlook.success = true
            results.outlook.eventId = retryData.id
            console.log('[v0] Outlook event created after refresh:', retryData.id)
          } else {
            results.outlook.error = retryData.error?.message ?? 'Erro após refresh'
            console.log('[v0] Outlook error after refresh:', results.outlook.error)
          }
        } else {
          results.outlook.error = 'Erro ao refrescar token: ' + refreshResult.error
        }
      } else if (response.ok) {
        results.outlook.success = true
        results.outlook.eventId = responseData.id
        console.log('[v0] Outlook event created:', responseData.id)
      } else {
        results.outlook.error = responseData.error?.message ?? 'Erro desconhecido'
        console.log('[v0] Outlook error:', results.outlook.error)
      }
    } catch (err) {
      results.outlook.error = err instanceof Error ? err.message : 'Erro ao sincronizar com Outlook'
      console.log('[v0] Outlook sync exception:', results.outlook.error)
    }
  } else {
    console.log('[v0] Outlook integration not found or not active')
  }

  console.log('[v0] Sync completed:', results)
  return results
}
