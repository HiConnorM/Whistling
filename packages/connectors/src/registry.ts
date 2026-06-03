import type { SourceType } from '@whistling/domain'
import type { Connector } from './types.js'

class ConnectorRegistry {
  private connectors = new Map<SourceType, Connector>()

  register(connector: Connector): void {
    this.connectors.set(connector.type, connector)
  }

  get(type: SourceType): Connector | undefined {
    return this.connectors.get(type)
  }

  getOrThrow(type: SourceType): Connector {
    const connector = this.connectors.get(type)
    if (!connector) {
      throw new Error(`No connector registered for source type: ${type}`)
    }
    return connector
  }

  list(): SourceType[] {
    return Array.from(this.connectors.keys())
  }
}

export const connectorRegistry = new ConnectorRegistry()
