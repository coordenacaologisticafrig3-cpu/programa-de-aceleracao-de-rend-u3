import { streamText, tool, convertToModelMessages } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/lib/types'
import { isDeptGestor, isStaffRole } from '@/lib/roles'
import { logAudit, type AuditAction } from '@/lib/audit'
import {
  getProjectReport,
  listTeamMembers,
  listDepartments,
  queryTasks,
  createBatchTasks,
  createRecurringTask,
  createDailyRecurringChecklist,
  createUser,
  updateUser,
  deleteUser,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  assignTask,
  updateTask,
  completeTask,
  deleteTask,
} from '@/app/actions/chat-tools'

export const maxDuration = 60
const CHAT_CONTEXT_WINDOW = 60

async function getCallerProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, department_id')
    .eq('id', user.id)
    .single()
  if (!profile) return null
  return { user, profile }
}

export async function POST(req: Request) {
  const caller = await getCallerProfile()
  if (!caller) {
    return new Response('Não autenticado.', { status: 401 })
  }
  const { profile } = caller
  const role = profile.role as AppRole

  if (!isStaffRole(role)) {
    return new Response('Sem permissão para acessar o assistente.', { status: 403 })
  }

  const { messages: rawMessages } = await req.json()
  const contextMessages = Array.isArray(rawMessages) ? rawMessages.slice(-CHAT_CONTEXT_WINDOW) : []
  const messages = await convertToModelMessages(contextMessages)

  // Logar a mensagem do usuario (ultima mensagem do array)
  const lastUserMsg = [...contextMessages].reverse().find((m: any) => m.role === 'user')
  if (lastUserMsg) {
    const msgText = typeof lastUserMsg.content === 'string'
      ? lastUserMsg.content
      : Array.isArray(lastUserMsg.content)
        ? lastUserMsg.content.filter((p: any) => p.type === 'text').map((p: any) => p.text).join(' ')
        : ''

    await logAudit({
      userId: caller.user.id,
      action: 'ai.message',
      entity: 'ai',
      description: msgText.slice(0, 500),
      metadata: {
        userName: caller.profile.full_name,
        role: caller.profile.role,
        messageLength: msgText.length,
        fullMessage: msgText,
      },
    })
  }

  const today = new Date().toISOString().split('T')[0]
  const rolePt = role === 'owner' ? 'owner' : role === 'admin' ? 'admin' : role === 'gestor' ? 'gestor' : 'staff'

  const isManagerOrOwner = role === 'owner' || role === 'admin' || role === 'gestor'

  const result = streamText({
    model: 'openai/gpt-4o',
    maxOutputTokens: 4096,
    system: `Você é o assistente inteligente do sistema Tetra, uma plataforma completa de gestão de tarefas e equipes.
Você está conversando com ${profile.full_name || 'o usuário'} que tem o papel de ${rolePt}.
A data de hoje é ${today}.

Contexto da conversa: você recebe uma janela de contexto com as últimas ${CHAT_CONTEXT_WINDOW} mensagens. Use esse histórico para manter continuidade, retomar nomes, tarefas, departamentos e decisões anteriores.

${isManagerOrOwner ? `🎯 SUAS CAPACIDADES COMPLETAS (GERENTE/OWNER):

📊 RELATÓRIOS E CONSULTAS:
- Gerar relatórios de desempenho com métricas detalhadas (taxa de execução, pontualidade, etc)
- Consultar tarefas com filtros avançados (status, prioridade, período, usuário, departamento)
- Listar membros da equipe com filtros por departamento
- Listar todos os departamentos ativos
- Listar categorias disponíveis

✅ GESTÃO DE TAREFAS:
- Atribuir tarefas individuais para usuários específicos
- Criar tarefas em lote para múltiplos usuários
- Criar tarefas RECORRENTES (diária, semanal, mensal, customizado) — SEMPRE prefira criar tarefas recorrentes quando o usuário pedir demandas repetitivas
- Atualizar tarefas existentes (título, descrição, data, prioridade, status, categoria)
- Marcar tarefas como concluídas
- Deletar tarefas

👥 GESTÃO DE USUÁRIOS:
- Criar novos usuários com email, nome e papel (funcionário, gestor ou admin)
- Atualizar dados de usuários (nome, papel, departamento)
- Deletar usuários (apenas owners)

🏢 GESTÃO DE DEPARTAMENTOS:
- Criar departamentos (apenas owners)
- Atualizar departamentos (nome, gerente, status)
- Deletar departamentos (apenas owners)

🏷️ GESTÃO DE CATEGORIAS:
- Criar categorias de tarefas com cores personalizadas
- Atualizar categorias existentes
- Deletar categorias

🔒 REGRAS DE PERMISSÃO:
${isDeptGestor(role) ? '- Como GESTOR, você só pode ver e gerenciar sua própria equipe/departamento. Não pode criar/editar departamentos.' : role === 'admin' ? '- Como ADMIN, você tem visão global da operação, mas não pode criar/editar/excluir departamentos nem promover owners.' : '- Como OWNER, você tem acesso total a todos os departamentos, usuários e configurações do sistema.'}
- Gestores podem criar usuários apenas no seu departamento.
- Apenas owners podem deletar usuários e gerenciar departamentos.

💡 REGRAS PARA CRIAÇÃO DE DEMANDAS:
- SEMPRE crie demandas como RECORRENTES (createRecurringTask ou createDailyRecurringChecklist) a menos que o usuário explicitamente peça uma tarefa pontual.
- Para listas de checklist diário, use createDailyRecurringChecklist com cada item como tarefa independente.
- Sempre defina uma data de início e fim ao criar recorrências.
- Após criar demandas, informe quantas instâncias foram geradas e o período coberto.` : `⚠️ ACESSO LIMITADO (FUNCIONÁRIO):
- Você pode consultar suas próprias tarefas e ver informações básicas.
- Você pode marcar suas tarefas como concluídas.
- Você NÃO pode criar, atribuir, editar ou deletar tarefas de outros usuários.
- Você NÃO pode gerenciar usuários, departamentos ou categorias.
- Para solicitar novas tarefas ou alterações, fale com seu gestor.`}

💡 REGRAS DE COMPORTAMENTO:
- Sempre confirme detalhes importantes antes de criar/deletar (a menos que o usuário já tenha fornecido tudo).
- Quando criar tarefas em lote, informe quantas foram criadas e para quem.
- Use formatação markdown para tornar relatórios legíveis (tabelas, listas, negrito).
- Ao exibir datas, use o formato DD/MM/AAAA.
- Sempre inclua taxas percentuais em relatórios de desempenho.
- Quando getProjectReport/queryTasks retornar dados, o sistema exibe cards/tabelas automáticas. NÃO repita os dados em texto, apenas faça comentários relevantes.
- IDENTIFICAÇÃO DE USUÁRIOS: Sempre que o usuário mencionar um nome (mesmo com erro, abreviado ou parcial), chame listTeamMembers primeiro para obter a lista completa e identificar corretamente quem foi mencionado.
- Quando responder sobre "hoje", sempre mencione a data: ${today}.
- Se faltar informação para executar uma ação, use as tools de listagem primeiro.
- Tarefas recorrentes diárias geram automaticamente instâncias para cada dia útil (seg-sex) até a data de término.
- Quando o usuário enviar uma lista em múltiplas linhas (uma linha por tarefa) e pedir para atribuir recorrente diário para alguém, trate CADA LINHA como uma tarefa independente e use createDailyRecurringChecklist.
- Após executar qualquer ação de criação/edição/remoção, SEMPRE finalize com um relatório curto em markdown contendo: o que foi feito, quantidade total processada, sucessos, falhas e próximos passos/recomendações.
- Sempre responda em português brasileiro de forma clara, objetiva e profissional.`,
    messages,
    tools: {
      getProjectReport: tool({
        description: 'Gera um relatório de desempenho com métricas de tarefas (concluídas no prazo, com atraso, não feitas) para um período específico. Pode filtrar por departamento ou usuário.',
        inputSchema: z.object({
          start: z.string().describe('Data de início no formato YYYY-MM-DD'),
          end: z.string().describe('Data de fim no formato YYYY-MM-DD'),
          departmentId: z.string().nullable().describe('ID do departamento para filtrar (opcional)'),
          userId: z.string().nullable().describe('ID do usuário para filtrar (opcional)'),
        }),
        execute: async ({ start, end, departmentId, userId }) => {
          return await getProjectReport({ start, end, departmentId, userId })
        },
      }),

      listTeamMembers: tool({
        description: 'Lista TODOS os membros da equipe com id, nome, papel e departamento. Use sempre que o usuário mencionar qualquer pessoa — mesmo com nome aproximado, incompleto ou com erro de digitação. O agente deve usar a lista para identificar quem o usuário quis dizer.',
        inputSchema: z.object({
          departmentId: z.string().nullable().describe('ID do departamento para filtrar (opcional). Omita para listar todos.'),
        }),
        execute: async ({ departmentId }) => {
          return await listTeamMembers({ departmentId })
        },
      }),

      listDepartments: tool({
        description: 'Lista todos os departamentos ativos com nome e quantidade de membros.',
        inputSchema: z.object({}),
        execute: async () => {
          return await listDepartments()
        },
      }),

      queryTasks: tool({
        description: 'Consulta tarefas com filtros opcionais de usuário, departamento, status, prioridade e período. Se o usuário mencionou um nome mas você ainda não tem o ID, use listTeamMembers com nameSearch primeiro para descobrir o ID. IMPORTANTE: status "overdue" não existe no banco — para tarefas atrasadas, use status "pending" com end igual à data de hoje.',
        inputSchema: z.object({
          userId: z.string().nullable().describe('ID do usuário (opcional) — use listTeamMembers para descobrir se tiver apenas o nome'),
          departmentId: z.string().nullable().describe('ID do departamento (opcional)'),
          status: z.enum(['pending', 'in_progress', 'done', 'overdue']).nullable().describe('Status da tarefa. Use "overdue" para tarefas atrasadas (pending com vencimento no passado), "pending" para pendentes, "in_progress" para em andamento, "done" para concluídas.'),
          priority: z.enum(['baixa', 'normal', 'alta', 'urgente']).nullable().describe('Prioridade da tarefa (opcional)'),
          start: z.string().nullable().describe('Data de início YYYY-MM-DD (opcional)'),
          end: z.string().nullable().describe('Data de fim YYYY-MM-DD (opcional)'),
          limit: z.number().nullable().describe('Limite de resultados (padrão 50)'),
        }),
        execute: async ({ userId, departmentId, status, priority, start, end, limit }) => {
          // "overdue" é tratado no backend como pending + due_date <= hoje
          return await queryTasks({ userId, departmentId, status: status as any, priority, start, end, limit: limit ?? 50 })
        },
      }),

      createBatchTasks: tool({
        description: 'Cria uma lista de tarefas e as atribui para um ou mais usuários de uma vez. Use para subir demandas em lote.',
        inputSchema: z.object({
          tasks: z.array(z.object({
            title: z.string().describe('Título da tarefa'),
            description: z.string().nullable().describe('Descrição (opcional)'),
            dueDate: z.string().describe('Data de vencimento YYYY-MM-DD'),
            dueTime: z.string().nullable().describe('Horário de vencimento HH:MM (opcional)'),
            priority: z.enum(['baixa', 'normal', 'alta', 'urgente']).describe('Prioridade da tarefa'),
            recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).describe('Recorrência da tarefa'),
          })).describe('Lista de tarefas a criar'),
          assigneeIds: z.array(z.string()).describe('IDs dos usuários que receberão as tarefas'),
          departmentId: z.string().nullable().describe('ID do departamento (opcional, para owner)'),
        }),
        execute: async ({ tasks, assigneeIds, departmentId }) => {
          return await createBatchTasks({
            tasks: tasks.map(t => ({
              ...t,
              description: t.description ?? undefined,
              dueTime: t.dueTime ?? undefined,
              categoryId: null,
            })),
            assigneeIds,
            departmentId,
          })
        },
      }),

      createRecurringTask: tool({
        description: 'Cria uma tarefa recorrente que se repete automaticamente (diária, semanal, mensal ou customizado).',
        inputSchema: z.object({
          title: z.string().describe('Título da tarefa recorrente'),
          description: z.string().nullable().describe('Descrição (opcional)'),
          frequency: z.enum(['daily', 'weekly', 'monthly', 'custom']).describe('Frequência de recorrência'),
          startDate: z.string().describe('Data de início YYYY-MM-DD'),
          endDate: z.string().nullable().describe('Data de fim YYYY-MM-DD (opcional)'),
          time: z.string().nullable().describe('Horário HH:MM (opcional)'),
          priority: z.enum(['baixa', 'normal', 'alta', 'urgente']).describe('Prioridade'),
          daysOfWeek: z.array(z.number()).nullable().describe('Dias da semana (0=dom, 1=seg, ... para frequência weekly)'),
          dayOfMonth: z.string().nullable().describe('Dia do mês para frequência monthly'),
          intervalDays: z.number().nullable().describe('Intervalo em dias para frequência custom'),
          departmentId: z.string().nullable().describe('ID do departamento (opcional)'),
          assigneeIds: z.array(z.string()).nullable().describe('IDs dos usuários (opcional)'),
        }),
        execute: async ({ title, description, frequency, startDate, endDate, time, priority, daysOfWeek, dayOfMonth, intervalDays, departmentId, assigneeIds }) => {
          return await createRecurringTask({
            title,
            description: description ?? undefined,
            frequency,
            startDate,
            endDate,
            time,
            priority,
            daysOfWeek: daysOfWeek ?? undefined,
            dayOfMonth: dayOfMonth ?? undefined,
            intervalDays: intervalDays ?? undefined,
            departmentId,
            assigneeIds: assigneeIds ?? undefined,
          })
        },
      }),

      createDailyRecurringChecklist: tool({
        description: 'Cria várias tarefas recorrentes diárias de uma só vez para um usuário específico. Use quando o usuário enviar uma lista de itens em linhas e pedir para atribuir diariamente.',
        inputSchema: z.object({
          assigneeId: z.string().describe('ID do usuário que receberá as tarefas'),
          tasks: z.array(z.string()).describe('Lista de títulos; cada item vira uma recorrência diária'),
          startDate: z.string().nullable().describe('Data inicial YYYY-MM-DD (opcional; padrão hoje)'),
          endDate: z.string().nullable().describe('Data final YYYY-MM-DD (opcional)'),
          time: z.string().nullable().describe('Horário HH:MM opcional para todas'),
          priority: z.enum(['baixa', 'normal', 'alta', 'urgente']).nullable().describe('Prioridade padrão (opcional)'),
          departmentId: z.string().nullable().describe('Departamento opcional (owner/admin)'),
        }),
        execute: async ({ assigneeId, tasks, startDate, endDate, time, priority, departmentId }) => {
          return await createDailyRecurringChecklist({
            assigneeId,
            tasks,
            startDate,
            endDate,
            time,
            priority: priority ?? 'normal',
            departmentId,
          })
        },
      }),

      // === GESTÃO DE USUÁRIOS ===

      createUser: tool({
        description: 'Cria um novo usuário no sistema com email, nome completo, papel (funcionario, gestor ou admin) e opcionalmente senha e departamento. Se o usuário fornecer uma senha, use-a. Gestores só podem criar no seu departamento.',
        inputSchema: z.object({
          email: z.string().email().describe('Email do novo usuário'),
          fullName: z.string().describe('Nome completo do usuário'),
          role: z.enum(['funcionario', 'gestor', 'admin']).describe('Papel do usuário'),
          departmentId: z.string().nullable().describe('ID do departamento (opcional para owner/admin, obrigatório implícito para gestor)'),
          password: z.string().nullable().describe('Senha inicial do usuário (opcional — se fornecida pelo solicitante, use-a exatamente)'),
        }),
        execute: async ({ email, fullName, role, departmentId, password }) => {
          return await createUser({ email, fullName, role, departmentId, password })
        },
      }),

      updateUser: tool({
        description: 'Atualiza dados de um usuário existente (nome, papel, departamento). Gerentes só podem editar usuários do seu departamento.',
        inputSchema: z.object({
          userId: z.string().describe('ID do usuário a ser atualizado'),
          fullName: z.string().nullable().describe('Novo nome completo (opcional)'),
          role: z.enum(['funcionario', 'gestor', 'admin']).nullable().describe('Novo papel (opcional)'),
          departmentId: z.string().nullable().describe('Novo departamento (opcional, apenas para owner)'),
        }),
        execute: async ({ userId, fullName, role, departmentId }) => {
          return await updateUser({
            userId,
            fullName: fullName ?? undefined,
            role: role ?? undefined,
            departmentId,
          })
        },
      }),

      deleteUser: tool({
        description: 'Deleta um usuário do sistema permanentemente. Apenas owners podem executar.',
        inputSchema: z.object({
          userId: z.string().describe('ID do usuário a ser deletado'),
        }),
        execute: async ({ userId }) => {
          return await deleteUser(userId)
        },
      }),

      // === GESTÃO DE DEPARTAMENTOS ===

      createDepartment: tool({
        description: 'Cria um novo departamento. Apenas owners podem executar.',
        inputSchema: z.object({
          name: z.string().describe('Nome do departamento'),
          managerId: z.string().nullable().describe('ID do gerente responsável (opcional)'),
        }),
        execute: async ({ name, managerId }) => {
          return await createDepartment({ name, managerId })
        },
      }),

      updateDepartment: tool({
        description: 'Atualiza um departamento existente (nome, gerente ou status). Apenas owners podem executar.',
        inputSchema: z.object({
          departmentId: z.string().describe('ID do departamento'),
          name: z.string().nullable().describe('Novo nome (opcional)'),
          managerId: z.string().nullable().describe('Novo gerente (opcional)'),
          status: z.enum(['ativo', 'inativo']).nullable().describe('Novo status (opcional)'),
        }),
        execute: async ({ departmentId, name, managerId, status }) => {
          return await updateDepartment({
            departmentId,
            name: name ?? undefined,
            managerId,
            status: status ?? undefined,
          })
        },
      }),

      deleteDepartment: tool({
        description: 'Deleta um departamento permanentemente. Apenas owners podem executar.',
        inputSchema: z.object({
          departmentId: z.string().describe('ID do departamento a ser deletado'),
        }),
        execute: async ({ departmentId }) => {
          return await deleteDepartment(departmentId)
        },
      }),

      // === GESTÃO DE CATEGORIAS ===

      getCategories: tool({
        description: 'Lista todas as categorias disponíveis no sistema com nome, cor e ícone.',
        inputSchema: z.object({}),
        execute: async () => {
          return await getCategories()
        },
      }),

      createCategory: tool({
        description: 'Cria uma nova categoria de tarefas com nome e cor personalizada.',
        inputSchema: z.object({
          name: z.string().describe('Nome da categoria'),
          color: z.string().describe('Cor em hexadecimal (ex: #3B82F6)'),
          icon: z.string().nullable().describe('Ícone da categoria (opcional)'),
        }),
        execute: async ({ name, color, icon }) => {
          return await createCategory({ name, color, icon: icon ?? undefined })
        },
      }),

      updateCategory: tool({
        description: 'Atualiza uma categoria existente (nome, cor ou ícone).',
        inputSchema: z.object({
          categoryId: z.string().describe('ID da categoria'),
          name: z.string().nullable().describe('Novo nome (opcional)'),
          color: z.string().nullable().describe('Nova cor (opcional)'),
          icon: z.string().nullable().describe('Novo ícone (opcional)'),
        }),
        execute: async ({ categoryId, name, color, icon }) => {
          return await updateCategory({
            categoryId,
            name: name ?? undefined,
            color: color ?? undefined,
            icon: icon ?? undefined,
          })
        },
      }),

      deleteCategory: tool({
        description: 'Deleta uma categoria permanentemente.',
        inputSchema: z.object({
          categoryId: z.string().describe('ID da categoria a ser deletada'),
        }),
        execute: async ({ categoryId }) => {
          return await deleteCategory(categoryId)
        },
      }),

      // === GESTÃO DE TAREFAS ===

      assignTask: tool({
        description: 'Atribui uma tarefa individual para um usuário específico. Use createBatchTasks para múltiplos usuários.',
        inputSchema: z.object({
          title: z.string().describe('Título da tarefa'),
          description: z.string().nullable().describe('Descrição detalhada (opcional)'),
          dueDate: z.string().describe('Data de vencimento YYYY-MM-DD'),
          dueTime: z.string().nullable().describe('Horário de vencimento HH:MM (opcional)'),
          priority: z.enum(['baixa', 'normal', 'alta', 'urgente']).describe('Prioridade da tarefa'),
          assigneeId: z.string().describe('ID do usuário que receberá a tarefa'),
          categoryId: z.string().nullable().describe('ID da categoria (opcional)'),
          recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).nullable().describe('Recorrência (opcional)'),
        }),
        execute: async ({ title, description, dueDate, dueTime, priority, assigneeId, categoryId, recurrence }) => {
          return await assignTask({
            title,
            description: description ?? undefined,
            dueDate,
            dueTime: dueTime ?? undefined,
            priority,
            assigneeId,
            categoryId,
            recurrence: recurrence ?? undefined,
          })
        },
      }),

      updateTask: tool({
        description: 'Atualiza uma tarefa existente (título, descrição, data, prioridade, status, categoria).',
        inputSchema: z.object({
          taskId: z.string().describe('ID da tarefa a ser atualizada'),
          title: z.string().nullable().describe('Novo título (opcional)'),
          description: z.string().nullable().describe('Nova descrição (opcional)'),
          dueDate: z.string().nullable().describe('Nova data de vencimento YYYY-MM-DD (opcional)'),
          dueTime: z.string().nullable().describe('Novo horário HH:MM (opcional)'),
          priority: z.enum(['baixa', 'normal', 'alta', 'urgente']).nullable().describe('Nova prioridade (opcional)'),
          status: z.enum(['pending', 'in_progress', 'done']).nullable().describe('Novo status (opcional)'),
          categoryId: z.string().nullable().describe('Nova categoria (opcional)'),
        }),
        execute: async ({ taskId, title, description, dueDate, dueTime, priority, status, categoryId }) => {
          return await updateTask({
            taskId,
            title: title ?? undefined,
            description: description ?? undefined,
            dueDate: dueDate ?? undefined,
            dueTime: dueTime ?? undefined,
            priority: priority ?? undefined,
            status: status ?? undefined,
            categoryId: categoryId ?? undefined,
          })
        },
      }),

      completeTask: tool({
        description: 'Marca uma tarefa como concluída (status = done).',
        inputSchema: z.object({
          taskId: z.string().describe('ID da tarefa a ser concluída'),
        }),
        execute: async ({ taskId }) => {
          return await completeTask(taskId)
        },
      }),

      deleteTask: tool({
        description: 'Deleta uma tarefa permanentemente do sistema.',
        inputSchema: z.object({
          taskId: z.string().describe('ID da tarefa a ser deletada'),
        }),
        execute: async ({ taskId }) => {
          return await deleteTask(taskId)
        },
      }),
    },
    onFinish: async ({ toolCalls }) => {
      if (!toolCalls || toolCalls.length === 0) return

      // Mapear cada tool call para uma acao de auditoria descritiva
      const toolActionMap: Record<string, { action: AuditAction; label: string }> = {
        createBatchTasks:            { action: 'ai.task_created',    label: 'criou tarefas em lote' },
        createRecurringTask:         { action: 'ai.task_created',    label: 'criou tarefa recorrente' },
        createDailyRecurringChecklist:{ action: 'ai.task_created',   label: 'criou checklist recorrente' },
        assignTask:                  { action: 'ai.task_created',    label: 'atribuiu tarefa' },
        updateTask:                  { action: 'ai.task_updated',    label: 'atualizou tarefa' },
        completeTask:                { action: 'ai.task_completed',  label: 'concluiu tarefa' },
        deleteTask:                  { action: 'ai.task_deleted',    label: 'excluiu tarefa' },
        createUser:                  { action: 'ai.user_created',    label: 'criou usuario' },
        updateUser:                  { action: 'ai.user_updated',    label: 'atualizou usuario' },
        deleteUser:                  { action: 'ai.user_deleted',    label: 'excluiu usuario' },
        getProjectReport:            { action: 'ai.report_requested', label: 'gerou relatorio' },
        queryTasks:                  { action: 'ai.report_requested', label: 'consultou tarefas' },
        createDepartment:            { action: 'ai.department_created', label: 'criou departamento' },
        createCategory:              { action: 'ai.category_created', label: 'criou categoria' },
      }

      for (const tc of toolCalls as any[]) {
        const mapped = toolActionMap[tc.toolName]
        if (!mapped) continue

        // Montar descricao legivel com base nos args
        const args = tc.args ?? {}
        let description = `IA ${mapped.label}`
        if (args.title) description += `: "${args.title}"`
        else if (args.taskId) description += ` (ID: ${args.taskId})`
        else if (args.email) description += `: ${args.email}`
        else if (args.userId) description += ` (usuario: ${args.userId})`
        else if (args.tasks?.length) description += ` (${args.tasks.length} itens)`

        await logAudit({
          userId: caller.user.id,
          action: mapped.action,
          entity: 'ai',
          description,
          metadata: {
            tool: tc.toolName,
            args: tc.args,
            result: tc.result,
          },
        })
      }
    },
  })

  return result.toUIMessageStreamResponse()
}
