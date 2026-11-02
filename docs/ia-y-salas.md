# Activar análisis de apuntes y salas de dos teléfonos

La interfaz, el servidor y las pruebas están incluidos en esta rama. El servicio del usuario está configurado como `https://winy.onrender.com`. La IA requiere elegir un proveedor y guardar su clave en Render. Las funciones locales del APK siguen disponibles sin conexión; la IA y las salas entre teléfonos requieren el servidor activo por HTTPS.

**Para probar con la cuota gratuita de Google, sigue [la guía de Gemini](gemini.md).** Se configura `WINY_AI_PROVIDER=gemini`, `WINY_GEMINI_MODEL=gemini-3.8-flash` y el secreto `WINY_GEMINI_KEY`. Las instrucciones siguientes sobre OpenAI son la alternativa con facturación de OpenAI.

## Modelo para el adaptador de OpenAI

Si eliges OpenAI, el modelo inicial es **`gpt-5.4-mini`**, usando **Responses API** y respuestas JSON con esquema estricto. Ambos adaptadores seleccionan conceptos centrales, generan un resumen y crean preguntas de comprensión de tres alternativas con citas. El servidor rechaza citas que no aparecen en las fuentes y valida las preguntas antes de guardarlas.

La recomendación inicial `gpt-5-mini` se sustituyó tras comprobar el catálogo oficial: tiene un retiro anunciado para el **11 de diciembre de 2026**. El modelo se puede cambiar mediante `WINY_AI_MODEL`. Fuente consultada: [tipos de modelos y notas de deprecación del SDK oficial](https://github.com/openai/openai-python/blob/main/src/openai/types/shared/chat_model.py). Consulta también [documentación de la API](https://developers.openai.com/api/docs) y [precios oficiales](https://openai.com/api/pricing/) antes de añadir saldo; no se ha fijado un presupuesto mensual ni contratado servicios en esta tarea.

La coincidencia literal de la cita no garantiza por sí sola que una pregunta sea pedagógicamente correcta. La selección de ideas y la calidad deben revisarse con documentos reales de tus cursos después de activar la API. Los tests actuales verifican el contrato y las citas con respuestas controladas; **no son pruebas con OpenAI real**.

## Lo que necesitas configurar

1. Crea o abre una cuenta en [OpenAI Platform](https://platform.openai.com/), crea un proyecto para Winy y activa su facturación según lo que quieras gastar. La suscripción a ChatGPT y el uso de la API se facturan por separado.
2. En el proyecto de OpenAI, crea una clave de API. Guárdala en el gestor de secretos del alojamiento como **`WINY_AI_KEY`**. **No la envíes por chat, no la subas a GitHub y no la pongas en el APK.**
3. Configura **`WINY_AI_MODEL=gpt-5.4-mini`** y un límite de intentos diarios **`WINY_AI_DAILY_LIMIT=20`**, o uno menor durante tus pruebas. Además hay un máximo de cinco juegos completados por jugador al día. Los fallos no consumen esos cinco juegos; sí consumen el cupo global de solicitudes al proveedor. El límite es compartido por la única instancia del servidor; configura también los controles de gasto disponibles en el proyecto de OpenAI.
4. Ejecuta el servidor de Winy en un alojamiento con **Node.js 24.5 o superior**, HTTPS y un disco persistente para SQLite. Puede ser un servicio Node con volumen en Render, Railway o tu propio servidor. El servidor configurado para esta entrega es `https://winy.onrender.com`; el coste y la persistencia del alojamiento dependen de tu plan.
5. Cuando tengas la dirección HTTPS del servicio, compila el APK con **`WINY_API_BASE`** apuntando a ese origen. Ejemplo ilustrativo: `https://winy.tu-dominio.com`. Ese valor es público y no contiene ninguna clave.

Para comprobar la selección de contenido, trae dos documentos representativos de tus cursos y señala qué temas consideras importantes. Así podremos evaluar el resumen, las preguntas, las citas y el coste real por análisis.

## Instalar el servidor

### Pasos en Render

1. En Render, conecta tu cuenta de GitHub y autoriza el repositorio `melendezzz26/winy`.
2. Crea un **Web Service**, selecciona ese repositorio y la rama **`winy-apk-prueba`**. Usa el entorno **Node**.
3. Build Command: `npm ci --ignore-scripts --omit=optional && npm run postinstall`.
4. Start Command: `npm start`. Health Check Path: `/api/status`.
5. En **Environment**, configura `NODE_VERSION=24.19.0`, `WINY_HOST=0.0.0.0`, `WINY_AI_MODEL=gpt-5.4-mini`, `WINY_AI_DAILY_LIMIT=20` y la clave **`WINY_AI_KEY`** como valor secreto. Deja que Render asigne `PORT`.
6. Para conservar datos, elige una modalidad que admita disco persistente, monta el disco en `/var/data` y configura `WINY_DB=/var/data/winy.sqlite`. Revisa el precio mostrado por Render antes de contratarlo. Una prueba con disco efímero perderá identidades y partidas cuando se reinicie el servicio.
7. Despliega. Cuando el servicio responda, comparte solo su URL HTTPS pública. No compartas la clave, tu contraseña ni un token de administración de Render.

Con esa URL se puede comprobar el servicio y generar el APK conectado. La ruta `/api/status` es de estado; las preguntas y las salas requieren una sesión anónima creada por la aplicación.

### Comandos para otros alojamientos

Desde la raíz del repositorio:

```sh
npm ci --ignore-scripts --omit=optional
npm run postinstall
npm run check
npm test
npm start
```

El proveedor debe inyectar las variables de `.env.example` de forma segura. Winy no lee automáticamente archivos `.env`: en tu ordenador debes exportarlas o usar un mecanismo de carga de variables. El script de inicio respeta el proxy de entorno en Node y mantiene la verificación TLS. Los proveedores sin proxy se conectan normalmente.

En producción, configura `WINY_HOST=0.0.0.0`, el `PORT` indicado por el proveedor y `WINY_DB` dentro del volumen persistente. **Usar una sola instancia/proceso del servidor en esta versión**: SQLite y los límites de conexión están diseñados para esa configuración. No uses un disco efímero si quieres conservar identidades y partidas tras reiniciar.

`GET /api/status` devuelve si el servidor está activo, si la IA está configurada, el proveedor (`openai` o `gemini`) y el modelo seleccionado. No muestra la clave. Un estado `ai: true` confirma que hay una variable configurada; la autorización y la cuota del proveedor se comprueban al ejecutar un análisis real.

## Conectar Android

En Linux/macOS, después de configurar el servidor:

```sh
WINY_API_BASE=https://winy.tu-dominio.com npm run build:apk
```

En PowerShell:

```powershell
$env:WINY_API_BASE="https://winy.tu-dominio.com"
npm run build:apk
```

El valor debe ser un origen HTTPS sin rutas, parámetros ni credenciales. Android permite acceder a `/api/` de ese origen y a los archivos locales del juego. La API acepta el origen local del WebView. En GitHub Actions puedes guardar este valor público como variable de repositorio **`WINY_API_BASE`** antes de ejecutar el flujo manual.

Si compilas sin `WINY_API_BASE`, las funciones locales siguen disponibles y el APK indica que el servicio en línea aún no está activado. **No se simula una conexión ni un rival.**

## Batallas en línea

Un jugador crea una sala con su nombre y tema, comparte el código de seis caracteres y el segundo entra desde su teléfono. El anfitrión inicia cuando ambos están presentes. Cada ronda dura 30 segundos; la respuesta correcta se revela al contestar ambos o al agotarse el tiempo. El servidor decide el resultado y evita contabilizar dos veces una respuesta. La aplicación consulta cambios cada segundo.

Se puede jugar como invitado con un token privado o entrar con una cuenta de correo mediante [Supabase](cuentas.md). Las salas caducan a las dos horas. Con una cuenta se puede sincronizar el progreso, los repasos y el historial; las sesiones locales y las salas siguen usando SQLite. El modo de dos jugadores en un solo teléfono sigue disponible por separado.

## Tratamiento de documentos

Los lectores locales extraen texto. En modo IA, ese texto y los nombres de las fuentes se envían al servidor y al proveedor seleccionado: OpenAI o Google Gemini. No se sube el PDF/DOCX/PPTX binario. El servidor conserva el juego generado, su resumen y las citas; no guarda el texto completo enviado. A OpenAI se solicita `store: false`; el tratamiento de cada proveedor sigue las políticas de datos aplicables a tu plan. Los escaneos siguen necesitando OCR o texto pegado: esta entrega no añade OCR.

La vista previa permite lectura rápida de extractos distribuidos de hasta 24.000 caracteres o análisis completo de hasta 80.000. `POST /api/study` con `background: true` devuelve una tarea; `GET /api/study/jobs/:id` muestra el estado y `POST /api/study/jobs/:id/cancel` cancela. Se conserva el formato síncrono de la API para los clientes anteriores. El análisis sin conexión anterior permanece como opción explícita para completar palabras; no se presenta como IA ni se usa para fingir una respuesta si el proveedor falla.

## Si OpenAI devuelve un límite o un error

La clave de API identifica tu proyecto; crearla no garantiza que tenga saldo o cuota disponible. El plan de ChatGPT no sustituye la facturación de la API. No se presupone que las cuentas nuevas reciban créditos gratuitos.

- **`ai_quota_exhausted`:** OpenAI informó falta de cuota, facturación inactiva o límite de gasto. Revisa en OpenAI Platform la facturación, los créditos vigentes y los límites del proyecto al que pertenece la clave. Cambiar de modelo no añade cuota al proyecto.
- **`ai_rate_limited`:** límite temporal de solicitudes o tokens; espera y reduce la frecuencia o el tamaño del material.
- **`ai_usage_limit`:** OpenAI devolvió 429 sin un código suficiente para distinguir la causa; revisa la cuota del proyecto y vuelve a probar más tarde.
- **`ai_invalid_key`:** revisa el secreto `WINY_AI_KEY` del servidor. Nunca lo envíes al chat ni lo incluyas en el APK.
- **`ai_model_unavailable` / `ai_access_denied`:** revisa el modelo configurado, permisos y posibles requisitos de verificación del proyecto.

Los límites propios de Winy tienen mensajes distintos: cinco juegos completados por jugador (`winy_daily_games_limit`) y un cupo global de solicitudes (`winy_daily_requests_limit`). Los intentos fallidos y los reintentos solo consumen el segundo.

Winy incluye adaptadores para OpenAI y Gemini. Se seleccionan con `WINY_AI_PROVIDER`. Un nombre de modelo de Google en `WINY_AI_MODEL` no cambia de proveedor: Gemini usa `WINY_GEMINI_MODEL` y `WINY_GEMINI_KEY`, según [su guía de configuración](gemini.md).
