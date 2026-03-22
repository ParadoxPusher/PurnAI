import { NextResponse } from 'next/server';

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

    const payload = {
      model: 'moonshotai/kimi-k2.5',
      messages: apiMessages,
      max_tokens: 4096,
      temperature: 0.7,
      stream: true,
      chat_template_kwargs: { thinking: true },
    };

    const response = await fetch(invokeUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      // @ts-ignore
      cache: 'no-store',
    });

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

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              controller.enqueue(encoder.encode(trimmed + '\n\n'));
            }
          }

          if (buffer.trim()) {
            controller.enqueue(encoder.encode(buffer.trim() + '\n\n'));
          }
        } catch (e) {
          console.error('Stream relay error:', e);
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
