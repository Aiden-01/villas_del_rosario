import vine from '@vinejs/vine'

export const clientValidator = vine.compile(
  vine.object({
    nombres: vine.string().trim().minLength(1).maxLength(100),
    apellidos: vine.string().trim().minLength(1).maxLength(100),
    telefono: vine.string().trim().minLength(1).maxLength(30),
    direccion: vine.string().trim().minLength(1).maxLength(255),
    zona: vine.string().trim().maxLength(120).optional(),
  })
)
