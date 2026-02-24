/**
 * Cor do badge de match score (0–100%).
 * Verde alto, amarelo/laranja médio, vermelho baixo.
 */
export function getMatchScoreColor(score: number | null | undefined): string {
  if (score == null || typeof score !== 'number') return '#6b7280'; // gray
  const n = Math.max(0, Math.min(100, score));
  if (n >= 70) return '#22c55e'; // green
  if (n >= 40) return '#eab308'; // yellow
  return '#ef4444'; // red
}
