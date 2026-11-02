# Winy 🌱

**[Descargar APK de prueba 0.5.0](https://github.com/melendezzz26/winy/raw/refs/heads/winy-apk-prueba/winy-debug.apk)** · [Activar cuentas con Supabase](docs/cuentas.md) · [Activar Groq como respaldo](docs/groq.md) · [Configurar Gemini para pruebas](docs/gemini.md) · [Auditoría y mejoras](docs/auditoria.md) · [Configurar servidor](docs/ia-y-salas.md)

Este APK incluye tutorial que se puede omitir, repasos con trivia y tarjetas, mapa geográfico, seis misiones con pasaporte y pañuelos que siguen el cuerpo de cada mascota. Se conecta a `https://winy.onrender.com`. Para usar la IA configura su clave en Render; no se incluyen claves en el APK. Las salas necesitan que el servidor esté activo.

Aplicación web móvil de hábitos y aprendizaje, creada a partir de las capturas del prototipo **Winy · Tu pequeña gran aventura**. Incluye cuatro compañeros peruanos, cinco secciones y progreso local o vinculado a una cuenta. Las cuatro mascotas usan los PNG originales de `mascotas.zip`, con su transparencia y sin modificar los archivos. El logotipo SVG sigue siendo provisional.

## Ejecutar

Requiere Node.js **24.5 o superior** (validado con Node.js 24.19). Desde la raíz del repositorio:

```sh
npm ci --ignore-scripts --omit=optional
npm run postinstall
npm start
```

El servidor escucha en el puerto **4173**. Para probarlo desde otro dispositivo en tu red, usa `WINY_HOST=0.0.0.0 npm start`. En PowerShell: `$env:WINY_HOST="0.0.0.0"; npm start`. `PORT` permite elegir otro puerto.

`postinstall` copia los lectores de documentos y la fuente a `web/vendor/`; también se ejecuta automáticamente con una instalación normal de npm. Los recursos del juego se sirven localmente. El modo sin conexión no requiere claves. El modo IA envía texto al servidor y al proveedor configurado (Gemini, Groq u OpenAI); las salas entre teléfonos usan el servidor incluido.

## Qué funciona

- **Bienvenida:** registro con correo y contraseña mediante Supabase, confirmación por correo, acceso directo para cuentas existentes y un tutorial de cuatro pasos que se puede omitir o volver a ver. También se puede jugar como invitado y elegir entre los cuatro compañeros.
- **Hogar:** mascota que responde y se anima al tocarla, XP, niveles, monedas, trivia, tres hábitos y pasaporte de seis sellos. Cada hábito entrega una recompensa por día.
- **Estudiar:** vista previa del texto extraído y elección de trivia, tarjetas o repaso mixto. Los errores quedan pendientes y los aciertos vuelven con intervalos de 1, 3, 7 y 14 días. Incluye tres trivias con explicaciones y ejercicios locales para completar palabras; temporizador de 25 minutos, 5 minutos o 30 segundos. El temporizador continúa al cambiar de sección o recargar la página.
- **Aventura:** contorno geográfico de Perú de Natural Earth, seis destinos proyectados con sus coordenadas reales y selección sin recortar el país. Cada destino tiene tres preguntas propias; con dos aciertos se consigue un sello permanente, visible en el pasaporte y el mapa.
- **Amigos:** salas entre dos clientes con código, temporizador y puntuación controlados por el servidor, más historial local de partidas. También se conserva el dúo por turnos en un solo teléfono.
- **Estilo:** seis opciones, vista previa sobre la mascota antes de comprar y validación de saldo. Los pañuelos tienen contornos, pliegues y costuras propios por especie, con el pelo, las alas y las plumas por delante de la tela.

Las recompensas de trivia se calculan con la mejor puntuación de cada juego y día: 10 XP y 5 monedas por acierto. Si primero logras 1 y luego 3, recibes el premio de los 2 aciertos adicionales. Repetir o bajar la marca no duplica premios. Los guardados antiguos conservan las recompensas ya entregadas. Saludar a la mascota no entrega monedas. El cambio de fecha usa el calendario local del dispositivo. El progreso se guarda en el dispositivo. Con Supabase configurado se puede entrar con correo, guardar una copia en la cuenta y cargarla desde otro teléfono. Consulta [la configuración de cuentas y sus límites](docs/cuentas.md). El repaso de errores no duplica premios.

## Estudiar con archivos

En **Estudiar → Crear juego con mis archivos**, revisa primero el texto leído y el tipo de juego, y luego prepara el repaso. Puedes importar `examples/clase-fotosintesis.txt` o pega varios párrafos. Se aceptan hasta **5 archivos de 8 MB cada uno**:

- PDF con texto, hasta las primeras 40 páginas (PDF.js).
- Word `.docx` y PowerPoint `.pptx`, hasta 80 diapositivas (fflate y extracción del XML).
- TXT, Markdown y texto pegado.

El modo local crea preguntas para completar una palabra y conserva la frase original como evidencia. El modo IA selecciona ideas clave, genera un resumen y crea trivia. El modelo elige pasajes numerados y Winy recupera literalmente las citas del texto original. Se conservan las preguntas verificadas y se avisa si se descartaron partes sin respaldo. La compatibilidad con respuestas antiguas admite diferencias de formato sin inventar citas. Este segundo modo requiere activar la API en el servidor. No se incluye OCR: los escaneos, PDF con contraseña, `.doc` y `.ppt` no se procesan. Se guardan hasta 10 juegos en el dispositivo, con sus ejercicios, citas y agenda de repaso. La lectura rápida usa hasta 24.000 caracteres en extractos distribuidos y avisa si omite contenido; el modo completo admite hasta 80.000 caracteres. La preparación con IA muestra avances, se puede cancelar y conserva el archivo extraído al reintentar. Cada juego creado permite practicar los tres modos sin nuevas llamadas a la IA.

Consulta [cómo configurar la API, el modelo y las salas](docs/ia-y-salas.md). Se puede elegir **OpenAI (`gpt-5.4-mini`)** o **Gemini (`gemini-3.8-flash`)**. Para pruebas con cuota gratuita de Google sigue [la guía de Gemini](docs/gemini.md). También se puede usar [Groq con `openai/gpt-oss-20b` como respaldo automático](docs/groq.md) cuando Gemini informa falta de cuota. Cada proveedor mantiene sus propios límites; el cupo global de Winy se aplica a ambos.

## Validar

```sh
npm run check
npm test
```

Las pruebas de estado y estudio verifican recompensas, compras, restauración, creación de ejercicios y límites de archivos.

Con el servidor iniciado y Chromium instalado:

```sh
npm run test:browser
```

La prueba usa Chrome DevTools Protocol, sin otro framework. También recorre tutorial, acceso con correo, sincronización, tarjetas, repaso de errores y cancelación. Comprueba que reintentar un PDF no lo vuelva a leer. Recorre bienvenida, mascota interactiva, hábitos, trivia completa, compras, misiones, pasaporte, sala con dos clientes, dúo, apuntes y lectura de PDF/DOCX/PPTX/TXT con archivos generados para la ejecución. Comprueba persistencia al recargar, mejora de recompensas, un temporizador real de 30 segundos, ausencia de errores JavaScript y desbordamiento en anchos de 320, 390, 600 y 1280 px. La interfaz de análisis usa una respuesta de servicio controlada; no demuestra que una clave real tenga cuota. Escribe capturas en `.local/` (ignorado por Git). `CHROMIUM` permite especificar el ejecutable y `WINY_TEST_URL` un servidor distinto.

## Archivos

- `web/app.js`: interfaz, navegación, modales y flujos.
- `web/styles.css`: diseño adaptable a teléfono y escritorio.
- `web/core/state.js`: guardado, niveles, recompensas y compras.
- `web/core/study.js`: creación de ejercicios con evidencia.
- `web/core/study-flow.js`: lectura con avances, vista previa y preparación en segundo plano.
- `web/core/review.js`: tarjetas, errores e intervalos de repaso.
- `web/core/outfits.js`: tela y oclusión del pañuelo según la anatomía.
- `web/core/documents.js`: lectores locales de documentos.
- `web/core/data.js`: mascotas, accesorios, destinos y trivias.
- `web/core/gameplay.js`: misiones, sellos y respuestas de los compañeros.
- `web/assets/pets/`: los cuatro PNG originales de las mascotas.
- `web/core/pets.js`: encuadre de cada ilustración y colocación de accesorios en el mismo espacio de coordenadas, compartidos por todas las pantallas.
- `scripts/serve.mjs`: servidor HTTP para recursos de `web/` y la API.
- `server/`: API de salas con SQLite, sesiones anónimas, puntuación y análisis mediante Gemini, Groq u OpenAI Responses API.
- `scripts/vendor.mjs`: recursos de terceros con versiones fijadas y licencias.

## Android

`android/` empaqueta los recursos del juego para funcionar sin servidor, con selector nativo de documentos, compartir y botón Atrás. Requiere Android 8.0 o superior y un Android System WebView actualizado. El APK de pruebas se genera con `npm run build:apk` y queda en `dist/winy-debug.apk`. Consulta [instalación, compilación y pruebas en teléfono](docs/android.md).

El flujo manual de GitHub Actions **Winy · pruebas y APK** genera el artefacto **Winy-Android-debug** cuando estos archivos se suben al repositorio. No se ha ejecutado ese flujo remoto desde esta tarea.
