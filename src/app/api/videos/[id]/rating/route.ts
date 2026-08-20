import { NextResponse } from 'next/server';

function deprecated() {
  return NextResponse.json(
    {
      error: {
        code: 'DEPRECATED',
        message: 'Video ratings have been removed. Use likes instead.',
      },
    },
    { status: 410 }
  );
}

export async function GET() {
  return deprecated();
}

export async function POST() {
  return deprecated();
}

export async function PATCH() {
  return deprecated();
}

export async function DELETE() {
  return deprecated();
}
