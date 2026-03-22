import { NextResponse } from 'next/server';

// On serverless (Netlify), we can't write to the filesystem.
// Files are generated client-side and downloaded directly via the browser.
// This endpoint is kept as a no-op for compatibility.
export async function POST(req: Request) {
  try {
    const { fileName, fileData } = await req.json();

    return NextResponse.json({
      success: true,
      fileName: fileName.replace(/[^a-zA-Z0-9._-]/g, '_'),
      message: 'File saved client-side. Use the download button to save.',
    });
  } catch (error: any) {
    console.error('Error in save-file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process file' },
      { status: 500 }
    );
  }
}
