import { actionRegistry } from "../registry/action-registry"
import type { ActionExecutor } from "../types/action"

const delayAction: ActionExecutor = {
  type: "action.delay",
  label: "Esperar",
  description: "Pausa la ejecución por un tiempo determinado (usa nodo tipo delay en el workflow)",
  configSchema: {},
  async execute(config, _context, _deps) {
    const ms = (config.ms as number) ?? (config.seconds as number ?? 0) * 1000
    if (ms > 0) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(ms, 300000)))
    }
    return {
      success: true,
      output: { delayed: true, ms },
      error: null,
      retryable: false,
    }
  },
}

actionRegistry.register(delayAction)

export default delayAction
