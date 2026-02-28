import type { HttpContext } from '@adonisjs/core/http'
import ApiToken from '#models/api_token'
import Pago from '#models/pago'
import Prestamo from '#models/prestamo'
import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'

export default class ReportesController {

  private async verifyToken(token: string) {
    if (!token) return null
    const apiToken = await ApiToken.query()
      .where('token', token.replace('Bearer ', ''))
      .preload('user')
      .first()
    return apiToken?.user || null
  }

  /**
   * Pagos por rango de fechas
   */
  async pagos({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')

      if (!user || user.role !== 'admin') {
        return response.forbidden({ message: 'No autorizado' })
      }

      const { fechaInicio, fechaFin } = request.qs()

      if (!fechaInicio || !fechaFin) {
        return response.badRequest({ message: 'fechaInicio y fechaFin son requeridos' })
      }

      const pagos = await Pago.query()
        .whereBetween('fecha_pago', [fechaInicio, fechaFin])
        .preload('prestamo', (q) => q.preload('cliente'))
        .preload('usuario')
        .orderBy('fecha_pago', 'asc')

      return response.ok(pagos)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener reporte de pagos' })
    }
  }

  /**
   * Préstamos por estado
   */
  async prestamos({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')

      if (!user || user.role !== 'admin') {
        return response.forbidden({ message: 'No autorizado' })
      }

      const { estado } = request.qs()

      const query = Prestamo.query().preload('cliente')

      if (estado) {
        query.where('estado', estado)
      }

      const prestamos = await query.orderBy('created_at', 'desc')

      return response.ok(prestamos)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener reporte de préstamos' })
    }
  }

  /**
   * Ganancias por rango de fechas
   */
  async ganancias({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')

      if (!user || user.role !== 'admin') {
        return response.forbidden({ message: 'No autorizado' })
      }

      const { fechaInicio, fechaFin } = request.qs()

      if (!fechaInicio || !fechaFin) {
        return response.badRequest({ message: 'fechaInicio y fechaFin son requeridos' })
      }

      const pagos = await Pago.query()
        .whereBetween('fecha_pago', [fechaInicio, fechaFin])
        .preload('prestamo', (q) => q.preload('cliente'))
        .orderBy('fecha_pago', 'asc')

      // Calcular ganancias (intereses cobrados)
      const totalCobrado = pagos.reduce((sum, p) => sum + Number(p.montoPagado), 0)

      const detalle = pagos.map((p) => {
        const cuotaSemanal = Number(p.prestamo.monto) * (1 + Number(p.prestamo.interes) / 100) / Number(p.prestamo.cuotas)
        const capitalPorCuota = Number(p.prestamo.monto) / Number(p.prestamo.cuotas)
        const ganancia = cuotaSemanal - capitalPorCuota

        return {
          fecha: p.fechaPago,
          cliente: `${p.prestamo.cliente.nombres} ${p.prestamo.cliente.apellidos}`,
          numeroCuota: p.numeroCuota,
          montoPagado: Number(p.montoPagado),
          capital: Number(capitalPorCuota.toFixed(2)),
          ganancia: Number(ganancia.toFixed(2)),
        }
      })

      const totalGanancia = detalle.reduce((sum, d) => sum + d.ganancia, 0)
      const totalCapital = detalle.reduce((sum, d) => sum + d.capital, 0)

      return response.ok({
        fechaInicio,
        fechaFin,
        totalCobrado: Number(totalCobrado.toFixed(2)),
        totalCapital: Number(totalCapital.toFixed(2)),
        totalGanancia: Number(totalGanancia.toFixed(2)),
        detalle,
      })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener reporte de ganancias' })
    }
  }

