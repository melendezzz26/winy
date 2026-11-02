# Gemini con Groq como respaldo

Winy 0.5.0 admite dos proveedores independientes: Gemini como principal y Groq como respaldo cuando el principal informa falta de cuota o límite de solicitudes. No cambia automáticamente a OpenAI de pago.

## Configurar Groq

1. Abre [Groq Console](https://console.groq.com/), crea una cuenta y comprueba el plan gratuito y los límites disponibles para tu cuenta. No se garantiza una cuota concreta ni ilimitada.
2. En [API Keys](https://console.groq.com/keys), crea una clave y guárdala como secreto en **Render → Environment → `GROQ_API_KEY`**. No la envíes por chat ni la subas al repositorio.
3. Guarda estas variables en Render y despliega la última versión de `winy-apk-prueba`:

| Variable | Valor |
| --- | --- |
| `WINY_AI_PROVIDER` | `gemini` |
| `WINY_AI_FALLBACK` | `groq` |
| `GROQ_API_KEY` | Tu clave de Groq, como secreto |
| `GROQ_MODEL` | `openai/gpt-oss-20b` |

Conserva la clave y el modelo de Gemini que ya configuraste. El nombre `openai/gpt-oss-20b` identifica un modelo alojado en Groq: las solicitudes van a `api.groq.com` y usan la cuota de Groq, sin usar tu clave de OpenAI. Es el modelo del [ejemplo oficial del SDK de Groq consultado](https://github.com/groq/groq-python#usage). Comprueba su disponibilidad en tu panel; no se ha usado una clave real de Groq desde este entorno.

También se admiten `WINY_GROQ_KEY` y `WINY_GROQ_MODEL`, que tienen prioridad sobre los nombres sin prefijo. Para usar solo Groq, elige `WINY_AI_PROVIDER=groq` y deja `WINY_AI_FALLBACK` vacío.

## Comprobar la configuración

En `https://winy.onrender.com/api/status` debe aparecer una sección como esta:

```json
"fallback": {
  "provider": "groq",
  "model": "openai/gpt-oss-20b",
  "enabled": true
}
```

`enabled` confirma presencia de clave, no cuota ni autorización. La prueba real es generar un juego y comprobar las citas. La pantalla avisa antes de enviar los apuntes que puede utilizar ambos proveedores y muestra con cuál se preparó el repaso.

## Cuándo cambia

Se usa Groq ante cuota agotada, cuota gratuita no disponible o límite de solicitudes del principal. Tras un límite temporal se evita contactar al principal durante un minuto; tras cuota agotada se pausa durante quince minutos antes de volver a comprobarlo. Esa pausa no significa que la cuota se renueve en quince minutos.

Una clave inválida, modelo inaccesible, configuración rechazada o citas sin respaldo no se ocultan cambiando de proveedor. Si Groq también tiene un límite, se muestra su error. Cada proveedor admite un reintento; el cambio al respaldo es otra llamada. En conjunto pueden ser hasta cuatro llamadas, siempre sujetas al cupo global y al plazo total de 60 segundos de la tarea. Si el respaldo no tiene clave, se mantiene el error del principal.

## Límites de Winy y de cada proveedor

`WINY_AI_DAILY_LIMIT` es un cupo global propio de Winy, compartido por ambos proveedores. Cuenta llamadas reales, incluidos fallos, reintentos y el paso al respaldo. El valor predeterminado sigue siendo 20. Si quieres permitir más intentos entre los dos servicios puedes establecer, por ejemplo, `WINY_AI_DAILY_LIMIT=40`, ajustándolo a las cuotas que muestre cada panel. Esto no aumenta las cuotas de Google o Groq.

El límite por jugador sigue siendo cinco juegos completados al día. Los repasos guardados, tarjetas y corrección de errores no necesitan otra llamada a la IA. El resultado reciente de un material se reutiliza para evitar gastar otra solicitud.

Para reducir el consumo de tokens, Groq utiliza hasta 10.000 caracteres en extractos literales distribuidos cuando el material es más largo. El resultado muestra esa cobertura; no presenta extractos como documento completo. Su salida usa hasta 3.072 tokens y razonamiento `low` en GPT-OSS. Los límites gratuitos de tokens pueden impedir incluso una solicitud con pocos archivos: comprueba el panel y prueba un fragmento menor si ocurre.

## Citas y datos enviados

La IA selecciona identificadores de pasajes numerados. Winy verifica que existan y recupera la frase original del documento; no pide al modelo que copie cada cita. Si hay partes sin respaldo, se descartan y se avisa. Solo se publica el juego si quedan al menos dos preguntas verificadas y alguna idea respaldada.

Los extractos se envían a Groq únicamente al utilizarlo. Revisa sus políticas de datos y el plan de tu cuenta. La integración no promete tratamiento privado por ser gratuita; las claves permanecen en Render.
