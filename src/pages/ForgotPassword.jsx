// @ts-nocheck
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email);
      setSent(true);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : "No se pudo enviar el correo de recuperación. Intente de nuevo en unos minutos.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl mb-4 border-2 border-primary" style={{ backgroundColor: 'hsl(221,83%,28%)' }}>
            <span className="text-white font-display font-bold text-xl">CPF</span>
          </div>
          <h1 className="text-3xl font-heading font-bold uppercase tracking-wide text-foreground">Taller Fonseca</h1>
          <p className="text-muted-foreground text-sm mt-1">Sistema de Gestión de Taller</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-8 shadow-xl">
          <h2 className="text-xl font-heading font-bold uppercase tracking-wide mb-1">Recuperar Contraseña</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Ingrese su correo electrónico y le enviaremos un enlace para restablecer su contraseña.
          </p>

          {sent ? (
            <div className="text-center py-6 space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 border border-primary/20">
                <CheckCircle2 className="w-7 h-7 text-primary" />
              </div>
              <p className="text-sm text-foreground">
                Si existe una cuenta con ese correo, recibirá un enlace para restablecer su contraseña en breve.
              </p>
              <Button asChild className="w-full h-12 font-semibold">
                <Link to="/login">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver a Iniciar Sesión
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Correo Electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="usuario@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-background border-border"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-12 font-semibold text-base mt-2" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar Enlace de Recuperación"
                )}
              </Button>

              <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-primary hover:underline pt-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                Volver a Iniciar Sesión
              </Link>

              <p className="text-xs text-muted-foreground text-center pt-1">
                Revise spam/promociones y confirme que su correo esté escrito correctamente.
              </p>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 space-y-1">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Taller Mecánico Fonseca · +506 2686-7444
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            Software creado por <span className="text-primary/80 font-semibold">JP Ingeniería</span>
          </p>
        </div>
      </div>
    </div>
  );
}