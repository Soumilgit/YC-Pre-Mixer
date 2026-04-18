export async function GET() {
  return Response.json({
    status: "ok",
    api_key_configured: !!process.env.GEMINI_API_KEY,
    neo4j_configured: !!(
      process.env.NEO4J_URI &&
      process.env.NEO4J_USER &&
      process.env.NEO4J_PASSWORD
    ),
  });
}
