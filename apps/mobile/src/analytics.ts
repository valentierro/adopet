/**
 * Analytics: eventos para métricas e A/B test.
 * Em dev apenas loga; pode ser estendido para enviar a um backend.
 */

export type AnalyticsEvent =
  | { name: 'swipe'; properties: { petId: string; action: 'LIKE' | 'PASS' } }
  | { name: 'like'; properties: { petId: string } }
  | { name: 'open_chat'; properties: { petId: string; conversationId: string } }
  | { name: 'signup_complete'; properties: { userId?: string } }
  | { name: 'pet_viewed'; properties: { petId: string } }
  | { name: 'favorite_added'; properties: { petId: string } }
  | { name: 'adoption_confirmed'; properties: { petId: string } }
  | { name: 'screen_view'; properties: { screen: string } }
  | { name: 'onboarding_started'; properties: Record<string, never> }
  | { name: 'onboarding_skipped'; properties: Record<string, never> }
  | { name: 'onboarding_slide_viewed'; properties: { slide_index: number; slide_name: string } }
  | { name: 'onboarding_completed'; properties: { last_slide_index: number } }
  | { name: 'onboarding_final_action'; properties: { action: 'login' | 'signup' | 'explore' } };

let enabled = true;

export function setAnalyticsEnabled(value: boolean) {
  enabled = value;
}

export function trackEvent(event: AnalyticsEvent): void {
  if (!enabled) return;
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[Analytics]', event.name, event.properties);
  }
  // Futuro: api.post('/analytics/event', { name: event.name, properties: event.properties })
}
