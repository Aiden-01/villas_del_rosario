// start/routes.ts
import router from '@adonisjs/core/services/router'

const AuthController = () => import('#controllers/auth_controller')
const UsersController = () => import('#controllers/users_controller')

// Ruta pública
router.get('/', async () => {
  return { message: 'Backend funcionando 🚀' }
})

// Login público
router.post('/api/login', [AuthController, 'login'])

// Ruta de prueba SIN middleware
router.get('/api/test', async () => {
  return { test: 'ok', timestamp: new Date().toISOString() }
})

// Ruta de usuarios SIN middleware (temporalmente)
router
  .group(() => {
    router.get('/', [UsersController, 'index'])
    router.post('/', [UsersController, 'store'])
    router.delete('/:id', [UsersController, 'destroy'])
  })
  .prefix('api/users')
// .middleware([]) // SIN middleware por ahora