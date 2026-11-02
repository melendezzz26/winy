# Más preguntas y exámenes entre compañeros · 0.7.0

Cada usuario puede preparar un repaso con sus apuntes y crear una sala para practicarlo con otra persona, desde dos teléfonos. El compañero solo necesita el código de la sala; no necesita subir el archivo ni generar de nuevo las preguntas.

## Preparar más preguntas

1. En **Estudiar → Crear juego con mis archivos**, sube tus apuntes o pega el contenido de tu clase.
2. Elige **6, 12 o 20 preguntas**. La opción inicial es 12. Funciona con IA y con el modo local para completar palabras.
3. Revisa el texto detectado y prepara el repaso. Si faltan ideas o se descartan preguntas sin respaldo, se muestra la cantidad realmente preparada; no se rellenan preguntas inventadas para alcanzar el número elegido.

Los tres proveedores reciben la cantidad elegida y un presupuesto de salida adecuado. Se mantiene una sola llamada cuando la generación termina correctamente; los reintentos y el respaldo de cuota conservan sus límites. Más preguntas pueden consumir más tokens y tardar más: para 20, la tarea admite hasta dos minutos en total, con avances y cancelación. Reutilizar el juego para practicar o crear una sala no llama a la IA.

## Jugar el examen con otra persona

1. Abre el repaso en Estudiar y pulsa **Jugar este examen con un compañero**. También puedes entrar por **Amigos → Crear sala** y elegir uno de tus repasos guardados.
2. Elige todas las preguntas disponibles, hasta 10 o hasta 5, y un tiempo de **30, 60 o 90 segundos** para responder. El valor inicial es 60 segundos. La sala nunca incluye más preguntas que el banco elegido, hasta un máximo de 20.
3. Crea la sala y copia o comparte el código. En el otro teléfono: **Amigos → Tengo un código**, nombre y código. Se admiten dos personas; solo el creador inicia la partida.
4. Respondan la misma pregunta. Se admiten alternativas de IA y completar palabras del modo local. El servidor puntúa; el otro jugador no recibe la solución antes de cerrar la ronda por respuestas o por tiempo.
5. Lean la explicación y la cita. Cada uno pulsa **Ya revisé la explicación**; la siguiente pregunta empieza cuando ambos lo hacen. No hay cuenta atrás para leer la explicación de un examen compartido.
6. Al terminar, cualquiera puede pulsar **Guardar preguntas y repasar mis errores**. Se conserva una copia en Estudiar, con los resultados personales incorporados al repaso espaciado. Las respuestas escritas del otro jugador no se entregan con esa copia.

Si uno cierra la ventana puede volver por **Amigos → Volver a mi partida**. Las salas caducan a las dos horas. Hace falta Internet y que el servicio esté activo; estas salas no son partidas asíncronas de varios días.

## Qué se comparte

Se envían al servicio el título y las preguntas del banco elegido, con sus alternativas o palabras esperadas, explicaciones y citas. La otra persona ve las preguntas durante la partida y puede guardar el banco completo una vez terminada. **El archivo original, el texto completo importado, las metas Pomodoro y los demás repasos no se comparten.** Quien tenga el código puede ocupar la segunda plaza antes de empezar: envíalo a tu compañero.

Guardar el repaso es opcional. Se mantiene el límite de diez juegos guardados; al añadir el undécimo sale el más antiguo. El límite de sincronización por cuenta se amplía a 450.000 bytes para admitir bancos más grandes, con una prueba de diez exámenes de veinte preguntas. Los premios de la partida se guardan una vez por sala y día. El repaso de errores no vuelve a entregar el premio.

## Combinarlo con Pomodoro

El Pomodoro sigue activo mientras se navega o se juega. Para un bloque de 25 minutos se puede elegir una parte del banco, por ejemplo diez preguntas, y dedicar tiempo a explicarse las respuestas. El final del temporizador avisa y registra la fase sin reemplazar la pregunta en curso; el descanso empieza cuando el estudiante lo inicia. No es necesario terminar todo el banco en una sola sesión.

## Despliegue y comprobaciones

El APK y el servidor deben usar esta versión. Si el servicio todavía es anterior, la interfaz avisa al intentar compartir un repaso, en vez de presentar un tema predefinido como si fuera el examen elegido. En Render despliega la rama `winy-apk-prueba`; no hacen falta claves nuevas, tablas de Supabase nuevas ni cambiar las variables existentes.

La validación incluye 67 pruebas de lógica, API y proveedores. Comprueba 20 preguntas con cada adaptador mediante respuestas controladas, cantidad conservada al cambiar a Groq, rechazo de entradas inválidas antes de consumir cuota, caché separada por cantidad y una partida de doce preguntas entre dos clientes, con alternativas y palabras, avance coordinado, permisos y resultados personales. El recorrido de navegador genera veinte preguntas locales y completa un repaso propio con un segundo cliente HTTP; comprueba borrador durante las actualizaciones, citas y guardado final.

Las pruebas no usan claves reales ni demuestran la calidad de veinte preguntas de un modelo en producción. Falta verificar el despliegue real y el recorrido en dos teléfonos físicos. No se afirma una mejora educativa medida con estos cambios.
