import router from '@adonisjs/core/services/router'

const AuthController = () => import('#controllers/auth_controller')
const UsersController = () => import('#controllers/users_controller')
const ClientsController = () => import('#controllers/clients_controller')

router.get('/', async () => {
  return { message: 'Backend funcionando 🚀' }
})

/*
|--------------------------------------------------------------------------|
| Auth Routes (Public)
|--------------------------------------------------------------------------|
*/
router.post('/api/login', [AuthController, 'login'])
router.post('/api/logout', [AuthController, 'logout']).middleware(['auth'])
router.get('/api/me', [AuthController, 'me']).middleware(['auth'])

/*
|--------------------------------------------------------------------------|
| Protected routes
|--------------------------------------------------------------------------|
*/

// =============================
// 👑 SOLO ADMIN
// =============================
router
  .group(() => {
    router.get('/', [UsersController, 'index'])
    router.post('/', [UsersController, 'store'])
    router.delete('/:id', [UsersController, 'destroy'])
  })
  .prefix('api/users')
 .middleware(['auth', 'role:admin'])

// =============================
// ADMIN & TRABAJADOR
// =============================
router
  .group(() => {
    router.get('/', [ClientsController, 'index'])
  })
  .prefix('api/clients')
  .middleware(['auth', 'role:admin,trabajador']) // Asegúrate que sea 'trabajador' (no 'worker')