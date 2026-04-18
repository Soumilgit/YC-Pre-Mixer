const EXAMPLES = [
  {
    name: "notion-search",
    description:
      "Search Notion workspace and return summaries of top N pages",
    auth_type: "bearer",
    inputs: { query: "string", limit: "integer" },
  },
  {
    name: "github-issues",
    description: "Fetch open issues from a GitHub repo filtered by label",
    auth_type: "api_key",
    inputs: { repo: "string", label: "string" },
  },
  {
    name: "web-scraper",
    description: "Scrape a URL and return main content as clean text",
    auth_type: "none",
    inputs: { url: "string", selector: "string (optional)" },
  },
];

export async function GET() {
  return Response.json({ examples: EXAMPLES });
}
