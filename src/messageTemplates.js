// @ts-nocheck
export const WORKSHOP_STAGES = [
  "RECEPCIÓN",
  "ESPERA DE AUTORIZACIÓN",
  "DESARMADO",
  "ENDEREZADO",
  "PREPARACIÓN",
  "CABINA DE PINTURA",
  "ARMADO",
  "PULIDO",
  "CONTROL DE CALIDAD"
];

export const STATUS_MESSAGE_TEMPLATES = {
  "RECEPCIÓN": "Hola {{nombre_cliente}}, hemos recibido tu {{marca_modelo}} con placa {{placa}} en Taller Fonseca. Nuestro equipo ya inició el proceso de revisión inicial.",
  "ESPERA DE AUTORIZACIÓN": "Hola {{nombre_cliente}}, tu {{marca_modelo}} con placa {{placa}} se encuentra en espera de autorización. Te mantendremos al tanto para continuar sin demoras.",
  "DESARMADO": "Hola {{nombre_cliente}}, te informamos que tu {{marca_modelo}} con placa {{placa}} entró en la etapa de desarmado para evaluar y reparar cada componente con precisión.",
  "ENDEREZADO": "Hola {{nombre_cliente}}, tu {{marca_modelo}} con placa {{placa}} ya está en proceso de enderezado estructural. Estamos avanzando con control técnico en cada ajuste.",
  "PREPARACIÓN": "Hola {{nombre_cliente}}, tu {{marca_modelo}} con placa {{placa}} pasó a preparación. Estamos trabajando la superficie para asegurar un acabado de alta calidad.",
  "CABINA DE PINTURA": "Hola {{nombre_cliente}}, te informamos que tu {{marca_modelo}} con placa {{placa}} ya ha ingresado a la cabina de pintura. Estamos cuidando cada detalle del acabado.",
  "ARMADO": "Hola {{nombre_cliente}}, tu {{marca_modelo}} con placa {{placa}} está en etapa de armado. Estamos reinstalando las piezas y verificando funcionamiento general.",
  "PULIDO": "Hola {{nombre_cliente}}, tu {{marca_modelo}} con placa {{placa}} se encuentra en pulido final. Estamos afinando los detalles para una entrega impecable.",
  "CONTROL DE CALIDAD": "Hola {{nombre_cliente}}, tu {{marca_modelo}} con placa {{placa}} ingresó a control de calidad. Estamos realizando la revisión final para garantizar el resultado esperado."
};

const STAGE_ALIASES = {
  "RECEPCION": "RECEPCIÓN",
  "ESPERA DE AUTORIZACION": "ESPERA DE AUTORIZACIÓN",
  "PREPARACION": "PREPARACIÓN",
  "CABINA DE PINTURA": "CABINA DE PINTURA",
  "CONTROL DE CALIDAD": "CONTROL DE CALIDAD"
};

const normalizeToken = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export const normalizeWorkshopStage = (stage) => {
  const normalized = normalizeToken(stage);
  return STAGE_ALIASES[normalized] || WORKSHOP_STAGES.find((item) => normalizeToken(item) === normalized) || String(stage || "");
};

export const fillMessageTemplate = (template, variables = {}) => {
  return String(template || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return String(variables[key] ?? "").trim();
  });
};

export const getStatusTemplate = (stage) => {
  const key = normalizeWorkshopStage(stage);
  return STATUS_MESSAGE_TEMPLATES[key] || "Hola {{nombre_cliente}}, tu {{marca_modelo}} con placa {{placa}} cambió de estatus a {{estatus}}.";
};

export const getStatusMessage = (vehiculo, nuevoEstatus) => {
  const nombreCliente = vehiculo?.cliente_nombre || vehiculo?.cliente || "cliente";
  const marcaModelo = vehiculo?.marca_modelo || [vehiculo?.marca, vehiculo?.modelo].filter(Boolean).join(" ") || "vehículo";
  const placa = vehiculo?.placa || "sin placa";
  const normalizedStage = normalizeWorkshopStage(nuevoEstatus);

  return fillMessageTemplate(getStatusTemplate(normalizedStage), {
    nombre_cliente: nombreCliente,
    marca_modelo: marcaModelo,
    placa,
    estatus: normalizedStage
  });
};