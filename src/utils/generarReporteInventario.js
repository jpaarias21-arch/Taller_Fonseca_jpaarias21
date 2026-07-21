// @ts-nocheck
import jsPDF from "jspdf";

/* ───────────────────────────────────────────────
   PALETA DE COLORES INSTITUCIONALES
   ─────────────────────────────────────────────── */
const AZUL = [26, 43, 76];
const AMARILLO = [252, 209, 22];
const ROJO = [217, 35, 42];
const GRIS_TEXTO = [100, 100, 100];
const GRIS_CLARO = [238, 242, 246];
const GRIS_FONDO = [245, 247, 250];
const BLANCO = [255, 255, 255];
const NEGRO = [40, 40, 40];
const BORDE_SUAVE = [210, 215, 220];
const VERDE = [34, 180, 90];
const NARANJA = [255, 160, 50];
const GRIS_MEDIO = [160, 165, 170];

/* ───────────────────────────────────────────────
   UTILIDADES
   ─────────────────────────────────────────────── */
const formatoMoneda = (v) =>
  "₡" + Number(v || 0).toLocaleString("es-CR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

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

const formatoFechaCorta = (fecha) => {
  if (!fecha) return "—";
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return String(fecha);
  return d.toLocaleDateString("es-CR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

/**
 * Genera un PDF profesional del inventario actual con la línea gráfica de Taller Fonseca
 * @param {Array} productos - Lista de productos del inventario
 */
export async function generarReporteInventario(productos) {
  if (!productos?.length) {
    alert("No hay productos en el inventario para generar el reporte.");
    return;
  }

  // ── Calcular estadísticas ──
  const totalSKUs = productos.length;
  const totalValorInventario = productos.reduce(
    (acc, p) => acc + (Number(p.stock_actual) || 0) * (Number(p.precio_unitario) || 0),
    0
  );
  const bajoStock = productos.filter((p) => Number(p.stock_actual) <= Number(p.stock_minimo));
  const repuestos = productos.filter((p) => p.tipo === "Repuesto Físico").length;
  const consumibles = productos.filter((p) => p.tipo === "Consumible Químico").length;

  // ── Crear documento ──
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 15;
  let y = 0;

  const asegurarEspacio = (necesario = 20) => {
    if (y + necesario > pageH - 25) {
      doc.addPage();
      y = M + 5;
      doc.setFillColor(...AZUL);
      doc.rect(0, 0, pageW, 8, "F");
      doc.setTextColor(...BLANCO);
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.text("Taller Mecánico Fonseca · Enderezado y Pintura · Tel: 2665-2046", pageW / 2, 5.5, { align: "center" });
      doc.setFillColor(...AMARILLO);
      doc.rect(0, 8, pageW, 0.8, "F");
    }
  };

  /* =========================================================
     ENCABEZADO INSTITUCIONAL
     ========================================================= */
  doc.setDrawColor(...BORDE_SUAVE);
  doc.setLineWidth(0.5);
  doc.rect(M, 10, pageW - M * 2, pageH - 25, "S");

  // ── Bloque Logo ──
  doc.setFillColor(...AZUL);
  doc.rect(M + 2, 14, 26, 18, "F");
  doc.setFillColor(...AMARILLO);
  doc.rect(M + 2, 14, 26, 2.5, "F");
  doc.setTextColor(...BLANCO);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("INV", M + 15, 26, { align: "center" });

  // ── Bloque nombre taller ──
  doc.setFillColor(...AMARILLO);
  doc.rect(M + 28, 14, 75, 18, "F");
  doc.setTextColor(...AZUL);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("TALLER MECÁNICO", M + 32, 19.5);
  doc.setFontSize(16);
  doc.text("FONSECA", M + 32, 27.5);

  // ── Barra roja ──
  doc.setFillColor(...ROJO);
  doc.rect(M + 2, 32, 101, 6, "F");
  doc.setTextColor(...BLANCO);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("Enderezado y Pintura", M + 52.5, 36.3, { align: "center" });

  // ── Datos del taller (derecha) ──
  doc.setTextColor(...AZUL);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Taller Fonseca", pageW - M - 2, 16.5, { align: "right" });

  doc.setTextColor(...GRIS_TEXTO);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const infoTaller = [
    "Carrocería, Pintura y Mecánica General",
    "50 m este de la entrada principal, Residencial Bosques Don José",
    "Teléfonos: 2665-2046 / 2666-7444",
  ];
  infoTaller.forEach((linea, i) => {
    doc.text(linea, pageW - M - 2, 21 + i * 3.8, { align: "right" });
  });
  doc.setTextColor(...AZUL);
  doc.setFont("helvetica", "bold");
  doc.text("E-mail:", pageW - M - 2, 33.2, { align: "right" });
  doc.setTextColor(...ROJO);
  doc.text("jafonsecah@yahoo.es", pageW - M - 2, 36.5, { align: "right" });

  /* =========================================================
     TÍTULO DEL DOCUMENTO
     ========================================================= */
  y = 44;

  doc.setLineWidth(1.3);
  doc.setDrawColor(...AZUL);
  doc.line(M + 2, y, M + 2, y + 8);

  doc.setTextColor(...AZUL);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("REPORTE DE INVENTARIO", M + 8, y + 4.8);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRIS_TEXTO);
  doc.text(`Generado el: ${formatoFecha(new Date())}`, M + 8, y + 9);

  doc.setFontSize(7);
  doc.setTextColor(...AMARILLO);
  doc.setFont("helvetica", "bold");
  doc.text(`${totalSKUs} producto(s) registrados`, pageW - M - 2, y + 9, { align: "right" });

  y += 14;

  /* =========================================================
     TARJETAS DE ESTADÍSTICAS (4 indicadores)
     ========================================================= */
  asegurarEspacio(24);

  const anchoTarjetaEst = (pageW - M * 2 - 8) / 4;

  const stats = [
    { label: "Total SKUs", value: String(totalSKUs), color: AZUL, icon: "📦" },
    { label: "Stock Bajo", value: String(bajoStock.length), color: NARANJA, icon: "⚠" },
    { label: "Valor Inventario", value: formatoMoneda(totalValorInventario), color: VERDE, icon: "₡" },
    { label: "Repuestos / Quím.", value: `${repuestos} / ${consumibles}`, color: AZUL, icon: "⚙" },
  ];

  stats.forEach((stat, i) => {
    const x = M + 2 + i * (anchoTarjetaEst + 2);

    doc.setFillColor(...GRIS_FONDO);
    doc.roundedRect(x, y, anchoTarjetaEst, 18, 1.5, 1.5, "F");
    doc.setDrawColor(...BORDE_SUAVE);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, anchoTarjetaEst, 18, 1.5, 1.5, "S");

    // Barra izquierda decorativa
    doc.setFillColor(...stat.color);
    doc.rect(x + 0.5, y + 2, 1.5, 14, "F");

    doc.setTextColor(...GRIS_TEXTO);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text(stat.label.toUpperCase(), x + 4, y + 5);

    doc.setTextColor(...stat.color);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(stat.value, x + 4, y + 13.5);
  });

  y += 24;

  /* =========================================================
     TABLA PRINCIPAL DE PRODUCTOS
     ========================================================= */
  asegurarEspacio(24);

  const colXProd = M + 4;
  const colXTipo = M + 62;
  const colXCat = M + 92;
  const colXStock = M + 128;
  const colXPrecio = M + 153;
  const colXTotal = pageW - M - 4;
  const anchoTabla = pageW - M * 2 - 4;

  // ── Encabezado de tabla ──
  doc.setFillColor(...AZUL);
  doc.roundedRect(M + 2, y, anchoTabla, 7.5, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLANCO);
  doc.setFontSize(7);
  doc.text("PRODUCTO", colXProd, y + 5.2);
  doc.text("TIPO", colXTipo, y + 5.2);
  doc.text("CATEGORÍA", colXCat, y + 5.2);
  doc.text("STOCK", colXStock, y + 5.2);
  doc.text("PRECIO UNIT.", colXPrecio, y + 5.2, { align: "right" });
  doc.text("VALOR TOTAL", colXTotal, y + 5.2, { align: "right" });

  y += 8;

  // ── Ordenar productos: bajo stock primero, luego por nombre ──
  const ordenados = [...productos].sort((a, b) => {
    const aBajo = Number(a.stock_actual) <= Number(a.stock_minimo) ? 0 : 1;
    const bBajo = Number(b.stock_actual) <= Number(b.stock_minimo) ? 0 : 1;
    if (aBajo !== bBajo) return aBajo - bBajo;
    return (a.nombre || "").localeCompare(b.nombre || "");
  });

  ordenados.forEach((prod, idx) => {
    asegurarEspacio(7.5);

    const cantidad = Number(prod.stock_actual) || 0;
    const minimo = Number(prod.stock_minimo) || 0;
    const precio = Number(prod.precio_unitario) || 0;
    const valorTotal = cantidad * precio;
    const esBajoStock = cantidad <= minimo;

    // Alternancia / alerta de fila
    if (esBajoStock) {
      doc.setFillColor(255, 245, 230);
      doc.rect(M + 2, y - 1, anchoTabla, 7, "F");
    } else if (idx % 2 === 1) {
      doc.setFillColor(...GRIS_FONDO);
      doc.rect(M + 2, y - 1, anchoTabla, 7, "F");
    }

    // Barra lateral (rojo si bajo stock)
    if (esBajoStock) {
      doc.setFillColor(...NARANJA);
      doc.rect(M + 2, y - 1, 1.2, 7, "F");
    } else {
      doc.setFillColor(...BORDE_SUAVE);
      doc.rect(M + 2, y - 1, 1.2, 7, "F");
    }

    const nombre = String(prod.nombre || "—").toUpperCase();
    const tipo = prod.tipo || "—";
    const categoria = prod.categoria || "—";

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...NEGRO);
    doc.setFontSize(7);
    doc.text(nombre, colXProd + 2, y + 4, { maxWidth: 54 });

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRIS_TEXTO);
    doc.setFontSize(6);
    doc.text(tipo, colXTipo, y + 4, { maxWidth: 28 });

    doc.text(categoria, colXCat, y + 4, { maxWidth: 32 });

    // Stock: resaltar si bajo
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    if (esBajoStock) {
      doc.setTextColor(...NARANJA);
    } else {
      doc.setTextColor(...AZUL);
    }
    doc.text(`${cantidad} / ${minimo}`, colXStock + 3, y + 4, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRIS_TEXTO);
    doc.setFontSize(6.5);
    doc.text(formatoMoneda(precio), colXPrecio + 3, y + 4, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...AZUL);
    doc.setFontSize(7);
    doc.text(formatoMoneda(valorTotal), colXTotal, y + 4, { align: "right" });

    y += 7;
  });

  /* =========================================================
     RESUMEN / PIE DE TABLA
     ========================================================= */
  asegurarEspacio(16);

  // ── Línea separadora ──
  doc.setDrawColor(...AZUL);
  doc.setLineWidth(0.4);
  doc.line(M + 2, y, pageW - M - 2, y);
  y += 3;

  // ── Totales compactos ──
  const sumXLabel = pageW - M - 55;
  const sumXValue = pageW - M - 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...GRIS_TEXTO);
  doc.text("Valor Total del Inventario:", sumXLabel, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...AZUL);
  doc.setFontSize(9);
  doc.text(formatoMoneda(totalValorInventario), sumXValue, y, { align: "right" });
  y += 5.5;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRIS_TEXTO);
  doc.setFontSize(7.5);
  doc.text("Cantidad de Productos:", sumXLabel, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...AZUL);
  doc.setFontSize(9);
  doc.text(String(totalSKUs), sumXValue, y, { align: "right" });
  y += 5.5;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...NARANJA);
  doc.setFontSize(7.5);
  doc.text("Productos con Stock Bajo:", sumXLabel, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...ROJO);
  doc.setFontSize(9);
  doc.text(String(bajoStock.length), sumXValue, y, { align: "right" });

  y += 12;

  /* =========================================================
     LISTA DE PRODUCTOS CON STOCK BAJO
     ========================================================= */
  if (bajoStock.length > 0) {
    asegurarEspacio(22);

    doc.setDrawColor(...BORDE_SUAVE);
    doc.setLineWidth(0.4);
    doc.roundedRect(M + 2, y, anchoTabla, 18 + bajoStock.length * 3.5, 2, 2, "D");

    doc.setFillColor(...NARANJA);
    doc.roundedRect(M + 4, y + 2, 50, 5, 1, 1, "F");
    doc.setTextColor(...BLANCO);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("⚠ STOCK BAJO (ALERTA)", M + 6, y + 5.5);

    doc.setTextColor(...GRIS_TEXTO);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");

    bajoStock.forEach((p, i) => {
      const cant = Number(p.stock_actual) || 0;
      const min = Number(p.stock_minimo) || 0;
      const deficit = min - cant;
      doc.text(
        `${i + 1}. ${p.nombre} — Stock: ${cant} / ${min} (faltan ${deficit} ${p.unidad || "uds"})`,
        M + 6,
        y + 10 + i * 4
      );
    });

    y += 18 + bajoStock.length * 3.5 + 6;
  }

  /* =========================================================
     FIRMAS
     ========================================================= */
  asegurarEspacio(24);

  doc.setDrawColor(...BORDE_SUAVE);
  doc.setLineWidth(0.4);
  doc.line(M + 5, y + 6, M + 65, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRIS_TEXTO);
  doc.setFontSize(7);
  doc.text("Responsable del Taller", M + 5, y + 10);

  doc.line(pageW - M - 65, y + 6, pageW - M - 5, y + 6);
  doc.text("Taller Mecánico Fonseca", pageW - M - 65, y + 10);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...AZUL);
  doc.setFontSize(6.5);
  doc.text("Céd. Jurídica: 3-002-456789", M + 5, y + 15);
  doc.text("Céd. Física: 1-0512-0345", pageW - M - 65, y + 15);

  y += 22;

  /* =========================================================
     FOOTER INSTITUCIONAL
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
    doc.text(
      "Taller Mecánico Fonseca · Enderezado y Pintura · Tel: 2665-2046 / 2666-7444",
      pageW / 2,
      pageH - 12.2,
      { align: "center" }
    );
    doc.setFont("helvetica", "italic");
    doc.setFontSize(5.5);
    doc.text(
      "Email: jafonsecah@yahoo.es · 50 m este de la entrada principal, Residencial Bosques Don José",
      pageW / 2,
      pageH - 9,
      { align: "center" }
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(150, 150, 150);
    const pagText = i > 1 ? `Página ${i} de ${pageCount}` : "";
    doc.text(pagText, pageW - M - 4, pageH - 6.5, { align: "right" });
  }

  // ── Guardar PDF ──
  const nombreArchivo = `Reporte_Inventario_${formatoFechaCorta(new Date()).replace(/\//g, "-")}.pdf`;
  doc.save(nombreArchivo);
}
