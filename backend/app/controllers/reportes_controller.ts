import type { HttpContext } from '@adonisjs/core/http'
import ApiToken from '#models/api_token'
import Pago from '#models/pago'
import Prestamo from '#models/prestamo'
import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'

const COLOR_PRIMARY = 'FF2563EB'
const COLOR_SECONDARY = 'FF1E40AF'
const COLOR_WHITE = 'FFFFFFFF'
const COLOR_HEADER_BG = 'FFE8F0FE'
const COLOR_TOTAL_BG = 'FFDBEAFE'

const fechaCorta = (fecha: any): string => {
  if (!fecha) return ''
  const str = String(fecha).split('T')[0]
  const [year, month, day] = str.split('-')
  return `${day}-${month}-${year}`
}

const fechaMasUnDia = (fecha?: string) => {
  if (!fecha) return fecha
  const date = new Date(fecha)
  date.setDate(date.getDate() + 1)
  return date.toISOString().split('T')[0]
}

const formatearMoneda = (valor: number) => `Q${Number(valor || 0).toFixed(2)}`

const calcularCuotaMonto = (prestamo: Prestamo) =>
  Number((Number(prestamo.monto) / Number(prestamo.cuotas || 1)).toFixed(2))

const calcularCuotasPagadas = (prestamo: Prestamo) => {
  const cuotaMonto = calcularCuotaMonto(prestamo)
  const pagosPorCuota = new Map<number, number>()

  for (const pago of prestamo.pagos || []) {
    if (pago.numeroCuota <= 0 || pago.tipoPago !== 'cuota') continue

    const actual = pagosPorCuota.get(pago.numeroCuota) || 0
    pagosPorCuota.set(pago.numeroCuota, Number((actual + Number(pago.montoPagado)).toFixed(2)))
  }

  let completas = 0
  for (let cuota = 1; cuota <= Number(prestamo.cuotas || 0); cuota++) {
    if ((pagosPorCuota.get(cuota) || 0) + 0.01 >= cuotaMonto) {
      completas++
    }
  }

  return completas
}

const normalizarTipoReporte = (tipo?: string) => {
  if (tipo === 'prestamos') return 'ventas'
  if (tipo === 'ganancias') return 'cartera'
  return tipo || 'pagos'
}

const estilizarEncabezado = (row: ExcelJS.Row) => {
  row.height = 28
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: COLOR_WHITE }, size: 11 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_PRIMARY } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = { bottom: { style: 'medium', color: { argb: COLOR_SECONDARY } } }
  })
}

const estilizarFila = (row: ExcelJS.Row, esImpar: boolean) => {
  row.height = 22
  row.eachCell((cell) => {
    cell.alignment = { vertical: 'middle', horizontal: 'left' }
    if (!esImpar) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_BG } }
    }
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } } }
  })
}

const agregarFilaTotales = (sheet: ExcelJS.Worksheet, valores: (string | number)[]) => {
  const row = sheet.addRow(valores)
  row.height = 26
  row.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: COLOR_SECONDARY } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOTAL_BG } }
    cell.alignment = { vertical: 'middle', horizontal: 'left' }
    cell.border = { top: { style: 'medium', color: { argb: COLOR_PRIMARY } } }
  })
}

const agregarInfoReporte = (
  sheet: ExcelJS.Worksheet,
  titulo: string,
  filtros: { label: string; valor: string }[]
) => {
  const filaTitulo = sheet.addRow([titulo])
  filaTitulo.getCell(1).font = { bold: true, size: 14, color: { argb: COLOR_PRIMARY } }
  filaTitulo.height = 30

  filtros.forEach(({ label, valor }) => {
    const fila = sheet.addRow([`${label}: ${valor}`])
    fila.getCell(1).font = { italic: true, size: 10, color: { argb: 'FF6B7280' } }
    fila.height = 16
  })

  sheet.addRow([])
}

