import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function StatusChangeWhatsappModal({
  open,
  onOpenChange,
  stage,
  message,
  onMessageChange,
  onConfirm,
  isSubmitting,
  disableConfirm,
  disableReason
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar cambio de estatus y notificación</AlertDialogTitle>
          <AlertDialogDescription>
            El vehículo pasará a <span className="font-semibold text-foreground">{stage || "nuevo estatus"}</span>.
            Revise o edite el mensaje antes de enviarlo automáticamente al cliente por WhatsApp.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="status-whatsapp-message">
            Mensaje para el cliente
          </label>
          <Textarea
            id="status-whatsapp-message"
            value={message}
            onChange={(event) => onMessageChange(event.target.value)}
            rows={8}
            className="resize-none"
            placeholder="Escriba el mensaje para el cliente..."
          />
          {disableReason ? <p className="text-xs text-destructive">{disableReason}</p> : null}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
          <Button onClick={onConfirm} disabled={isSubmitting || disableConfirm}>
            {isSubmitting ? "Procesando..." : "Confirmar y Enviar"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
