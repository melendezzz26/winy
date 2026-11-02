# Activar análisis de apuntes y salas de dos teléfonos

La interfaz, el servidor y las pruebas están incluidos en esta rama. **La clave de IA y el alojamiento público no están configurados todavía.** El APK funciona sin conexión para las funciones locales. La IA y las salas entre teléfonos requieren el servidor activo y accesible por HTTPS.

## Modelo de IA recomendado

Para esta versión, el modelo inicial es **`gpt-5.4-mini`**, usando **Responses API** y respuestas JSON con esquema estricto. Debe seleccionar conceptos centrales, resumirlos y generar preguntas de comprensión de tres alternativas, con una cita del documento y su página o diapositiva cuando estén disponibles. El servidor rechaza citas que no aparecen en las fuentes y valida las preguntas antes de guardarlas.

La recomendación inicial `gpt-5-mini` se sustituyó tras comprobar el catálogo oficial: tiene un retiro anunciado para el **11 de diciembre de 2026**. El modelo se puede cambiar mediante `WINY_AI_MODEL`. Fuente consultada: [tipos de modelos y notas de deprecación del SDK oficial](https://github.com/openai/openai-python/blob/main/src/openai/types/shared/chat_model.py). Consulta también [documentación de la API](https://developers.openai.com/api/docs) y [precios oficiales](https://openai.com/api/pricing/) antes de añadir saldo; no se ha fijado un presupuesto mensual ni contratado servicios en esta tarea.

La coincidencia literal de la cita no garantiza por sí sola que una pregunta sea pedagógicamente correcta. La selección de ideas y la calidad deben revisarse con documentos reales de tus cursos después de activar la API. Los tests actuales verifican el contrato y las citas con respuestas controladas; **no son pruebas con OpenAI real**.

## Lo que necesitas configurar

1. Crea o abre una cuenta en [OpenAI Platform](https://platform.openai.com/), crea un proyecto para Winy y activa su facturación según lo que quieras gastar. La suscripción a ChatGPT y el uso de la API se facturan por separado.
2. En el proyecto de OpenAI, crea una clave de API. Guárdala en el gestor de secretos del alojamiento como **`WINY_AI_KEY`**. **No la envíes por chat, no la subas a GitHub y no la pongas en el APK.**
3. Configura **`WINY_AI_MODEL=gpt-5.4-mini`** y un límite de intentos diarios **`WINY_AI_DAILY_LIMIT=20`**, o uno menor durante tus pruebas. Además hay un máximo de cinco análisis por identidad al día. Los intentos fallidos también consumen ese cupo, para limitar reintentos. El límite es compartido por la única instancia del servidor; configura también los controles de gasto disponibles en el proyecto de OpenAI.
4. Ejecuta el servidor de Winy en un alojamiento con **Node.js 24.5 o superior**, HTTPS y un disco persistente para SQLite. Puede ser un servicio Node con volumen en Render, Railway o tu propio servidor. El coste del alojamiento depende del proveedor; aún no se ha elegido ni desplegado uno.
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

`GET /api/status` devuelve si el servidor está activo, si la IA está configurada y qué modelo usa. No muestra la clave. Un estado `ai: true` confirma que hay una variable configurada; la autorización y el saldo del proveedor se comprueban al ejecutar un análisis real.

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

La identidad es anónima y se guarda con un token privado en el dispositivo; no hay inicio de sesión por correo ni recuperación de cuenta en esta versión. Las salas caducan a las dos horas. El historial de partidas se guarda en cada dispositivo; el progreso y las monedas locales todavía no se sincronizan entre dispositivos. El modo de dos jugadores en un solo teléfono sigue disponible por separado.

## Tratamiento de documentos

Los lectores locales extraen texto. En modo IA, ese texto y los nombres de las fuentes se envían al servidor y a OpenAI. No se sube el PDF/DOCX/PPTX binario. El servidor conserva el juego generado, su resumen y las citas; no guarda el texto completo enviado. Se solicita `store: false` a Responses API; el tratamiento del proveedor sigue sus políticas de datos aplicables. Los escaneos siguen necesitando OCR o texto pegado: esta entrega no añade OCR.

Se aceptan hasta 80.000 caracteres por análisis. El análisis sin conexión anterior permanece como opción explícita para completar palabras; no se presenta como IA ni se usa para fingir una respuesta si el proveedor falla.
