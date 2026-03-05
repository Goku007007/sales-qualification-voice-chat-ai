import type { SessionState, RouteDecision } from '@/types';
import { detectRiskKeywords } from '@/lib/scoring/rubrics';
import { withSessionSpan } from '@/lib/tracing/spans';

export async function routeNode(state: SessionState): Promise<Partial<SessionState>> {
  return withSessionSpan(
    state.sessionId,
    'route_node',
    async () => {
      const riskDetected = detectRiskKeywords(state.messages, state.industry);

      let decision: RouteDecision;
      if (riskDetected) {
        decision = 'risk';
      } else if (state.scoreLabel === 'hot' || state.scoreLabel === 'warm') {
        decision = state.scoreLabel;
      } else {
        decision = 'cold';
      }

      return { routeDecision: decision };
    },
    {
      industry: state.industry,
      score_label: state.scoreLabel ?? 'none',
    },
  );
}

export function routeRouter(state: SessionState): string {
  if (state.routeDecision) return state.routeDecision.toLowerCase();
  return 'cold'; // fallback
}
