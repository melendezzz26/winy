# Auditoría de aprendizaje · Winy 0.6.0

La entrega posterior 0.7.0 incorpora [hasta veinte preguntas y exámenes entre compañeros](examenes-compartidos.md).

Revisión del código y del recorrido de estudio para adolescentes de **15 y 16 años**, realizada el 2 de noviembre de 2026. Incluye cambios implementados, comprobaciones técnicas y propuestas pendientes. No es una evaluación con estudiantes ni una demostración de mejores notas.

## Hallazgo principal

Winy ya tenía apoyos útiles: apuntes propios, fuentes visibles, recuperación mediante trivia y tarjetas, repaso espaciado, pausas y una mascota que acompaña. Faltaba unirlos en una sesión con propósito. El temporizador anterior terminaba y entregaba un premio, pero no organizaba descansos, una meta ni una comprobación posterior. La recompensa y el acierto inmediato podían confundirse con comprensión.

## Cambios implementados

| Prioridad | Hallazgo en 0.5.0 | Cambio en 0.6.0 | Límite que permanece |
| --- | --- | --- | --- |
| Alta | El temporizador estaba separado del material y no tenía fases de descanso. | Pomodoro con meta escrita y tema opcional: estudio de 25 o 15 minutos, descanso corto de 5 y largo de 15 tras cuatro bloques. Cada fase se inicia manualmente; se permite pausar y reiniciar sin castigo. | El reloj registra tiempo transcurrido, no atención. No hay alarma del sistema con la app cerrada. La duración se adapta por decisión del estudiante. |
| Alta | La prueba de 30 segundos otorgaba el mismo hábito que estudiar. | La demo queda identificada y no registra minutos de estudio, bloques ni recompensas. Se conservan temporizadores antiguos de 5 minutos al actualizar. | Los registros locales no son una certificación de horas estudiadas. |
| Alta | Responder por reconocimiento podía bastar para terminar el repaso. | Nuevo modo **Con mis palabras**: escribir antes de revelar, comparar con la respuesta y cita, y revisar tres criterios de autoevaluación. Se reutiliza el juego, sin nuevas llamadas a la IA. | La longitud mínima solo exige un intento; no mide calidad. No hay corrección automática de redacciones. |
| Alta | Un acierto adivinado se programaba igual que un recuerdo seguro. | Antes de contestar: «Seguro de mi respuesta» o «Tengo dudas». Un acierto con dudas vuelve en 10 minutos y queda en «errores y dudas»; los aciertos seguros mantienen 1, 3, 7 y 14 días. | Es una regla sencilla basada en autoinforme, no un modelo validado de dominio. |
| Alta | Las tarjetas mostraban «respuestas correctas» aunque el propio alumno decidía si recordaba. | Los resultados identifican expresamente las autoevaluaciones; la explicación escrita se compara con los apuntes. No se presenta como una nota automática. | Las recompensas de tarjetas y explicación siguen basadas en autoevaluación. |
| Media | Las instrucciones a la IA pedían comprensión sin precisar edad ni tipo de pensamiento. | Instrucción compartida por Gemini, Groq y OpenAI: español claro para 15–16 años, recordar/comprender/aplicar según lo que permitan los apuntes y explicación de la confusión entre alternativas. Las habilidades se guardan y se muestran. | La etiqueta la propone el modelo. Que una cita exista no demuestra que respalde toda la interpretación. Hace falta revisión docente de una muestra. |
| Media | El progreso destacaba monedas, XP y nivel. | Panel de estudio con bloques y minutos registrados, conceptos por repasar y última meta autoevaluada. Al volver del descanso se ofrece explicar hasta tres conceptos del material asociado. | No se mezclan estas cifras en una supuesta «nota de comprensión». Se conservan hasta 60 bloques y 10 juegos. |
| Media | El reloj solo se veía al abrir su ventana. | Barra accesible durante la navegación y recuperación de la fase al recargar. Terminar una fase no reemplaza una pregunta ni una importación en curso. | Sin notificaciones nativas. Si la app estuvo cerrada, solo se completa la fase que estaba en marcha; no se inventan nuevos bloques. |

Las explicaciones libres se mantienen únicamente mientras esa pantalla está abierta: **no se guardan ni se envían a la IA**. Se conservan la autoevaluación y los registros de repaso. Las metas sí forman parte del progreso y se sincronizan si el estudiante usa una cuenta.

## Cómo usar un bloque para comprender

1. Elegir una meta observable: «explicar dos causas y su relación», en lugar de «estudiar historia».
2. Leer un fragmento de los apuntes. Identificar una idea y un ejemplo.
3. Cerrar los apuntes y recuperar esa idea con trivia, tarjetas o palabras propias. Comparar con la fuente y corregir una confusión concreta.
4. Registrar si se pudo explicar la meta. Descansar fuera de la pantalla durante cinco minutos.
5. Al volver, recuperar hasta tres conceptos sin mirar. Retomar los errores y dudas; volver a los aciertos en otro día.

25 minutos es una opción de organización, no una duración óptima demostrada para todos los adolescentes. El bloque de 15 minutos facilita empezar; conviene cambiar de tarea o hacer una pausa cuando sea necesario. El descanso largo es una oportunidad para parar, no una obligación de acumular cuatro bloques.

## Mejoras siguientes que requieren otra iteración

