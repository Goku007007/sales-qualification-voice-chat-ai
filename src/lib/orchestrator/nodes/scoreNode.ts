import type { SessionState } from '@/types';
import { getIndustryPack } from '@/industry-packs';
import { scoreLead } from '@/lib/scoring/engine';
import { withSessionSpan } from '@/lib/tracing/spans';

export async function scoreNode(state: SessionState): Promise<Partial<SessionState>> {
  return withSessionSpan(
    state.sessionId,
    'score_node',
    async () => {
      const industryPack = getIndustryPack(state.industry);
      const result = await scoreLead(state, industryPack);

      return {
        score: result.score,
        scoreLabel: result.scoreLabel,
        scoreReasons: result.scoreReasons,
      };
    },
    {
      industry: state.industry,
      current_state: state.currentState,
    },
  );
}
