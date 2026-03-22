import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const invokeUrl = "https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-xl";
    const apiKey = process.env.NVIDIA_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'NVIDIA_API_KEY not configured' }, { status: 500 });
    }

    const payload = {
      text_prompts: [
        {
          text: prompt,
          weight: 1,
        },
      ],
      sampler: "K_DPM_2_ANCESTRAL",
      seed: 0,
      steps: 25,
      cfg_scale: 5,
      height: 1024,
      width: 1024,
    };

    const response = await fetch(invokeUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('NVIDIA Image API error:', errText);
      return NextResponse.json(
        { error: `Image generation failed: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const base64Image = data.artifacts?.[0]?.base64;

    if (!base64Image) {
      return NextResponse.json(
        { error: 'No image generated' },
        { status: 500 }
      );
    }

    // Return base64 directly — no filesystem needed
    return NextResponse.json({
      success: true,
      image: `data:image/png;base64,${base64Image}`,
    });
  } catch (error: any) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate image' },
      { status: 500 }
    );
  }
}