const calcularCobrado = (prestamo: Prestamo) =>
  Number(
    (prestamo.pagos || []).reduce((suma, pago) => suma + Number(pago.montoPagado), 0).toFixed(2)
  )

const etiquetaPago = (pago: Pago) => {
  if (pago.tipoPago === 'abono') return 'Abono'
  if (pago.tipoPago === 'enganche') return 'Enganche'
  return `Cuota ${pago.numeroCuota}/${pago.prestamo.cuotas}`
}

const calcularResumenVenta = (prestamo: Prestamo) => {
  const cobrado = calcularCobrado(prestamo)
  const saldoPendiente = Math.max(Number(prestamo.monto) - cobrado, 0)
  const cuotasPagadas = calcularCuotasPagadas(prestamo)
  const totalCuotas = Number(prestamo.cuotas || 0)
  const porcentaje = totalCuotas > 0 ? Math.round((cuotasPagadas / totalCuotas) * 100) : 0
  const ultimoPago = [...(prestamo.pagos || [])].sort((a, b) =>
    String(b.fechaPago).localeCompare(String(a.fechaPago))
  )[0]

  return {
    lote: prestamo.numeroLote || 'N/A',
    cliente: `${prestamo.cliente.nombres} ${prestamo.cliente.apellidos}`,
    precioLote: Number(prestamo.monto),
    cuotasPagadas,
    totalCuotas,
    fraccion: `${cuotasPagadas}/${totalCuotas || 0}`,
    porcentaje,
    cobrado,
    saldoPendiente: Number(saldoPendiente.toFixed(2)),
    estado: prestamo.estado,
    fechaInicio: prestamo.fechaInicio,
    fechaFin: prestamo.fechaFin,
    fechaCobro: prestamo.fechaCobro,
    ultimoPago: ultimoPago?.fechaPago || null,
  }
}

export default class ReportesController {
  private async verifyToken(token: string) {
    if (!token) return null
    const apiToken = await ApiToken.query()
      .where('token', token.replace('Bearer ', ''))
      .preload('user')
      .first()

    return apiToken?.user || null
  }

  async pagos({ request, response }: HttpContext) {
    try {
      const user = await this.verifyToken(request.header('authorization') || '')
      if (!user || user.role !== 'admin') return response.forbidden({ message: 'No autorizado' })

      const { fechaInicio, fechaFin } = request.qs()
      if (!fechaInicio || !fechaFin) {
        return response.badRequest({ message: 'fechaInicio y fechaFin son requeridos' })
      }

      const pagos = await Pago.query()
        .where('fecha_pago', '>=', fechaInicio)
        .where('fecha_pago', '<', fechaMasUnDia(fechaFin)!)
        .preload('prestamo', (query) => query.preload('cliente').preload('lote'))
        .preload('usuario')
        .orderBy('fecha_pago', 'asc')

      return response.ok(pagos)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener reporte de pagos' })
    }
  }

  async ventas({ request, response }: HttpContext) {
    try {
      const user = await this.verifyToken(request.header('authorization') || '')
      if (!user || user.role !== 'admin') return response.forbidden({ message: 'No autorizado' })

      const { estado, fechaInicio, fechaFin } = request.qs()
      const query = Prestamo.query().preload('cliente').preload('pagos').preload('lote')

      if (estado) query.where('estado', estado)
      if (fechaInicio) query.where('fecha_inicio', '>=', fechaInicio)
      if (fechaFin) query.where('fecha_inicio', '<', fechaMasUnDia(fechaFin)!)

      const ventas = await query.orderBy('created_at', 'desc')
      return response.ok(ventas)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener reporte de ventas' })
    }
  }

  async prestamos(ctx: HttpContext) {
    return this.ventas(ctx)
  }

