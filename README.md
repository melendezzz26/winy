# Winy 🌱
Juego educativo móvil con cuy, llama, gallito de las rocas y cóndor andino. Conserva el diseño 2D del prototipo aprobado. El mismo código se ejecuta en el navegador y empaquetado en Android (Java + WebView); este repositorio no es un proyecto Unity.

## Empezar en Windows
Con Git y Node.js 22 o superior instalados, abre PowerShell:
```powershell
git clone https://github.com/melendezzz26/winy.git Winy-Codex
cd Winy-Codex
npm test
npm start
```
Abre **http://localhost:4173**. No hace falta instalar paquetes para la web. Abre la carpeta con `code .` o selecciónala como proyecto en Codex. Para probar desde tu teléfono en la misma red, antes de `npm start` escribe `$env:WINY_HOST="0.0.0.0"`; en el teléfono usa `http://IP-DE-TU-PC:4173`. Windows puede pedir permiso para la red privada.

## Probar la clase
En **Estudiar → Crear juego con mis archivos**, carga `examples/clase-fotosintesis.txt`. También admite PDF con texto (40 primeras páginas), DOCX, PPTX (hasta 80 diapositivas), Markdown, TXT y texto pegado. Se admiten cinco archivos de hasta 8 MB cada uno. Un PDF escaneado, una foto o un archivo que solo tenga portada no son una clase legible: hace falta introducir el contenido.

El motor local propone, por ejemplo, **«¿Qué ocurre cuando los estomas se cierran?»**. Permite responder con palabras propias y luego contrastar con el pasaje de la clase. Crea alternativas cuando encuentra respuestas de conceptos distintos en el mismo material. Cada reto conserva su párrafo y el archivo, página o diapositiva, cuando corresponde. El tema escrito prioriza pasajes: no se generan respuestas desde el nombre del archivo. Si hay menos de dos hechos utilizables, pide material en lugar de inventar preguntas. El análisis por reglas está pensado para prosa explicativa en español; no es un modelo generativo, OCR ni un corrector semántico.

## Vestir a la mascota
En **Estilo** se pueden probar o comprar accesorios. Cada mascota tiene puntos propios para cabeza, cuello, sien y pecho en el espacio de la ilustración. El accesorio y el animal comparten encuadre, escala y animación en el hogar, vestidor y visita.

## Android
El proyecto `android/` empaqueta los recursos de `web/` y abre el selector nativo de documentos. El estudio no requiere un servidor. Flujo de GitHub Actions: **Actions → Winy · pruebas y APK**; abre una ejecución correcta y descarga el artefacto **Winy-Android-debug**. Descomprime e instala el APK en tu teléfono de prueba. Es una compilación de desarrollo; no se usa una clave de publicación. Si Actions está desactivado, actívalo y ejecuta el flujo. Alternativa local: JDK 17 + Android SDK 35 + Gradle 8.9; desde la raíz: `gradle -p android assembleDebug`. La salida queda en `android/app/build/outputs/apk/debug/`.

## Código
- `web/core/study.js`: limpieza, identificación de relaciones, selección de material y preguntas con evidencia.
- `web/core/wardrobe.js`: accesorios vectoriales y anclajes específicos por especie.
- `web/app.js`: navegación, lectura de clases, trivia individual y en dúo, hábitos y progreso.
- `web/assets/`: logotipo, mascotas y lectores de archivos incluidos.
- `tests/`: regresiones del juego, ejercicios y vestuario. Se ejecutan con `npm test`.
- `android/`: aplicación instalable, lector WebView y selector de archivos.
- `docs/pruebas-en-telefono.md`: comprobaciones para una prueba física.

Se mantienen progreso local, mapa con seis destinos, perfiles sociales de muestra y juego por turnos en **un teléfono**. No hay cuentas reales ni sincronización entre teléfonos. Las clases importadas se procesan localmente; se guardan ejercicios y citas, no los archivos originales. Este repositorio de desarrollo y el enlace público del prototipo son entregas independientes.
