import ApiToken from '#models/api_token';
import Pago from '#models/pago';
import Prestamo from '#models/prestamo';
import { resumenFinancieroVenta } from '#services/mora_service';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
const COLOR_PRIMARY = 'FF2563EB';
const COLOR_SECONDARY = 'FF1E40AF';
const COLOR_WHITE = 'FFFFFFFF';
const COLOR_HEADER_BG = 'FFE8F0FE';
const COLOR_TOTAL_BG = 'FFDBEAFE';
const fechaCorta = (fecha) => {
    if (!fecha)
        return '';
    const str = String(fecha).split('T')[0];
    const [year, month, day] = str.split('-');
    return `${day}-${month}-${year}`;
};
const fechaMasUnDia = (fecha) => {
    if (!fecha)
        return fecha;
    const date = new Date(fecha);
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
};
const formatearMoneda = (valor) => `Q${Number(valor || 0).toFixed(2)}`;
const normalizarTipoReporte = (tipo) => {
    if (tipo === 'prestamos')
        return 'ventas';
    if (tipo === 'ganancias')
        return 'cartera';
    return tipo || 'pagos';
};
const estilizarEncabezado = (row) => {
    row.height = 28;
    row.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: COLOR_WHITE }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_PRIMARY } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { bottom: { style: 'medium', color: { argb: COLOR_SECONDARY } } };
    });
};
const estilizarFila = (row, esImpar) => {
    row.height = 22;
    row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        if (!esImpar) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_BG } };
        }
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } } };
    });
};
const agregarFilaTotales = (sheet, valores) => {
    const row = sheet.addRow(valores);
    row.height = 26;
    row.eachCell((cell) => {
        cell.font = { bold: true, size: 11, color: { argb: COLOR_SECONDARY } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOTAL_BG } };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        cell.border = { top: { style: 'medium', color: { argb: COLOR_PRIMARY } } };
    });
};
const agregarInfoReporte = (sheet, titulo, filtros) => {
    const filaTitulo = sheet.addRow([titulo]);
    filaTitulo.getCell(1).font = { bold: true, size: 14, color: { argb: COLOR_PRIMARY } };
    filaTitulo.height = 30;
    filtros.forEach(({ label, valor }) => {
        const fila = sheet.addRow([`${label}: ${valor}`]);
        fila.getCell(1).font = { italic: true, size: 10, color: { argb: 'FF6B7280' } };
        fila.height = 16;
    });
    sheet.addRow([]);
};
const etiquetaPago = (pago) => {
    if (pago.tipoPago === 'abono')
        return 'Abono';
    if (pago.tipoPago === 'enganche')
        return 'Enganche';
    return 'Pago de cuota';
};
const obtenerPagosReporte = async (fechaInicio, fechaFin) => {
    const query = Pago.query()
        .where('anulado', false)
        .preload('prestamo', (prestamo) => prestamo
        .preload('cliente')
        .preload('lote')
        .preload('predios', (predios) => predios.preload('lote')))
        .preload('usuario');
    if (fechaInicio)
        query.where('fecha_pago', '>=', fechaInicio);
    if (fechaFin)
        query.where('fecha_pago', '<', fechaMasUnDia(fechaFin));
    return query.orderBy('fecha_pago', 'asc');
};
const obtenerVentasReporte = async ({ estado, fechaInicio, fechaFin }) => {
    const query = Prestamo.query()
        .preload('cliente')
        .preload('pagos', (pagos) => pagos.where('anulado', false))
        .preload('pagoAplicaciones', (aplicaciones) => aplicaciones.orderBy('numero_cuota', 'asc'))
        .preload('programaciones')
        .preload('lote')
        .preload('predios', (predios) => predios.preload('lote'));
    if (estado)
        query.where('estado', estado);
    if (fechaInicio)
        query.where('fecha_inicio', '>=', fechaInicio);
    if (fechaFin)
        query.where('fecha_inicio', '<', fechaMasUnDia(fechaFin));
    const ventas = await query.orderBy('created_at', 'desc');
    return ventas.map((prestamo) => {
        const resumenFinanciero = resumenFinancieroVenta(prestamo, prestamo.programaciones || []);
        const ultimoPago = [...(prestamo.pagos || [])].sort((a, b) => String(b.fechaPago).localeCompare(String(a.fechaPago)))[0];
        return {
            prestamo,
            resumenFinanciero,
            totalCobradoHistorico: Number((resumenFinanciero.enganche + resumenFinanciero.totalPagado).toFixed(2)),
            ultimoPago: ultimoPago?.fechaPago || null,
        };
    });
};
const calcularTotalesCartera = (ventas) => {
    const totalValorLotes = ventas.reduce((suma, venta) => suma + venta.resumenFinanciero.montoTotal, 0);
    const totalCobradoHistorico = ventas.reduce((suma, venta) => suma + venta.totalCobradoHistorico, 0);
    const totalSaldoPendiente = ventas.reduce((suma, venta) => suma + venta.resumenFinanciero.saldoPendiente, 0);
    const totalCuotasPagadas = ventas.reduce((suma, venta) => suma + venta.resumenFinanciero.cuotasPagadas, 0);
    const totalCuotas = ventas.reduce((suma, venta) => suma + venta.resumenFinanciero.cuotasContractuales, 0);
    return {
        totalVentas: ventas.length,
        totalValorLotes: Number(totalValorLotes.toFixed(2)),
        totalCobradoHistorico: Number(totalCobradoHistorico.toFixed(2)),
        totalSaldoPendiente: Number(totalSaldoPendiente.toFixed(2)),
        totalCuotasPagadas,
        totalCuotas,
        porcentajeGeneral: totalCuotas > 0 ? Math.round((totalCuotasPagadas / totalCuotas) * 100) : 0,
    };
};
const serializarVentaReporte = (venta) => ({
    ...venta.prestamo.serialize(),
    resumenFinanciero: venta.resumenFinanciero,
    totalCobradoHistorico: venta.totalCobradoHistorico,
    ultimoPago: venta.ultimoPago,
});
const construirDetalleCartera = (venta) => ({
    id: venta.prestamo.id,
    lote: venta.prestamo.numeroLote || 'N/A',
    cliente: `${venta.prestamo.cliente.nombres} ${venta.prestamo.cliente.apellidos}`,
    fechaInicio: venta.prestamo.fechaInicio,
    fechaFin: venta.prestamo.fechaFin,
    fechaCobro: venta.prestamo.fechaCobro,
    ultimoPago: venta.ultimoPago,
    totalCobradoHistorico: venta.totalCobradoHistorico,
    resumenFinanciero: venta.resumenFinanciero,
    precioLote: venta.resumenFinanciero.montoTotal,
    cuotasPagadas: venta.resumenFinanciero.cuotasPagadas,
    totalCuotas: venta.resumenFinanciero.cuotasContractuales,
    fraccion: venta.resumenFinanciero.fraccion,
    porcentaje: venta.resumenFinanciero.porcentaje,
    cobrado: venta.totalCobradoHistorico,
    saldoPendiente: venta.resumenFinanciero.saldoPendiente,
    estado: venta.resumenFinanciero.estado,
});
export default class ReportesController {
    async verifyToken(token) {
        if (!token)
            return null;
        const apiToken = await ApiToken.query()
            .where('token', token.replace('Bearer ', ''))
            .preload('user')
            .first();
        return apiToken?.user || null;
    }
    async pagos({ request, response }) {
        try {
            const user = await this.verifyToken(request.header('authorization') || '');
            if (!user || user.role !== 'admin')
                return response.forbidden({ message: 'No autorizado' });
            const { fechaInicio, fechaFin } = request.qs();
            if (!fechaInicio || !fechaFin) {
                return response.badRequest({ message: 'fechaInicio y fechaFin son requeridos' });
            }
            const pagos = await obtenerPagosReporte(fechaInicio, fechaFin);
            return response.ok(pagos);
        }
        catch (error) {
            console.error(error);
            return response.internalServerError({ message: 'Error al obtener reporte de pagos' });
        }
    }
    async ventas({ request, response }) {
        try {
            const user = await this.verifyToken(request.header('authorization') || '');
            if (!user || user.role !== 'admin')
                return response.forbidden({ message: 'No autorizado' });
            const { estado, fechaInicio, fechaFin } = request.qs();
            const ventas = await obtenerVentasReporte({ estado, fechaInicio, fechaFin });
            return response.ok(ventas.map(serializarVentaReporte));
        }
        catch (error) {
            console.error(error);
            return response.internalServerError({ message: 'Error al obtener reporte de ventas' });
        }
    }
    async prestamos(ctx) {
        return this.ventas(ctx);
    }
    async cartera({ request, response }) {
        try {
            const user = await this.verifyToken(request.header('authorization') || '');
            if (!user || user.role !== 'admin')
                return response.forbidden({ message: 'No autorizado' });
            const { estado, fechaInicio, fechaFin } = request.qs();
            const ventas = await obtenerVentasReporte({ estado, fechaInicio, fechaFin });
            const totales = calcularTotalesCartera(ventas);
            const detalle = ventas.map(construirDetalleCartera);
            return response.ok({
                ...totales,
                detalle,
            });
        }
        catch (error) {
            console.error(error);
            return response.internalServerError({ message: 'Error al obtener reporte de cartera' });
        }
    }
    async ganancias(ctx) {
        return this.cartera(ctx);
    }
    async exportarExcel({ request, response }) {
        try {
            const user = await this.verifyToken(request.header('authorization') || '');
            if (!user || user.role !== 'admin')
                return response.forbidden({ message: 'No autorizado' });
            const tipo = normalizarTipoReporte(request.qs().tipo);
            const { fechaInicio, fechaFin, estado } = request.qs();
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Villas del Rosario';
            workbook.created = new Date();
            workbook.modified = new Date();
            if (tipo === 'pagos') {
                const sheet = workbook.addWorksheet('Pagos');
                sheet.properties.defaultRowHeight = 20;
                const pagos = await obtenerPagosReporte(fechaInicio, fechaFin);
                agregarInfoReporte(sheet, 'Reporte de Pagos Manuales', [
                    { label: 'Periodo', valor: `${fechaCorta(fechaInicio)} al ${fechaCorta(fechaFin)}` },
                    { label: 'Total de registros', valor: String(pagos.length) },
                    { label: 'Generado', valor: fechaCorta(new Date().toISOString()) },
                ]);
                sheet.columns = [
                    { key: 'fecha', width: 14 },
                    { key: 'cliente', width: 30 },
                    { key: 'lote', width: 14 },
                    { key: 'cuota', width: 14 },
                    { key: 'monto', width: 18 },
                    { key: 'usuario', width: 22 },
                ];
                const headerRow = sheet.addRow([
                    'Fecha',
                    'Cliente',
                    'Lote',
                    'Cuota',
                    'Monto Pagado (Q)',
                    'Registrado por',
                ]);
                estilizarEncabezado(headerRow);
                let totalCobrado = 0;
                pagos.forEach((pago, index) => {
                    const monto = Number(pago.montoPagado);
                    totalCobrado += monto;
                    const row = sheet.addRow([
                        fechaCorta(pago.fechaPago),
                        `${pago.prestamo.cliente.nombres} ${pago.prestamo.cliente.apellidos}`,
                        pago.prestamo.numeroLote || 'N/A',
                        etiquetaPago(pago),
                        monto,
                        pago.usuario?.username || 'N/A',
                    ]);
                    estilizarFila(row, index % 2 === 0);
                    row.getCell(5).numFmt = '"Q"#,##0.00';
                    row.getCell(5).font = { bold: true, color: { argb: COLOR_PRIMARY } };
                });
                agregarFilaTotales(sheet, ['', '', '', 'TOTAL', totalCobrado, '']);
                sheet.lastRow.getCell(5).numFmt = '"Q"#,##0.00';
            }
            if (tipo === 'ventas') {
                const sheet = workbook.addWorksheet('Ventas');
                sheet.properties.defaultRowHeight = 20;
                const ventas = await obtenerVentasReporte({ estado, fechaInicio, fechaFin });
                agregarInfoReporte(sheet, 'Reporte de Ventas de Lotes', [
                    { label: 'Estado filtrado', valor: estado || 'Todos' },
                    {
                        label: 'Periodo',
                        valor: fechaInicio && fechaFin
                            ? `${fechaCorta(fechaInicio)} al ${fechaCorta(fechaFin)}`
                            : 'Todos',
                    },
                    { label: 'Total de registros', valor: String(ventas.length) },
                    { label: 'Generado', valor: fechaCorta(new Date().toISOString()) },
                ]);
                sheet.columns = [
                    { key: 'cliente', width: 30 },
                    { key: 'lote', width: 14 },
                    { key: 'precio', width: 18 },
                    { key: 'cuotas', width: 12 },
                    { key: 'avance', width: 12 },
                    { key: 'saldo', width: 18 },
                    { key: 'cobro', width: 16 },
                    { key: 'estado', width: 14 },
                ];
                const headerRow = sheet.addRow([
                    'Cliente',
                    'Lote',
                    'Precio Lote (Q)',
                    'Cuotas',
                    'Avance',
                    'Saldo Pendiente (Q)',
                    'Cobro Pactado',
                    'Estado',
                ]);
                estilizarEncabezado(headerRow);
                let totalVendido = 0;
                let totalPendiente = 0;
                ventas.forEach((venta, index) => {
                    const resumen = venta.resumenFinanciero;
                    totalVendido += resumen.montoTotal;
                    totalPendiente += resumen.saldoPendiente;
                    const row = sheet.addRow([
                        `${venta.prestamo.cliente.nombres} ${venta.prestamo.cliente.apellidos}`,
                        venta.prestamo.numeroLote || 'N/A',
                        resumen.montoTotal,
                        resumen.fraccion,
                        `${resumen.porcentaje}%`,
                        resumen.saldoPendiente,
                        fechaCorta(venta.prestamo.fechaCobro),
                        resumen.estado,
                    ]);
                    estilizarFila(row, index % 2 === 0);
                    row.getCell(3).numFmt = '"Q"#,##0.00';
                    row.getCell(6).numFmt = '"Q"#,##0.00';
                });
                agregarFilaTotales(sheet, ['TOTAL', '', totalVendido, '', '', totalPendiente, '', '']);
                sheet.lastRow.getCell(3).numFmt = '"Q"#,##0.00';
                sheet.lastRow.getCell(6).numFmt = '"Q"#,##0.00';
            }
            if (tipo === 'cartera') {
                const sheet = workbook.addWorksheet('Cartera');
                sheet.properties.defaultRowHeight = 20;
                const detalle = await obtenerVentasReporte({ estado, fechaInicio, fechaFin });
                const totales = calcularTotalesCartera(detalle);
                agregarInfoReporte(sheet, 'Resumen de Cartera', [
                    { label: 'Estado filtrado', valor: estado || 'Todos' },
                    {
                        label: 'Periodo',
                        valor: fechaInicio && fechaFin
                            ? `${fechaCorta(fechaInicio)} al ${fechaCorta(fechaFin)}`
                            : 'Todos',
                    },
                    { label: 'Valor de lotes', valor: formatearMoneda(totales.totalValorLotes) },
                    {
                        label: 'Cobrado historico',
                        valor: formatearMoneda(totales.totalCobradoHistorico),
                    },
                    { label: 'Saldo pendiente', valor: formatearMoneda(totales.totalSaldoPendiente) },
                ]);
                sheet.columns = [
                    { key: 'cliente', width: 30 },
                    { key: 'lote', width: 14 },
                    { key: 'avance', width: 12 },
                    { key: 'cobrado', width: 18 },
                    { key: 'saldo', width: 18 },
                    { key: 'ultimoPago', width: 16 },
                    { key: 'estado', width: 14 },
                ];
                const headerRow = sheet.addRow([
                    'Cliente',
                    'Lote',
                    'Avance',
                    'Cobrado (Q)',
                    'Saldo Pendiente (Q)',
                    'Ultimo Pago',
                    'Estado',
                ]);
                estilizarEncabezado(headerRow);
                detalle.forEach((venta, index) => {
                    const resumen = venta.resumenFinanciero;
                    const row = sheet.addRow([
                        `${venta.prestamo.cliente.nombres} ${venta.prestamo.cliente.apellidos}`,
                        venta.prestamo.numeroLote || 'N/A',
                        `${resumen.fraccion} (${resumen.porcentaje}%)`,
                        venta.totalCobradoHistorico,
                        resumen.saldoPendiente,
                        fechaCorta(venta.ultimoPago),
                        resumen.estado,
                    ]);
                    estilizarFila(row, index % 2 === 0);
                    row.getCell(4).numFmt = '"Q"#,##0.00';
                    row.getCell(5).numFmt = '"Q"#,##0.00';
                });
                agregarFilaTotales(sheet, [
                    'TOTALES',
                    '',
                    '',
                    totales.totalCobradoHistorico,
                    totales.totalSaldoPendiente,
                    '',
                    '',
                ]);
                sheet.lastRow.getCell(4).numFmt = '"Q"#,##0.00';
                sheet.lastRow.getCell(5).numFmt = '"Q"#,##0.00';
            }
            const buffer = await workbook.xlsx.writeBuffer();
            response.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            response.header('Content-Disposition', `attachment; filename="reporte_${tipo}.xlsx"`);
            return response.send(buffer);
        }
        catch (error) {
            console.error(error);
            return response.internalServerError({ message: 'Error al exportar Excel' });
        }
    }
    async exportarPDF({ request, response }) {
        try {
            const user = await this.verifyToken(request.header('authorization') || '');
            if (!user || user.role !== 'admin')
                return response.forbidden({ message: 'No autorizado' });
            const tipo = normalizarTipoReporte(request.qs().tipo);
            const { fechaInicio, fechaFin, estado } = request.qs();
            const doc = new PDFDocument({ margin: 40 });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.fontSize(18).font('Helvetica-Bold').text('Villas del Rosario', { align: 'center' });
            doc.fontSize(12).font('Helvetica').text(`Reporte: ${tipo}`, { align: 'center' });
            if (fechaInicio && fechaFin) {
                doc.text(`Periodo: ${fechaCorta(fechaInicio)} al ${fechaCorta(fechaFin)}`, {
                    align: 'center',
                });
            }
            doc
                .fontSize(9)
                .fillColor('#6B7280')
                .text(`Generado el ${fechaCorta(new Date().toISOString())}`, { align: 'center' });
            doc.fillColor('#000000').moveDown();
            if (tipo === 'pagos') {
                const pagos = await obtenerPagosReporte(fechaInicio, fechaFin);
                pagos.forEach((pago) => {
                    doc
                        .font('Helvetica-Bold')
                        .fontSize(11)
                        .text(`Lote ${pago.prestamo.numeroLote || 'N/A'} - ${etiquetaPago(pago)}`);
                    doc
                        .font('Helvetica')
                        .text(`${pago.prestamo.cliente.nombres} ${pago.prestamo.cliente.apellidos}`);
                    doc
                        .fontSize(10)
                        .fillColor('#4B5563')
                        .text(`Monto: ${formatearMoneda(Number(pago.montoPagado))}   Fecha: ${fechaCorta(pago.fechaPago)}   Registrado por: ${pago.usuario?.username || 'N/A'}`);
                    doc.fillColor('#000000').moveDown(0.5);
                });
            }
            if (tipo === 'ventas') {
                const ventas = await obtenerVentasReporte({ estado, fechaInicio, fechaFin });
                ventas.forEach((venta) => {
                    const resumen = venta.resumenFinanciero;
                    doc
                        .font('Helvetica-Bold')
                        .fontSize(11)
                        .text(`${venta.prestamo.cliente.nombres} ${venta.prestamo.cliente.apellidos} - lote ${venta.prestamo.numeroLote || 'N/A'}`);
                    doc
                        .font('Helvetica')
                        .fontSize(10)
                        .fillColor('#4B5563')
                        .text(`Precio: ${formatearMoneda(resumen.montoTotal)}   Avance: ${resumen.fraccion} (${resumen.porcentaje}%)   Estado: ${resumen.estado}`)
                        .text(`Saldo pendiente: ${formatearMoneda(resumen.saldoPendiente)}   Cobro pactado: ${fechaCorta(venta.prestamo.fechaCobro) || 'N/A'}`);
                    doc.fillColor('#000000').moveDown(0.5);
                });
            }
            if (tipo === 'cartera') {
                const detalle = await obtenerVentasReporte({ estado, fechaInicio, fechaFin });
                const totales = calcularTotalesCartera(detalle);
                detalle.forEach((venta) => {
                    const resumen = venta.resumenFinanciero;
                    doc
                        .font('Helvetica-Bold')
                        .fontSize(11)
                        .text(`${venta.prestamo.cliente.nombres} ${venta.prestamo.cliente.apellidos} - lote ${venta.prestamo.numeroLote || 'N/A'}`);
                    doc
                        .font('Helvetica')
                        .fontSize(10)
                        .fillColor('#4B5563')
                        .text(`Cobrado: ${formatearMoneda(venta.totalCobradoHistorico)}   Saldo: ${formatearMoneda(resumen.saldoPendiente)}   Avance: ${resumen.fraccion} (${resumen.porcentaje}%)`)
                        .text(`Ultimo pago: ${fechaCorta(venta.ultimoPago) || 'N/A'}   Estado: ${resumen.estado}`);
                    doc.fillColor('#000000').moveDown(0.5);
                });
                doc.moveDown();
                doc
                    .font('Helvetica-Bold')
                    .fontSize(13)
                    .text(`Saldo total pendiente: ${formatearMoneda(totales.totalSaldoPendiente)}`, {
                    align: 'right',
                });
            }
            doc.end();
            await new Promise((resolve) => doc.on('end', resolve));
            const pdfBuffer = Buffer.concat(chunks);
            response.header('Content-Type', 'application/pdf');
            response.header('Content-Disposition', `attachment; filename="reporte_${tipo}.pdf"`);
            return response.send(pdfBuffer);
        }
        catch (error) {
            console.error(error);
            return response.internalServerError({ message: 'Error al exportar PDF' });
        }
    }
}
//# sourceMappingURL=reportes_controller.js.map