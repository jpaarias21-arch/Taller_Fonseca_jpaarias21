// @ts-nocheck
import { supabase } from "./supabaseClient";

/**
 * Obtener el rango de fechas (inicio y fin) para un mes específico.
 * @param {number} year
 * @param {number} month - 1-based (1 = enero, 12 = diciembre)
 * @returns {{ start: string, end: string }} Fechas ISO
 */
export const getMonthRange = (year, month) => {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0); // último día del mes
  const end = endDate.toISOString().slice(0, 10);
  return { start, end };
};

/**
 * Generar el reporte mensual completo: órdenes procesadas, ingresos e inventario consumido.
 *
 * @param {number} year
 * @param {number} month - 1-based
 * @returns {Promise<{
 *   periodo: { año: number, mes: number, label: string },
 *   ordenes: {
 *     total: number,
 *     entregadas: number,
 *     activas: number,
 *     lista: Array<object>
 *   },
 *   ingresos: {
 *     total: number,
 *     monto_cotizado: number,
 *     monto_final: number,
 *     por_orden: Array<{ id: string, placa: string, cliente: string, monto_final: number, monto_cotizado: number }>
 *   },
 *   inventario: {
 *     total_articulos: number,
 *     costo_total: number,
 *     por_producto: Array<{ nombre: string, codigo: string, cantidad: number, costo_total: number }>,
 *     detalle: Array<object>
 *   },
 *   resumen: string
 * }>}
 */
