import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'No query provided' }, { status: 400 });
    }

    // Use DuckDuckGo HTML search (no API key needed)
    const encoded = encodeURIComponent(query);
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encoded}`;

    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    const html = await response.text();

    // Parse results from DuckDuckGo HTML
    const results: Array<{ title: string; url: string; snippet: string }> = [];

    // Match result blocks — DuckDuckGo HTML uses <a class="result__a"> for titles
    // and <a class="result__snippet"> for snippets
    const resultBlocks = html.split('class="result__body"');

    for (let i = 1; i < resultBlocks.length && results.length < 8; i++) {
      const block = resultBlocks[i];

      // Extract title
      const titleMatch = block.match(/class="result__a"[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/a>/);
      let title = titleMatch
        ? titleMatch[1].replace(/<[^>]*>/g, '').trim()
        : '';

      // Extract URL
      const urlMatch = block.match(/class="result__a"\s+href="([^"]*)"/);
      let url = urlMatch ? urlMatch[1] : '';

      // DuckDuckGo wraps URLs in a redirect, extract the actual URL
      if (url.includes('uddg=')) {
        const uddgMatch = url.match(/uddg=([^&]*)/);
        if (uddgMatch) {
          url = decodeURIComponent(uddgMatch[1]);
        }
      }

      // Extract snippet
      const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
      let snippet = snippetMatch
        ? snippetMatch[1].replace(/<[^>]*>/g, '').trim()
        : '';

      if (title && url) {
        results.push({ title, url, snippet });
      }
    }

    // If HTML parsing didn't work well, try a simpler fallback approach
    if (results.length === 0) {
      // Try extracting from a simpler pattern
      const linkRegex = /class="result__a"\s+href="([^"]*)"[^>]*>([^<]*)</g;
      let match;
      while ((match = linkRegex.exec(html)) !== null && results.length < 8) {
        let url = match[1];
        const title = match[2].trim();

        if (url.includes('uddg=')) {
          const uddgMatch = url.match(/uddg=([^&]*)/);
          if (uddgMatch) url = decodeURIComponent(uddgMatch[1]);
        }

        if (title && url && url.startsWith('http')) {
          results.push({ title, url, snippet: '' });
        }
      }
    }

    // Now fetch content from top 3 results for deeper context
    const enrichedResults = await Promise.all(
      results.slice(0, 3).map(async (result) => {
        try {
          const pageResponse = await fetch(result.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'text/html',
            },
            signal: AbortSignal.timeout(5000),
          });

          if (!pageResponse.ok) return result;

          const pageHtml = await pageResponse.text();

          // Extract text content (strip HTML tags, scripts, styles)
          let text = pageHtml
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
            .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
            .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/&[a-z]+;/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          // Take first ~1500 chars of meaningful content
          text = text.slice(0, 1500);

          return { ...result, content: text };
        } catch {
          return result;
        }
      })
    );

    return NextResponse.json({
      success: true,
      query,
      results: results.slice(0, 8),
      enrichedResults,
      resultCount: results.length,
    });
  } catch (error: any) {
    console.error('Web search error:', error);
    return NextResponse.json(
      { error: error.message || 'Search failed' },
      { status: 500 }
    );
  }
}
