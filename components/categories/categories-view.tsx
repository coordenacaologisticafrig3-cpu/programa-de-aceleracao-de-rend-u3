'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import {
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from '@/app/actions/categories'
import { toast } from 'sonner'
import type { Category } from '@/lib/types'
import { useIsMobile } from '@/hooks/use-is-mobile'

interface CategoriesViewProps {
  userId: string
  initialCategories: Category[]
  error?: string
}

const ICON_OPTIONS = [
  'briefcase',
  'user',
  'heart',
  'book',
  'shopping-cart',
  'home',
  'star',
  'zap',
]

const COLOR_PRESETS = [
  '#3B82F6', // azul
  '#8B5CF6', // roxo
  '#EC4899', // rosa
  '#F59E0B', // laranja
  '#22C55E', // verde
  '#EF4444', // vermelho
  '#06B6D4', // ciano
  '#F97316', // orange
]

export function CategoriesView({ userId, initialCategories, error }: CategoriesViewProps) {
  const isMobile = useIsMobile()
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#3B82F6')
  const [newIcon, setNewIcon] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  async function handleCreate() {
    if (!newName.trim()) return
    startTransition(async () => {
      const result = await createCategory(newName, newColor, newIcon || undefined)
      if (result.error) {
        toast.error(result.error)
      } else if (result.category) {
        setCategories((p) => [...p, result.category as Category])
        setNewName('')
        setNewColor('#3B82F6')
        setNewIcon('')
        setShowAdd(false)
        toast.success('Categoria criada!')
      }
    })
  }

  async function handleUpdate(id: string, name: string, color: string, icon: string) {
    startTransition(async () => {
      const result = await updateCategory(id, name, color, icon)
      if (result.error) {
        toast.error(result.error)
      } else if (result.category) {
        setCategories((p) =>
          p.map((c) => (c.id === id ? (result.category as Category) : c))
        )
        setEditingId(null)
        toast.success('Categoria atualizada!')
      }
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta categoria?')) return
    startTransition(async () => {
      const result = await deleteCategory(id)
      if (result.error) {
        toast.error(result.error)
      } else {
        setCategories((p) => p.filter((c) => c.id !== id))
        toast.success('Categoria excluída!')
      }
    })
  }

  async function handleReorder(from: number, to: number) {
    const newCats = [...categories]
    const [moved] = newCats.splice(from, 1)
    newCats.splice(to, 0, moved)

    // Atualizar order field
    const updates = newCats.map((c, i) => ({ id: c.id, order: i }))
    startTransition(async () => {
      const result = await reorderCategories(updates)
      if (result.error) {
        toast.error(result.error)
      } else {
        setCategories(newCats)
        toast.success('Categorias reordenadas!')
      }
    })
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--color-background)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: isMobile ? 'var(--space-5)' : 'var(--space-8)',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          Cadastro de Categorias
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
          Organize suas tarefas por categorias
        </p>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: isMobile ? 'var(--space-5)' : 'var(--space-8)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-8)',
          maxWidth: '800px',
          scrollbarWidth: 'none',
        }}
        className="scrollbar-hide"
      >
        {error && (
          <div
            style={{
              padding: 'var(--space-6)',
              background: 'rgba(239,68,68,0.1)',
              borderLeft: '3px solid var(--color-error)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-error)',
              fontSize: '13px',
            }}
          >
            {error}
          </div>
        )}

        {/* Lista de categorias */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          {categories.map((cat, idx) => (
            <div
              key={cat.id}
              style={{
                display: 'flex',
                alignItems: isMobile ? 'flex-start' : 'center',
                gap: 'var(--space-4)',
                padding: 'var(--space-4)',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                flexWrap: isMobile ? 'wrap' : 'nowrap',
              }}
            >
              {/* Drag handle */}
              <button
                onClick={() => idx > 0 && handleReorder(idx, idx - 1)}
                title="Mover para cima"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'grab',
                  color: 'var(--color-text-muted)',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <GripVertical size={16} />
              </button>

              {/* Color dot */}
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: 'var(--radius-full)',
                  background: cat.color,
                  flexShrink: 0,
                }}
              />

              {/* Content */}
              {editingId === cat.id ? (
                <div style={{ display: 'flex', gap: 'var(--space-3)', flex: 1, alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : 'row', minWidth: 0 }}>
                  <input
                    autoFocus
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    style={{
                      flex: 1,
                      width: isMobile ? '100%' : undefined,
                      padding: '6px 10px',
                      background: 'var(--color-input-bg)',
                      border: '1px solid var(--color-input-border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-text-primary)',
                      fontSize: '13px',
                    }}
                  />

                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    {COLOR_PRESETS.map((col) => (
                      <button
                        key={col}
                        onClick={() => setNewColor(col)}
                        title="Selecionar cor"
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: 'var(--radius-full)',
                          background: col,
                          border: newColor === col ? '2px solid var(--color-accent-blue)' : '1px solid transparent',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      />
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--space-2)', width: isMobile ? '100%' : undefined, justifyContent: isMobile ? 'flex-end' : undefined }}>
                    <button
                      onClick={() => handleUpdate(cat.id, newName, newColor, newIcon)}
                      disabled={isPending}
                      style={{
                        padding: '6px 12px',
                        background: 'var(--color-primary)',
                        color: '#111111',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Salvar
                    </button>

                    <button
                      onClick={() => setEditingId(null)}
                      style={{
                        padding: '6px 12px',
                        background: 'transparent',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: 'var(--color-text-primary)',
                        margin: 0,
                      }}
                    >
                      {cat.name}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setEditingId(cat.id)
                      setNewName(cat.name)
                      setNewColor(cat.color)
                      setNewIcon(cat.icon || '')
                    }}
                    style={{
                      padding: '6px 12px',
                      background: 'transparent',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      color: 'var(--color-text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => handleDelete(cat.id)}
                    style={{
                      padding: '6px 10px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-error)',
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add new */}
        {!showAdd ? (
          <button
            onClick={() => {
              setShowAdd(true)
              setNewName('')
              setNewColor('#3B82F6')
              setNewIcon('')
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-4)',
              background: 'transparent',
              border: '2px dashed var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--color-accent-blue)',
              fontWeight: 500,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            <Plus size={18} />
            Adicionar Categoria
          </button>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: isMobile ? 'stretch' : 'center',
              flexDirection: isMobile ? 'column' : 'row',
              gap: 'var(--space-4)',
              padding: 'var(--space-4)',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '2px solid var(--color-accent-blue)',
            }}
          >
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: 'var(--radius-full)',
                background: newColor,
                flexShrink: 0,
              }}
            />

            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome da categoria"
              style={{
                flex: 1,
                width: isMobile ? '100%' : undefined,
                padding: '6px 10px',
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-primary)',
                fontSize: '14px',
                outline: 'none',
              }}
            />

            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {COLOR_PRESETS.map((col) => (
                <button
                  key={col}
                  onClick={() => setNewColor(col)}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: 'var(--radius-full)',
                    background: col,
                    border: newColor === col ? '2px solid var(--color-accent-blue)' : '1px solid transparent',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)', width: isMobile ? '100%' : undefined, justifyContent: isMobile ? 'flex-end' : undefined }}>
              <button
                onClick={handleCreate}
                disabled={isPending}
                style={{
                  padding: '6px 14px',
                  background: 'var(--color-primary)',
                  color: '#111111',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Criar
              </button>

              <button
                onClick={() => setShowAdd(false)}
                style={{
                  padding: '6px 14px',
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
