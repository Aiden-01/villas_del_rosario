import router from '@adonisjs/core/services/router'

const AuthController = () => import('#controllers/auth_controller')
const UsersController = () => import('#controllers/users_controller')
const ClientsController = () => import('#controllers/clients_controller')
const PrestamosController = () => import('#controllers/prestamos_controller')
const PagosController = () => import('#controllers/pagos_controller')
const ReportesController = () => import('#controllers/reportes_controller')
const RutasController = () => import('#controllers/rutas_controller')

router.get('/', async () => {
  return { message: 'Backend funcionando 🚀' }
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

router
  .group(() => {
    router.get('/', [ClientsController, 'index'])
    router.get('/:id', [ClientsController, 'show'])
    router.post('/', [ClientsController, 'store'])
    router.put('/:id', [ClientsController, 'update'])
    router.delete('/:id', [ClientsController, 'destroy'])
  })
  .prefix('api/clientes')

router
  .group(() => {
    router.get('/', [PrestamosController, 'index'])
    router.get('/cliente/:clienteId', [PrestamosController, 'byCliente'])
    router.get('/:id', [PrestamosController, 'show'])
    router.post('/', [PrestamosController, 'store'])
    router.put('/:id', [PrestamosController, 'update'])
    router.delete('/:id', [PrestamosController, 'destroy'])
  })
  .prefix('api/prestamos')

router
  .group(() => {
    router.get('/', [PagosController, 'index'])
    router.get('/prestamo/:prestamoId', [PagosController, 'byPrestamo'])
    router.post('/', [PagosController, 'store'])
    router.delete('/:id', [PagosController, 'destroy'])
  })
  .prefix('api/pagos')

router
  .group(() => {
    router.get('/pagos', [ReportesController, 'pagos'])
    router.get('/prestamos', [ReportesController, 'prestamos'])
    router.get('/ganancias', [ReportesController, 'ganancias'])
    router.get('/exportar/excel', [ReportesController, 'exportarExcel'])
    router.get('/exportar/pdf', [ReportesController, 'exportarPDF'])
  })
  .prefix('api/reportes')

router
  .group(() => {
    router.get('/', [RutasController, 'index'])
    router.post('/', [RutasController, 'store'])
    router.put('/:id', [RutasController, 'update'])
    router.delete('/:id', [RutasController, 'destroy'])
    router.get('/hoy', [RutasController, 'rutaDelDia'])
  })
  .prefix('api/rutas')