| Orden | Propuesta | Cómo verificar que aporta valor |
| --- | --- | --- |
| 1 | Revisar con docentes preguntas reales de distintas materias: exactitud, nivel, calidad de distractores y explicación del error. Priorizar relaciones y aplicaciones cuando la fuente lo permita. | Rúbrica docente y proporción de preguntas utilizables sin corregir. Revisar resultados reales de Gemini y Groq; las pruebas con respuestas controladas no miden su calidad educativa. |
| 2 | Añadir una comprobación al día siguiente y otra a la semana, con preguntas equivalentes que cambien el ejemplo y el orden. | Comparar recuerdo sin apuntes y explicación de relaciones; evitar medir solo repetir las mismas alternativas. La agenda espaciada actual es una base, sin recordatorios del sistema. |
| 3 | Dar pistas graduales para una dificultad concreta y permitir reformular la explicación después de comparar. | Observar si el estudiante puede corregir la confusión en una pregunta nueva, sin quedarse copiando la respuesta. |
| 4 | Agrupar temarios grandes por conceptos y permitir elegir una sección antes de generar el juego. | Revisar con el alumno qué parte del documento quedó cubierta. Los extractos distribuidos actuales pueden omitir contenido relevante. |
| 5 | Mejorar ejercicios de matemáticas, diagramas, fórmulas y documentos escaneados. | Conjunto de documentos reales y revisión por materia. El modo local sigue siendo completar palabras y no debe anunciarse como comprensión semántica. No hay OCR. |
| 6 | Auditoría de accesibilidad con lector de pantalla, tamaño de texto, contraste y teclado; probar el tono y el diseño con adolescentes. | Completar el recorrido sin ayuda con TalkBack y texto ampliado. La ausencia de desbordamiento y las etiquetas actuales no sustituyen estas pruebas. |
| 7 | Ofrecer explicaciones colaborativas entre compañeros, con turnos sin presión de velocidad. | Valorar la explicación y la corrección mutua. La sala competitiva actual usa rondas con tiempo y es una actividad opcional; no es una medida de comprensión. |

## Validación técnica de esta entrega

- `npm run check` y `npm test`: sintaxis correcta y 61 pruebas aprobadas. Incluyen pausa, restauración, cuatro bloques, descanso largo, migración, demo y recuperación de una fase vencida una sola vez.
- Pruebas de repaso que distinguen acierto con dudas, vencimiento a diez minutos y recuperación de la secuencia de aciertos seguros.
- Validación de etiquetas de habilidad y compatibilidad con juegos anteriores. Los tres proveedores comparten las instrucciones educativas y la verificación de citas existentes.
- Recorrido en Chromium: meta antes de iniciar, asociación con un juego, barra, descanso, autoevaluación y repaso; explicación antes de revelar, criterios y resultado explícitamente autoevaluado. Los vencimientos de los bloques largos se simulan; la demo de 30 segundos comprueba tiempo real, pausa y recarga.
- Regresiones de documentos, cuentas, sincronización, errores de proveedores, respaldo Gemini → Groq, salas, mascotas y recompensas. Comprobación de anchos de 320, 390, 600 y 1280 píxeles.
- Compilación Android, Lint, firma y correspondencia de recursos web del APK. La compilación no equivale a una ejecución en un teléfono.

El entorno no permite acceder al Render ni a los proyectos reales de IA/Supabase del usuario. Las respuestas de IA y de cuentas de las pruebas están controladas. Falta una prueba del despliegue con claves reales y un dispositivo físico.

## Piloto propuesto con estudiantes

Probar primero comprensión de las instrucciones y facilidad de uso con un grupo pequeño de 15–16 años, con consentimiento y supervisión adecuados al contexto escolar. Después comparar contenidos equivalentes con y sin el recorrido guiado, alternando el orden y manteniendo un tiempo parecido. Medir antes, inmediatamente después y a los siete días: recuerdo sin apuntes, explicación con rúbrica docente, una aplicación nueva, confianza y esfuerzo percibido. Registrar también abandonos y dificultades; más minutos o XP por sí solos no prueban aprendizaje.

Este piloto inicial sirve para detectar problemas y estimar señales, no para afirmar eficacia general ni diferencias por edad con una muestra pequeña. Evitar recopilar datos personales que no sean necesarios.

## Fundamento y alcance

La recuperación activa, la práctica distribuida y la autoexplicación motivan estas decisiones. Como referencias para el diseño:

- Dunlosky et al. (2013), revisión de técnicas de aprendizaje: [10.1177/1529100612453266](https://doi.org/10.1177/1529100612453266).
- Roediger y Karpicke (2006), práctica de recuperación y retención: [10.1111/j.1467-9280.2006.01693.x](https://doi.org/10.1111/j.1467-9280.2006.01693.x).
- Chi et al. (1994), autoexplicación: [10.1207/s15516709cog1803_3](https://doi.org/10.1207/s15516709cog1803_3).
- Cepeda et al. (2006), distribución de la práctica: [10.1037/0033-2909.132.3.354](https://doi.org/10.1037/0033-2909.132.3.354).

Son referencias generales conocidas, no una revisión sistemática realizada en esta tarea ni evidencia de que Winy o el ciclo 25/5 mejoren el aprendizaje en este grupo. Esa conclusión requiere el piloto y una evaluación posterior.
