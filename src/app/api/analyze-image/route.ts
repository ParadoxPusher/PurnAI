import { NextResponse } from 'next/server';

export const maxDuration = 120;

// Kimi K2.5 is for multimodal (vision), fallback to K2 instruct for text-only analysis
const PRIMARY_MODEL = 'moonshotai/kimi-k2-thinking';
const FALLBACK_MODEL = 'moonshotai/kimi-k2-instruct';

export async function POST(req: Request) {
  try {
    const { image, prompt, messages } = await req.json();

    const invokeUrl = "https://integrate.api.nvidia.com/v1/chat/completions";
    const apiKey = process.env.NVIDIA_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'NVIDIA_API_KEY not configured' }, { status: 500 });
    }

    const userContent: any[] = [];

    if (image) {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: image,
        },
      });
    }

    userContent.push({
      type: 'text',
      text: prompt || 'Analyze this image in detail. Describe what you see.',
    });

    const apiMessages = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant that can analyze images in detail. Provide thorough, accurate descriptions and analysis.',
      },
      ...(messages || []),
      {
        role: 'user',
        content: userContent,
      },
    ];

    const makePayload = (model: string) => ({
      model,
      messages: apiMessages,
      max_tokens: 4096,
      temperature: 0.6,
      top_p: 1.0,
      stream: true,
    });

    const tryModel = async (model: string, timeoutMs: number): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const resp = await fetch(invokeUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'text/event-stream',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(makePayload(model)),
          signal: controller.signal,
          // @ts-ignore
          cache: 'no-store',
        });
        clearTimeout(timeoutId);
        return resp;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    };

    let response: Response | null = null;

    // Try primary model
    try {
      response = await tryModel(PRIMARY_MODEL, 30000);
      if (!response.ok) {
        console.error(`Primary model returned ${response.status}`);
        response = null;
      }
    } catch (err: any) {
      console.error(`Primary model failed:`, err.name === 'AbortError' ? 'timeout' : err.message);
      response = null;
    }

    // Fallback
    if (!response) {
      try {
        response = await tryModel(FALLBACK_MODEL, 60000);
      } catch (fetchErr: any) {
        if (fetchErr.name === 'AbortError') {
          return NextResponse.json(
            { error: 'AI models timed out. Please try again.' },
            { status: 504 }
          );
        }
        throw fetchErr;
      }
    }

    if (!response.ok) {
      const err = await response.text();
      console.error('NVIDIA API error:', response.status, err);
      return NextResponse.json({ error: err }, { status: response.status });
    }

    if (!response.body) {
      return NextResponse.json({ error: 'No response body' }, { status: 500 });
    }

    const upstream = response.body;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let receivedAnyData = false;

        try {
          while (true) {
            const readPromise = reader.read();
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => {
                reject(new Error('Stream timeout'));
              }, 60000);
            });

            const { value, done } = await Promise.race([readPromise, timeoutPromise]);
            if (done) break;

            receivedAnyData = true;

            if (value) {
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                controller.enqueue(encoder.encode(trimmed + '\n\n'));
              }
            }
          }

          if (buffer.trim()) {
            controller.enqueue(encoder.encode(buffer.trim() + '\n\n'));
          }
        } catch (e: any) {
          console.error('Stream relay error:', e.message);
          const errorEvent = `data: ${JSON.stringify({
            choices: [{
              delta: { content: `\n\n[Error: ${e.message || 'Connection lost'}. Please try again.]` },
              finish_reason: 'error'
            }]
          })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error: any) {
    console.error('Analyze image error:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
