# Propuesta: el mundo y el compañero de Winy

Evaluación de producto sobre la versión 0.7.0, realizada el 2 de noviembre de 2026. Público principal: estudiantes de secundaria de 15 y 16 años. **Es una propuesta para desarrollar; estas interacciones nuevas todavía no están implementadas.**

## Recomendación

Crear un **refugio personal en 2D**, conectado al mapa del Perú que ya existe. El estudiante elige a su compañero, organiza su espacio y sale a pequeñas expediciones. La mascota acompaña una rutina que ya tiene propósito: elegir una meta, estudiar, recordar, descansar y volver a practicar.

Para este público priorizaría autonomía, identidad visual y colaboración. Un aspecto tierno puede convivir con un lenguaje directo y respetuoso. Conviene comprobar el tono con estudiantes: secundaria incluye gustos e intereses diversos.

## Base disponible

- Cuatro mascotas con nombre, ilustraciones originales, accesorios y una reacción al tocarlas. Los saludos actuales salen de listas locales.
- Hogar con una escena y un fondo fijo; todavía no es un espacio explorable ni decorable.
- Mapa geográfico con seis destinos, misiones y pasaporte. Conviene ampliar esa sección para viajar, conservando las ubicaciones reales.
- Pomodoro con meta, estudio, descanso y repaso; puede proporcionar el contexto de las animaciones.
- Modo **Con mis palabras**, con intento previo, cita y autoevaluación. Puede ser la actividad «Enséñale a tu compañero», manteniendo la misma comparación con los apuntes.
- Salas de dos jugadores con bancos propios y revisión conjunta. Pueden servir de base para una misión cooperativa.

## Interacciones evaluadas

El esfuerzo es una estimación relativa sobre el código actual; no es una cotización ni un plazo.

| Interacción | Qué haría el estudiante | Valor esperado | Esfuerzo | Prioridad |
| --- | --- | --- | --- | --- |
| Compañero de enfoque | Elegir una meta y ver a su mascota acompañar el bloque, con una animación discreta. | Da continuidad y contexto al Pomodoro. | Bajo–medio | Primera entrega |
| Enséñale una idea | Tocar el cuaderno de la mascota, intentar explicar un concepto y comparar después con el apunte guardado. | Da una razón para recuperar y explicar antes de mirar. Se reutiliza «Con mis palabras». | Bajo–medio | Primera entrega |
| Saludo y gestos | Elegir saludar, ofrecer un snack o celebrar con la mascota. Respuesta breve y distinta según el compañero. | Aporta personalidad y vínculo con el juego; por sí solo no demuestra aprendizaje. | Bajo para reacciones simples | Primera entrega, alcance pequeño |
| Refugio personalizable | Cambiar escritorio, lámpara, planta, fondo y recuerdos de viaje. | Permite expresar gustos y ver una trayectoria propia. | Medio | Primera entrega, pocos objetos |
| Expediciones | Elegir un destino del mapa y completar una misión breve con preguntas de un repaso. Recibir un recuerdo para el refugio. | Conecta el mundo con el material del estudiante y con el pasaporte. | Medio | Segunda entrega |
| Proyecto entre compañeros | Elegir un proyecto decorativo, practicar un examen juntos y aportar al avance al terminar y revisar las rondas. | Ofrece una meta común además de comparar puntos. El resultado individual se conserva. | Medio–alto | Segunda entrega |
| Visitar otro refugio | Entrar mediante invitación para ver decoración y recuerdos compartidos. | Añade expresión social, con menos relación directa con aprender. | Medio–alto | Después de validar las anteriores |
| Conversación abierta con IA | Hablar libremente con la mascota. | Puede resultar atractiva, pero requiere un diseño propio, nuevas llamadas y límites claros de respuesta. | Alto y consumo variable | Posponer |

Las siete primeras pueden funcionar sin llamadas nuevas a Gemini o Groq. Se usan estados del juego, preguntas ya guardadas, mensajes escritos y recursos gráficos locales. Una frase programada no debe presentarse como una evaluación de la explicación del alumno.

## El refugio inicial

Una sola escena con cuatro puntos que se puedan tocar. Cada punto también tiene un botón con nombre para poder usarlo sin gestos precisos.

