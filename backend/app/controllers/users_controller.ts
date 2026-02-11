import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'

export default class UsersController {
  // Solo admins pueden usar estas rutas
  private isAdmin(ctx: HttpContext) {
    if (!ctx.auth.user || ctx.auth.user.role !== 'admin') {
      ctx.response.forbidden({ message: 'No tienes permisos' })
      return false
    }
    return true
  }

  /*
  |--------------------------------------------------------------------------|
  | Listar usuarios
  |--------------------------------------------------------------------------|
  */
  async index(ctx: HttpContext) {
    if (!this.isAdmin(ctx)) return

    const users = await User.query().select([
      'id',
      'name',
      'email',
      'username',
      'role',
      'createdAt',
    ])
    return ctx.response.ok(users)
  }

  /*
  |--------------------------------------------------------------------------|
  | Crear usuario
  |--------------------------------------------------------------------------|
  */
  async store(ctx: HttpContext) {
    if (!this.isAdmin(ctx)) return

    const data = ctx.request.only([
      'name',
      'email',
      'username',
      'password',
      'role',
    ])

    const existsEmail = await User.findBy('email', data.email)
    if (existsEmail) {
      return ctx.response.badRequest({ message: 'El email ya existe' })
    }

    const existsUsername = await User.findBy('username', data.username)
    if (existsUsername) {
      return ctx.response.badRequest({ message: 'El username ya existe' })
    }

    const user = await User.create(data)

    return ctx.response.created({
      message: 'Usuario creado',
      user,
    })
  }

  /*
  |--------------------------------------------------------------------------|
  | Editar usuario
  |--------------------------------------------------------------------------|
  */
  async update(ctx: HttpContext) {
    if (!this.isAdmin(ctx)) return

    const user = await User.find(ctx.params.id)
    if (!user) {
      return ctx.response.notFound({ message: 'Usuario no encontrado' })
    }

    const data = ctx.request.only([
      'name',
      'email',
      'username',
      'password',
      'role',
    ])

    if (data.email && data.email !== user.email) {
      const existsEmail = await User.findBy('email', data.email)
      if (existsEmail) {
        return ctx.response.badRequest({ message: 'El email ya existe' })
      }
    }

    if (data.username && data.username !== user.username) {
      const existsUsername = await User.findBy('username', data.username)
      if (existsUsername) {
        return ctx.response.badRequest({ message: 'El username ya existe' })
      }
    }

    user.merge(data)
    await user.save()

    return ctx.response.ok({
      message: 'Usuario actualizado',
      user,
    })
  }

  /*
  |--------------------------------------------------------------------------|
  | Eliminar usuario
  |--------------------------------------------------------------------------|
  */
  async destroy(ctx: HttpContext) {
    if (!this.isAdmin(ctx)) return

    const user = await User.find(ctx.params.id)
    if (!user) {
      return ctx.response.notFound({ message: 'Usuario no encontrado' })
    }

    await user.delete()

    return ctx.response.ok({ message: 'Usuario eliminado' })
  }
}