export const generarReporteMensual = async (year, month) => {
  const { start, end } = getMonthRange(year, month);

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  const label = `${monthNames[month - 1]} ${year}`;

  const periodo = { año: year, mes: month, label };

  // ─── 1. Órdenes de Trabajo del período ───
  const { data: ordenesData, error: errOrdenes } = await supabase
    .from("orden_trabajo")
    .select("*")
    .gte("fecha_ingreso", start)
    .lte("fecha_ingreso", `${end}T23:59:59`)
    .order("fecha_ingreso", { ascending: false });

  if (errOrdenes) {
    console.error("Error al obtener órdenes del período:", errOrdenes.message);
    throw new Error(`No se pudieron cargar las órdenes: ${errOrdenes.message}`);
  }

  const ordenes = Array.isArray(ordenesData) ? ordenesData : [];
  const entregadas = ordenes.filter((o) => o.estado_kanban === "Entregado");
  const activas = ordenes.filter((o) => o.estado_kanban !== "Entregado");

  // ─── 2. Ingresos ───
  const montoCotizadoTotal = ordenes.reduce(
    (sum, o) => sum + Number(o.monto_cotizado || 0),
    0
  );
  const montoFinalTotal = ordenes.reduce(
    (sum, o) => sum + Number(o.monto_final || 0),
    0
  );
  const ingresosPorOrden = ordenes
    .filter((o) => Number(o.monto_final || o.monto_cotizado || 0) > 0)
    .map((o) => ({
      id: o.id,
      numero_orden: o.numero_orden,
      placa: o.placa,
      cliente: o.cliente_nombre,
      monto_final: Number(o.monto_final || 0),
      monto_cotizado: Number(o.monto_cotizado || 0),
      fecha_ingreso: o.fecha_ingreso,
      estado: o.estado_kanban,
    }))
    .sort((a, b) => (b.monto_final || b.monto_cotizado) - (a.monto_final || a.monto_cotizado));

  // ─── 3. Inventario consumido en el período ───
  // Buscar movimientos de salida cuyo created_date esté en el rango
  const { data: movimientos, error: errMov } = await supabase
    .from("movimiento_inventario")
    .select("*")
    .eq("tipo_movimiento", "Salida")
    .gte("created_date", start)
    .lte("created_date", `${end}T23:59:59`);

  if (errMov) {
    console.error("Error al obtener movimientos de inventario:", errMov.message);
    // No es fatal, continuamos con array vacío
  }

  const movs = Array.isArray(movimientos) ? movimientos : [];

  // Agrupar por producto
  const productoMap = new Map();
  for (const m of movs) {
    const key = m.inventario_id || m.producto_nombre || "desconocido";
    if (!productoMap.has(key)) {
      productoMap.set(key, {
        inventario_id: m.inventario_id,
        nombre: m.producto_nombre || "Desconocido",
        codigo: m.codigo || "",
        cantidad: 0,
        costo_total: 0,
        precio_unitario: m.precio_unitario || 0,
      });
    }
    const entry = productoMap.get(key);
    entry.cantidad += Number(m.cantidad || 0);
    entry.costo_total += Number(m.cantidad || 0) * Number(m.precio_unitario || 0);
  }

  // Obtener precios unitarios de inventario para los productos que no tienen precio en el movimiento
  const inventarioIds = [...productoMap.keys()].filter(
    (id) => id && id !== "desconocido"
  );
  if (inventarioIds.length > 0) {
    const { data: inventarioData } = await supabase
      .from("inventario")
      .select("id, nombre, codigo, precio_unitario")
      .in("id", inventarioIds);

    if (Array.isArray(inventarioData)) {
      const precioMap = new Map(
        inventarioData.map((p) => [p.id, p.precio_unitario || 0])
      );
      for (const [, entry] of productoMap) {
        if (entry.inventario_id && entry.precio_unitario === 0) {
          entry.precio_unitario = precioMap.get(entry.inventario_id) || 0;
          entry.costo_total = entry.cantidad * entry.precio_unitario;
        }
      }
    }
  }

  const porProducto = [...productoMap.values()]
    .sort((a, b) => b.costo_total - a.costo_total);

  const totalArticulos = movs.reduce((sum, m) => sum + Number(m.cantidad || 0), 0);
  const costoTotalInventario = porProducto.reduce(
    (sum, p) => sum + p.costo_total,
    0
  );

  return {
    periodo,
    ordenes: {
      total: ordenes.length,
      entregadas: entregadas.length,
      activas: activas.length,
      lista: ordenes.map((o) => ({
        id: o.id,
        numero_orden: o.numero_orden,
        placa: o.placa,
        cliente: o.cliente_nombre,
        marca: o.marca,
        modelo: o.modelo,
        anio: o.anio,
        fecha_ingreso: o.fecha_ingreso,
        fecha_entrega_real: o.fecha_entrega_real,
        estado_kanban: o.estado_kanban,
        estado_cotizacion: o.estado_cotizacion,
        monto_final: Number(o.monto_final || 0),
        monto_cotizado: Number(o.monto_cotizado || 0),
        es_asegurado: o.es_asegurado,
        aseguradora: o.aseguradora,
      })),
    },
    ingresos: {
      total: montoFinalTotal || montoCotizadoTotal,
      monto_cotizado: montoCotizadoTotal,
      monto_final: montoFinalTotal,
      por_orden: ingresosPorOrden,
    },
    inventario: {
      total_articulos: totalArticulos,
      costo_total: costoTotalInventario,
      por_producto: porProducto,
      detalle: movs.map((m) => ({
        id: m.id,
        producto: m.producto_nombre,
        cantidad: Number(m.cantidad || 0),
        precio_unitario: Number(m.precio_unitario || 0),
        orden_id: m.orden_id,
        numero_orden: m.numero_orden,
        motivo: m.motivo,
        fecha: m.created_date,
        usuario: m.usuario_nombre,
      })),
    },
    resumen: [
      `📊 Reporte de ${label}`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `Órdenes procesadas: ${ordenes.length} (${entregadas.length} entregadas, ${activas.length} activas)`,
      `Ingresos totales: ₡${(montoFinalTotal || montoCotizadoTotal).toLocaleString("es-CR", { minimumFractionDigits: 2 })}`,
      `Inventario consumido: ${totalArticulos} unidades por ₡${costoTotalInventario.toLocaleString("es-CR", { minimumFractionDigits: 2 })}`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `Generado el ${new Date().toLocaleDateString("es-CR")}`,
    ].join("\n"),
  };
};

/**
 * Exportar el reporte mensual como un archivo de texto plano.
 * @param {object} reporte - El objeto devuelto por generarReporteMensual
 * @returns {string} Contenido del archivo
 */
