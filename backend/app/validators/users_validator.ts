import vine from '@vinejs/vine'

export const createUserValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100),
    email: vine.string().trim().email().maxLength(150),
    username: vine
      .string()
      .trim()
      .minLength(3)
      .maxLength(50)
      .regex(/^[a-zA-Z0-9._-]+$/),
    password: vine.string().minLength(8).maxLength(128),
    role: vine.enum(['admin', 'trabajador']),
  })
)
