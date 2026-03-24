import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'No query provided' }, { status: 400 });
    }

    // Heuristic to clean the query of common conversational document-generation filler
    // This dramatically improves DuckDuckGo text and image search results
    let searchKeywords = query.replace(/^(please\s+)?(can you\s+)?(write|create|generate|make|give me|provide)\s+(a|an|some\s+)?(detailed\s+)?(document|pdf|ppt|powerpoint|presentation|article|essay|post|file)\s+(about|on|for)\s+/i, '');
    searchKeywords = searchKeywords.replace(/(and\s+)?(also\s+)?(include|add|with)\s+(some\s+)?(images|pictures|photos|visuals)/gi, '');
    searchKeywords = searchKeywords.trim() || query; // Fallback to original if completely stripped

    // Run text search and image search in parallel
    const [textResults, imageResults] = await Promise.all([
      searchText(searchKeywords),
      searchImages(searchKeywords),
    ]);

    return NextResponse.json({
      success: true,
      query,
      results: textResults.results,
      enrichedResults: textResults.enrichedResults,
      images: imageResults,
      resultCount: textResults.results.length,
    });
  } catch (error: any) {
    console.error('Web search error:', error);
    return NextResponse.json(
      { error: error.message || 'Search failed' },
      { status: 500 }
    );
  }
}

// ── Text search via DuckDuckGo HTML ──
async function searchText(query: string) {
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

  const resultBlocks = html.split('class="result__body"');

  for (let i = 1; i < resultBlocks.length && results.length < 10; i++) {
    const block = resultBlocks[i];

    const titleMatch = block.match(/class="result__a"[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/a>/);
    let title = titleMatch
      ? titleMatch[1].replace(/<[^>]*>/g, '').trim()
      : '';

    const urlMatch = block.match(/class="result__a"\s+href="([^"]*)"/);
    let url = urlMatch ? urlMatch[1] : '';

    if (url.includes('uddg=')) {
      const uddgMatch = url.match(/uddg=([^&]*)/);
      if (uddgMatch) {
        url = decodeURIComponent(uddgMatch[1]);
      }
    }

    const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
    let snippet = snippetMatch
      ? snippetMatch[1].replace(/<[^>]*>/g, '').trim()
      : '';

    if (title && url) {
      results.push({ title, url, snippet });
    }
  }

  // Fallback parsing
  if (results.length === 0) {
    const linkRegex = /class="result__a"\s+href="([^"]*)"[^>]*>([^<]*)</g;
    let match;
    while ((match = linkRegex.exec(html)) !== null && results.length < 10) {
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

  // Fetch content from top 5 results for deeper context
  const enrichedResults = await Promise.all(
    results.slice(0, 5).map(async (result) => {
      try {
        const pageResponse = await fetch(result.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html',
          },
          signal: AbortSignal.timeout(6000),
        });

        if (!pageResponse.ok) return result;

        const pageHtml = await pageResponse.text();

        // Extract text content — strip non-content elements
        let text = pageHtml
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
          .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
          .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
          .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
          .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/&[a-z]+;/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        // Take first ~3000 chars for deeper reading
        text = text.slice(0, 3000);

        return { ...result, content: text };
      } catch {
        return result;
      }
    })
  );

  return { results: results.slice(0, 10), enrichedResults };
}

// ── Image search via DuckDuckGo ──
async function searchImages(query: string): Promise<Array<{ url: string; title: string; source: string; thumbnail: string }>> {
  try {
    // Step 1: Get the vqd token from DuckDuckGo
    const tokenResponse = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(5000),
    });

    const tokenHtml = await tokenResponse.text();
    const vqdMatch = tokenHtml.match(/vqd=["']?([^"'&]+)/);
    if (!vqdMatch) {
      // Fallback: try extracting from a different pattern
      const vqdAlt = tokenHtml.match(/vqd=([\d-]+)/);
      if (!vqdAlt) return [];
      return await fetchDdgImages(query, vqdAlt[1]);
    }

    return await fetchDdgImages(query, vqdMatch[1]);
  } catch (err) {
    console.error('Image search error:', err);
    return [];
  }
}

async function fetchDdgImages(query: string, vqd: string): Promise<Array<{ url: string; title: string; source: string; thumbnail: string }>> {
  try {
    const params = new URLSearchParams({
      l: 'us-en',
      o: 'json',
      q: query,
      vqd: vqd,
      f: ',,,,,',
      p: '1',
    });

    const imgResponse = await fetch(`https://duckduckgo.com/i.js?${params.toString()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://duckduckgo.com/',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!imgResponse.ok) return [];

    const imgData = await imgResponse.json();
    const images: Array<{ url: string; title: string; source: string; thumbnail: string }> = [];

    if (imgData.results && Array.isArray(imgData.results)) {
      for (const img of imgData.results.slice(0, 6)) {
        if (img.image && img.title) {
          images.push({
            url: img.image,
            title: img.title || '',
            source: img.source || img.url || '',
            thumbnail: img.thumbnail || img.image,
          });
        }
      }
    }

    return images;
  } catch {
    return [];
  }
}
