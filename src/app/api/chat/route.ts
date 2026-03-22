import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { messages, mode = 'normal', searchResults } = await req.json();

    const invokeUrl = "https://integrate.api.nvidia.com/v1/chat/completions";
    const apiKey = process.env.NVIDIA_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'NVIDIA_API_KEY not configured' }, { status: 500 });
    }

    // --- Base system prompt ---
    const basePrompt = `You are Purn AI, a powerful, precise, and highly capable AI assistant. You respond with confidence, depth, and accuracy. You are better than average — you think critically, provide nuanced answers, and never give shallow or vague responses.

Core traits:
- You give THOROUGH, well-structured answers with clear reasoning.
- When explaining, you use examples, analogies, and step-by-step breakdowns.
- You always consider edge cases and multiple perspectives.
- You format responses with clear headings, bullet points, and code blocks where appropriate.
- You never say "I'm just an AI" or refuse reasonable requests with weak excuses.
- You proactively provide additional helpful context the user might not have asked for but would benefit from.`;

    // --- Doc generation instructions (always present) ---
    const docGenInstructions = `
DOCUMENT GENERATION INSTRUCTIONS:
When the user asks to create or make a presentation (PPT/PowerPoint), a PDF document, or a document, you MUST output a strictly formatted JSON response inside a markdown code block labeled exactly as \`\`\`json doc-gen

For PDF documents:
\`\`\`json doc-gen
{
  "type": "pdf",
  "title": "Document Title",
  "content": "Full rich markdown content here..."
}
\`\`\`
PDF CONTENT QUALITY RULES — the "content" string must be PROFESSIONAL and DETAILED:
- Use proper markdown: ## headings, ### sub-headings, **bold**, *italic*, > blockquotes, tables, numbered lists, bullet lists.
- Write like a professional document — include an introduction, clearly separated sections, detailed paragraphs (at least 3-5 sentences each), and a conclusion.
- Use markdown tables (| col1 | col2 |) for any data, comparisons, or structured info.
- Use > blockquotes for key takeaways, important notes, or definitions.
- Include at least 5-8 sections with meaningful depth, not shallow one-liners.
- The content should look like it was written by a senior professional — thorough, well-organized, and publication-ready.

For PowerPoint presentations:
\`\`\`json doc-gen
{
  "type": "ppt",
  "title": "Presentation Title",
  "slides": [
    { "title": "Slide Title", "bullets": ["Point 1", "Point 2", "Point 3", "Point 4"] }
  ]
}
\`\`\`
PPT QUALITY RULES:
- Create at least 6-10 slides for any topic (title slide is auto-generated, provide only content slides).
- Each slide MUST have 3-5 bullet points that are complete sentences, not fragments.
- Bullet points should be informative and detailed — not vague one-word items.
- Structure: Introduction → Key Points (multiple slides) → Examples/Data → Benefits/Challenges → Summary/Conclusion.
- Make it presentation-ready: each bullet should convey a complete idea that a presenter can speak to.

For text/code documents:
\`\`\`json doc-gen
{
  "type": "document",
  "title": "filename.ext",
  "content": "The full content of the document or code file"
}
\`\`\`
CODE/DOCUMENT QUALITY RULES:
- For code: write complete, working, production-quality code with proper comments, error handling, and structure.
- For code: use the correct file extension in the title (e.g., "app.py", "server.js", "styles.css", "index.html").
- For plain documents (.txt, .md): write thorough, well-structured content with clear formatting.

CODE GENERATION:
When the user asks to write code, generate a code file, or create a script, output a doc-gen block with type "document" and use the appropriate file extension in the title.

IMAGE GENERATION:
When the user asks to create, generate, or make an image, respond with a JSON block:
\`\`\`json image-gen
{
  "prompt": "A detailed description of the image to generate"
}
\`\`\`

IMPORTANT RULES:
- When asked for a PPT/PDF/document/code, output ONLY your reasoning in the thought block and the appropriate JSON block.
- When asked to generate an image, output ONLY the image-gen JSON block.
- If the user does not explicitly ask for a document, presentation, code file, or image, respond normally without any JSON blocks.
- NEVER produce empty or shallow documents. Every generated file must be thorough and professional.`;

    // --- Mode-specific prompt additions ---
    let modePrompt = '';
    let temperature = 0.7;
    let maxTokens = 16384;

    // Build web search context if available
    let searchContext = '';
    if (searchResults) {
      searchContext = '\n\nWEB SEARCH RESULTS (use these to answer the query):\n';

      if (searchResults.enrichedResults && searchResults.enrichedResults.length > 0) {
        searchResults.enrichedResults.forEach((r: any, i: number) => {
          searchContext += `\n--- Source ${i + 1}: ${r.title} ---\nURL: ${r.url}\n`;
          if (r.content) {
            searchContext += `Content: ${r.content}\n`;
          } else if (r.snippet) {
            searchContext += `Snippet: ${r.snippet}\n`;
          }
        });
      }

      if (searchResults.results && searchResults.results.length > 0) {
        searchContext += '\n--- Additional search results ---\n';
        searchResults.results.forEach((r: any, i: number) => {
          searchContext += `${i + 1}. [${r.title}](${r.url}) — ${r.snippet}\n`;
        });
      }
    }

    const deepResearchPrompt = `
DEEP RESEARCH MODE — ACTIVE:
You are now operating in DEEP RESEARCH mode. This means you must:

1. **Analyze the query deeply** — break it down into sub-questions and components.
2. **Think step by step** — use extended chain-of-thought reasoning in your thinking block. Consider multiple angles, hypotheses, and counterarguments.
3. **Be exhaustively thorough** — cover the topic from multiple dimensions: history, current state, technical details, implications, pros/cons, comparisons, and expert perspectives.
4. **Structure your response** like a research report:
   - Executive Summary (2-3 sentences)
   - Detailed Analysis (with sub-headings)
   - Key Findings / Insights
   - Considerations / Caveats
   - Conclusion
5. **Cite reasoning** — explain WHY each point matters, not just WHAT the facts are.
6. **Be quantitative** where possible — include numbers, statistics, comparisons, and data points.
7. **Consider opposing viewpoints** — present balanced analysis.

Your thinking block should show extensive reasoning with at least 5-10 logical steps before producing the final answer. Think like a senior researcher writing a briefing for a decision-maker.`;

    const webSearchPrompt = `
WEB SEARCH MODE — ACTIVE:
You have access to real-time web search results provided below. You MUST:

1. **Use the search results** as your primary source of information. Base your answer on the actual content retrieved.
2. **Cite your sources** — reference the source URLs in your response using markdown links like [Source Title](URL).
3. **Synthesize information** from multiple sources into a coherent, comprehensive answer.
4. **Be transparent** — if the search results don't fully answer the question, say so and provide your best analysis.
5. **Prioritize recency** — prefer information from more recent sources.
6. **Format clearly** — use headings, bullet points, and structured formatting.
7. **Include a "Sources" section** at the end with all referenced links.
${searchContext}`;

    if (mode === 'deep-research+web-search') {
      temperature = 0.3;
      maxTokens = 16384;
      modePrompt = deepResearchPrompt + '\n' + webSearchPrompt + `

COMBINED MODE INSTRUCTIONS:
You are using BOTH Deep Research AND Web Search simultaneously. This means:
- Use the web search results as factual grounding for your deep analysis.
- Apply deep research reasoning to synthesize and analyze the web search findings.
- Your thinking block should show extensive reasoning that incorporates the search results.
- Structure your response as a thorough research report backed by real web sources.
- Cite sources from the web search results throughout your analysis.
- This combined mode should produce the most comprehensive, well-sourced response possible.`;
    } else if (mode === 'deep-research') {
      temperature = 0.3;
      maxTokens = 16384;
      modePrompt = deepResearchPrompt;
    } else if (mode === 'web-search') {
      temperature = 0.5;
      maxTokens = 16384;
      modePrompt = webSearchPrompt;
    }

    const fullSystemPrompt = basePrompt + '\n' + docGenInstructions + '\n' + modePrompt;

    const apiMessages = [
      { role: "system", content: fullSystemPrompt },
      ...messages
    ];

    const payload = {
      model: "moonshotai/kimi-k2.5",
      messages: apiMessages,
      max_tokens: maxTokens,
      temperature,
      top_p: 0.95,
      stream: true,
      chat_template_kwargs: { thinking: true },
    };

    const response = await fetch(invokeUrl, {
      method: 'POST',
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "text/event-stream",
        "Content-Type": "application/json",
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
      return NextResponse.json({ error: 'No response body from API' }, { status: 500 });
    }

    // Relay the SSE stream
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
    console.error('Chat API error:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}
