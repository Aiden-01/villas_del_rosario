import router from '@adonisjs/core/services/router'

const middleware = router.named({
  auth: () => import('#middleware/auth_middleware'),
  admin: () => import('#middleware/admin_middleware'),
})

const AuthController = () => import('#controllers/auth_controller')
const UsersController = () => import('#controllers/users_controller')
const ClientsController = () => import('#controllers/clients_controller')
const PrestamosController = () => import('#controllers/prestamos_controller')
const PagosController = () => import('#controllers/pagos_controller')
const ReportesController = () => import('#controllers/reportes_controller')
const RutasController = () => import('#controllers/rutas_controller')
const ActividadesController = () => import('#controllers/actividades_controller')
const SeguimientosController = () => import('#controllers/seguimientos_controller')

router.get('/', async () => {
  return { message: 'Backend funcionando' }
})

router.post('/api/login', [AuthController, 'login'])

router.get('/api/test', async () => {
  return { test: 'ok', timestamp: new Date().toISOString() }
})

router
  .group(() => {
    router.get('/', [UsersController, 'index'])
    router.post('/', [UsersController, 'store'])
    router.delete('/:id', [UsersController, 'destroy'])
  })
  .prefix('api/users')
  .use([middleware.auth(), middleware.admin()])

router
  .group(() => {
    router.get('/', [ClientsController, 'index'])
    router.put('/ordenar', [ClientsController, 'actualizarOrdenes'])
    router.put('/ordenar-rutas', [ClientsController, 'actualizarOrdenRutas'])
    router.get('/:id', [ClientsController, 'show'])
    router.post('/', [ClientsController, 'store'])
    router.put('/:id', [ClientsController, 'update'])
    router.delete('/:id', [ClientsController, 'destroy']).use(middleware.admin())
  })
  .prefix('api/clientes')
  .use(middleware.auth())

router
  .group(() => {
    router.get('/', [PrestamosController, 'index'])
    router.get('/cliente/:clienteId', [PrestamosController, 'byCliente'])
    router.get('/:id', [PrestamosController, 'show'])
    router.post('/', [PrestamosController, 'store'])
    router.put('/:id', [PrestamosController, 'update'])
    router.delete('/:id', [PrestamosController, 'destroy']).use(middleware.admin())
  })
  .prefix('api/prestamos')
  .use(middleware.auth())

router
  .group(() => {
    router.get('/', [PrestamosController, 'index'])
    router.get('/cliente/:clienteId', [PrestamosController, 'byCliente'])
    router.get('/:id', [PrestamosController, 'show'])
    router.post('/', [PrestamosController, 'store'])
    router.put('/:id', [PrestamosController, 'update'])
    router.delete('/:id', [PrestamosController, 'destroy']).use(middleware.admin())
  })
  .prefix('api/ventas')
  .use(middleware.auth())

router
  .group(() => {
    router.get('/', [PagosController, 'index'])
    router.get('/prestamo/:prestamoId', [PagosController, 'byPrestamo'])
    router.get('/venta/:prestamoId', [PagosController, 'byPrestamo'])
    router.post('/', [PagosController, 'store'])
    router.delete('/:id', [PagosController, 'destroy']).use(middleware.admin())
  })
  .prefix('api/pagos')
  .use(middleware.auth())

router
  .group(() => {
    router.get('/pagos', [ReportesController, 'pagos'])
    router.get('/ventas', [ReportesController, 'ventas'])
    router.get('/prestamos', [ReportesController, 'prestamos'])
    router.get('/cartera', [ReportesController, 'cartera'])
    router.get('/ganancias', [ReportesController, 'ganancias'])
    router.get('/exportar/excel', [ReportesController, 'exportarExcel'])
    router.get('/exportar/pdf', [ReportesController, 'exportarPDF'])
  })
  .prefix('api/reportes')
  .use([middleware.auth(), middleware.admin()])

router
  .group(() => {
    router.get('/hoy', [RutasController, 'rutaDelDia'])
    router.get('/', [RutasController, 'index'])
    router.post('/', [RutasController, 'store']).use(middleware.admin())
    router.put('/:id', [RutasController, 'update']).use(middleware.admin())
    router.delete('/:id', [RutasController, 'destroy']).use(middleware.admin())
  })
  .prefix('api/rutas')
  .use(middleware.auth())

router
  .group(() => {
    router.get('/', [ActividadesController, 'index'])
  })
  .prefix('api/historial')
  .use(middleware.auth())

router
  .group(() => {
    router.post('/', [SeguimientosController, 'store'])
    router.put('/:id/resolver', [SeguimientosController, 'resolver'])
    router.get('/prestamo/:prestamoId', [SeguimientosController, 'byPrestamo'])
    router.get('/venta/:prestamoId', [SeguimientosController, 'byPrestamo'])
  })
  .prefix('api/seguimientos')
  .use(middleware.auth())