  async cartera({ request, response }: HttpContext) {
    try {
      const user = await this.verifyToken(request.header('authorization') || '')
      if (!user || user.role !== 'admin') return response.forbidden({ message: 'No autorizado' })

      const { estado, fechaInicio, fechaFin } = request.qs()

      const query = Prestamo.query().preload('cliente').preload('pagos').preload('lote')
      if (estado) query.where('estado', estado)
      if (fechaInicio) query.where('fecha_inicio', '>=', fechaInicio)
      if (fechaFin) query.where('fecha_inicio', '<', fechaMasUnDia(fechaFin)!)

      const ventas = await query.orderBy('created_at', 'desc')
      const detalle = ventas.map(calcularResumenVenta)

      const totalValorLotes = detalle.reduce((suma, venta) => suma + venta.precioLote, 0)
      const totalCobradoHistorico = detalle.reduce((suma, venta) => suma + venta.cobrado, 0)
      const totalSaldoPendiente = detalle.reduce((suma, venta) => suma + venta.saldoPendiente, 0)
      const totalCuotasPagadas = detalle.reduce((suma, venta) => suma + venta.cuotasPagadas, 0)
      const totalCuotas = detalle.reduce((suma, venta) => suma + venta.totalCuotas, 0)

      return response.ok({
        totalVentas: detalle.length,
        totalValorLotes: Number(totalValorLotes.toFixed(2)),
        totalCobradoHistorico: Number(totalCobradoHistorico.toFixed(2)),
        totalSaldoPendiente: Number(totalSaldoPendiente.toFixed(2)),
        totalCuotasPagadas,
        totalCuotas,
        porcentajeGeneral:
          totalCuotas > 0 ? Math.round((totalCuotasPagadas / totalCuotas) * 100) : 0,
        detalle,
      })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener reporte de cartera' })
    }
  }

  async ganancias(ctx: HttpContext) {
    return this.cartera(ctx)
  }

