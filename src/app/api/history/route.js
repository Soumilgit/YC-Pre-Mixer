import { getHistory, getGenerationById } from "@/lib/neo4j";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const gen = await getGenerationById(id);
    if (!gen) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return Response.json(gen);
  }

  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const history = await getHistory(limit);
  return Response.json({ generations: history });
}
