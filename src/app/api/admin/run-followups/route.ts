import { NextResponse } from 'next/server';
import { processFollowUpJobs } from '@/lib/scheduler/jobRunner';

function getTokenFromRequest(req: Request): string | null {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const bearer = auth.slice('Bearer '.length).trim();
    if (bearer.length > 0) return bearer;
  }

  const headerToken = req.headers.get('x-admin-token');
  return headerToken && headerToken.length > 0 ? headerToken : null;
}

export async function POST(req: Request) {
  const expectedToken = process.env.ADMIN_API_TOKEN;

  if (!expectedToken) {
    return NextResponse.json(
      {
        error: {
          code: 'ADMIN_TOKEN_NOT_CONFIGURED',
          message: 'ADMIN_API_TOKEN is not configured',
        },
      },
      { status: 503 },
    );
  }

  const requestToken = getTokenFromRequest(req);
  if (!requestToken || requestToken !== expectedToken) {
    return NextResponse.json(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid admin token',
        },
      },
      { status: 401 },
    );
  }

  const result = await processFollowUpJobs();
  return NextResponse.json({
    processed: result.processed,
    failed: result.failed,
    timestamp: new Date().toISOString(),
  });
}