  async exportarExcel({ request, response }: HttpContext) {
    try {
      const user = await this.verifyToken(request.header('authorization') || '')
      if (!user || user.role !== 'admin') return response.forbidden({ message: 'No autorizado' })

      const tipo = normalizarTipoReporte(request.qs().tipo)
      const { fechaInicio, fechaFin, estado } = request.qs()
      const fechaFinStr = fechaMasUnDia(fechaFin)

      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'Villas del Rosario'
      workbook.created = new Date()
      workbook.modified = new Date()

      if (tipo === 'pagos') {
        const sheet = workbook.addWorksheet('Pagos')
        sheet.properties.defaultRowHeight = 20

        const pagos = await Pago.query()
          .where('fecha_pago', '>=', fechaInicio)
          .where('fecha_pago', '<', fechaFinStr!)
          .preload('prestamo', (query) => query.preload('cliente').preload('lote'))
          .preload('usuario')
          .orderBy('fecha_pago', 'asc')

        agregarInfoReporte(sheet, 'Reporte de Pagos Manuales', [
          { label: 'Periodo', valor: `${fechaCorta(fechaInicio)} al ${fechaCorta(fechaFin)}` },
          { label: 'Total de registros', valor: String(pagos.length) },
          { label: 'Generado', valor: fechaCorta(new Date().toISOString()) },
        ])

        sheet.columns = [
          { key: 'fecha', width: 14 },
          { key: 'cliente', width: 30 },
          { key: 'lote', width: 14 },
          { key: 'cuota', width: 14 },
          { key: 'monto', width: 18 },
          { key: 'usuario', width: 22 },
        ]

        const headerRow = sheet.addRow([
          'Fecha',
          'Cliente',
          'Lote',
          'Cuota',
          'Monto Pagado (Q)',
          'Registrado por',
        ])
        estilizarEncabezado(headerRow)

        let totalCobrado = 0
        pagos.forEach((pago, index) => {
          const monto = Number(pago.montoPagado)
          totalCobrado += monto

          const row = sheet.addRow([
            fechaCorta(pago.fechaPago),
            `${pago.prestamo.cliente.nombres} ${pago.prestamo.cliente.apellidos}`,
            pago.prestamo.numeroLote || 'N/A',
            etiquetaPago(pago),
            monto,
            pago.usuario?.username || 'N/A',
          ])

          estilizarFila(row, index % 2 === 0)
          row.getCell(5).numFmt = '"Q"#,##0.00'
          row.getCell(5).font = { bold: true, color: { argb: COLOR_PRIMARY } }
        })

        agregarFilaTotales(sheet, ['', '', '', 'TOTAL', totalCobrado, ''])
        sheet.lastRow!.getCell(5).numFmt = '"Q"#,##0.00'
      }

      if (tipo === 'ventas') {
        const sheet = workbook.addWorksheet('Ventas')
        sheet.properties.defaultRowHeight = 20

        const query = Prestamo.query().preload('cliente').preload('pagos').preload('lote')
        if (estado) query.where('estado', estado)
        if (fechaInicio) query.where('fecha_inicio', '>=', fechaInicio)
        if (fechaFinStr) query.where('fecha_inicio', '<', fechaFinStr)
        const ventas = await query.orderBy('created_at', 'desc')

        agregarInfoReporte(sheet, 'Reporte de Ventas de Lotes', [
          { label: 'Estado filtrado', valor: estado || 'Todos' },
          {
            label: 'Periodo',
            valor:
              fechaInicio && fechaFin
                ? `${fechaCorta(fechaInicio)} al ${fechaCorta(fechaFin)}`
                : 'Todos',
          },
          { label: 'Total de registros', valor: String(ventas.length) },
          { label: 'Generado', valor: fechaCorta(new Date().toISOString()) },
        ])

        sheet.columns = [
          { key: 'cliente', width: 30 },
          { key: 'lote', width: 14 },
          { key: 'precio', width: 18 },
          { key: 'cuotas', width: 12 },
          { key: 'avance', width: 12 },
          { key: 'saldo', width: 18 },
          { key: 'cobro', width: 16 },
          { key: 'estado', width: 14 },
        ]

        const headerRow = sheet.addRow([
          'Cliente',
          'Lote',
          'Precio Lote (Q)',
          'Cuotas',
          'Avance',
          'Saldo Pendiente (Q)',
          'Cobro Pactado',
          'Estado',
        ])
        estilizarEncabezado(headerRow)

        let totalVendido = 0
        let totalPendiente = 0

        ventas.forEach((venta, index) => {
          const resumen = calcularResumenVenta(venta)
          totalVendido += resumen.precioLote
          totalPendiente += resumen.saldoPendiente

          const row = sheet.addRow([
            resumen.cliente,
            resumen.lote,
            resumen.precioLote,
            resumen.fraccion,
            `${resumen.porcentaje}%`,
            resumen.saldoPendiente,
            fechaCorta(resumen.fechaCobro),
            resumen.estado,
          ])

          estilizarFila(row, index % 2 === 0)
          row.getCell(3).numFmt = '"Q"#,##0.00'
          row.getCell(6).numFmt = '"Q"#,##0.00'
        })

        agregarFilaTotales(sheet, ['TOTAL', '', totalVendido, '', '', totalPendiente, '', ''])
        sheet.lastRow!.getCell(3).numFmt = '"Q"#,##0.00'
        sheet.lastRow!.getCell(6).numFmt = '"Q"#,##0.00'
      }

      if (tipo === 'cartera') {
        const sheet = workbook.addWorksheet('Cartera')
        sheet.properties.defaultRowHeight = 20

        const query = Prestamo.query().preload('cliente').preload('pagos').preload('lote')
        if (estado) query.where('estado', estado)
        if (fechaInicio) query.where('fecha_inicio', '>=', fechaInicio)
        if (fechaFinStr) query.where('fecha_inicio', '<', fechaFinStr)
        const ventas = await query.orderBy('created_at', 'desc')
        const detalle = ventas.map(calcularResumenVenta)

        const totalValorLotes = detalle.reduce((suma, venta) => suma + venta.precioLote, 0)
        const totalCobrado = detalle.reduce((suma, venta) => suma + venta.cobrado, 0)
        const totalPendiente = detalle.reduce((suma, venta) => suma + venta.saldoPendiente, 0)

        agregarInfoReporte(sheet, 'Resumen de Cartera', [
          { label: 'Estado filtrado', valor: estado || 'Todos' },
          {
            label: 'Periodo',
            valor:
              fechaInicio && fechaFin
                ? `${fechaCorta(fechaInicio)} al ${fechaCorta(fechaFin)}`
                : 'Todos',
          },
          { label: 'Valor de lotes', valor: formatearMoneda(totalValorLotes) },
          { label: 'Cobrado historico', valor: formatearMoneda(totalCobrado) },
          { label: 'Saldo pendiente', valor: formatearMoneda(totalPendiente) },
        ])

        sheet.columns = [
          { key: 'cliente', width: 30 },
          { key: 'lote', width: 14 },
          { key: 'avance', width: 12 },
          { key: 'cobrado', width: 18 },
          { key: 'saldo', width: 18 },
          { key: 'ultimoPago', width: 16 },
          { key: 'estado', width: 14 },
        ]

        const headerRow = sheet.addRow([
          'Cliente',
          'Lote',
          'Avance',
          'Cobrado (Q)',
          'Saldo Pendiente (Q)',
          'Ultimo Pago',
          'Estado',
        ])
        estilizarEncabezado(headerRow)

        detalle.forEach((venta, index) => {
          const row = sheet.addRow([
            venta.cliente,
            venta.lote,
            `${venta.fraccion} (${venta.porcentaje}%)`,
            venta.cobrado,
            venta.saldoPendiente,
            fechaCorta(venta.ultimoPago),
            venta.estado,
          ])

          estilizarFila(row, index % 2 === 0)
          row.getCell(4).numFmt = '"Q"#,##0.00'
          row.getCell(5).numFmt = '"Q"#,##0.00'
        })

        agregarFilaTotales(sheet, ['TOTALES', '', '', totalCobrado, totalPendiente, '', ''])
        sheet.lastRow!.getCell(4).numFmt = '"Q"#,##0.00'
        sheet.lastRow!.getCell(5).numFmt = '"Q"#,##0.00'
      }

      const buffer = await workbook.xlsx.writeBuffer()
      response.header(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      response.header('Content-Disposition', `attachment; filename="reporte_${tipo}.xlsx"`)
      return response.send(buffer)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al exportar Excel' })
    }
  }

  async exportarPDF({ request, response }: HttpContext) {
    try {
      const user = await this.verifyToken(request.header('authorization') || '')
      if (!user || user.role !== 'admin') return response.forbidden({ message: 'No autorizado' })

      const tipo = normalizarTipoReporte(request.qs().tipo)
      const { fechaInicio, fechaFin, estado } = request.qs()
      const fechaFinStr = fechaMasUnDia(fechaFin)

      const doc = new PDFDocument({ margin: 40 })
      const chunks: Buffer[] = []
      doc.on('data', (chunk) => chunks.push(chunk))

      doc.fontSize(18).font('Helvetica-Bold').text('Villas del Rosario', { align: 'center' })
      doc.fontSize(12).font('Helvetica').text(`Reporte: ${tipo}`, { align: 'center' })
      if (fechaInicio && fechaFin) {
        doc.text(`Periodo: ${fechaCorta(fechaInicio)} al ${fechaCorta(fechaFin)}`, {
          align: 'center',
        })
      }
      doc
        .fontSize(9)
        .fillColor('#6B7280')
        .text(`Generado el ${fechaCorta(new Date().toISOString())}`, { align: 'center' })
      doc.fillColor('#000000').moveDown()

      if (tipo === 'pagos') {
        const pagos = await Pago.query()
          .where('fecha_pago', '>=', fechaInicio)
          .where('fecha_pago', '<', fechaFinStr!)
          .preload('prestamo', (query) => query.preload('cliente').preload('lote'))
          .preload('usuario')
          .orderBy('fecha_pago', 'asc')

        pagos.forEach((pago) => {
          doc
            .font('Helvetica-Bold')
            .fontSize(11)
            .text(`Lote ${pago.prestamo.numeroLote || 'N/A'} - ${etiquetaPago(pago)}`)
          doc
            .font('Helvetica')
            .text(`${pago.prestamo.cliente.nombres} ${pago.prestamo.cliente.apellidos}`)
          doc
            .fontSize(10)
            .fillColor('#4B5563')
            .text(
              `Monto: ${formatearMoneda(Number(pago.montoPagado))}   Fecha: ${fechaCorta(pago.fechaPago)}   Registrado por: ${pago.usuario?.username || 'N/A'}`
            )
          doc.fillColor('#000000').moveDown(0.5)
        })
      }

      if (tipo === 'ventas') {
        const query = Prestamo.query().preload('cliente').preload('pagos').preload('lote')
        if (estado) query.where('estado', estado)
        if (fechaInicio) query.where('fecha_inicio', '>=', fechaInicio)
        if (fechaFinStr) query.where('fecha_inicio', '<', fechaFinStr)
        const ventas = await query.orderBy('created_at', 'desc')

        ventas.forEach((venta) => {
          const resumen = calcularResumenVenta(venta)
          doc.font('Helvetica-Bold').fontSize(11).text(`${resumen.cliente} - lote ${resumen.lote}`)
          doc
            .font('Helvetica')
            .fontSize(10)
            .fillColor('#4B5563')
            .text(
              `Precio: ${formatearMoneda(resumen.precioLote)}   Avance: ${resumen.fraccion} (${resumen.porcentaje}%)   Estado: ${resumen.estado}`
            )
            .text(
              `Saldo pendiente: ${formatearMoneda(resumen.saldoPendiente)}   Cobro pactado: ${fechaCorta(resumen.fechaCobro) || 'N/A'}`
            )
          doc.fillColor('#000000').moveDown(0.5)
        })
      }

      if (tipo === 'cartera') {
        const query = Prestamo.query().preload('cliente').preload('pagos').preload('lote')
        if (estado) query.where('estado', estado)
        if (fechaInicio) query.where('fecha_inicio', '>=', fechaInicio)
        if (fechaFinStr) query.where('fecha_inicio', '<', fechaFinStr)
        const ventas = await query.orderBy('created_at', 'desc')
        const detalle = ventas.map(calcularResumenVenta)
        const totalPendiente = detalle.reduce((suma, venta) => suma + venta.saldoPendiente, 0)

        detalle.forEach((venta) => {
          doc.font('Helvetica-Bold').fontSize(11).text(`${venta.cliente} - lote ${venta.lote}`)
          doc
            .font('Helvetica')
            .fontSize(10)
            .fillColor('#4B5563')
            .text(
              `Cobrado: ${formatearMoneda(venta.cobrado)}   Saldo: ${formatearMoneda(venta.saldoPendiente)}   Avance: ${venta.fraccion} (${venta.porcentaje}%)`
            )
            .text(`Ultimo pago: ${fechaCorta(venta.ultimoPago) || 'N/A'}   Estado: ${venta.estado}`)
          doc.fillColor('#000000').moveDown(0.5)
        })

        doc.moveDown()
        doc
          .font('Helvetica-Bold')
          .fontSize(13)
          .text(`Saldo total pendiente: ${formatearMoneda(totalPendiente)}`, { align: 'right' })
      }

      doc.end()
      await new Promise((resolve) => doc.on('end', resolve))
      const pdfBuffer = Buffer.concat(chunks)

      response.header('Content-Type', 'application/pdf')
      response.header('Content-Disposition', `attachment; filename="reporte_${tipo}.pdf"`)
      return response.send(pdfBuffer)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al exportar PDF' })
    }
  }
}
