# Taller_Fonseca_jpaarias21

## WhatsApp automático por backend

El flujo actual permite confirmar el mensaje dentro de la app y enviarlo automáticamente por backend usando una Supabase Edge Function.

### 1) Configurar secretos en Supabase

Defina estos secretos en su proyecto:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`

Ejemplo:

```bash
supabase secrets set WHATSAPP_ACCESS_TOKEN="<token_meta>"
supabase secrets set WHATSAPP_PHONE_NUMBER_ID="<phone_number_id>"
```

### 2) Desplegar función

```bash
supabase functions deploy send-whatsapp-status
```

### 2.1) Aplicar migración de logs

```bash
supabase db push
```

Esto crea la tabla `public.whatsapp_envios` para auditar cada intento de envío (éxito o error).

### 3) Probar desde la app

- Mueva un vehículo de estado en Kanban o en Detalle de orden.
- Revise el mensaje previo en el modal.
- Presione `Enviar automático`.

Si todo está bien configurado, el cliente recibirá el WhatsApp sin salir de la app.

### Auditoría

Cada envío queda registrado en `public.whatsapp_envios` con:

- `order_id`, `estado`, `placa`, `cliente`
- `telefono`, `mensaje`
- `status` (`sent` o `failed`)
- `provider_message_id` y `provider_response`
- `error` cuando aplique