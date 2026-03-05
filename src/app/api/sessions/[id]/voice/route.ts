import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: {
        code: 'VOICE_UPLOAD_DISABLED',
        message:
          'Server-side voice upload is disabled. Use browser speech-to-text in the composer.',
      },
    },
    { status: 501 },
  );
}