| Lugar | Acción principal | Qué reutiliza |
| --- | --- | --- |
| Escritorio | Elegir tema, escribir la meta y empezar el Pomodoro. | Juegos guardados y temporizador. |
| Cuaderno | Explicar una idea a la mascota o recuperar hasta tres conceptos pendientes. | «Con mis palabras», tarjetas y agenda de repaso. |
| Rincón de descanso | Ver a la mascota descansar y una sugerencia breve para apartarse de la pantalla. | Fase de descanso del Pomodoro. |
| Mochila y sendero | Vestir al compañero, cambiar decoración y abrir el mapa de destinos. | Accesorios, monedas, mapa y pasaporte. |

Ejemplo de recorrido: abrir Winy → tocar el escritorio → elegir «Biología, explicar dos procesos» → estudiar → registrar qué se pudo explicar → iniciar descanso → volver al cuaderno para recuperar una idea. Al salir de la sesión, el estudiante puede colocar un recuerdo en el refugio.

Durante el enfoque, las animaciones son discretas y se pueden reducir o apagar. Durante el descanso, la mascota también descansa: la aplicación anima a dejar la pantalla. La decoración y la exploración quedan disponibles entre sesiones, sin avisos que interrumpan una respuesta o el temporizador.

## Progresión y personalidad

- Cada compañero conserva su identidad: curiosidad del cuy, calma de la llama, energía del gallito y perspectiva del cóndor. Los mensajes pueden variar con el contexto sin interpretar el estado emocional del alumno.
- La personalización inicial utiliza la moneda existente. No se crea otra economía antes de comprobar que haga falta.
- Los recuerdos pueden reconocer acciones concretas: terminar un repaso, revisar un error o volver a practicar otro día. El tiempo acumulado y la autoevaluación se identifican como actividad, no como prueba de dominio.
- Tocar repetidamente a la mascota no produce monedas. Las animaciones breves se pueden disfrutar sin premios.
- La mascota permanece bien cuando el estudiante se ausenta. La progresión permite retomar sin perder objetos por no entrar, sin alimentación obligatoria y sin mensajes que hagan sentir culpa.
- Un proyecto cooperativo reconoce el repaso conjunto de ambos, aunque tengan puntuaciones diferentes. Se conserva el resultado personal para decidir qué practicar.

Mensajes de ejemplo: «¿Qué idea quieres poder explicar hoy?», «Tenemos una duda pendiente; podemos empezar por esa» y «Toca descansar. Aquí queda guardado tu avance».

## Alcance técnico y consumo

La primera entrega puede funcionar de forma local y sincronizar la decoración junto con el progreso existente. Los movimientos sencillos pueden aprovechar los PNG actuales con transformaciones y objetos en capas. Caminar, sentarse o manipular objetos de forma convincente requerirá nuevas poses o animación de las ilustraciones; no basta con desplazar la imagen completa.

El refugio no necesita enviar la posición de la mascota al servidor continuamente. Las llamadas nuevas se limitarían al guardado de cambios; las salas conservan su conexión durante la partida. Las visitas a refugios y los proyectos compartidos sí necesitan datos del servidor, permisos de invitación y persistencia adicionales. La infraestructura actual de salas temporales no proporciona por sí sola ese mundo social persistente.

Los fondos, objetos y animaciones aumentarán el tamaño de la descarga y el trabajo gráfico, aunque no consuman cuota de IA. Se deben probar en el Android mínimo admitido, con movimiento reducido, texto ampliado y sin depender del color o del sonido para comprender las acciones.

## Orden de construcción y validación

1. Refugio sencillo con escritorio y cuaderno, acompañamiento del Pomodoro y tres reacciones breves. Conservar navegación y progreso existentes.
2. Un pequeño catálogo de decoración y recuerdos. Comprobar que el estudiante entiende cómo se consiguen y dónde se guardan.
3. Conectar expediciones con bancos de apuntes y después probar un proyecto cooperativo con las salas existentes.
4. Evaluar las visitas y una conversación opcional solo si las pruebas muestran una necesidad concreta.

Antes de ampliar el mundo, probar el primer recorrido con un grupo pequeño de estudiantes de 15–16 años: localizar el escritorio, iniciar una meta, explicar una idea, descansar y retomar. Observar si la mascota ayuda a empezar, si el tono les encaja y si aparecen distracciones o confusión entre premios y aprendizaje.

La retención se comprueba con una explicación o pregunta equivalente días después. Más toques, minutos dentro de la app o decoración desbloqueada no bastan para concluir que se estudia mejor. Esta evaluación de código y diseño no sustituye esas pruebas con estudiantes.
