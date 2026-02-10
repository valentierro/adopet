/**
 * Última rota conhecida (para incluir no reporte de bug quando ocorre um erro).
 * Atualizado pelo RouteTracker no layout.
 */
let lastRoute: string = '';

export function getLastRoute(): string {
  return lastRoute;
}

export function setLastRoute(route: string): void {
  lastRoute = route;
}
