import router from '@adonisjs/core/services/router'

const AuthController = () => import('#controllers/auth_controller')
const UsersController = () => import('#controllers/users_controller')
const ClientsController = () => import('#controllers/clients_controller')

router.get('/', async () => {
  return { message: 'Backend funcionando 🚀' }
})

/*
|--------------------------------------------------------------------------|
| Auth
|--------------------------------------------------------------------------|
*/
router.post('/api/login', [AuthController, 'login'])

/*
|--------------------------------------------------------------------------|
| Protected routes
|--------------------------------------------------------------------------|
*/

// =============================
// 👑 SOLO ADMIN
// =============================
// SOLO ADMIN
router.group(() => {
  router.get('/', [UsersController, 'index'])
  router.post('/', [UsersController, 'store'])
  router.delete('/:id', [UsersController, 'destroy'])
})
.prefix('api/users')       // ✅ prefijo único
.middleware(['auth', 'admin']) // ✅ middlewares válidos

// ADMIN & TRABAJADOR
router.group(() => {
  router.get('/', [ClientsController, 'index'])
})
.prefix('api/clients')
.middleware(['auth', 'worker']) // middleware que valida ambos roles
