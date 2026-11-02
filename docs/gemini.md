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

Los límites propios de Winy siguen vigentes: cinco intentos por identidad y el cupo global diario. Los intentos fallidos también cuentan, para evitar reintentos ilimitados.

Los textos extraídos se envían a Google cuando eliges Gemini. Su tratamiento depende de las [condiciones de Gemini API](https://ai.google.dev/gemini-api/terms) y del plan que utilices. No se promete almacenamiento o tratamiento privado por el hecho de usar una cuota gratuita.

La implementación y los errores se probaron con respuestas controladas. Este entorno no recibió tu clave de Google ni pudo acceder al dominio de Render por su política de red; **no se ha verificado todavía un análisis real con tu cuenta**.
