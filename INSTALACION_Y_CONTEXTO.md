# Villas del Rosario - Instalacion y Contexto Tecnico

Este archivo sirve como contexto rapido para cualquier persona que necesite instalar, ejecutar y entender la base tecnica del sistema.

## 1. Que es este proyecto

`Villas del Rosario` es un sistema de lotificaciones para:

- administrar clientes
- registrar ventas de lotes
- llevar control de cuotas y pagos
- reprogramar cobros pendientes
- visualizar pagos en agenda/calendario

El proyecto esta dividido en 2 partes:

- `backend/`: API en AdonisJS con PostgreSQL
- `frontend/`: interfaz web en React + Vite

## 2. Tecnologias usadas

### Backend

- `Node.js`
- `AdonisJS 6`
- `TypeScript`
- `PostgreSQL`
- `Lucid ORM`
- `Luxon`
- `ExcelJS`
- `PDFKit`

### Frontend

- `React 19`
- `Vite`
- `Tailwind CSS`
- `React Router`
- `Lucide React`

## 3. Requisitos previos

Instalar como minimo:

- `Git`
- `Node.js` recomendado: `22 LTS`
- `npm`
- `PostgreSQL` recomendado: `15` o superior

Tambien es importante:

- tener un usuario y base de datos de PostgreSQL creados
- poder ejecutar `npm` desde terminal
- tener libre el puerto `3333` para backend
- tener libre el puerto `5173` para frontend

## 4. Estructura general

```text
villas_del_rosario/
├─ backend/
├─ frontend/
└─ INSTALACION_Y_CONTEXTO.md
```

## 5. Variables de entorno

El backend usa archivo `.env`.

Base de ejemplo real del proyecto:

```env
TZ=UTC
PORT=3333
HOST=localhost
LOG_LEVEL=info
APP_KEY=coloca_aqui_una_clave_segura
NODE_ENV=development
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu_password
DB_DATABASE=app
```

Pasos:

1. Copiar `backend/.env.example` a `backend/.env`
2. Ajustar usuario, password y nombre de la base de datos
3. Guardar cambios antes de correr migraciones

## 6. Instalacion en Windows

### 6.1 Instalar herramientas

Instalar:

- `Git for Windows`
- `Node.js 22 LTS`
- `PostgreSQL`

Verificar en PowerShell:

```powershell
node -v
npm -v
git --version
psql --version
```

### 6.2 Crear base de datos

Desde PowerShell o `psql`:

```powershell
psql -U postgres
```

Luego dentro de PostgreSQL:

```sql
CREATE DATABASE app;
```

### 6.3 Instalar dependencias

Desde la raiz del proyecto:

```powershell
cd C:\ruta\hacia\villas_del_rosario\backend
npm install

cd ..\frontend
npm install
```

### 6.4 Configurar entorno

```powershell
cd C:\ruta\hacia\villas_del_rosario\backend
Copy-Item .env.example .env
```

Editar `backend/.env` con tus datos reales de PostgreSQL.

### 6.5 Ejecutar migraciones

```powershell
cd C:\ruta\hacia\villas_del_rosario\backend
node ace migration:run
```

### 6.6 Levantar backend

```powershell
cd C:\ruta\hacia\villas_del_rosario\backend
npm run dev
```

Backend esperado:

- `http://localhost:3333`

### 6.7 Levantar frontend

En otra terminal:

```powershell
cd C:\ruta\hacia\villas_del_rosario\frontend
npm run dev
```

Frontend esperado:

- `http://localhost:5173`

## 7. Instalacion en Ubuntu / Linux

### 7.1 Instalar herramientas

```bash
sudo apt update
sudo apt install -y git curl postgresql postgresql-contrib
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

Verificar:

```bash
node -v
npm -v
git --version
psql --version
```

### 7.2 Crear base de datos

```bash
sudo -u postgres psql
```

Luego:

```sql
CREATE DATABASE app;
```

Si necesitas un usuario propio:

```sql
CREATE USER villas_user WITH PASSWORD 'tu_password';
GRANT ALL PRIVILEGES ON DATABASE app TO villas_user;
```

### 7.3 Instalar dependencias

```bash
cd /ruta/hacia/villas_del_rosario/backend
npm install

cd ../frontend
npm install
```

### 7.4 Configurar entorno

```bash
cd /ruta/hacia/villas_del_rosario/backend
cp .env.example .env
```

Editar `backend/.env`:

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu_password
DB_DATABASE=app
```

### 7.5 Ejecutar migraciones

```bash
cd /ruta/hacia/villas_del_rosario/backend
node ace migration:run
```

### 7.6 Levantar backend

```bash
cd /ruta/hacia/villas_del_rosario/backend
npm run dev
```

### 7.7 Levantar frontend

En otra terminal:

```bash
cd /ruta/hacia/villas_del_rosario/frontend
npm run dev
```

## 8. Comandos utiles del proyecto

### Backend

```bash
npm run dev
npm run typecheck
npm run build
node ace migration:run
node ace migration:rollback
```

### Frontend

```bash
npm run dev
npm run build
```

## 9. Flujo recomendado para desarrollo

1. Levantar PostgreSQL
2. Entrar a `backend/`
3. Verificar `.env`
4. Correr `node ace migration:run`
5. Levantar backend con `npm run dev`
6. En otra terminal entrar a `frontend/`
7. Levantar frontend con `npm run dev`

## 10. URLs locales esperadas

- Backend: `http://localhost:3333`
- Frontend: `http://localhost:5173`

Prueba rapida del backend:

```bash
curl http://localhost:3333/
```

Respuesta esperada:

```json
{"message":"Backend funcionando"}
```

## 11. Problemas comunes

### Error de conexion a PostgreSQL

Revisar:

- que PostgreSQL este iniciado
- que el usuario y password en `.env` sean correctos
- que la base `app` exista

### El frontend no conecta con backend

Revisar:

- que el backend siga corriendo en `3333`
- que no haya bloqueo por firewall
- que el frontend este abierto en `5173`

### Las tablas no existen

Correr:

```bash
cd backend
node ace migration:run
```

### Puerto ocupado

Cambiar el puerto en `backend/.env` o cerrar el proceso que lo esta usando.

## 12. Notas para quien continue el proyecto

- El dominio real del sistema es `clientes`, `ventas`, `lotes`, `pagos` y `programaciones de pago`
- Ya no se usa la logica vieja de `rutas` para cobranza casa por casa
- La pantalla de `Pagos` ahora funciona como tablero/calendario mensual de cobros
- El backend depende de PostgreSQL; no es un proyecto pensado para SQLite o almacenamiento en memoria

## 13. Sugerencia de mejoras futuras

- agregar `README.md` general en raiz que apunte a este archivo
- agregar `seeders` oficiales para usuario admin inicial
- agregar Docker para levantar backend + frontend + PostgreSQL mas rapido
- agregar archivo `.env.example` tambien para frontend si despues se define `VITE_API_URL`

## 14. Docker

Este proyecto ya puede prepararse para correr con Docker en desarrollo usando:

- `docker-compose.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `.dockerignore` en backend y frontend

### 14.1 Que se sube a Git

Cuando uses Docker, lo normal es subir al repo:

- `docker-compose.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `backend/.dockerignore`
- `frontend/.dockerignore`
- este archivo de documentacion

No se sube:

- `node_modules`
- contenedores creados
- imagenes Docker construidas
- secretos reales de `.env`

### 14.2 Para que sirve Docker aqui

Docker ayuda a que otra persona pueda levantar el proyecto sin instalar manualmente:

- versiones especificas de Node.js
- PostgreSQL local configurado a mano
- dependencias del backend y frontend una por una

En otras palabras, reduce mucho el problema de:

`en mi maquina si funciona`

### 14.3 Requisito previo para Docker

Instalar:

- `Docker Desktop` en Windows
- o `Docker Engine + Docker Compose` en Ubuntu/Linux

Verificar:

```bash
docker --version
docker compose version
```

### 14.4 Levantar el proyecto con Docker

Desde la raiz:

```bash
docker compose up --build
```

Servicios esperados:

- `frontend`: `http://localhost:5173`
- `backend`: `http://localhost:3333`
- `postgres`: `localhost:5432`

### 14.5 Detener contenedores

```bash
docker compose down
```

### 14.6 Detener y borrar volumenes

Esto elimina tambien la data local del PostgreSQL del contenedor:

```bash
docker compose down -v
```

### 14.7 Reconstruir imagenes

Si cambias dependencias o Dockerfiles:

```bash
docker compose up --build
```

### 14.8 Notas de esta configuracion Docker

- esta configuracion esta pensada para `desarrollo`
- el backend corre migraciones al iniciar
- el backend crea o actualiza un usuario admin por defecto al iniciar
- el frontend corre Vite en modo desarrollo
- PostgreSQL corre en un contenedor aparte
- el codigo local se monta dentro del contenedor para que puedas seguir editando desde tu maquina

Credenciales por defecto en Docker:

- usuario: `admin`
- password: `admin123`

Si quieres cambiarlas, modifica estas variables en `docker-compose.yml`:

- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

### 14.9 Docker y AWS Ubuntu

Docker no te perjudica si luego subes el proyecto a un servidor Ubuntu en AWS.

De hecho ayuda porque:

- mantienes un entorno consistente
- despliegas algo mas parecido a lo que ya probaste localmente
- reduces diferencias entre tu PC y el servidor

Recomendacion para produccion:

- usar contenedor para `backend`
- usar contenedor para `frontend`
- evitar usar PostgreSQL dentro del mismo servidor si el proyecto va a crecer
- preferir una base administrada como `Amazon RDS`

### 14.10 Flujo sugerido con Git + Docker

1. desarrollar el proyecto localmente
2. probarlo con `docker compose up --build`
3. subir a Git los archivos del proyecto y los archivos Docker
4. en otra maquina o servidor, clonar el repo
5. levantarlo con Docker sin repetir toda la instalacion manual

## 15. Notificaciones gratis por correo para cobros

El backend puede enviar un solo correo resumen al dueno del sistema con los cobros pactados para el dia.

La proteccion contra correos repetidos esta en la tabla `notificaciones_cobros`: por cada venta, cuota, fecha y canal solo puede existir un registro. Si el comando corre dos veces el mismo dia, no vuelve a enviar el mismo cobro.

Variables necesarias:

```env
COBROS_NOTIFICACIONES_AUTO=true
COBROS_NOTIFICACIONES_HORA=7
COBROS_NOTIFICACIONES_MINUTO=0
COBROS_NOTIFY_TO=correo_del_dueno@gmail.com

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=correo_que_envia@gmail.com
SMTP_PASS=app_password_de_gmail
SMTP_FROM="Villas del Rosario <correo_que_envia@gmail.com>"
```

Para Gmail no uses la contrasena normal de la cuenta. Activa verificacion en dos pasos y genera una "contrasena de aplicacion".

Probar sin enviar correo ni guardar historial:

```powershell
$env:COBROS_NOTIFICACIONES_DRY_RUN='true'
node ace cobros:notificar
```

Enviar manualmente el resumen del dia:

```bash
npm run notify:cobros
```

Si `COBROS_NOTIFICACIONES_AUTO=true`, el servidor agenda el envio diario a la hora configurada. En Docker tambien debes cambiar esas variables en `docker-compose.yml`.
