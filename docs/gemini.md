# Configurar Gemini con cuota gratuita para probar Winy

Winy admite **Gemini Developer API**, además de OpenAI. El modelo inicial del adaptador es **`gemini-3.8-flash`**, recomendado por el [quickstart oficial de Google consultado](https://github.com/google-gemini/cookbook/blob/main/quickstarts/Get_started.ipynb). La disponibilidad y la cuota gratuita dependen de tu proyecto, modelo y región: compruébalas en Google AI Studio. No se garantiza un cupo gratuito ni ilimitado.

## Tu cuenta de Google

1. Abre [Google AI Studio](https://aistudio.google.com/) con tu cuenta.
2. En la sección de claves de API, crea o selecciona un proyecto y genera su clave para Gemini Developer API.
3. Comprueba el nivel de uso y los límites del modelo en el panel. Para esta prueba gratuita, usa un proyecto/modelo que el panel indique como disponible sin facturación. Si Google exige activar pago, revisa las condiciones antes de continuar: Winy no cambia la facturación ni añade crédito.
4. Guarda la clave en Render como secreto; no la envíes por chat ni la subas a GitHub. La clave de OpenAI no funciona para Gemini.

## Variables en Render

En tu servicio `winy.onrender.com`, abre **Environment** y configura:

| Variable | Valor |
| --- | --- |
| `WINY_AI_PROVIDER` | `gemini` |
| `WINY_GEMINI_MODEL` | `gemini-3.8-flash` |
| `WINY_GEMINI_KEY` | Tu clave de Google AI Studio, guardada como secreto |
| `WINY_AI_DAILY_LIMIT` | `20` o menos durante las pruebas |

Guarda las variables y despliega la última versión de la rama **`winy-apk-prueba`**. `WINY_AI_MODEL` y `WINY_AI_KEY` pertenecen al adaptador de OpenAI y no seleccionan el modelo de Gemini. Winy no cambia de proveedor automáticamente si se agota un cupo.

También se admiten **`GEMINI_API_KEY`** y **`GEMINI_MODEL`**. Si no defines `WINY_AI_PROVIDER` y hay una clave de Gemini configurada, Winy selecciona Gemini al arrancar, aunque quede una clave antigua de OpenAI. Para elegir OpenAI explícitamente, define `WINY_AI_PROVIDER=openai`. La selección se hace al arrancar; no se cambia a un proveedor de pago si se agota la cuota gratuita.

Después, abre **https://winy.onrender.com/api/status**. La respuesta esperada es:

```json
{"online":true,"ai":true,"provider":"gemini","model":"gemini-3.8-flash"}
```

`ai: true` indica que hay una clave configurada. Solo un análisis real permite comprobar la validez de esa clave y la cuota de Google. Si aparece `ai: false`, revisa `WINY_GEMINI_KEY`. Si sigue apareciendo `provider: openai`, revisa `WINY_AI_PROVIDER` y que Render haya desplegado el commit nuevo.

En Winy, selecciona **Ideas clave y trivia con IA** y prueba primero con dos o tres párrafos. Cuando funcione, prueba el PDF completo. Se usa el mismo esquema de resumen, ideas, preguntas y verificación literal de citas que en el adaptador de OpenAI.

## Límites y errores

- `ai_free_quota_unavailable`: el proyecto/modelo reporta cuota cero. Revisa disponibilidad y el nivel gratuito en Google AI Studio.
- `ai_daily_quota_exhausted`: se agotó el cupo diario del proveedor; espera a que se renueve.
- `ai_rate_limited`: se alcanzó un límite de solicitudes; espera y reduce la frecuencia o el tamaño del material.
- `ai_invalid_key`: revisa la clave en Render; no hace falta cambiar las sesiones del juego.
- `ai_model_unavailable`: el identificador no está disponible para tu proyecto. Configura un modelo de texto con salida JSON admitido y con cuota disponible, según tu panel.

Desde 0.4.0 el límite por jugador cuenta **cinco juegos completados al día**; los fallos no consumen esos cinco juegos. El cupo global `WINY_AI_DAILY_LIMIT` sí cuenta las llamadas al proveedor, incluidos fallos y el único reintento automático, porque pueden consumir la cuota de Google. Los juegos guardados se pueden repasar sin otra llamada de IA.

Un `503 ServiceUnavailable` del panel de Google indica indisponibilidad del proveedor, mientras que un `429` puede indicar un límite. Winy devuelve códigos diferentes: `ai_provider_unavailable`, `ai_rate_limited`, `ai_daily_quota_exhausted`, `winy_daily_games_limit` y `winy_daily_requests_limit`. No conviene interpretar todos como falta de crédito.

La generación usa tareas en segundo plano con estado y cancelación. La solicitud REST usa el enum canónico `MINIMAL` para el razonamiento de Gemini 3 Flash, hasta 6 preguntas y 4.096 tokens de salida. Si Google rechaza específicamente ese ajuste opcional, se retira y se permite una salida de hasta 8.192 tokens, conservando modelo, fuentes y esquema de citas.

La recuperación de compatibilidad y los fallos HTTP 502/503/504 comparten **un único reintento**. No se reintentan cuota, clave inválida, modelo inaccesible ni errores 400 sin identificar. La segunda llamada exige reservar otro intento del cupo global. Cada intento tiene un máximo de 27 segundos y la tarea uno de 60 segundos. La lectura del PDF ocurre antes y muestra la página que está leyendo.

Si Google devuelve un error 400, Render registra un evento `gemini_request_rejected` con una referencia, estado del proveedor y nombres conocidos de campos rechazados. No registra el mensaje original de Google, las claves, los apuntes ni los nombres de archivo. Si la tarea falla, la pantalla muestra la referencia para localizar ese evento.

Un `401` de Winy después de un despliegue puede corresponder a una sesión antigua. Un invitado se identifica de nuevo y reenvía sus apuntes una sola vez; una cuenta con correo conserva su progreso local y pide volver a entrar. Esto es independiente del rechazo de parámetros de Gemini.

Los textos extraídos se envían a Google cuando eliges Gemini. Su tratamiento depende de las [condiciones de Gemini API](https://ai.google.dev/gemini-api/terms) y del plan que utilices. No se promete almacenamiento o tratamiento privado por el hecho de usar una cuota gratuita.

La implementación y los errores se probaron con respuestas controladas. Este entorno no recibió tu clave de Google ni pudo acceder al dominio de Render por su política de red; **no se ha verificado todavía un análisis real con tu cuenta**.

## Otro proveedor cuando se agota Gemini

Desde 0.5.0 se puede configurar [Groq como respaldo automático](groq.md), con su propia clave y cuota. Solo cambia al estar configurado explícitamente; nunca pasa automáticamente a OpenAI de pago. Ambos mantienen la validación de pasajes originales y el cupo global de Winy.
