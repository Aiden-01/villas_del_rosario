import type { HttpContext } from '@adonisjs/core/http'
import ApiToken from '#models/api_token'
import Pago from '#models/pago'
import Prestamo from '#models/prestamo'
import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'

const fechaCorta = (fecha: any): string => {
  if (!fecha) return ''
  const str = String(fecha).split('T')[0]
  const [year, month, day] = str.split('-')
  return `${day}-${month}-${year}`
}

const COLOR_PRIMARY   = 'FF2563EB'
const COLOR_SECONDARY = 'FF1E40AF'
const COLOR_WHITE     = 'FFFFFFFF'
const COLOR_HEADER_BG = 'FFE8F0FE'
const COLOR_GREEN     = 'FF16A34A'
const COLOR_TOTAL_BG  = 'FFDBEAFE'

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
  const filaT = sheet.addRow([titulo])
  filaT.getCell(1).font = { bold: true, size: 14, color: { argb: COLOR_PRIMARY } }
  filaT.height = 30
  filtros.forEach(({ label, valor }) => {
    const fila = sheet.addRow([`${label}: ${valor}`])
    fila.getCell(1).font = { italic: true, size: 10, color: { argb: 'FF6B7280' } }
    fila.height = 16
  })
  sheet.addRow([])
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

  // ─── GET /api/reportes/pagos ────────────────────────────────────────────────
  async pagos({ request, response }: HttpContext) {
    try {
      const user = await this.verifyToken(request.header('authorization') || '')
      if (!user || user.role !== 'admin') return response.forbidden({ message: 'No autorizado' })

      const { fechaInicio, fechaFin } = request.qs()
      if (!fechaInicio || !fechaFin)
        return response.badRequest({ message: 'fechaInicio y fechaFin son requeridos' })

      // ✅ Incluir el día completo de fechaFin usando < día siguiente
      const fechaFinMas1 = new Date(fechaFin)
      fechaFinMas1.setDate(fechaFinMas1.getDate() + 1)
      const fechaFinStr = fechaFinMas1.toISOString().split('T')[0]

      const pagos = await Pago.query()
        .where('fecha_pago', '>=', fechaInicio)
        .where('fecha_pago', '<', fechaFinStr)
        .preload('prestamo', (q) => q.preload('cliente'))
        .preload('usuario')
        .orderBy('fecha_pago', 'asc')

      return response.ok(pagos)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener reporte de pagos' })
    }
  }

  // ─── GET /api/reportes/prestamos ───────────────────────────────────────────
  async prestamos({ request, response }: HttpContext) {
    try {
      const user = await this.verifyToken(request.header('authorization') || '')
      if (!user || user.role !== 'admin') return response.forbidden({ message: 'No autorizado' })

      const { estado, fechaInicio, fechaFin } = request.qs()
      const query = Prestamo.query().preload('cliente')

      if (estado) query.where('estado', estado)

      // ✅ Filtro por fecha de inicio del préstamo (opcional)
      if (fechaInicio) query.where('fecha_inicio', '>=', fechaInicio)
      if (fechaFin) {
        const fechaFinMas1 = new Date(fechaFin)
        fechaFinMas1.setDate(fechaFinMas1.getDate() + 1)
        const fechaFinStr = fechaFinMas1.toISOString().split('T')[0]
        query.where('fecha_inicio', '<', fechaFinStr)
      }

      const prestamos = await query.orderBy('created_at', 'desc')
      return response.ok(prestamos)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener reporte de préstamos' })
    }
  }

  // ─── GET /api/reportes/ganancias ───────────────────────────────────────────
  async ganancias({ request, response }: HttpContext) {
    try {
      const user = await this.verifyToken(request.header('authorization') || '')
      if (!user || user.role !== 'admin') return response.forbidden({ message: 'No autorizado' })

      const { fechaInicio, fechaFin } = request.qs()
      if (!fechaInicio || !fechaFin)
        return response.badRequest({ message: 'fechaInicio y fechaFin son requeridos' })

      // ✅ Incluir día completo de fechaFin
      const fechaFinMas1 = new Date(fechaFin)
      fechaFinMas1.setDate(fechaFinMas1.getDate() + 1)
      const fechaFinStr = fechaFinMas1.toISOString().split('T')[0]

      const pagos = await Pago.query()
        .where('fecha_pago', '>=', fechaInicio)
        .where('fecha_pago', '<', fechaFinStr)
        .preload('prestamo', (q) => q.preload('cliente'))
        .orderBy('fecha_pago', 'asc')

      const detalle = pagos.map((p) => {
        const cuotaSemanal = Number(p.prestamo.monto) * (1 + Number(p.prestamo.interes) / 100) / Number(p.prestamo.cuotas)
        const capitalPorCuota = Number(p.prestamo.monto) / Number(p.prestamo.cuotas)
        return {
          fecha: fechaCorta(p.fechaPago),
          cliente: `${p.prestamo.cliente.nombres} ${p.prestamo.cliente.apellidos}`,
          numeroCuota: p.numeroCuota,
          montoPagado: Number(p.montoPagado),
          capital: Number(capitalPorCuota.toFixed(2)),
          ganancia: Number((cuotaSemanal - capitalPorCuota).toFixed(2)),
        }
      })

      return response.ok({
        fechaInicio,
        fechaFin,
        totalCobrado:  Number(detalle.reduce((s, d) => s + d.montoPagado, 0).toFixed(2)),
        totalCapital:  Number(detalle.reduce((s, d) => s + d.capital,     0).toFixed(2)),
        totalGanancia: Number(detalle.reduce((s, d) => s + d.ganancia,    0).toFixed(2)),
        detalle,
      })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener reporte de ganancias' })
    }
  }

  // ─── GET /api/reportes/exportar/excel ──────────────────────────────────────
  async exportarExcel({ request, response }: HttpContext) {
    try {
      const user = await this.verifyToken(request.header('authorization') || '')
      if (!user || user.role !== 'admin') return response.forbidden({ message: 'No autorizado' })

      const { tipo, fechaInicio, fechaFin, estado } = request.qs()

      // ✅ fechaFin + 1 día para todos los exports
      let fechaFinStr = fechaFin
      if (fechaFin) {
        const d = new Date(fechaFin)
        d.setDate(d.getDate() + 1)
        fechaFinStr = d.toISOString().split('T')[0]
      }

      const workbook = new ExcelJS.Workbook()
      workbook.creator  = 'Sistema de Préstamos'
      workbook.created  = new Date()
      workbook.modified = new Date()

      if (tipo === 'pagos') {
        const sheet = workbook.addWorksheet('Reporte de Pagos')
        sheet.properties.defaultRowHeight = 20

        const pagos = await Pago.query()
          .where('fecha_pago', '>=', fechaInicio)
          .where('fecha_pago', '<', fechaFinStr)
          .preload('prestamo', (q) => q.preload('cliente'))
          .preload('usuario')
          .orderBy('fecha_pago', 'asc')

        agregarInfoReporte(sheet, 'Reporte de Pagos', [
          { label: 'Período', valor: `${fechaCorta(fechaInicio)} al ${fechaCorta(fechaFin)}` },
          { label: 'Total de registros', valor: String(pagos.length) },
          { label: 'Generado', valor: fechaCorta(new Date().toISOString()) },
        ])

        sheet.columns = [
          { key: 'fecha',   width: 14 },
          { key: 'cliente', width: 34 },
          { key: 'cuota',   width: 12 },
          { key: 'monto',   width: 18 },
          { key: 'usuario', width: 22 },
        ]

        const headerRow = sheet.addRow(['Fecha', 'Cliente', 'Cuota #', 'Monto Pagado (Q)', 'Registrado por'])
        estilizarEncabezado(headerRow)

        let totalCobrado = 0
        pagos.forEach((p, i) => {
          const monto = Number(p.montoPagado)
          totalCobrado += monto
          const row = sheet.addRow([
            fechaCorta(p.fechaPago),
            `${p.prestamo.cliente.nombres} ${p.prestamo.cliente.apellidos}`,
            `#${p.numeroCuota}`,
            monto,
            p.usuario?.username || 'N/A',
          ])
          estilizarFila(row, i % 2 === 0)
          row.getCell(4).numFmt = '"Q"#,##0.00'
          row.getCell(4).font = { bold: true, color: { argb: COLOR_PRIMARY } }
        })

        agregarFilaTotales(sheet, ['', '', 'TOTAL', totalCobrado, ''])
        const totalRow = sheet.lastRow!
        totalRow.getCell(4).numFmt = '"Q"#,##0.00'
        totalRow.getCell(4).font = { bold: true, size: 12, color: { argb: COLOR_GREEN } }

        const headerRowNum = sheet.rowCount - pagos.length - 1
        sheet.autoFilter = {
          from: { row: headerRowNum, column: 1 },
          to:   { row: headerRowNum, column: 5 },
        }

      } else if (tipo === 'prestamos') {
        const sheet = workbook.addWorksheet('Reporte de Préstamos')
        sheet.properties.defaultRowHeight = 20

        const query = Prestamo.query().preload('cliente')
        if (estado) query.where('estado', estado)
        if (fechaInicio) query.where('fecha_inicio', '>=', fechaInicio)
        if (fechaFin)    query.where('fecha_inicio', '<', fechaFinStr)
        const prestamos = await query.orderBy('created_at', 'desc')

        agregarInfoReporte(sheet, 'Reporte de Préstamos', [
          { label: 'Estado filtrado', valor: estado || 'Todos' },
          { label: 'Período',         valor: fechaInicio ? `${fechaCorta(fechaInicio)} al ${fechaCorta(fechaFin)}` : 'Todos' },
          { label: 'Total de registros', valor: String(prestamos.length) },
          { label: 'Generado',        valor: fechaCorta(new Date().toISOString()) },
        ])

        sheet.columns = [
          { key: 'cliente',     width: 34 },
          { key: 'monto',       width: 18 },
          { key: 'interes',     width: 13 },
          { key: 'cuotas',      width: 12 },
          { key: 'fechaInicio', width: 14 },
          { key: 'fechaFin',    width: 14 },
          { key: 'estado',      width: 13 },
        ]

        const headerRow = sheet.addRow(['Cliente', 'Monto (Q)', 'Interés %', 'Cuotas', 'Fecha Inicio', 'Fecha Fin', 'Estado'])
        estilizarEncabezado(headerRow)

        let totalPrestado = 0
        prestamos.forEach((p, i) => {
          const monto = Number(p.monto)
          totalPrestado += monto
          const row = sheet.addRow([
            `${p.cliente.nombres} ${p.cliente.apellidos}`,
            monto,
            `${p.interes}%`,
            `${p.cuotas} sem`,
            fechaCorta(p.fechaInicio),
            fechaCorta(p.fechaFin),
            p.estado,
          ])
          estilizarFila(row, i % 2 === 0)
          row.getCell(2).numFmt = '"Q"#,##0.00'
          row.getCell(2).font = { bold: true, color: { argb: COLOR_PRIMARY } }
          const estadoCell = row.getCell(7)
          if (p.estado === 'activo')  { estadoCell.font = { color: { argb: 'FF16A34A' }, bold: true } }
          if (p.estado === 'vencido') { estadoCell.font = { color: { argb: 'FFDC2626' }, bold: true } }
          if (p.estado === 'pagado')  { estadoCell.font = { color: { argb: 'FF2563EB' }, bold: true } }
        })

        agregarFilaTotales(sheet, ['TOTAL', totalPrestado, '', '', '', '', ''])
        const totalRow = sheet.lastRow!
        totalRow.getCell(2).numFmt = '"Q"#,##0.00'
        totalRow.getCell(2).font = { bold: true, size: 12, color: { argb: COLOR_GREEN } }

        const headerRowNum = sheet.rowCount - prestamos.length - 1
        sheet.autoFilter = {
          from: { row: headerRowNum, column: 1 },
          to:   { row: headerRowNum, column: 7 },
        }

      } else if (tipo === 'ganancias') {
        const sheet = workbook.addWorksheet('Reporte de Ganancias')
        sheet.properties.defaultRowHeight = 20

        const pagos = await Pago.query()
          .where('fecha_pago', '>=', fechaInicio)
          .where('fecha_pago', '<', fechaFinStr)
          .preload('prestamo', (q) => q.preload('cliente'))
          .orderBy('fecha_pago', 'asc')

        let totalCobrado = 0, totalCapital = 0, totalGanancia = 0
        const filas = pagos.map((p) => {
          const cuotaSemanal    = Number(p.prestamo.monto) * (1 + Number(p.prestamo.interes) / 100) / Number(p.prestamo.cuotas)
          const capitalPorCuota = Number(p.prestamo.monto) / Number(p.prestamo.cuotas)
          const ganancia        = cuotaSemanal - capitalPorCuota
          totalCobrado  += Number(p.montoPagado)
          totalCapital  += capitalPorCuota
          totalGanancia += ganancia
          return {
            fecha:    fechaCorta(p.fechaPago),
            cliente:  `${p.prestamo.cliente.nombres} ${p.prestamo.cliente.apellidos}`,
            cuota:    `#${p.numeroCuota}`,
            monto:    Number(p.montoPagado),
            capital:  Number(capitalPorCuota.toFixed(2)),
            ganancia: Number(ganancia.toFixed(2)),
          }
        })

        agregarInfoReporte(sheet, 'Reporte de Ganancias', [
          { label: 'Período',       valor: `${fechaCorta(fechaInicio)} al ${fechaCorta(fechaFin)}` },
          { label: 'Total cobrado', valor: `Q${totalCobrado.toFixed(2)}` },
          { label: 'Total capital', valor: `Q${totalCapital.toFixed(2)}` },
          { label: 'Ganancia neta', valor: `Q${totalGanancia.toFixed(2)}` },
          { label: 'Generado',      valor: fechaCorta(new Date().toISOString()) },
        ])

        sheet.columns = [
          { key: 'fecha',    width: 14 },
          { key: 'cliente',  width: 34 },
          { key: 'cuota',    width: 12 },
          { key: 'monto',    width: 18 },
          { key: 'capital',  width: 18 },
          { key: 'ganancia', width: 18 },
        ]

        const headerRow = sheet.addRow(['Fecha', 'Cliente', 'Cuota #', 'Monto Cobrado (Q)', 'Capital (Q)', 'Ganancia (Q)'])
        estilizarEncabezado(headerRow)

        filas.forEach((f, i) => {
          const row = sheet.addRow([f.fecha, f.cliente, f.cuota, f.monto, f.capital, f.ganancia])
          estilizarFila(row, i % 2 === 0)
          ;[4, 5, 6].forEach((col) => { row.getCell(col).numFmt = '"Q"#,##0.00' })
          row.getCell(4).font = { color: { argb: COLOR_PRIMARY } }
          row.getCell(6).font = { bold: true, color: { argb: COLOR_GREEN } }
        })

        agregarFilaTotales(sheet, ['', 'TOTALES', '', totalCobrado, totalCapital, totalGanancia])
        const totalRow = sheet.lastRow!
        ;[4, 5, 6].forEach((col) => {
          totalRow.getCell(col).numFmt = '"Q"#,##0.00'
          totalRow.getCell(col).font   = { bold: true, size: 11, color: { argb: COLOR_GREEN } }
        })

        const headerRowNum = sheet.rowCount - filas.length - 1
        sheet.autoFilter = {
          from: { row: headerRowNum, column: 1 },
          to:   { row: headerRowNum, column: 6 },
        }
      }

      const buffer = await workbook.xlsx.writeBuffer()
      response.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      response.header('Content-Disposition', `attachment; filename="reporte_${tipo}.xlsx"`)
      return response.send(buffer)

    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al exportar Excel' })
    }
  }

  // ─── GET /api/reportes/exportar/pdf ────────────────────────────────────────
  async exportarPDF({ request, response }: HttpContext) {
    try {
      const user = await this.verifyToken(request.header('authorization') || '')
      if (!user || user.role !== 'admin') return response.forbidden({ message: 'No autorizado' })

      const { tipo, fechaInicio, fechaFin, estado } = request.qs()

      // ✅ fechaFin + 1 día
      let fechaFinStr = fechaFin
      if (fechaFin) {
        const d = new Date(fechaFin)
        d.setDate(d.getDate() + 1)
        fechaFinStr = d.toISOString().split('T')[0]
      }

      const doc = new PDFDocument({ margin: 40 })
      const chunks: Buffer[] = []
      doc.on('data', (chunk) => chunks.push(chunk))

      doc.fontSize(18).font('Helvetica-Bold').text('Sistema de Préstamos', { align: 'center' })
      doc.fontSize(12).font('Helvetica').text(`Reporte: ${tipo}`, { align: 'center' })
      if (fechaInicio && fechaFin) {
        doc.text(`Período: ${fechaCorta(fechaInicio)} al ${fechaCorta(fechaFin)}`, { align: 'center' })
      }
      doc.fontSize(9).fillColor('#6B7280')
        .text(`Generado el ${fechaCorta(new Date().toISOString())}`, { align: 'center' })
      doc.fillColor('#000000').moveDown()

      if (tipo === 'pagos') {
        const pagos = await Pago.query()
          .where('fecha_pago', '>=', fechaInicio)
          .where('fecha_pago', '<', fechaFinStr)
          .preload('prestamo', (q) => q.preload('cliente'))
          .preload('usuario')
          .orderBy('fecha_pago', 'asc')

        pagos.forEach((p) => {
          doc.font('Helvetica-Bold').fontSize(11)
            .text(`Cuota #${p.numeroCuota}`, { continued: true })
          doc.font('Helvetica')
            .text(` — ${p.prestamo.cliente.nombres} ${p.prestamo.cliente.apellidos}`)
          doc.fontSize(10).fillColor('#4B5563')
            .text(`  Monto: Q${Number(p.montoPagado).toFixed(2)}   Fecha: ${fechaCorta(p.fechaPago)}   Cobrado por: ${p.usuario?.username || 'N/A'}`)
          doc.fillColor('#000000').moveDown(0.5)
        })

      } else if (tipo === 'prestamos') {
        const query = Prestamo.query().preload('cliente')
        if (estado)      query.where('estado', estado)
        if (fechaInicio) query.where('fecha_inicio', '>=', fechaInicio)
        if (fechaFin)    query.where('fecha_inicio', '<', fechaFinStr)
        const prestamos = await query.orderBy('created_at', 'desc')

        prestamos.forEach((p) => {
          doc.font('Helvetica-Bold').fontSize(11)
            .text(`${p.cliente.nombres} ${p.cliente.apellidos}`)
          doc.font('Helvetica').fontSize(10).fillColor('#4B5563')
            .text(`  Monto: Q${Number(p.monto).toFixed(2)}   Interés: ${p.interes}%   Cuotas: ${p.cuotas}   Estado: ${p.estado}`)
            .text(`  Inicio: ${fechaCorta(p.fechaInicio)}   Fin: ${fechaCorta(p.fechaFin)}`)
          doc.fillColor('#000000').moveDown(0.5)
        })

      } else if (tipo === 'ganancias') {
        const pagos = await Pago.query()
          .where('fecha_pago', '>=', fechaInicio)
          .where('fecha_pago', '<', fechaFinStr)
          .preload('prestamo', (q) => q.preload('cliente'))
          .orderBy('fecha_pago', 'asc')

        let totalGanancia = 0
        pagos.forEach((p) => {
          const cuotaSemanal    = Number(p.prestamo.monto) * (1 + Number(p.prestamo.interes) / 100) / Number(p.prestamo.cuotas)
          const capitalPorCuota = Number(p.prestamo.monto) / Number(p.prestamo.cuotas)
          const ganancia        = cuotaSemanal - capitalPorCuota
          totalGanancia += ganancia

          doc.font('Helvetica-Bold').fontSize(11)
            .text(`${p.prestamo.cliente.nombres} ${p.prestamo.cliente.apellidos}`, { continued: true })
          doc.font('Helvetica').text(` — Cuota #${p.numeroCuota}`)
          doc.fontSize(10).fillColor('#4B5563')
            .text(`  Cobrado: Q${Number(p.montoPagado).toFixed(2)}   Capital: Q${capitalPorCuota.toFixed(2)}   Ganancia: Q${ganancia.toFixed(2)}   Fecha: ${fechaCorta(p.fechaPago)}`)
          doc.fillColor('#000000').moveDown(0.5)
        })

        doc.moveDown()
        doc.font('Helvetica-Bold').fontSize(13)
          .text(`Total ganancia: Q${totalGanancia.toFixed(2)}`, { align: 'right' })
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