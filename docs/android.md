# Probar Winy en Android

El proyecto `android/` empaqueta el juego disponible en `web/` dentro de un WebView. Incluye las mascotas originales, fuentes y lectores de documentos. Los modos locales funcionan sin servidor; la IA y las salas entre teléfonos requieren el servidor HTTPS configurado. Consulta [cómo activar esos servicios](ia-y-salas.md).

## Instalar el APK de prueba

1. Descarga `dist/winy-debug.apk` en tu teléfono Android **8.0 o superior**.
2. Abre el archivo y permite temporalmente instalar aplicaciones desde el navegador o el gestor de archivos que estés usando.
3. Instala **Winy** y elige a tu compañero.

Es un APK de desarrollo con identificador `pe.winy.app.debug`; no es una publicación en Google Play. Mantén actualizado Android System WebView o Chrome para poder usar los lectores modernos de PDF. Amigos ofrece salas para dos teléfonos cuando hay servidor disponible, y conserva por separado el modo de dos personas en un solo teléfono.

El progreso se guarda en el almacenamiento privado de la aplicación. Se mantiene al cerrar o actualizar con el mismo identificador y la misma firma. Se pierde si borras los datos o desinstalas la aplicación. La clave local de pruebas `.local/winy-debug.keystore` debe conservarse para poder instalar futuras actualizaciones encima de esta versión; no es una clave de publicación.

## Recorrido de prueba en el teléfono

- Elegir y nombrar las cuatro mascotas; cambiar de compañero conservando monedas, nivel y accesorios.
- Completar una trivia, revisar explicaciones y comprobar que repetirla el mismo día no duplica recompensas.
- Completar los hábitos de comida y pausa. Iniciar el temporizador de 30 segundos, cambiar de sección o cerrar y volver a abrir la aplicación, y revisar el hábito de enfoque.
- Cargar TXT, Markdown, PDF con texto, DOCX y PPTX desde el selector nativo; revisar la evidencia de los ejercicios. Un escaneo o un documento con contraseña debe mostrar un error legible.
- Elegir destinos en el mapa y abrir sus retos.
- Con el servidor configurado, crear una sala y entrar con el código desde otro teléfono; comprobar inicio, cuatro rondas y resultado. Probar también el dúo en un mismo teléfono.
- Comprar y equipar accesorios, comprobar saldo insuficiente y volver a abrir la app para revisar el guardado.
- Abrir un modal y pulsar Atrás: debe cerrarse. Desde una sección, Atrás vuelve al Hogar; desde Hogar sale de la aplicación.
- Activar modo avión y repetir navegación, trivia y lectura de un documento ya disponible en el teléfono.

## Compilar otra vez

Herramientas: **JDK 17 o 21**, Android SDK **35**, Build Tools **35.0.0** y Node.js **24.5 o superior**. Configura `JAVA_HOME` y `ANDROID_HOME` según tus instalaciones. El wrapper incluido descarga Gradle **8.9** y verifica su SHA-256.

Desde la raíz:

```sh
npm ci --ignore-scripts --omit=optional
npm run postinstall
npm run check
npm test
npm run build:apk
```

En Android Studio puedes abrir `android/` y sincronizar el proyecto. La compilación por consola también funciona en Windows con las variables anteriores y el wrapper `.bat`.

El script ejecuta `assembleDebug` y `lintDebug`, verifica la firma mediante `apksigner`, compara todos los recursos web incluidos con sus originales y copia el APK a `dist/winy-debug.apk`. También escribe `dist/winy-debug.apk.sha256`. La salida de Gradle queda en `android/app/build/outputs/apk/debug/app-debug.apk`.

En el entorno de nube preparado se conservan las herramientas en `/workspace/.winy-tools`. El script reutiliza esas instalaciones, la CA del entorno y el proxy configurado, manteniendo la verificación TLS. `WINY_GRADLE` permite seleccionar otro ejecutable de Gradle.

La validación web usa `npm run test:browser` con `npm start` activo. Compilar, verificar la firma y pasar Android Lint no sustituye probar el APK en un dispositivo real.