export const formatearReporteTexto = (reporte) => {
  const lines = [
    "=".repeat(60),
    `  REPORTE MENSUAL - ${reporte.periodo.label}`,
    "=".repeat(60),
    "",
    `  Generado: ${new Date().toLocaleString("es-CR")}`,
    "",
    "─".repeat(60),
    "  1. ÓRDENES DE TRABAJO",
    "─".repeat(60),
    `  Total: ${reporte.ordenes.total}`,
    `  Entregadas: ${reporte.ordenes.entregadas}`,
    `  Activas: ${reporte.ordenes.activas}`,
    "",
    ...reporte.ordenes.lista.map(
      (o, i) =>
        `  ${String(i + 1).padStart(2, " ")}. ${o.placa || "—"} — ${o.cliente || "—"} — [${o.estado_kanban}] — ₡${(o.monto_final || o.monto_cotizado).toLocaleString("es-CR")}`
    ),
    "",
    "─".repeat(60),
    "  2. INGRESOS",
    "─".repeat(60),
    `  Monto Cotizado: ₡${reporte.ingresos.monto_cotizado.toLocaleString("es-CR", { minimumFractionDigits: 2 })}`,
    `  Monto Final:    ₡${reporte.ingresos.monto_final.toLocaleString("es-CR", { minimumFractionDigits: 2 })}`,
    `  Total:          ₡${reporte.ingresos.total.toLocaleString("es-CR", { minimumFractionDigits: 2 })}`,
    "",
    ...reporte.ingresos.por_orden.map(
      (o) =>
        `  ${o.placa.padEnd(10)} ₡${(o.monto_final || o.monto_cotizado).toLocaleString("es-CR", { minimumFractionDigits: 2 })} — ${o.cliente}`
    ),
    "",
    "─".repeat(60),
    "  3. INVENTARIO CONSUMIDO",
    "─".repeat(60),
    `  Total artículos: ${reporte.inventario.total_articulos}`,
    `  Costo total:     ₡${reporte.inventario.costo_total.toLocaleString("es-CR", { minimumFractionDigits: 2 })}`,
    "",
    ...reporte.inventario.por_producto.map(
      (p) =>
        `  ${(p.nombre || "?").padEnd(30)} ${String(p.cantidad).padStart(4)} und  ₡${p.costo_total.toLocaleString("es-CR", { minimumFractionDigits: 2 })}`
    ),
    "",
    "─".repeat(60),
    "  Fin del reporte",
    "=".repeat(60),
  ];

  return lines.join("\n");
};

/**
 * Generar datos para tabla CSV del reporte mensual.
 * @param {object} reporte
 * @returns {Array<Array<string>>} Filas del CSV
 */
export const formatearReporteCSV = (reporte) => {
  const rows = [];

  // Sección Órdenes
  rows.push(["REPORTE MENSUAL", reporte.periodo.label]);
  rows.push(["Generado", new Date().toLocaleString("es-CR")]);
  rows.push([]);
  rows.push(["ÓRDENES DE TRABAJO"]);
  rows.push(["#", "Placa", "Cliente", "Marca", "Modelo", "Año", "Ingreso", "Entrega Real", "Estado Kanban", "Cotización", "Monto Cotizado", "Monto Final", "Asegurado"]);
  reporte.ordenes.lista.forEach((o, i) => {
    rows.push([
      String(i + 1),
      o.placa || "",
      o.cliente || "",
      o.marca || "",
      o.modelo || "",
      String(o.anio || ""),
      o.fecha_ingreso || "",
      o.fecha_entrega_real || "",
      o.estado_kanban || "",
      o.estado_cotizacion || "",
      String(o.monto_cotizado),
      String(o.monto_final),
      o.es_asegurado ? "Sí" : "No",
    ]);
  });
  rows.push([]);
  rows.push(["TOTAL", "", "", "", "", "", "", "", "", "", reporte.ingresos.monto_cotizado, reporte.ingresos.monto_final, ""]);
  rows.push([]);

  // Sección Inventario
  rows.push(["INVENTARIO CONSUMIDO"]);
  rows.push(["Producto", "Código", "Cantidad", "Costo Total"]);
  reporte.inventario.por_producto.forEach((p) => {
    rows.push([p.nombre || "", p.codigo || "", String(p.cantidad), String(p.costo_total)]);
  });
  rows.push([]);
  rows.push(["TOTAL", "", String(reporte.inventario.total_articulos), String(reporte.inventario.costo_total)]);

  return rows;
};