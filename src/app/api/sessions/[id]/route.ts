import { NextResponse } from 'next/server';
import { sessionService } from '@/lib/services/sessionService';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await sessionService.getSession(params.id);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error(`Failed to get session ${params.id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
