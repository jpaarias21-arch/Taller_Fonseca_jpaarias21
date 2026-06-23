import { Phone, MapPin, Mail, Triangle } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="px-4 lg:px-6 py-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10">
          {/* Logo & branding */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-12 h-12 bg-fonseca-blue rounded-lg flex items-center justify-center border-2 border-fonseca-yellow relative">
              <Triangle size={24} className="text-white absolute" strokeWidth={2} />
              <span className="text-white font-display font-bold text-xs relative z-10">CPF</span>
            </div>
            <div>
              <p className="text-primary font-heading font-bold text-lg leading-tight">TALLER MECÁNICO FONSECA</p>
              <p className="text-accent-foreground font-semibold text-xs" style={{ color: 'hsl(var(--fonseca-red))' }}>Enderezado y Pintura</p>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px bg-border self-stretch" />

          {/* Contact info */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-primary flex-shrink-0" />
              <span>+506 2686-7444</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-primary flex-shrink-0" />
              <span>Costa Rica</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-primary flex-shrink-0" />
              <span>jafonsecah@yahoo.es</span>
            </div>
          </div>

          {/* Version */}
          <div className="md:ml-auto text-center md:text-right">
            <p className="text-muted-foreground text-xs">Sistema de Gestión v1.0</p>
            <p className="text-muted-foreground text-xs mt-0.5">© 2026 Taller Fonseca. Todos los derechos reservados.</p>
          </div>
        </div>
      </div>
      {/* Red stripe accent */}
      <div className="h-1" style={{ background: 'linear-gradient(90deg, hsl(var(--fonseca-blue)) 0%, hsl(var(--fonseca-yellow)) 50%, hsl(var(--fonseca-red)) 100%)' }} />
    </footer>
  );
}