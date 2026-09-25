# Design System — Tetra Educação

---

## 0. Temas: Claro e Escuro

A plataforma suporta dois modos visuais: **Dark** (padrão) e **Light**. O tema é controlado via atributo `data-theme` no elemento `<html>` e também respeita automaticamente a preferência do sistema operacional via `prefers-color-scheme`.

### Estratégia

Todos os valores de cor são definidos como **CSS Custom Properties (variáveis)** na raiz. Os componentes **nunca usam valores hexadecimais diretamente** — sempre consomem os tokens (`var(--color-background)`, `var(--color-text-primary)`, etc.).

### Tokens por tema

| Token | Dark | Light |
|---|---|---|
| `--color-background` | `#111111` | `#F4F4F5` |
| `--color-surface` | `#1A1A1A` | `#FFFFFF` |
| `--color-surface-elevated` | `#222222` | `#F0F0F0` |
| `--color-border` | `#2C2C2C` | `#E2E2E2` |
| `--color-border-subtle` | `#1F1F1F` | `#EBEBEB` |
| `--color-text-primary` | `#FFFFFF` | `#111111` |
| `--color-text-secondary` | `#A0A0A0` | `#555555` |
| `--color-text-muted` | `#555555` | `#AAAAAA` |
| `--color-text-inverse` | `#111111` | `#FFFFFF` |
| `--color-btn-cta-bg` | `#FFFFFF` | `#111111` |
| `--color-btn-cta-text` | `#111111` | `#FFFFFF` |
| `--color-input-bg` | `#1A1A1A` | `#FFFFFF` |
| `--color-input-border` | `#2C2C2C` | `#D0D0D0` |

### Tokens fixos (invariantes)

| Token | Hex | Uso |
|---|---|---|
| `--color-primary` | `#00FF85` | CTAs, checkboxes ativos |
| `--color-primary-dark` | `#00CC6A` | Hover botão verde |
| `--color-accent-blue` | `#3B82F6` | Sidebar ativa, links |
| `--color-accent-red` | `#FF4757` | Alertas, ao vivo |
| `--color-accent-orange` | `#F59E0B` | Badges pendentes |
| `--color-success` | `#22C55E` | Status ativo |
| `--color-warning` | `#F59E0B` | Pendente |
| `--color-error` | `#EF4444` | Bloqueado |
| `--color-live` | `#FF4757` | Indicador ao vivo |

---

## 1. Tipografia

```css
font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

| Token | Size | Weight | Uso |
|---|---|---|---|
| `--text-xs` | `11px` | 400 | Labels de ícones, badges |
| `--text-sm` | `13px` | 400 | Corpo secundário |
| `--text-base` | `14px` | 400 | Texto padrão |
| `--text-md` | `16px` | 500 | Labels, subtítulos |
| `--text-lg` | `18px` | 600 | Títulos de card |
| `--text-xl` | `22px` | 600 | Títulos de página |
| `--text-2xl` | `28px` | 700 | Títulos principais |
| `--text-3xl` | `36px` | 700 | Headlines |

---

## 2. Border Radius

| Token | Valor | Uso |
|---|---|---|
| `--radius-sm` | `6px` | Badges, tags |
| `--radius-md` | `10px` | Botões, inputs |
| `--radius-lg` | `14px` | Cards padrão |
| `--radius-xl` | `18px` | Cards grandes, modais |
| `--radius-full` | `9999px` | Avatares, pills |

---

## 3. Espaçamento (múltiplos de 4px)

| Token | Valor |
|---|---|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `20px` |
| `--space-6` | `24px` |
| `--space-8` | `32px` |
| `--space-10` | `40px` |
| `--space-12` | `48px` |

---

## 4. Sombras

| Token | Dark | Light |
|---|---|---|
| `--shadow-card` | `0 4px 16px rgba(0,0,0,0.4)` | `0 2px 8px rgba(0,0,0,0.08)` |
| `--shadow-modal` | `0 8px 32px rgba(0,0,0,0.6)` | `0 8px 32px rgba(0,0,0,0.15)` |
| `--shadow-dropdown` | `0 4px 12px rgba(0,0,0,0.5)` | `0 4px 12px rgba(0,0,0,0.10)` |

---

## 5. Iconografia

**Biblioteca:** Lucide Icons — estilo outline, stroke `1.5`.

| Contexto | Tamanho |
|---|---|
| Inline em texto / botão | `16px` |
| Padrão (sidebar, inputs) | `20px` |
| Destaque (header, card) | `24px` |
| Empty state / modal | `48px` |

---

## 6. Sidebar

```css
.sidebar {
  width: 60px; /* expandida: 240px */
  background: var(--color-background);
  border-right: 1px solid var(--color-border-subtle);
}
.nav-item--active {
  border-left: 2px solid var(--color-accent-blue);
  background: rgba(59,130,246,0.1);
  color: var(--color-text-primary);
}
```

---

## 7. Componentes

### Botão Primário (CTA)
- Dark: fundo branco, texto preto. Light: fundo preto, texto branco.
- `background: var(--color-btn-cta-bg)` / `color: var(--color-btn-cta-text)`

### Botão Upgrade (verde neon)
- `background: var(--color-primary)` (`#00FF85`) — fixo, igual em ambos os temas
- Texto: `#111111` para contraste

### Ghost / Outline
- `border: 1px solid var(--color-btn-ghost-border)` / `color: var(--color-btn-ghost-text)`

### Input
- `background: var(--color-input-bg)` / `border: 1px solid var(--color-input-border)`
- Focus: `border-color: var(--color-accent-blue)`

### Checkbox marcado
- `background: var(--color-primary)` / `border-color: var(--color-primary)` — fixo

### Badge / Status
- success: `rgba(34,197,94,0.15)` bg + `var(--color-success)` text
- warning: `rgba(245,158,11,0.15)` bg + `var(--color-warning)` text
- error: `rgba(239,68,68,0.15)` bg + `var(--color-error)` text

---

## 8. Regras fundamentais

- **Nunca usar hex fixo** em componentes para superfícies, texto, bordas ou sombras.
- **Sempre `var(--color-*)`** para qualquer cor que mude por tema.
- **Cores de marca e status são invariantes** (`--color-primary`, `--color-live`, etc.).
- **Ícones usam `currentColor`** — adaptam-se ao tema automaticamente.
