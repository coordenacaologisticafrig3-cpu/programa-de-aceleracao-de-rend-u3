'use client'

import { useState, useTransition } from 'react'
import { Edit2, Trash2, Plus, X, Check } from 'lucide-react'
import type { Department } from '@/lib/types'
import { createDepartment, updateDepartment, deleteDepartment } from '@/app/actions/admin'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { toast } from 'sonner'

interface Manager {
  id: string
  full_name: string | null
}

interface DepartmentsViewProps {
  initialDepartments: Department[]
  managers: Manager[]
}

export function DepartmentsView({ initialDepartments, managers }: DepartmentsViewProps) {
  const isMobile = useIsMobile()
  const [departments, setDepartments] = useState<Department[]>(initialDepartments)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', managerId: '', status: 'ativo' as const })
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', managerId: '' })
  const [isPending, startTransition] = useTransition()

  const handleAddDepartment = () => {
    if (!addForm.name.trim()) {
      toast.error('Nome do departamento é obrigatório')
      return
    }

    startTransition(async () => {
      const result = await createDepartment(addForm.name.trim(), addForm.managerId || undefined)
      if (result.error) {
        toast.error(result.error)
      } else {
        setDepartments((p) => [...p, result.department].sort((a, b) => a.name.localeCompare(b.name)))
        toast.success('Departamento criado com sucesso')
        setAddForm({ name: '', managerId: '' })
        setShowAdd(false)
      }
    })
  }

  const handleEditDepartment = (dept: Department) => {
    setEditingId(dept.id)
    setEditForm({
      name: dept.name,
      managerId: dept.manager_id || '',
      status: dept.status,
    })
  }

  const handleSaveEdit = () => {
    if (!editForm.name.trim()) {
      toast.error('Nome do departamento é obrigatório')
      return
    }

    startTransition(async () => {
      const result = await updateDepartment(editingId!, editForm.name.trim(), editForm.managerId || null, editForm.status)
      if (result.error) {
        toast.error(result.error)
      } else {
        setDepartments((p) => p.map((d) => d.id === editingId ? result.department : d).sort((a, b) => a.name.localeCompare(b.name)))
        toast.success('Departamento atualizado com sucesso')
        setEditingId(null)
      }
    })
  }

  const handleDeleteDepartment = (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este departamento?')) return

    startTransition(async () => {
      const result = await deleteDepartment(id)
      if (result.error) {
        toast.error(result.error)
      } else {
        setDepartments((p) => p.filter((d) => d.id !== id))
        toast.success('Departamento deletado com sucesso')
      }
    })
  }

  const managerMap = new Map(managers.map((m) => [m.id, m.full_name || 'Sem nome']))

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--color-background)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: isMobile ? 'var(--space-5)' : 'var(--space-8)',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-2)',
        }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            margin: 0,
          }}>
            Departamentos
          </h1>
          {!isMobile && (
            <button
              onClick={() => setShowAdd(!showAdd)}
              disabled={isPending}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--color-btn-cta-bg)',
                color: 'var(--color-btn-cta-text)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.6 : 1,
                transition: 'all var(--transition-fast)',
              }}
            >
              <Plus size={16} />
              Novo departamento
            </button>
          )}
        </div>
        <p style={{
          fontSize: '13px',
          color: 'var(--color-text-secondary)',
          margin: 0,
        }}>
          {departments.length} {departments.length === 1 ? 'departamento' : 'departamentos'} cadastrado{departments.length !== 1 ? 's' : ''}
        </p>
        {isMobile && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            disabled={isPending}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: 'var(--space-4)',
              width: '100%',
              background: 'var(--color-btn-cta-bg)',
              color: 'var(--color-btn-cta-text)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isPending ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.6 : 1,
              transition: 'all var(--transition-fast)',
            }}
          >
            <Plus size={16} />
            Novo departamento
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 'var(--space-8)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
        maxWidth: '900px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }} className="scrollbar-hide">

        {/* Form Adicionar */}
        {showAdd && (
          <div style={{
            background: 'var(--color-surface)',
            border: `2px solid var(--color-accent-blue)`,
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-6)',
            boxShadow: 'var(--shadow-card)',
          }}>
            <h3 style={{
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              margin: '0 0 var(--space-4)',
            }}>
              Novo departamento
            </h3>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  marginBottom: 'var(--space-2)',
                }}>
                  Nome
                </label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Comercial"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '14px',
                    background: 'var(--color-input-bg)',
                    border: `1px solid var(--color-input-border)`,
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text-primary)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  marginBottom: 'var(--space-2)',
                }}>
                  Gestor responsável (opcional)
                </label>
                <select
                  value={addForm.managerId}
                  onChange={(e) => setAddForm((p) => ({ ...p, managerId: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '14px',
                    background: 'var(--color-input-bg)',
                    border: `1px solid var(--color-input-border)`,
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text-primary)',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">Selecione um gestor</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name || 'Sem nome'}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{
                display: 'flex',
                gap: 'var(--space-3)',
                justifyContent: 'flex-end',
              }}>
                <button
                  onClick={() => {
                    setShowAdd(false)
                    setAddForm({ name: '', managerId: '' })
                  }}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 500,
                    background: 'var(--color-surface-elevated)',
                    border: `1px solid var(--color-border)`,
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddDepartment}
                  disabled={isPending}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 600,
                    background: 'var(--color-primary)',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text-inverse)',
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    opacity: isPending ? 0.6 : 1,
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  Criar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de departamentos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {departments.length === 0 ? (
            <div style={{
              padding: 'var(--space-8)',
              textAlign: 'center',
              color: 'var(--color-text-muted)',
              fontSize: '14px',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
            }}>
              Nenhum departamento cadastrado
            </div>
          ) : (
            departments.map((dept) => (
              <div
                key={dept.id}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-5)',
                  boxShadow: 'var(--shadow-card)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {editingId === dept.id ? (
                  /* Editar */
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-4)',
                  }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--color-text-secondary)',
                        marginBottom: 'var(--space-2)',
                      }}>
                        Nome
                      </label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          fontSize: '14px',
                          background: 'var(--color-input-bg)',
                          border: `1px solid var(--color-input-border)`,
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--color-text-primary)',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--color-text-secondary)',
                        marginBottom: 'var(--space-2)',
                      }}>
                        Gestor responsável
                      </label>
                      <select
                        value={editForm.managerId}
                        onChange={(e) => setEditForm((p) => ({ ...p, managerId: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          fontSize: '14px',
                          background: 'var(--color-input-bg)',
                          border: `1px solid var(--color-input-border)`,
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--color-text-primary)',
                          boxSizing: 'border-box',
                        }}
                      >
                        <option value="">Sem gestor</option>
                        {managers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.full_name || 'Sem nome'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--color-text-secondary)',
                        marginBottom: 'var(--space-2)',
                      }}>
                        Status
                      </label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value as 'ativo' | 'inativo' }))}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          fontSize: '14px',
                          background: 'var(--color-input-bg)',
                          border: `1px solid var(--color-input-border)`,
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--color-text-primary)',
                          boxSizing: 'border-box',
                        }}
                      >
                        <option value="ativo">Ativo</option>
                        <option value="inativo">Inativo</option>
                      </select>
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: 'var(--space-3)',
                      justifyContent: 'flex-end',
                    }}>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{
                          padding: '8px 16px',
                          fontSize: '14px',
                          fontWeight: 500,
                          background: 'var(--color-surface-elevated)',
                          border: `1px solid var(--color-border)`,
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--color-text-secondary)',
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={isPending}
                        style={{
                          padding: '8px 16px',
                          fontSize: '14px',
                          fontWeight: 600,
                          background: 'var(--color-primary)',
                          border: 'none',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--color-text-inverse)',
                          cursor: isPending ? 'not-allowed' : 'pointer',
                          opacity: isPending ? 0.6 : 1,
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Visualizar */
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                        margin: '0 0 var(--space-2)',
                      }}>
                        {dept.name}
                      </h3>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                      }}>
                        <span style={{
                          fontSize: '12px',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: dept.status === 'ativo' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: dept.status === 'ativo' ? 'var(--color-success)' : 'var(--color-error)',
                          fontWeight: 500,
                        }}>
                          {dept.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </span>
                        {dept.manager_id && (
                          <span style={{
                            fontSize: '12px',
                            color: 'var(--color-text-secondary)',
                          }}>
                            Gestor: {managerMap.get(dept.manager_id) || 'Desconhecido'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: 'var(--space-2)',
                    }}>
                      <button
                        onClick={() => handleEditDepartment(dept)}
                        disabled={isPending}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: isPending ? 'not-allowed' : 'pointer',
                          color: 'var(--color-accent-blue)',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          opacity: isPending ? 0.6 : 1,
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteDepartment(dept.id)}
                        disabled={isPending}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: isPending ? 'not-allowed' : 'pointer',
                          color: 'var(--color-error)',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          opacity: isPending ? 0.6 : 1,
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