  /**
   * Exportar a Excel
   */
  async exportarExcel({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')

      if (!user || user.role !== 'admin') {
        return response.forbidden({ message: 'No autorizado' })
      }

      const { tipo, fechaInicio, fechaFin, estado } = request.qs()
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('Reporte')

      if (tipo === 'pagos') {
        sheet.columns = [
          { header: 'Fecha', key: 'fecha', width: 15 },
          { header: 'Cliente', key: 'cliente', width: 30 },
          { header: 'Cuota #', key: 'cuota', width: 10 },
          { header: 'Monto Pagado', key: 'monto', width: 15 },
          { header: 'Registrado por', key: 'usuario', width: 20 },
        ]

        const pagos = await Pago.query()
          .whereBetween('fecha_pago', [fechaInicio, fechaFin])
          .preload('prestamo', (q) => q.preload('cliente'))
          .preload('usuario')
          .orderBy('fecha_pago', 'asc')

        pagos.forEach((p) => {
          sheet.addRow({
            fecha: p.fechaPago,
            cliente: `${p.prestamo.cliente.nombres} ${p.prestamo.cliente.apellidos}`,
            cuota: p.numeroCuota,
            monto: Number(p.montoPagado),
            usuario: p.usuario?.username || 'N/A',
          })
        })

      } else if (tipo === 'prestamos') {
        sheet.columns = [
          { header: 'Cliente', key: 'cliente', width: 30 },
          { header: 'Monto', key: 'monto', width: 15 },
          { header: 'Interés %', key: 'interes', width: 12 },
          { header: 'Cuotas', key: 'cuotas', width: 10 },
          { header: 'Fecha Inicio', key: 'fechaInicio', width: 15 },
          { header: 'Fecha Fin', key: 'fechaFin', width: 15 },
          { header: 'Estado', key: 'estado', width: 12 },
        ]

        const query = Prestamo.query().preload('cliente')
        if (estado) query.where('estado', estado)
        const prestamos = await query.orderBy('created_at', 'desc')

        prestamos.forEach((p) => {
          sheet.addRow({
            cliente: `${p.cliente.nombres} ${p.cliente.apellidos}`,
            monto: Number(p.monto),
            interes: Number(p.interes),
            cuotas: p.cuotas,
            fechaInicio: p.fechaInicio,
            fechaFin: p.fechaFin,
            estado: p.estado,
          })
        })

      } else if (tipo === 'ganancias') {
        sheet.columns = [
          { header: 'Fecha', key: 'fecha', width: 15 },
          { header: 'Cliente', key: 'cliente', width: 30 },
          { header: 'Cuota #', key: 'cuota', width: 10 },
          { header: 'Monto Cobrado', key: 'monto', width: 15 },
          { header: 'Capital', key: 'capital', width: 15 },
          { header: 'Ganancia', key: 'ganancia', width: 15 },
        ]

        const pagos = await Pago.query()
          .whereBetween('fecha_pago', [fechaInicio, fechaFin])
          .preload('prestamo', (q) => q.preload('cliente'))
          .orderBy('fecha_pago', 'asc')

        pagos.forEach((p) => {
          const cuotaSemanal = Number(p.prestamo.monto) * (1 + Number(p.prestamo.interes) / 100) / Number(p.prestamo.cuotas)
          const capitalPorCuota = Number(p.prestamo.monto) / Number(p.prestamo.cuotas)
          sheet.addRow({
            fecha: p.fechaPago,
            cliente: `${p.prestamo.cliente.nombres} ${p.prestamo.cliente.apellidos}`,
            cuota: p.numeroCuota,
            monto: Number(p.montoPagado),
            capital: Number(capitalPorCuota.toFixed(2)),
            ganancia: Number((cuotaSemanal - capitalPorCuota).toFixed(2)),
          })
        })
      }

      // Estilo encabezados
      sheet.getRow(1).font = { bold: true }
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' },
      }
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

      const buffer = await workbook.xlsx.writeBuffer()

      response.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      response.header('Content-Disposition', `attachment; filename="reporte_${tipo}.xlsx"`)
      return response.send(buffer)

    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al exportar Excel' })
    }
  }

  /**
   * Exportar a PDF
   */
  async exportarPDF({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')

      if (!user || user.role !== 'admin') {
        return response.forbidden({ message: 'No autorizado' })
      }

      const { tipo, fechaInicio, fechaFin, estado } = request.qs()
      const doc = new PDFDocument({ margin: 40 })
      const chunks: Buffer[] = []

      doc.on('data', (chunk) => chunks.push(chunk))

      // Encabezado
      doc.fontSize(18).font('Helvetica-Bold').text('Sistema de Préstamos', { align: 'center' })
      doc.fontSize(12).font('Helvetica').text(`Reporte: ${tipo}`, { align: 'center' })
      if (fechaInicio && fechaFin) {
        doc.text(`Período: ${fechaInicio} al ${fechaFin}`, { align: 'center' })
      }
      doc.moveDown()

      if (tipo === 'pagos') {
        const pagos = await Pago.query()
          .whereBetween('fecha_pago', [fechaInicio, fechaFin])
          .preload('prestamo', (q) => q.preload('cliente'))
          .preload('usuario')
          .orderBy('fecha_pago', 'asc')

        pagos.forEach((p) => {
          doc.font('Helvetica-Bold').text(`Cuota #${p.numeroCuota}`, { continued: true })
          doc.font('Helvetica').text(` — ${p.prestamo.cliente.nombres} ${p.prestamo.cliente.apellidos}`)
          doc.text(`  Monto: Q${Number(p.montoPagado).toFixed(2)}   Fecha: ${p.fechaPago}   Cobrado por: ${p.usuario?.username || 'N/A'}`)
          doc.moveDown(0.5)
        })

      } else if (tipo === 'prestamos') {
        const query = Prestamo.query().preload('cliente')
        if (estado) query.where('estado', estado)
        const prestamos = await query.orderBy('created_at', 'desc')

        prestamos.forEach((p) => {
          doc.font('Helvetica-Bold').text(`${p.cliente.nombres} ${p.cliente.apellidos}`)
          doc.font('Helvetica').text(`  Monto: Q${Number(p.monto).toFixed(2)}   Interés: ${p.interes}%   Cuotas: ${p.cuotas}   Estado: ${p.estado}`)
          doc.text(`  Inicio: ${p.fechaInicio}   Fin: ${p.fechaFin}`)
          doc.moveDown(0.5)
        })

      } else if (tipo === 'ganancias') {
        const pagos = await Pago.query()
          .whereBetween('fecha_pago', [fechaInicio, fechaFin])
          .preload('prestamo', (q) => q.preload('cliente'))
          .orderBy('fecha_pago', 'asc')

        let totalGanancia = 0

        pagos.forEach((p) => {
          const cuotaSemanal = Number(p.prestamo.monto) * (1 + Number(p.prestamo.interes) / 100) / Number(p.prestamo.cuotas)
          const capitalPorCuota = Number(p.prestamo.monto) / Number(p.prestamo.cuotas)
          const ganancia = cuotaSemanal - capitalPorCuota
          totalGanancia += ganancia

          doc.font('Helvetica-Bold').text(`${p.prestamo.cliente.nombres} ${p.prestamo.cliente.apellidos}`, { continued: true })
          doc.font('Helvetica').text(` — Cuota #${p.numeroCuota}`)
          doc.text(`  Cobrado: Q${Number(p.montoPagado).toFixed(2)}   Capital: Q${capitalPorCuota.toFixed(2)}   Ganancia: Q${ganancia.toFixed(2)}`)
          doc.moveDown(0.5)
        })

        doc.moveDown()
        doc.font('Helvetica-Bold').fontSize(13).text(`Total ganancia: Q${totalGanancia.toFixed(2)}`, { align: 'right' })
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