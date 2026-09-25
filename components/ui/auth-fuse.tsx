"use client";

import * as React from "react";
import { useState, useId, useEffect, useTransition } from "react";
import { Eye, EyeOff, Sun, Moon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// ─── Theme Toggle ──────────────────────────────────────────────────────────────

function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme") as "dark" | "light";
    setTheme(current ?? "dark");
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    setTheme(next);
  };

  return (
    <button
      onClick={toggle}
      aria-label="Alternar tema"
      style={{
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: "var(--color-text-secondary)",
        padding: "6px",
        borderRadius: "var(--radius-sm)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "color var(--transition-fast)",
      }}
    >
      {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}

// ─── Typewriter ────────────────────────────────────────────────────────────────

function Typewriter({ text, speed = 60 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setDisplayed("");
    setIndex(0);
  }, [text]);

  useEffect(() => {
    if (index >= text.length) return;
    const t = setTimeout(() => {
      setDisplayed((p) => p + text[index]);
      setIndex((p) => p + 1);
    }, speed);
    return () => clearTimeout(t);
  }, [index, text, speed]);

  return (
    <span>
      {displayed}
      <span style={{ animation: "pulse 1s infinite" }}>|</span>
    </span>
  );
}

// ─── Input ─────────────────────────────────────────────────────────────────────

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { style, ...rest } = props;
  return (
    <input
      {...rest}
      style={{
        width: "100%",
        background: "var(--color-input-bg)",
        border: "1px solid var(--color-input-border)",
        borderRadius: "var(--radius-md)",
        padding: "10px 16px",
        color: "var(--color-input-text)",
        fontSize: "14px",
        outline: "none",
        transition: "border-color var(--transition-fast)",
        boxSizing: "border-box",
        ...style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "var(--color-accent-blue)";
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "var(--color-input-border)";
        props.onBlur?.(e);
      }}
    />
  );
}

// ─── PasswordInput ─────────────────────────────────────────────────────────────

function PasswordInput({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const id = useId();
  const [show, setShow] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {label && (
        <label
          htmlFor={id}
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--color-text-secondary)",
          }}
        >
          {label}
        </label>
      )}
      <div style={{ position: "relative" }}>
        <Input
          {...props}
          id={id}
          type={show ? "text" : "password"}
          style={{ paddingRight: "44px" }}
        />
        <button
          type="button"
          onClick={() => setShow((p) => !p)}
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-muted)",
          }}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

// ─── Label ─────────────────────────────────────────────────────────────────────

function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        fontSize: "13px",
        fontWeight: 500,
        color: "var(--color-text-secondary)",
      }}
    >
      {children}
    </label>
  );
}

// ─── SignInForm ────────────────────────────────────────────────────────────────

function SignInForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    startTransition(async () => {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authError.message);
      } else {
        router.push('/meudia');
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} autoComplete="on" noValidate style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "6px" }}>
          Acesse sua conta
        </h1>
        <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
          Informe seu e-mail e senha para entrar
        </p>
      </div>

      {error && (
        <div style={{
          background: "rgba(239,68,68,0.12)",
          border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: "var(--radius-sm)",
          padding: "10px 14px",
          fontSize: "13px",
          color: "var(--color-error)",
        }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <Label htmlFor="signin-email">E-mail</Label>
          <Input
            id="signin-email"
            name="email"
            type="email"
            placeholder="seu@email.com"
            required
            autoComplete="email"
            disabled={isPending}
          />
        </div>

        <PasswordInput
          name="password"
          label="Senha"
          required
          autoComplete="current-password"
          placeholder="Sua senha"
          disabled={isPending}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        style={{
          background: "var(--color-btn-cta-bg)",
          color: "var(--color-btn-cta-text)",
          border: "none",
          borderRadius: "var(--radius-md)",
          padding: "10px 20px",
          fontSize: "14px",
          fontWeight: 600,
          cursor: isPending ? "not-allowed" : "pointer",
          opacity: isPending ? 0.5 : 1,
          transition: "background var(--transition-fast)",
          width: "100%",
        }}
      >
        {isPending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}

// ─── SignUpForm ────────────────────────────────────────────────────────────────

function SignUpForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    startTransition(async () => {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) {
        setError(authError.message);
      } else {
        setSuccess('Verifique seu e-mail para confirmar o cadastro.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} autoComplete="on" noValidate style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "6px" }}>
          Crie sua conta
        </h1>
        <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
          Preencha seus dados para se cadastrar
        </p>
      </div>

      {error && (
        <div style={{
          background: "rgba(239,68,68,0.12)",
          border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: "var(--radius-sm)",
          padding: "10px 14px",
          fontSize: "13px",
          color: "var(--color-error)",
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          background: "rgba(34,197,94,0.12)",
          border: "1px solid rgba(34,197,94,0.3)",
          borderRadius: "var(--radius-sm)",
          padding: "10px 14px",
          fontSize: "13px",
          color: "var(--color-success)",
        }}>
          {success}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <Label htmlFor="signup-name">Nome completo</Label>
          <Input
            id="signup-name"
            name="name"
            type="text"
            placeholder="João da Silva"
            required
            autoComplete="name"
            disabled={isPending}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <Label htmlFor="signup-email">E-mail</Label>
          <Input
            id="signup-email"
            name="email"
            type="email"
            placeholder="seu@email.com"
            required
            autoComplete="email"
            disabled={isPending}
          />
        </div>

        <PasswordInput
          name="password"
          label="Senha"
          required
          autoComplete="new-password"
          placeholder="Crie uma senha"
          disabled={isPending}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        style={{
          background: "var(--color-btn-cta-bg)",
          color: "var(--color-btn-cta-text)",
          border: "none",
          borderRadius: "var(--radius-md)",
          padding: "10px 20px",
          fontSize: "14px",
          fontWeight: 600,
          cursor: isPending ? "not-allowed" : "pointer",
          opacity: isPending ? 0.5 : 1,
          width: "100%",
        }}
      >
        {isPending ? "Cadastrando..." : "Cadastrar"}
      </button>
    </form>
  );
}

// ─── AuthUI ────────────────────────────────────────────────────────────────────

export function AuthUI() {
  const [isSignIn, setIsSignIn] = useState(true);

  const imageUrl = isSignIn
    ? "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80"
    : "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=80";

  const quote = isSignIn
    ? "Bem-vindo de volta. A sua jornada continua."
    : "Crie uma conta. Um novo capítulo começa aqui.";

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      minHeight: "100vh",
      background: "var(--color-background)",
    }}>
      <style>{`
        input::placeholder { color: var(--color-text-muted); }
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear { display: none; }
        @media (max-width: 768px) {
          .auth-image-panel { display: none !important; }
          .auth-form-panel { grid-column: 1 / -1 !important; }
        }
      `}</style>

      {/* Painel do formulário */}
      <div
        className="auth-form-panel"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
          position: "relative",
        }}
      >
        {/* Theme toggle */}
        <div style={{ position: "absolute", top: "20px", right: "20px" }}>
          <ThemeToggle />
        </div>

        {/* Logo */}
        <div style={{ marginBottom: "48px", textAlign: "center" }}>
          <div style={{
            width: "40px",
            height: "40px",
            background: "var(--color-primary)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 10px",
          }}>
            <span style={{ color: "#111111", fontWeight: 700, fontSize: "16px" }}>T</span>
          </div>
          <span style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-text-primary)" }}>
            Tetra
          </span>
        </div>

        {/* Form */}
        <div style={{ width: "100%", maxWidth: "360px" }}>
          {isSignIn ? <SignInForm /> : <SignUpForm />}

          {/* Toggle */}
          <p style={{
            textAlign: "center",
            marginTop: "20px",
            fontSize: "13px",
            color: "var(--color-text-secondary)",
          }}>
            {isSignIn ? "Não tem uma conta?" : "Já tem uma conta?"}{" "}
            <button
              onClick={() => setIsSignIn((p) => !p)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--color-accent-blue)",
                fontSize: "13px",
                fontWeight: 500,
                padding: 0,
              }}
            >
              {isSignIn ? "Cadastre-se" : "Entrar"}
            </button>
          </p>

          {/* Divider */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            margin: "20px 0",
          }}>
            <div style={{ flex: 1, height: "1px", background: "var(--color-border)" }} />
            <span style={{ fontSize: "12px", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
              Ou continue com
            </span>
            <div style={{ flex: 1, height: "1px", background: "var(--color-border)" }} />
          </div>

          {/* Google */}
          <button
            type="button"
            style={{
              width: "100%",
              background: "transparent",
              border: "1px solid var(--color-btn-ghost-border)",
              borderRadius: "var(--radius-md)",
              padding: "10px 20px",
              color: "var(--color-btn-ghost-text)",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "background var(--transition-fast)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="Google"
              style={{ width: "16px", height: "16px" }}
            />
            Continuar com o Google
          </button>
        </div>
      </div>

      {/* Painel da imagem */}
      <div
        className="auth-image-panel"
        style={{
          position: "relative",
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transition: "background-image var(--transition-slow)",
        }}
      >
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 50%)",
        }} />
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "40px 32px",
          textAlign: "center",
        }}>
          <p style={{
            fontSize: "16px",
            fontWeight: 500,
            color: "#FFFFFF",
            marginBottom: "8px",
            lineHeight: 1.5,
          }}>
            &ldquo;<Typewriter key={quote} text={quote} />&rdquo;
          </p>
          <cite style={{
            fontSize: "13px",
            color: "rgba(255,255,255,0.6)",
            fontStyle: "normal",
          }}>
            — Tetra Educação
          </cite>
        </div>
      </div>
    </div>
  );
}
