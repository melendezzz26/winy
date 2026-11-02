# Auditoría funcional de Winy · 0.3.0

La revisión cubre navegación, progreso, documentos, generación de trivia, mapa, accesorios y salas entre dos clientes. Las mejoras se implementaron en el código y en el APK de esta rama.

## Hallazgos y correcciones

| Problema observado | Comportamiento implementado |
| --- | --- |
| Las variables estándar de Gemini podían quedar sin leer mientras seguía configurada la antigua clave de OpenAI. | Se admiten `GEMINI_API_KEY` y `GEMINI_MODEL`, además de los nombres con prefijo `WINY_`. Sin proveedor explícito, una clave de Gemini selecciona Gemini al arrancar. No hay cambio automático al proveedor de pago si falla la cuota. |
| El mensaje de límite de IA confundía falta de saldo con saturación temporal. | Se distinguen clave inválida, modelo inaccesible, cuota gratuita no disponible, límite diario y exceso de solicitudes. No se devuelve al cliente el mensaje privado del proveedor. |
| Si la primera consulta al servidor fallaba, el modo IA quedaba desactivado hasta reiniciar la app. | Se vuelve a comprobar al abrir los apuntes y al recuperar Internet. El botón Actualizar conexión permite recuperar la opción y el proveedor sin borrar el formulario. La consulta de estado admite hasta 60 segundos para el arranque del servidor. |
| Un primer intento con pocos aciertos bloqueaba la recompensa de ese juego durante todo el día. | Se conserva la mejor marca diaria y se paga la diferencia cuando mejora. Los guardados antiguos mantienen sus pagos y repetir una puntuación no genera premios nuevos. |
| Los destinos eran puntos de entrada a trivias genéricas, sin una meta propia. | Lima, Cusco, Loreto, Arequipa, Piura y San Martín tienen tres preguntas distintas cada uno. Dos aciertos otorgan un sello que persiste en el pasaporte y el mapa. Completar los seis identifica al Explorador del Perú. |
| La mascota tenía poca respuesta al contacto. | Al tocarla cambia su mensaje y hace una animación breve. Cada especie tiene sus respuestas. La animación respeta la preferencia de movimiento reducido y no genera monedas. |
| El mapa ilustrado deformaba el país y la selección podía recortarlo. | Contorno de Natural Earth y destinos con coordenadas reales bajo una misma proyección. Seleccionar mantiene visible el país completo. Las seis opciones caben en una cuadrícula móvil. |
| Los accesorios flotaban o no seguían la anatomía de cada compañero. | PNG originales encuadrados en un espacio común y anclajes propios por especie. El pañuelo sigue el cuello; corona, flor, insignia y medalla usan posiciones y tamaños específicos. |
| Un JSON `null` o una lista con fuentes nulas provocaba un fallo interno en el análisis. | La API valida el objeto de entrada y las fuentes antes de llamar al proveedor. Devuelve un error 400 y no gasta un intento de IA por esos datos inválidos. |
| Una respuesta estructurada aún podía traer índices de fuente incorrectos, citas demasiado largas o preguntas repetidas. | Se exigen índices enteros, citas literales de 15 a 350 caracteres y tres alternativas distintas. Se eliminan preguntas repetidas y se rechaza el juego si quedan menos de dos. |

## Validación

- `npm run check` y `npm test`: validaciones de sintaxis y 32 pruebas de lógica, API y proveedores con respuestas controladas. Incluyen una partida completa entre dos clientes concurrentes, tiempos, autenticación, cuotas, reintentos, migración del progreso y sellos.
- `npm run test:browser`: recorrido en Chromium con documentos PDF, DOCX, PPTX y TXT generados para la prueba; mascota, misiones, recompensas, compras, dos clientes en una sala y persistencia. Incluye un temporizador real de 30 segundos y las cinco secciones a 320, 390, 600 y 1280 píxeles.
- `npm run build:apk`: compilación Android y Lint, verificación de firma y comparación de todos los recursos web incluidos con los archivos del proyecto.

Las citas literales permiten revisar el respaldo de una pregunta; comprobar su presencia no demuestra por sí solo que toda la interpretación de la IA sea correcta. La pantalla de ideas conserva las fuentes para revisarlas.

## Límites de esta entrega

El acceso desde este entorno a `winy.onrender.com` y al proveedor de IA está restringido por su política de red. La configuración real de Render y la cuota de Google deben confirmarse allí. `/api/status` informa proveedor, modelo y presencia de clave; `ai: true` no demuestra que haya cuota. La prueba definitiva consiste en generar un juego desde apuntes y revisar sus citas. No se ha realizado esa llamada con la clave del usuario.

Las pruebas de salas usan dos clientes locales y el servidor real incluido. Falta comprobar el despliegue con dos teléfonos físicos. El APK se compila y verifica, pero no se ha ejecutado en un dispositivo Android desde este entorno; tampoco se ha identificado el nombre de la alerta antivirus que se reportó anteriormente.

El progreso del juego permanece en el dispositivo. Las salas y sesiones anónimas usan SQLite: para conservarlas tras un despliegue se necesita un disco persistente en Render, como explica la [guía del servidor](ia-y-salas.md). La implementación actual está pensada para una instancia del servidor; no incluye cuentas con recuperación ni sincronización del pasaporte entre dispositivos.
