# Activar cuentas con Supabase

Winy 0.4.0 incluye registro con correo y contraseña, confirmación del correo, inicio y cierre de sesión, tutorial que se puede omitir y guardado de progreso por cuenta. Supabase conserva las cuentas y el progreso aunque Render vuelva a desplegar el servidor. Las contraseñas las gestiona Supabase Auth; Winy no las guarda.

## 1. Crear el proyecto

1. En [Supabase](https://supabase.com/dashboard), crea un proyecto en el plan gratuito disponible para tu cuenta. No hace falta contratar un plan para preparar la integración.
2. En **Authentication → Sign In / Providers → Email**, activa el acceso por correo y **Confirm email**.
3. En **Authentication → URL Configuration**, establece **Site URL** en `https://winy.onrender.com`. Permite esa misma dirección como redirección. La confirmación se abre en el navegador; después puedes entrar con correo y contraseña desde la web o el APK.
4. En **SQL Editor**, crea una consulta, pega el contenido completo de [supabase.sql](supabase.sql) y ejecútala. Crea la tabla de progreso y sus reglas de seguridad: cada usuario solo puede acceder a su fila.

## 2. Configurar Render

Obtén la URL y la clave publicable en **Project Settings → API / API Keys**. En el servicio de Winy, guarda estas variables y vuelve a desplegar la rama `winy-apk-prueba`:

| Variable | Valor |
| --- | --- |
| `SUPABASE_URL` | `https://TU-PROYECTO.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | La clave **publishable**, no `secret` ni `service_role` |

También se admite `SUPABASE_ANON_KEY` para proyectos que muestran la antigua clave `anon`. No hace falta cambiar el APK ni entregar claves por chat. No uses la contraseña de PostgreSQL ni la clave `service_role` para esta integración.

Al abrir `https://winy.onrender.com/api/status` debe aparecer `"accounts": true`. Esto confirma que las variables están presentes; un registro y la sincronización real confirman que Auth, el correo y la tabla están configurados.

## 3. Correo de confirmación

El envío de correo incluido para pruebas en Supabase tiene restricciones de destinatarios y frecuencia; puede admitir solo direcciones autorizadas del equipo del proyecto. Para que otras personas puedan registrarse y verificar su correo, configura un proveedor en **Authentication → Email → SMTP Settings**, según las instrucciones del panel. Puedes evaluar un proveedor con cuota gratuita; su disponibilidad y límites dependen del proveedor. Sus credenciales SMTP se guardan en Supabase, no en el APK ni en GitHub.

En una prueba privada puedes desactivar temporalmente **Confirm email** desde el panel: Winy también acepta el acceso inmediato que devuelve Supabase. En ese caso el correo no está verificado y Winy no mostrará el paso de confirmación. Para un registro público con correos verificados, activa la confirmación y configura el envío.

## 4. Comprobar el recorrido

1. En Winy, pulsa **Crear cuenta con correo**, escribe tu nombre de jugador, correo y una contraseña de al menos 8 caracteres.
2. Si hay confirmación activada, abre el enlace recibido y vuelve a **Ya tengo cuenta → Entrar**.
3. Elige compañero y revisa u omite el tutorial. Una cuenta que ya tiene compañero entra directamente a su aventura.
4. Completa un reto y espera la sincronización. Desde el botón de cuenta puedes consultar el estado del guardado.
5. En otro navegador o teléfono, inicia sesión con la misma cuenta: deben aparecer el compañero, las monedas y los repasos guardados.

## Cómo se guarda

El dispositivo conserva el progreso para funcionar sin conexión. Al estar conectado con una cuenta se envía una copia a Supabase. La API usa el token del usuario y las reglas RLS del SQL; no emplea una clave que pueda leer todas las cuentas.

La sesión de Winy dura hasta siete días y puede cerrarse antes desde la aplicación. Render puede perder esa sesión local si su disco es temporal; en ese caso hay que volver a entrar con el correo, pero las cuentas y el guardado de Supabase permanecen allí. Si falla una sincronización, el progreso local se conserva. La aplicación permite recuperar explícitamente el guardado de la cuenta.

El guardado es una instantánea: no mezcla dos partidas simultáneas de la misma cuenta en dos dispositivos. La última copia sincronizada es la que se carga al entrar; juega con cuentas distintas en las batallas. No se incluye todavía una pantalla de recuperación de contraseña: esa gestión se mantiene en Supabase hasta añadir el flujo correspondiente.

La integración se probó con respuestas controladas de Auth y almacenamiento y con la API local. La configuración y entrega de correos del proyecto real deben comprobarse después de añadir estas variables y ejecutar el SQL.
