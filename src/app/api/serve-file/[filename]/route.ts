import { NextResponse } from 'next/server';

// On serverless (Netlify), we can't serve files from the filesystem.
// Files are generated and downloaded client-side directly.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  return NextResponse.json(
    { error: `File "${filename}" not available. Files are downloaded directly from the browser.` },
    { status: 404 }
  );
}
