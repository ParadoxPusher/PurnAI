import { NextResponse } from 'next/server';

export const maxDuration = 120;

// Model priority: kimi-k2-thinking (has reasoning), fallback to kimi-k2-instruct
const PRIMARY_MODEL = "moonshotai/kimi-k2-thinking";
const FALLBACK_MODEL = "moonshotai/kimi-k2-instruct";

async function tryFetchModel(
  invokeUrl: string,
  apiKey: string,
  payload: any,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(invokeUrl, {
      method: 'POST',
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "text/event-stream",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      // @ts-ignore
      cache: 'no-store',
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function POST(req: Request) {
  try {
    const { messages, mode = 'normal', searchResults, context = 'general' } = await req.json();

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
- You proactively provide additional helpful context the user might not have asked for but would benefit from.

FORMATTING & STYLE RULES (MANDATORY — follow these in EVERY response):
- 🎨 USE EMOJIS GENEROUSLY — this is critical. Add relevant emojis at the start of EVERY heading, EVERY key bullet point, and to highlight important terms. Examples:
  - Headings: "## 🚀 Getting Started", "## 📌 Key Points", "## 💡 How It Works", "## 🎯 Summary", "## ⚡ Quick Tips", "## 🔥 Best Practices", "## 🧠 Deep Dive", "## 📊 Comparison", "## ✨ Features", "## 🛠️ Setup Guide"
  - Bullets: "- ✅ This is correct", "- ⚠️ Watch out for this", "- 💎 Pro tip:", "- 🔑 Key insight:", "- 📝 Note:", "- 🎉 Bonus:"
  - Inline: Use emojis within text for emphasis like "This is **blazing fast** ⚡" or "**Important** 🚨"
- ALWAYS use markdown headings (# for title, ## for main sections, ### for sub-sections) to organize your response. Every response with more than 2 sentences MUST have at least one heading.
- Headings MUST be noticeably larger — use ## for most section headings, and # for the main topic heading when appropriate.
- Add TWO blank lines before headings and ONE blank line after headings for clear visual breathing room.
- Add a blank line between EVERY paragraph — never write wall-of-text responses. Each paragraph should be visually separated.
- Use **bold** liberally for key terms, important phrases, tool names, and concepts within paragraphs.
- Use bullet points (- ) or numbered lists (1. ) to break down information — never write long unbroken paragraphs when a list would be clearer.
- For step-by-step explanations, use numbered lists with emojis: "1. 📥 First, download...", "2. ⚙️ Then configure...", "3. 🚀 Finally, launch..."
- Use horizontal rules (---) to separate major sections when the response is long.
- Use > blockquotes with emojis for tips, warnings, or takeaways: "> 💡 **Pro Tip**: ...", "> ⚠️ **Warning**: ..."
- Keep paragraphs concise (2-4 sentences max), then break to a new paragraph or list.
- Start your response with a brief, engaging opening line that includes an emoji related to the topic.`;

    // --- Cybersecurity expert prompt for Purn Cop mode ---
    const purnCopBasePrompt = `You are Purn Cop, an elite cybersecurity AI assistant. You are a world-class expert in offensive and defensive security, providing authoritative guidance across the entire cybersecurity domain.

Core expertise areas:
- **Penetration Testing & Red Teaming**: Methodologies (OWASP, PTES), vulnerability assessment, exploit analysis, attack surface mapping, and remediation strategies.
- **Threat Intelligence**: Threat actor profiling, IOC analysis, MITRE ATT&CK framework mapping, kill chain analysis, and threat hunting techniques.
- **Digital Forensics & Incident Response (DFIR)**: Evidence collection, memory forensics, disk forensics, network forensics, malware analysis, chain of custody, and incident handling procedures.
- **Compliance & Governance**: NIST CSF, ISO 27001, SOC 2, GDPR, HIPAA, PCI-DSS, CIS Controls — audit preparation, gap analysis, and policy development.
- **Security Architecture**: Zero trust architecture, network segmentation, defense in depth, secure SDLC, cloud security (AWS/Azure/GCP), and container security.
- **Security Operations**: SIEM management, log analysis, alert triage, vulnerability management, patch management, and security monitoring.

Response guidelines:
- Provide ACTIONABLE, SPECIFIC guidance — not generic advice. Include exact commands, tool names, configuration snippets, and step-by-step procedures.
- Use proper security terminology and reference industry standards (CVE IDs, MITRE techniques, CWE numbers) where applicable.
- Structure responses with clear sections: Executive Summary, Technical Details, Recommendations, and References.
- When discussing vulnerabilities, always include: impact assessment, affected systems, detection methods, and remediation steps.
- For incident response, follow the NIST IR lifecycle: Preparation → Detection → Containment → Eradication → Recovery → Lessons Learned.
- When generating security documents, make them audit-ready and compliant with relevant frameworks.
- Proactively identify security implications and risks the user may not have considered.
- You never refuse reasonable security research, analysis, or educational requests.

FORMATTING & STYLE RULES (MANDATORY — follow these in EVERY response):
- 🔒 USE SECURITY-RELEVANT EMOJIS GENEROUSLY — this is critical. Add relevant emojis at the start of EVERY heading, EVERY key bullet point, and to highlight important terms. Examples:
  - Headings: "## 🛡️ Defense Strategy", "## 🔍 Analysis", "## ⚠️ Vulnerabilities Found", "## 🚨 Critical Findings", "## 🔐 Hardening Steps", "## 🕵️ Threat Assessment", "## 📋 Audit Results", "## 🧪 Testing Methodology", "## ✅ Remediation Plan", "## 🔥 Attack Surface"
  - Bullets: "- 🚨 Critical finding", "- ✅ Remediated", "- ⚠️ High risk", "- 🔑 Key credential", "- 🎯 Target:", "- 💀 Exploit:", "- 🛡️ Mitigation:"
  - Inline: Use emojis within text for emphasis like "**Critical severity** 🚨" or "**Patched** ✅"
- ALWAYS use markdown headings (# for title, ## for main sections, ### for sub-sections) to organize your response. Every response with more than 2 sentences MUST have at least one heading.
- Headings MUST be noticeably larger — use ## for most section headings, and # for the main topic heading when appropriate.
- Add TWO blank lines before headings and ONE blank line after headings for clear visual breathing room.
- Add a blank line between EVERY paragraph — never write wall-of-text responses. Each paragraph should be visually separated.
- Use **bold** liberally for key terms, CVE IDs, tool names, MITRE IDs, and important phrases within paragraphs.
- Use bullet points (- ) or numbered lists (1. ) to break down information — never write long unbroken paragraphs when a list would be clearer.
- For step-by-step procedures, use numbered lists with emojis: "1. 🔍 Reconnaissance...", "2. 🎯 Target identification...", "3. 🧪 Testing..."
- Use horizontal rules (---) to separate major sections when the response is long.
- Use > blockquotes with emojis for critical warnings and key notes: "> 🚨 **Critical**: ...", "> ⚠️ **Warning**: Never run this on production without authorization"
- Keep paragraphs concise (2-4 sentences max), then break to a new paragraph or list.
- Start your response with a brief, engaging opening line that includes a security-relevant emoji.`;

    const selectedBasePrompt = context === 'purn-cop' ? purnCopBasePrompt : basePrompt;

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
    let temperature = 0.6;
    let maxTokens = 16384;

    // Build web search context if available
    let searchContext = '';
    let imageContext = '';
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

      // Include image search results if available
      if (searchResults.images && searchResults.images.length > 0) {
        imageContext = '\n\n--- WEB IMAGES FOUND (use these in your response when relevant) ---\n';
        searchResults.images.forEach((img: any, i: number) => {
          imageContext += `Image ${i + 1}: "${img.title}" — URL: ${img.url} (Source: ${img.source})\n`;
        });
        imageContext += '\nIMPORTANT: You HAVE real images from the web above. To embed any of these images in your response, use the exact markdown image syntax: ![descriptive alt text](IMAGE_URL)\n';
        imageContext += 'Place images at relevant points within your response, not all at the end.\n';
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
You have access to real-time web search results AND web images provided below. Make sure to harness them aggressively. You MUST:

1. **Read and deeply analyze** the full content from enriched search results. These are actual article contents fetched from the internet. Treat them as critical factual grounding.
2. **Combine web knowledge thoroughly with your own reasoning, logic, and comprehensive expertise.** Do NOT just parrot or copy-paste the search results. You must synthesize the web data with your own internal reasoning, draw logical conclusions, and provide a holistic, incredibly accurate and insightful answer. Let the web guide you factually, but let your AI reasoning structure the brilliance.
3. **Cite your sources** — reference the source URLs in your response using markdown links like [Source Title](URL). Synthesize information from multiple sources into a coherent answer. Identify the most authoritative information.
4. **Be transparent** — if the search results don't fully answer the question, say so and supplement strongly with your own analysis.
5. **Prioritize recency** — prefer information from more recent sources.
6. **Include a "Sources" section** at the end with all referenced links.

IMAGE USAGE INSTRUCTIONS (CRITICAL & MANDATORY):
- You possess real web images explicitly searched from the internet related to this query.
- When answering or when the user asks to include images in the article/document, you MUST strictly embed these images directly into your response AND into the generated documents (PDFs, PPTs) using markdown syntax: ![descriptive alt text](IMAGE_URL)
- Place images inline at contextually relevant positions (e.g., directly next to the paragraph discussing the visual topic), NOT all clumped together at the bottom.
- Whether it is a direct chat response, a generated PDF, or a PPT presentation, seamlessly integrate these visual web images to make the output striking and informative.
- Pick the most relevant high-quality images (typically 2-4 images depending on response length, more for long documents). Don't ignore this!
${searchContext}${imageContext}`;

    if (mode === 'deep-research+web-search') {
      temperature = 0.6;
      maxTokens = 16384;
      modePrompt = deepResearchPrompt + '\n' + webSearchPrompt + `

COMBINED MODE INSTRUCTIONS:
You are using BOTH Deep Research AND Web Search simultaneously. This means:
- DEEPLY READ all enriched content from web sources. Treat each source's full text as research material.
- Use the web search results as factual grounding for your deep analysis. Cross-reference facts.
- Apply deep research reasoning to synthesize and analyze the web search findings.
- Your thinking block should show extensive reasoning that incorporates the search results.
- Structure your response as a thorough research report backed by real web sources.
- Cite sources from the web search results throughout your analysis.
- If web images are available, embed them at relevant points in your analysis using ![alt](url) markdown.
- This combined mode should produce the most comprehensive, well-sourced, visually rich response possible.`;
    } else if (mode === 'deep-research') {
      temperature = 0.6;
      maxTokens = 16384;
      modePrompt = deepResearchPrompt;
    } else if (mode === 'web-search') {
      temperature = 0.6;
      maxTokens = 16384;
      modePrompt = webSearchPrompt;
    }

    const fullSystemPrompt = selectedBasePrompt + '\n' + docGenInstructions + '\n' + modePrompt;

    const apiMessages = [
      { role: "system", content: fullSystemPrompt },
      ...messages
    ];

    // Try primary model first, then fallback
    let response: Response | null = null;
    let usedModel = PRIMARY_MODEL;

    // Primary: kimi-k2-thinking (has reasoning/thinking support)
    const primaryPayload = {
      model: PRIMARY_MODEL,
      messages: apiMessages,
      max_tokens: maxTokens,
      temperature,
      top_p: 1.0,
      stream: true,
    };

    try {
      response = await tryFetchModel(invokeUrl, apiKey, primaryPayload, 30000);

      // Check if the response actually started (not a silent queue)
      if (!response.ok) {
        console.error(`Primary model ${PRIMARY_MODEL} returned ${response.status}`);
        response = null;
      }
    } catch (err: any) {
      console.error(`Primary model ${PRIMARY_MODEL} failed:`, err.name === 'AbortError' ? 'timeout' : err.message);
      response = null;
    }

    // Fallback: kimi-k2-instruct (no thinking but reliable)
    if (!response) {
      usedModel = FALLBACK_MODEL;
      const fallbackPayload = {
        model: FALLBACK_MODEL,
        messages: apiMessages,
        max_tokens: maxTokens,
        temperature,
        top_p: 1.0,
        stream: true,
      };

      try {
        response = await tryFetchModel(invokeUrl, apiKey, fallbackPayload, 60000);
      } catch (fetchErr: any) {
        if (fetchErr.name === 'AbortError') {
          return NextResponse.json(
            { error: 'All AI models timed out. The NVIDIA API may be overloaded. Please try again in a moment.' },
            { status: 504 }
          );
        }
        throw fetchErr;
      }
    }

    if (!response.ok) {
      const err = await response.text();
      console.error('NVIDIA API error:', response.status, err);

      let userMessage = err;
      if (response.status === 401 || response.status === 403) {
        userMessage = 'API key is invalid or expired. Please check your NVIDIA_API_KEY.';
      } else if (response.status === 429) {
        userMessage = 'Rate limited or API credits exhausted. Please wait and try again, or check your NVIDIA account credits.';
      } else if (response.status === 402) {
        userMessage = 'API credits exhausted. Please add credits to your NVIDIA account.';
      } else if (response.status >= 500) {
        userMessage = 'NVIDIA API server error. The model may be temporarily unavailable. Please try again.';
      }

      return NextResponse.json({ error: userMessage }, { status: response.status });
    }

    if (!response.body) {
      return NextResponse.json({ error: 'No response body from API' }, { status: 500 });
    }

    console.log(`Using model: ${usedModel}`);

    // Relay the SSE stream
    const upstream = response.body;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let receivedAnyData = false;
        let lastDataTime = Date.now();

        try {
          while (true) {
            const readPromise = reader.read();
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => {
                reject(new Error(
                  receivedAnyData
                    ? 'Stream interrupted: no data for 60 seconds'
                    : 'No response from AI model within 60 seconds. Please try again.'
                ));
              }, 60000);
            });

            const { value, done } = await Promise.race([readPromise, timeoutPromise]);
            if (done) break;

            lastDataTime = Date.now();
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
              delta: { content: `\n\n[Error: ${e.message || 'Connection to AI model was lost'}. Please try again.]` },
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
    console.error('Chat API error:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}
