// @ts-nocheck
import { supabase } from "@/lib/supabaseClient";
import jsPDF from "jspdf";

/* ───────────────────────────────────────────────
   PALETA DE COLORES INSTITUCIONALES (TALLER FONSECA)
   ─────────────────────────────────────────────── */
const AZUL = [26, 43, 76];        // #1A2B4C
const AZUL_CLARO = [52, 73, 112]; // #344970
const AMARILLO = [252, 209, 22];   // #FCD116
const ROJO = [217, 35, 42];        // #D9232A
const GRIS_TEXTO = [100, 100, 100];
const GRIS_CLARO = [238, 242, 246];
const GRIS_FONDO = [245, 247, 250];
const BLANCO = [255, 255, 255];
const NEGRO = [40, 40, 40];
const BORDE_SUAVE = [210, 215, 220];

/* ───────────────────────────────────────────────
   UTILIDADES DE FORMATEO (SIN UNICODE / SIN SÍMBOLOS ROTOS)
   ─────────────────────────────────────────────── */
const formatoMoneda = (v) => {
  const num = Number(v || 0);
  const enteroFormateado = Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `CRC ${enteroFormateado}`;
};

const formatoFecha = (fecha) => {
  if (!fecha) return "—";
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return String(fecha);
  return d.toLocaleDateString("es-CR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * Genera un PDF de cotización / proforma profesional con la línea gráfica de Taller Fonseca
 * @param {object} ordenActual - Datos de la orden de trabajo
 */
export async function generarReporteVehiculo(ordenActual) {
  if (!ordenActual?.placa) {
    alert("La orden actual no tiene una placa válida registrada.");
    return;
  }

  // ── 1. Consultar orden de trabajo ──
  const { data: ordenes, error: errOrdenes } = await supabase
    .from("orden_trabajo")
    .select("*")
    .eq("id", ordenActual.id)
    .limit(1);

  if (errOrdenes || !ordenes?.length) {
    console.error("Error al obtener la orden:", errOrdenes);
    alert("Ocurrió un error al consultar la orden de trabajo.");
    return;
  }

  const orden = ordenes[0];

  // ── 2. Consultar líneas de avalúo (TABLA ÚNICA: Repuestos y Mano de Obra) ──
  const { data: lineas, error: errLineas } = await supabase
    .from("linea_avaluo")
    .select("*")
    .eq("orden_id", orden.id);

  if (errLineas) {
    console.error("Error al obtener las líneas del avalúo:", errLineas);
  }

  const todasLineas = lineas || [];

  // ── 3. Crear documento PDF tamaño carta ──
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 15; // margen
  let y = 0;

  const asegurarEspacio = (necesario = 20) => {
    if (y + necesario > pageH - 25) {
      doc.addPage();
      y = M + 5;
      // Header compacto en páginas siguientes
      doc.setFillColor(...AZUL);
      doc.rect(0, 0, pageW, 8, "F");
      doc.setTextColor(...BLANCO);
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.text("Taller Mecanico Fonseca - Enderezado y Pintura - Tel: 2665-2046", pageW / 2, 5.5, { align: "center" });
      doc.setFillColor(...AMARILLO);
      doc.rect(0, 8, pageW, 0.8, "F");
    }
  };

  /* =========================================================
     ENCABEZADO INSTITUCIONAL DEDICADO
     ========================================================= */

  // Borde decorativo externo continuo
  doc.setDrawColor(...BORDE_SUAVE);
  doc.setLineWidth(0.5);
  doc.rect(M, 10, pageW - M * 2, pageH - 25, "S");

  // Bloque Logo (CPF)
  doc.setFillColor(...AZUL);
  doc.rect(M + 2, 14, 26, 18, "F");
  doc.setFillColor(...AMARILLO);
  doc.rect(M + 2, 14, 26, 2.5, "F");
  doc.setTextColor(...BLANCO);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("CPF", M + 15, 26, { align: "center" });

  // Bloque nombre taller (fondo amarillo)
  doc.setFillColor(...AMARILLO);
  doc.rect(M + 28, 14, 75, 18, "F");
  doc.setTextColor(...AZUL);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("TALLER MECANICO", M + 32, 19.5);
  doc.setFontSize(16);
  doc.text("FONSECA", M + 32, 27.5);

  // Barra roja (Enderezado y Pintura)
  doc.setFillColor(...ROJO);
  doc.rect(M + 2, 32, 101, 6, "F");
  doc.setTextColor(...BLANCO);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("Enderezado y Pintura", M + 52.5, 36.3, { align: "center" });

  // Datos del taller (derecha)
  doc.setTextColor(...AZUL);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Taller Fonseca", pageW - M - 2, 16.5, { align: "right" });

  doc.setTextColor(...GRIS_TEXTO);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const infoTaller = [
    "Carroceria, Pintura y Mecanica General",
    "50 m este de la entrada principal, Residencial Bosques Don Jose",
    "Telefonos: 2665-2046 / 2666-7444",
  ];
  infoTaller.forEach((linea, i) => {
    doc.text(linea, pageW - M - 2, 21 + i * 3.8, { align: "right" });
  });

  // Correo institucional
  doc.setTextColor(...AZUL);
  doc.setFont("helvetica", "bold");
  doc.text("E-mail:", pageW - M - 2, 33.2, { align: "right" });
  doc.setTextColor(...ROJO);
  doc.text("jafonsecah@yahoo.es", pageW - M - 2, 36.5, { align: "right" });

  /* =========================================================
     TÍTULO DEL DOCUMENTO + N° ORDEN + FECHA
     ========================================================= */
  y = 44;

  doc.setLineWidth(1.3);
  doc.setDrawColor(...AZUL);
  doc.line(M + 2, y, M + 2, y + 8);

  doc.setTextColor(...AZUL);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("PRESUPUESTO / COTIZACION", M + 8, y + 4.8);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRIS_TEXTO);
  doc.text(`Orden N: ${orden.numero_orden || orden.id.toString().slice(0, 8).toUpperCase()}`, M + 8, y + 9);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRIS_TEXTO);
  doc.text(`Fecha de emision: ${formatoFecha(new Date())}`, pageW - M - 2, y + 4.8, { align: "right" });

  doc.setFontSize(7);
  doc.setTextColor(...AMARILLO);
  doc.setFont("helvetica", "bold");
  doc.text(`Vigencia: 15 dias`, pageW - M - 2, y + 9, { align: "right" });

  y += 14;

  /* =========================================================
     TARJETAS: DATOS DEL CLIENTE Y VEHÍCULO
     ========================================================= */
  asegurarEspacio(24);

  const anchoTarjeta = (pageW - M * 2 - 4) / 2;
  const altoTarjeta = 20;

  // ── Tarjeta CLIENTE ──
  doc.setFillColor(...GRIS_FONDO);
  doc.roundedRect(M + 2, y, anchoTarjeta, altoTarjeta, 1.5, 1.5, "F");
  doc.setDrawColor(...BORDE_SUAVE);
  doc.setLineWidth(0.3);
  doc.roundedRect(M + 2, y, anchoTarjeta, altoTarjeta, 1.5, 1.5, "S");

  doc.setFillColor(...AZUL);
  doc.rect(M + 4, y + 1.5, 4, 9, "F");
  doc.setTextColor(...AZUL);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("CLIENTE", M + 10, y + 5.5);
  doc.setLineWidth(0.2);
  doc.setDrawColor(...BORDE_SUAVE);
  doc.line(M + 2, y + 8, M + 2 + anchoTarjeta, y + 8);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRIS_TEXTO);
  doc.text("Nombre:", M + 5, y + 12);
  doc.text("Telefono:", M + 5, y + 16.5);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NEGRO);
  doc.setFontSize(7.5);
  doc.text(String(orden.cliente_nombre || "—").toUpperCase(), M + 24, y + 12);
  doc.text(String(orden.cliente_telefono || "—"), M + 24, y + 16.5);

  // ── Tarjeta VEHÍCULO ──
  const tarjetaDerX = M + 4 + anchoTarjeta;
  doc.setFillColor(...GRIS_FONDO);
  doc.roundedRect(tarjetaDerX, y, anchoTarjeta, altoTarjeta, 1.5, 1.5, "F");
  doc.setDrawColor(...BORDE_SUAVE);
  doc.setLineWidth(0.3);
  doc.roundedRect(tarjetaDerX, y, anchoTarjeta, altoTarjeta, 1.5, 1.5, "S");

  doc.setFillColor(...AZUL);
  doc.rect(tarjetaDerX + 2, y + 1.5, 4, 9, "F");
  doc.setTextColor(...AZUL);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("VEHICULO", tarjetaDerX + 8, y + 5.5);
  doc.setLineWidth(0.2);
  doc.setDrawColor(...BORDE_SUAVE);
  doc.line(tarjetaDerX, y + 8, tarjetaDerX + anchoTarjeta, y + 8);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRIS_TEXTO);
  doc.text("Placa:", tarjetaDerX + 3, y + 12);
  doc.text("Vehiculo:", tarjetaDerX + 3, y + 16.5);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NEGRO);
  doc.setFontSize(7.5);
  doc.text(String(orden.placa || "—").toUpperCase(), tarjetaDerX + 18, y + 12);

  const descVehiculo = `${orden.marca || ""} ${orden.modelo || ""} ${orden.anio ? `(${orden.anio})` : ""}`.trim();
  doc.text((descVehiculo || "—").toUpperCase(), tarjetaDerX + 18, y + 16.5);

  y += altoTarjeta + 8;

  /* =========================================================
     TABLA OPTIMIZADA UNIFICADA DE TRABAJOS Y REPUESTOS
     ========================================================= */
  asegurarEspacio(24);

  const colXCant = M + 4;
  const colXDesc = M + 26;
  const colXPrecioU = pageW - M - 50;
  const colXSubtotal = pageW - M - 4;
  const anchoTabla = pageW - M * 2 - 4;

  // Encabezado principal de la tabla
  doc.setFillColor(...AZUL);
  doc.roundedRect(M + 2, y, anchoTabla, 7.5, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLANCO);
  doc.setFontSize(7.5);
  doc.text("CANT.", colXCant, y + 5.2);
  doc.text("DESCRIPCION / CONCEPTO", colXDesc, y + 5.2);
  doc.text("PRECIO UNIT.", colXPrecioU + 10, y + 5.2, { align: "right" });
  doc.text("SUBTOTAL", colXSubtotal, y + 5.2, { align: "right" });

  y += 8;

  let totalCotizado = 0;

  if (todasLineas.length === 0) {
    asegurarEspacio(12);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...GRIS_TEXTO);
    doc.setFontSize(8);
    doc.text("No hay repuestos o trabajos registrados en esta cotizacion.", M + 6, y + 4);
    y += 10;
  } else {
    todasLineas.forEach((l, idx) => {
      asegurarEspacio(7);

      // Sombreado alternado elegante (Zebra striping)
      if (idx % 2 === 1) {
        doc.setFillColor(...GRIS_FONDO);
        doc.rect(M + 2, y - 1, anchoTabla, 6.5, "F");
      }

      const cantidad = Math.max(1, Number(l.cantidad) || 1);
      const costoRepuesto = Number(l.costo_repuesto) || 0;
      const costoPintura = Number(l.costo_pintura) || 0;
      const montoDirecto = Number(l.subtotal) || 0;

      // Determinación precisa del subtotal
      let subtotal = (costoRepuesto * cantidad) + costoPintura;
      if (subtotal === 0 && montoDirecto > 0) {
        subtotal = montoDirecto;
      }

      const precioUnit = cantidad > 0 ? (subtotal / cantidad) : subtotal;
      const desc = String(l.pieza_nombre || l.concepto || l.descripcion_dano || "—").toUpperCase();

      totalCotizado += subtotal;

      // Columna CANTIDAD
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...NEGRO);
      doc.setFontSize(7.5);
      doc.text(String(cantidad), colXCant + 2, y + 3.5, { align: "center" });

      // Columna DESCRIPCION
      doc.text(desc, colXDesc, y + 3.5);

      // Columna PRECIO UNITARIO
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRIS_TEXTO);
      doc.setFontSize(7);
      doc.text(formatoMoneda(precioUnit), colXPrecioU + 10, y + 3.5, { align: "right" });

      // Columna SUBTOTAL
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...AZUL);
      doc.setFontSize(7.5);
      doc.text(formatoMoneda(subtotal), colXSubtotal, y + 3.5, { align: "right" });

      // Línea divisoria muy suave entre ítems
      doc.setDrawColor(240, 240, 240);
      doc.setLineWidth(0.2);
      doc.line(M + 2, y + 5.2, pageW - M - 2, y + 5.2);

      y += 6.5;
    });

    doc.setDrawColor(...BORDE_SUAVE);
    doc.setLineWidth(0.3);
    doc.line(M + 2, y, pageW - M - 2, y);
    y += 3;
  }

  /* =========================================================
     RESUMEN DE TOTALES
     ========================================================= */
  asegurarEspacio(24);

  const sumXLabel = pageW - M - 50;
  const sumXValue = pageW - M - 4;

  // Subtotal
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRIS_TEXTO);
  doc.text("Subtotal:", sumXLabel, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...AZUL);
  doc.setFontSize(9);
  doc.text(formatoMoneda(totalCotizado), sumXValue, y, { align: "right" });
  y += 5.5;

  // IVA
  const montoIVA = orden.iva ? Number(orden.iva) : 0;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRIS_TEXTO);
  doc.setFontSize(8);
  doc.text("I.V.A.:", sumXLabel, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...AZUL);
  doc.setFontSize(9);
  doc.text(formatoMoneda(montoIVA), sumXValue, y, { align: "right" });
  y += 6;

  // Línea separadora
  doc.setDrawColor(...AZUL);
  doc.setLineWidth(0.5);
  doc.line(sumXLabel - 3, y, sumXValue, y);
  y += 3;

  // Box del Gran Total
  const granTotal = totalCotizado + montoIVA;
  doc.setFillColor(...GRIS_FONDO);
  doc.rect(sumXLabel - 8, y - 2, 62, 10, "F");
  doc.setDrawColor(...AZUL);
  doc.setLineWidth(0.6);
  doc.rect(sumXLabel - 8, y - 2, 62, 10, "S");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...AZUL);
  doc.text("TOTAL:", sumXLabel, y + 5.5);
  doc.setTextColor(...ROJO);
  doc.setFontSize(13);
  doc.text(formatoMoneda(granTotal), sumXValue, y + 5.5, { align: "right" });

  y += 16;

  /* =========================================================
     NOTAS Y CONDICIONES
     ========================================================= */
  asegurarEspacio(28);

  doc.setDrawColor(...BORDE_SUAVE);
  doc.setLineWidth(0.4);
  doc.roundedRect(M + 2, y, anchoTabla, 26, 2, 2, "D");

  doc.setFillColor(...AZUL);
  doc.roundedRect(M + 4, y + 2, 55, 5, 1, 1, "F");
  doc.setTextColor(...BLANCO);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("NOTAS IMPORTANTES", M + 6, y + 5.5);

  doc.setTextColor(...GRIS_TEXTO);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  const notas = [
    "1. Este documento constituye un presupuesto estimado de los trabajos y repuestos requeridos.",
    "2. Los precios estan sujetos a cambios sin previo aviso segun disponibilidad del mercado.",
    "3. Cualquier trabajo adicional no contemplado sera cotizado y facturado por separado.",
    "4. Valido por 15 dias habiles a partir de la fecha de emision.",
  ];
  notas.forEach((n, i) => {
    doc.text(n, M + 6, y + 10 + i * 4);
  });

  y += 30;

  /* =========================================================
     FIRMAS Y DATOS LEGALES
     ========================================================= */
  asegurarEspacio(24);

  doc.setDrawColor(...BORDE_SUAVE);
  doc.setLineWidth(0.4);
  doc.line(M + 5, y + 6, M + 65, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRIS_TEXTO);
  doc.setFontSize(7);
  doc.text("Firma del Cliente", M + 5, y + 10);

  doc.line(pageW - M - 65, y + 6, pageW - M - 5, y + 6);
  doc.text("Taller Mecanico Fonseca", pageW - M - 65, y + 10);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...AZUL);
  doc.setFontSize(6.5);
  doc.text("Ced. Juridica: 3-002-456789", M + 5, y + 15);
  doc.text("Ced. Fisica: 1-0512-0345", pageW - M - 65, y + 15);

  y += 22;

  /* =========================================================
     FOOTER INSTITUCIONAL REPETIBLE
     ========================================================= */
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...AZUL);
    doc.rect(M + 2, pageH - 16, pageW - M * 2 - 4, 8, "F");
    doc.setFillColor(...AMARILLO);
    doc.rect(M + 2, pageH - 16, pageW - M * 2 - 4, 0.8, "F");

    doc.setTextColor(...BLANCO);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text("Taller Mecanico Fonseca - Enderezado y Pintura - Tel: 2665-2046 / 2666-7444", pageW / 2, pageH - 12.2, { align: "center" });
    doc.setFont("helvetica", "italic");
    doc.setFontSize(5.5);
    doc.text("Email: jafonsecah@yahoo.es - 50 m este de la entrada principal, Residencial Bosques Don Jose", pageW / 2, pageH - 9, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(150, 150, 150);
    const pagText = i > 1 ? `Pagina ${i} de ${pageCount}` : "";
    doc.text(pagText, pageW - M - 4, pageH - 6.5, { align: "right" });
  }

  // ── Guardar archivo PDF ──
  const nombreArchivo = `Cotizacion_${orden.placa || "Vehiculo"}_${(orden.numero_orden || orden.id).toString().slice(0, 8)}.pdf`;
  doc.save(nombreArchivo);
}