# Winy 🌱

**[Descargar APK de prueba 0.2.1](https://github.com/melendezzz26/winy/raw/refs/heads/winy-apk-prueba/winy-debug.apk)** · [Configurar Gemini para pruebas](docs/gemini.md) · [Configurar servidor](docs/ia-y-salas.md)

Este APK incluye mapa y accesorios actualizados y se conecta a `https://winy.onrender.com`. Para usar la IA configura el proveedor y su clave en Render; no se incluyen claves en el APK. Las salas necesitan que el servidor esté activo.

Aplicación web móvil de hábitos y aprendizaje, creada a partir de las capturas del prototipo **Winy · Tu pequeña gran aventura**. Incluye cuatro compañeros peruanos, cinco secciones y progreso local. Las cuatro mascotas usan los PNG originales de `mascotas.zip`, con su transparencia y sin modificar los archivos. El logotipo SVG sigue siendo provisional.

## Ejecutar

Requiere Node.js **24.5 o superior** (validado con Node.js 24.19). Desde la raíz del repositorio:

```sh
npm ci --ignore-scripts --omit=optional
npm run postinstall
npm start
```

El servidor escucha en el puerto **4173**. Para probarlo desde otro dispositivo en tu red, usa `WINY_HOST=0.0.0.0 npm start`. En PowerShell: `$env:WINY_HOST="0.0.0.0"; npm start`. `PORT` permite elegir otro puerto.

`postinstall` copia los lectores de documentos y la fuente a `web/vendor/`; también se ejecuta automáticamente con una instalación normal de npm. Los recursos del juego se sirven localmente. El modo sin conexión no requiere claves. El modo IA envía texto al servidor y a OpenAI; las salas entre teléfonos usan el servidor incluido.

## Qué funciona

- **Bienvenida:** elegir cuy, llama, gallito de las rocas o cóndor, ponerle nombre y cambiar de compañero conservando progreso y accesorios.
- **Hogar:** XP, niveles, monedas, trivia y tres hábitos. Cada hábito entrega una recompensa por día.
- **Estudiar:** tres trivias con explicaciones; ejercicios para completar palabras a partir de apuntes; temporizador de 25 minutos, 5 minutos o 30 segundos. El temporizador continúa al cambiar de sección o recargar la página.
- **Aventura:** contorno geográfico de Perú de Natural Earth, seis destinos proyectados con sus coordenadas reales y selección sin recortar el país.
- **Amigos:** salas entre dos clientes con código, temporizador y puntuación controlados por el servidor, más historial local de partidas. También se conserva el dúo por turnos en un solo teléfono.
- **Estilo:** seis opciones, confirmación de compra, validación de saldo y accesorios vectoriales colocados según cada especie.

Las recompensas de trivia se entregan una vez por juego y día. Se puede seguir practicando. El cambio de fecha usa el calendario local del dispositivo. El progreso se guarda en `localStorage` del mismo navegador y origen: no hay cuentas, sincronización entre teléfonos ni recuperación en un servidor.

## Estudiar con archivos

En **Estudiar → Crear juego con mis archivos**, importa `examples/clase-fotosintesis.txt` o pega varios párrafos. Se aceptan hasta **5 archivos de 8 MB cada uno**:

- PDF con texto, hasta las primeras 40 páginas (PDF.js).
- Word `.docx` y PowerPoint `.pptx`, hasta 80 diapositivas (fflate y extracción del XML).
- TXT, Markdown y texto pegado.

El modo local crea preguntas para completar una palabra y conserva la frase original como evidencia. El modo IA selecciona ideas clave, genera un resumen y crea trivia con citas que se verifican contra el texto. Este segundo modo requiere activar la API en el servidor. No se incluye OCR: los escaneos, PDF con contraseña, `.doc` y `.ppt` no se procesan. Se guardan hasta 10 juegos en el dispositivo, con sus ejercicios y citas.

Consulta [cómo configurar la API, el modelo y las salas](docs/ia-y-salas.md). Se puede elegir **OpenAI (`gpt-5.4-mini`)** o **Gemini (`gemini-3.8-flash`)**. Para pruebas con cuota gratuita de Google sigue [la guía de Gemini](docs/gemini.md); la cuota depende de tu cuenta y del modelo.

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

La prueba usa Chrome DevTools Protocol, sin otro framework. Recorre bienvenida, hábitos, trivia completa, compras, mapa, visitas, dúo, apuntes y lectura de PDF/DOCX/PPTX/TXT con archivos generados para la ejecución. Comprueba persistencia al recargar, un temporizador real de 30 segundos, ausencia de errores JavaScript y desbordamiento en anchos de 320, 390, 600 y 1280 px. Escribe capturas en `.local/` (ignorado por Git). `CHROMIUM` permite especificar el ejecutable y `WINY_TEST_URL` un servidor distinto.

## Archivos

- `web/app.js`: interfaz, navegación, modales y flujos.
- `web/styles.css`: diseño adaptable a teléfono y escritorio.
- `web/core/state.js`: guardado, niveles, recompensas y compras.
- `web/core/study.js`: creación de ejercicios con evidencia.
- `web/core/documents.js`: lectores locales de documentos.
- `web/core/data.js`: mascotas, accesorios, destinos y trivias.
- `web/assets/pets/`: los cuatro PNG originales de las mascotas.
- `web/core/pets.js`: encuadre de cada ilustración y colocación de accesorios en el mismo espacio de coordenadas, compartidos por todas las pantallas.
- `scripts/serve.mjs`: servidor HTTP para recursos de `web/` y la API.
- `server/`: API de salas con SQLite, sesiones anónimas, puntuación y análisis mediante OpenAI Responses API.
- `scripts/vendor.mjs`: recursos de terceros con versiones fijadas y licencias.

## Android

`android/` empaqueta los recursos del juego para funcionar sin servidor, con selector nativo de documentos, compartir y botón Atrás. Requiere Android 8.0 o superior y un Android System WebView actualizado. El APK de pruebas se genera con `npm run build:apk` y queda en `dist/winy-debug.apk`. Consulta [instalación, compilación y pruebas en teléfono](docs/android.md).

El flujo manual de GitHub Actions **Winy · pruebas y APK** genera el artefacto **Winy-Android-debug** cuando estos archivos se suben al repositorio. No se ha ejecutado ese flujo remoto desde esta tarea.
