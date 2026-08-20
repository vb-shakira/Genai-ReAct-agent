export type SearchHit = {
  title: string;
  url: string;
  snippet: string;
  source: "arXiv" | "Wikipedia" | "Community";
};

const AGENTIC_TERMS = [
  "agent",
  "agentic",
  "llm",
  "react",
  "tool",
  "reasoning",
  "orchestration",
  "multi-agent",
  "rag",
  "mcp",
  "autonomous",
  "planning",
  "workflow",
];

/** Bias every query toward the Agentic AI domain so the agent stays on-topic. */
function groundQuery(query: string) {
  const q = query.toLowerCase();
  const alreadyScoped = AGENTIC_TERMS.some((t) => q.includes(t));
  return alreadyScoped ? query : `${query} agentic AI agents LLM`;
}

function stripTags(html: string) {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function clip(text: string, max = 480) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

const STOPWORDS = new Set([
  "what",
  "which",
  "how",
  "does",
  "the",
  "and",
  "for",
  "are",
  "with",
  "from",
  "that",
  "this",
  "used",
  "use",
  "give",
  "about",
  "into",
  "official",
  "site",
]);

function keywords(query: string) {
  return query
    .toLowerCase()
    .replace(/site:\S+/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Keep only hits that actually overlap the query keywords. */
function relevant(hits: SearchHit[], kws: string[]) {
  if (kws.length === 0) return hits;
  return hits.filter((hit) => {
    const text = `${hit.title} ${hit.snippet}`.toLowerCase();
    return kws.some((kw) => text.includes(kw));
  });
}

async function searchArxiv(query: string): Promise<SearchHit[]> {
  const kws = keywords(query).slice(0, 5);
  if (kws.length === 0) return [];
  const expr = kws.map((kw) => `all:${kw}`).join(" AND ");
  const url = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(
    expr,
  )}&start=0&max_results=4&sortBy=relevance`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const xml = await res.text();
  const entries = xml.split("<entry>").slice(1);
  const hits = entries.map((entry) => {
    const title = stripTags(entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "Untitled");
    const summary = stripTags(entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] ?? "");
    const link = entry.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() ?? "";
    return { title, url: link, snippet: clip(summary), source: "arXiv" as const };
  });
  return relevant(hits, kws);
}

async function searchWikipedia(query: string): Promise<SearchHit[]> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    query,
  )}&srlimit=3&format=json&origin=*`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = (await res.json()) as {
    query?: { search?: Array<{ title: string; snippet: string }> };
  };
  return (json.query?.search ?? []).map((hit) => ({
    title: hit.title,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(hit.title.replace(/ /g, "_"))}`,
    snippet: clip(stripTags(hit.snippet)),
    source: "Wikipedia" as const,
  }));
}

async function searchCommunity(query: string): Promise<SearchHit[]> {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(
    query,
  )}&hitsPerPage=4&tags=(story,comment)`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = (await res.json()) as {
    hits?: Array<{
      title?: string | null;
      story_title?: string | null;
      url?: string | null;
      objectID: string;
      story_text?: string | null;
      comment_text?: string | null;
    }>;
  };
  return (json.hits ?? []).slice(0, 3).map((hit) => ({
    title: hit.title || hit.story_title || "Discussion",
    url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
    snippet: clip(stripTags(hit.comment_text || hit.story_text || "")) || "Community discussion.",
    source: "Community" as const,
  }));
}

/** Domain-grounded web search across Agentic AI research, reference and community sources. */
export async function searchAgenticWeb(rawQuery: string) {
  const query = groundQuery(rawQuery.trim());
  const results = await Promise.allSettled([
    searchArxiv(query),
    searchWikipedia(query),
    searchCommunity(query),
  ]);

  const kws = keywords(query);
  const hits = relevant(
    results.flatMap((r) => (r.status === "fulfilled" ? r.value : [])),
    kws,
  )
    .filter((h) => h.url && h.snippet)
    .slice(0, 8);

  return { query, hits };
}

export function formatObservation(query: string, hits: SearchHit[]) {
  if (hits.length === 0) return `No results found for "${query}".`;
  return hits
    .map((h, i) => `[${i + 1}] (${h.source}) ${h.title}\n${h.snippet}\nURL: ${h.url}`)
    .join("\n\n");
}
