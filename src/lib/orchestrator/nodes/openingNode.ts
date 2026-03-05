import type { SessionState } from '@/types';
import { withSessionSpan } from '@/lib/tracing/spans';

export async function openingNode(state: SessionState): Promise<Partial<SessionState>> {
  return withSessionSpan(
    state.sessionId,
    'opening_node',
    async () => {
      return {};
    },
    {
      current_state: state.currentState,
      industry: state.industry,
    },
  );
}
