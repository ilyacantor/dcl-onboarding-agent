import Anthropic from '@anthropic-ai/sdk';
import * as cheerio from 'cheerio';
import type { IntelBrief, IntelSource } from '../types/intel.types.js';

const anthropic = new Anthropic();

/**
 * Gather pre-meeting intelligence about a company by scraping public sources
 * and analyzing with Claude.
 */
export async function gatherIntelligence(
  customerName: string,
  customerId: string,
): Promise<IntelBrief> {
  const sources: IntelSource[] = [];
  const rawTexts: string[] = [];

  // Attempt to scrape multiple public sources
  const scrapers = [
    scrapeCompanyWebsite(customerName),
    scrapeSecFilings(customerName),
    scrapeNewsArticles(customerName),
  ];

  const results = await Promise.allSettled(scrapers);

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      sources.push(result.value.source);
      rawTexts.push(result.value.text);
    }
  }

  // If no data scraped, create a minimal brief
  if (rawTexts.length === 0) {
    return createMinimalBrief(customerName, sources);
  }

  // Send scraped data to Claude for analysis
  const brief = await analyzeWithClaude(customerName, rawTexts, sources);
  return brief;
}

// ── Web scrapers ──────────────────────────────────────────────────────

interface ScrapeResult {
  source: IntelSource;
  text: string;
}

async function scrapeCompanyWebsite(
  companyName: string,
): Promise<ScrapeResult | null> {
  try {
    // Search for the company's about page
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(companyName + ' about company site')}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract search result snippets as proxy for company info
    const snippets: string[] = [];
    $('div.BNeawe').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 20) snippets.push(text);
    });

    if (snippets.length === 0) return null;

    return {
      source: {
        url: searchUrl,
        type: 'WEBSITE',
        extracted_at: new Date().toISOString(),
      },
      text: `Company web search results for "${companyName}":\n${snippets.slice(0, 10).join('\n')}`,
    };
  } catch {
    return null;
  }
}

async function scrapeSecFilings(
  companyName: string,
): Promise<ScrapeResult | null> {
  try {
    const url = `https://efts.sec.gov/LATEST/search-index?q=%22${encodeURIComponent(companyName)}%22&dateRange=custom&startdt=2024-01-01&forms=10-K`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'DCL-Onboarding-Agent admin@example.com' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const data = await response.json() as any;
    if (!data.hits?.hits?.length) return null;

    const filings = data.hits.hits.slice(0, 3).map((hit: any) => {
      return `Filing: ${hit._source?.display_names?.join(', ') || 'N/A'} - ${hit._source?.file_description || ''} (${hit._source?.file_date || ''})`;
    });

    return {
      source: {
        url: `https://www.sec.gov/cgi-bin/browse-edgar?company=${encodeURIComponent(companyName)}&CIK=&type=10-K`,
        type: 'SEC_FILING',
        extracted_at: new Date().toISOString(),
      },
      text: `SEC filings for "${companyName}":\n${filings.join('\n')}`,
    };
  } catch {
    return null;
  }
}

async function scrapeNewsArticles(
  companyName: string,
): Promise<ScrapeResult | null> {
  try {
    const url = `https://www.google.com/search?q=${encodeURIComponent(companyName + ' enterprise systems ERP')}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    const snippets: string[] = [];
    $('div.BNeawe').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 20) snippets.push(text);
    });

    if (snippets.length === 0) return null;

    return {
      source: {
        url,
        type: 'NEWS',
        extracted_at: new Date().toISOString(),
      },
      text: `News/system info for "${companyName}":\n${snippets.slice(0, 8).join('\n')}`,
    };
  } catch {
    return null;
  }
}

// ── Claude analysis ─────────────────────────────────────────────────

async function analyzeWithClaude(
  companyName: string,
  rawTexts: string[],
  sources: IntelSource[],
): Promise<IntelBrief> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `Analyze the following public information about "${companyName}" and produce a structured intelligence brief for an enterprise onboarding interview.

RAW DATA:
${rawTexts.join('\n\n---\n\n')}

Return a JSON object with EXACTLY these fields:
{
  "company_overview": "2-3 sentence summary of the company",
  "industry": "Primary industry",
  "public_structure": ["List of known divisions, subsidiaries, or business units"],
  "known_systems": ["List of known enterprise systems (ERP, CRM, etc.)"],
  "recent_events": ["Recent mergers, acquisitions, reorgs, or major changes"],
  "suggested_questions": ["5-8 targeted interview questions based on what we found"]
}

If information is not available for a field, use an empty array or "Unknown".
Return ONLY valid JSON, no markdown formatting.`,
      },
    ],
  });

  const text =
    response.content[0].type === 'text' ? response.content[0].text : '{}';

  try {
    // Strip markdown code fences if present
    const cleaned = text.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      company_overview: parsed.company_overview || `${companyName} — no public information found.`,
      industry: parsed.industry || 'Unknown',
      public_structure: parsed.public_structure || [],
      known_systems: parsed.known_systems || [],
      recent_events: parsed.recent_events || [],
      suggested_questions: parsed.suggested_questions || [],
      sources,
      generated_at: new Date().toISOString(),
    };
  } catch {
    return createMinimalBrief(companyName, sources);
  }
}

function createMinimalBrief(
  companyName: string,
  sources: IntelSource[],
): IntelBrief {
  return {
    company_overview: `${companyName} — limited public information available. The interview will start from scratch.`,
    industry: 'Unknown',
    public_structure: [],
    known_systems: [],
    recent_events: [],
    suggested_questions: [
      'How is your company organized at the highest level?',
      'What are your primary business units or divisions?',
      'What ERP or financial systems do you use?',
      'Have there been any recent reorganizations?',
      'Which system is your source of truth for organizational data?',
    ],
    sources,
    generated_at: new Date().toISOString(),
  };
}
