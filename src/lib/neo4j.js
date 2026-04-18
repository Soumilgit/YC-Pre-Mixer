import neo4j from "neo4j-driver";

let driver = null;

function getDriver() {
  if (!driver) {
    const uri = process.env.NEO4J_URI;
    const user = process.env.NEO4J_USER;
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !user || !password) {
      return null;
    }

    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }
  return driver;
}

export async function storeGeneration({
  description,
  toolSpec,
  serverCode,
  configJson,
  usedFallback,
}) {
  const d = getDriver();
  if (!d) return null;

  const session = d.session();
  try {
    const result = await session.run(
      `CREATE (g:Generation {
        id: randomUUID(),
        description: $description,
        tool_name: $toolName,
        tool_spec: $toolSpec,
        server_code: $serverCode,
        config_json: $configJson,
        used_fallback: $usedFallback,
        created_at: datetime()
      }) RETURN g.id AS id`,
      {
        description,
        toolName: toolSpec?.tool_name || "unknown",
        toolSpec: JSON.stringify(toolSpec),
        serverCode,
        configJson,
        usedFallback,
      }
    );
    return result.records[0]?.get("id") || null;
  } finally {
    await session.close();
  }
}

export async function getHistory(limit = 20) {
  const d = getDriver();
  if (!d) return [];

  const session = d.session();
  try {
    const result = await session.run(
      `MATCH (g:Generation)
       RETURN g {
         .id, .description, .tool_name,
         .used_fallback, .created_at
       } AS gen
       ORDER BY g.created_at DESC
       LIMIT $limit`,
      { limit: neo4j.int(limit) }
    );
    return result.records.map((r) => {
      const gen = r.get("gen");
      return {
        id: gen.id,
        description: gen.description,
        tool_name: gen.tool_name,
        used_fallback: gen.used_fallback,
        created_at: gen.created_at?.toString() || null,
      };
    });
  } finally {
    await session.close();
  }
}

export async function getGenerationById(id) {
  const d = getDriver();
  if (!d) return null;

  const session = d.session();
  try {
    const result = await session.run(
      `MATCH (g:Generation {id: $id})
       RETURN g {
         .id, .description, .tool_name, .tool_spec,
         .server_code, .config_json, .used_fallback, .created_at
       } AS gen`,
      { id }
    );
    const gen = result.records[0]?.get("gen");
    if (!gen) return null;
    return {
      ...gen,
      tool_spec: gen.tool_spec ? JSON.parse(gen.tool_spec) : null,
      created_at: gen.created_at?.toString() || null,
    };
  } finally {
    await session.close();
  }
}
