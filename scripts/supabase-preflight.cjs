const fs = require("node:fs");
const path = require("node:path");
const { parseEnv } = require("node:util");
const postgres = require("postgres");

let environment;
try {
  environment = parseEnv(
    fs.readFileSync(path.resolve(__dirname, "..", ".env"), "utf8"),
  );
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  console.error("Missing .env file. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

const supabaseDatabaseUrl = environment.SUPABASE_DB_URL;
const supabaseUrl = environment.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = environment.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabaseSecretKey = environment.SUPABASE_SECRET_KEY;
const supabaseUserJwt = environment.SUPABASE_USER_JWT;
const supabaseUserEmail = environment.SUPABASE_USER_EMAIL;
const supabaseUserPassword = environment.SUPABASE_USER_PASSWORD;

const missingVariables = [
  ["SUPABASE_DB_URL", supabaseDatabaseUrl],
  ["EXPO_PUBLIC_SUPABASE_URL", supabaseUrl],
  ["EXPO_PUBLIC_SUPABASE_ANON_KEY", supabaseAnonKey],
]
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (
  !supabaseUserJwt &&
  !(supabaseUserEmail && supabaseUserPassword) &&
  !(supabaseSecretKey && supabaseUserEmail)
) {
  missingVariables.push(
    "SUPABASE_USER_JWT (or SUPABASE_USER_EMAIL with SUPABASE_USER_PASSWORD or SUPABASE_SECRET_KEY)",
  );
}

if (missingVariables.length > 0) {
  console.error(
    `Missing environment variables: ${missingVariables.join(", ")}`,
  );
  process.exit(1);
}

const supabase = postgres(supabaseDatabaseUrl, {
  ssl: "require",
  max: 1,
  connect_timeout: 10,
});

const targetTables = [
  "pieces",
  "fits",
  "inspo",
  "wants",
  "settings",
  "outfits",
  "preferences",
  "user_profile",
  "style_assessments",
];

const pieceColumns = [
  "id",
  "name",
  "category",
  "color",
  "material",
  "vibe",
  "seasons",
  "image",
  "added",
];

function isImageBytes(buffer) {
  if (buffer.length < 4) return false;
  return (
    (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
    (buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47) ||
    buffer.subarray(0, 4).toString("ascii") === "GIF8" ||
    (buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP")
  );
}

function classifyImage(value) {
  if (typeof value !== "string" || value.trim() === "") return "empty";

  const image = value.trim();
  const dataUrlMatch = image.match(
    /^data:image\/(?:avif|gif|jpe?g|png|webp);base64,([a-z0-9+/=\s]+)$/i,
  );
  if (dataUrlMatch) return "base64";

  if (/^https?:\/\//i.test(image)) return "url";

  const compact = image.replace(/\s/g, "");
  if (
    compact.length >= 16 &&
    compact.length % 4 === 0 &&
    /^[a-z0-9+/]+={0,2}$/i.test(compact)
  ) {
    try {
      if (isImageBytes(Buffer.from(compact, "base64"))) return "base64";
    } catch {
      // Fall through to path classification.
    }
  }

  return "storage_path";
}

function imageClassification(rows) {
  return rows.reduce(
    (counts, row) => {
      counts[classifyImage(row.image)] += 1;
      return counts;
    },
    { base64: 0, storage_path: 0, url: 0, empty: 0 },
  );
}

function comparePieceIds(sourceRows, targetRows) {
  const source = new Set(sourceRows.map((row) => String(row.id)));
  const target = new Set(targetRows.map((row) => String(row.id)));
  const missingFromAuthenticatedClient = [...source].filter(
    (id) => !target.has(id),
  );
  const unexpectedForAuthenticatedClient = [...target].filter(
    (id) => !source.has(id),
  );

  return {
    source_count: source.size,
    target_count: target.size,
    ids_match:
      missingFromAuthenticatedClient.length === 0 &&
      unexpectedForAuthenticatedClient.length === 0,
    missing_from_authenticated_client: missingFromAuthenticatedClient,
    unexpected_for_authenticated_client: unexpectedForAuthenticatedClient,
  };
}

function decodeJwtClaims(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new Error("SUPABASE_USER_JWT is not a valid JWT");
  }
}

async function getUserJwt() {
  if (supabaseUserJwt) return supabaseUserJwt;

  if (supabaseSecretKey && supabaseUserEmail) {
    const generateResponse = await fetch(
      `${supabaseUrl.replace(/\/$/, "")}/auth/v1/admin/generate_link`,
      {
        method: "POST",
        headers: {
          apikey: supabaseSecretKey,
          Authorization: `Bearer ${supabaseSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "magiclink",
          email: supabaseUserEmail,
        }),
      },
    );
    const generatedLink = await generateResponse.json();
    if (!generateResponse.ok || !generatedLink.hashed_token) {
      throw new Error(
        `Supabase admin user-token generation failed (${generateResponse.status})`,
      );
    }

    const verifyResponse = await fetch(
      `${supabaseUrl.replace(/\/$/, "")}/auth/v1/verify`,
      {
        method: "POST",
        headers: {
          apikey: supabaseAnonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "magiclink",
          token_hash: generatedLink.hashed_token,
        }),
      },
    );
    const verifiedSession = await verifyResponse.json();
    if (!verifyResponse.ok || !verifiedSession.access_token) {
      throw new Error(
        `Supabase user-token verification failed (${verifyResponse.status})`,
      );
    }
    return verifiedSession.access_token;
  }

  const response = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: supabaseUserEmail,
        password: supabaseUserPassword,
      }),
    },
  );
  const body = await response.json();
  if (!response.ok || !body.access_token) {
    throw new Error(`Supabase sign-in failed (${response.status})`);
  }
  return body.access_token;
}

async function fetchAuthenticatedPieces(userJwt) {
  const response = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/rest/v1/pieces?select=${pieceColumns.join(",")}`,
    {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${userJwt}`,
        Prefer: "count=exact",
        Range: "0-999",
      },
    },
  );
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Authenticated pieces query failed (${response.status})`);
  }

  const contentRange = response.headers.get("content-range");
  const exactCount = Number(contentRange?.split("/")[1]);
  return {
    rows: body,
    exactCount: Number.isFinite(exactCount) ? exactCount : null,
  };
}

async function run() {
  const targetPieces = await supabase`
    select id, name, category, color, material, vibe, seasons, image, added
    from public.pieces
    order by id
  `;

  const tables = await supabase`
    select
      c.relname as table_name,
      c.relrowsecurity as rls_enabled,
      c.relforcerowsecurity as rls_forced
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
    order by c.relname
  `;

  const policies = await supabase`
    select tablename, cmd
    from pg_policies
    where schemaname = 'public'
    order by tablename, cmd
  `;

  const userIdForeignKeys = await supabase`
    select
      source_ns.nspname as table_schema,
      source.relname as table_name,
      attribute.attname as column_name,
      constraint_record.conname as constraint_name,
      target_ns.nspname as referenced_schema,
      target.relname as referenced_table,
      case constraint_record.confdeltype
        when 'a' then 'NO ACTION'
        when 'r' then 'RESTRICT'
        when 'c' then 'CASCADE'
        when 'n' then 'SET NULL'
        when 'd' then 'SET DEFAULT'
      end as on_delete
    from pg_constraint constraint_record
    join pg_class source on source.oid = constraint_record.conrelid
    join pg_namespace source_ns on source_ns.oid = source.relnamespace
    join pg_class target on target.oid = constraint_record.confrelid
    join pg_namespace target_ns on target_ns.oid = target.relnamespace
    join lateral unnest(constraint_record.conkey) as key(attnum) on true
    join pg_attribute attribute
      on attribute.attrelid = source.oid and attribute.attnum = key.attnum
    where constraint_record.contype = 'f'
      and source_ns.nspname = 'public'
      and attribute.attname = 'user_id'
    order by source.relname, constraint_record.conname
  `;

  const buckets = await supabase`
    select id, name, public
    from storage.buckets
    order by id
  `;

  const [{ count: authUserCount }] = await supabase`
    select count(*)::integer as count
    from auth.users
  `;

  const existingTables = new Set(tables.map((row) => row.table_name));
  const missingTargetTables = targetTables.filter(
    (tableName) => !existingTables.has(tableName),
  );
  const targetCounts = {};
  for (const tableName of targetTables) {
    if (!existingTables.has(tableName)) continue;
    const [{ count }] = await supabase.unsafe(
      `select count(*)::integer as count from public.${tableName}`,
    );
    targetCounts[tableName] = count;
  }

  const userJwt = await getUserJwt();
  const authenticatedPieces = await fetchAuthenticatedPieces(userJwt);
  const authenticatedComparison = comparePieceIds(
    targetPieces,
    authenticatedPieces.rows,
  );
  const jwtClaims = decodeJwtClaims(userJwt);

  console.log(
    JSON.stringify(
      {
        piece_count: targetPieces.length,
        image_classification: imageClassification(targetPieces),
        authenticated_rls_check: {
          jwt_role: jwtClaims.role || null,
          jwt_subject_present: Boolean(jwtClaims.sub),
          jwt_expired:
            typeof jwtClaims.exp === "number"
              ? jwtClaims.exp <= Math.floor(Date.now() / 1000)
              : null,
          exact_count: authenticatedPieces.exactCount,
          returned_count: authenticatedPieces.rows.length,
          matches_sql_visible_rows: authenticatedComparison,
        },
        user_id_foreign_keys: userIdForeignKeys,
        table_rls: tables.filter((row) =>
          targetTables.includes(row.table_name),
        ),
        policy_commands: policies.reduce((commands, policy) => {
          commands[policy.tablename] ??= [];
          if (!commands[policy.tablename].includes(policy.cmd)) {
            commands[policy.tablename].push(policy.cmd);
          }
          return commands;
        }, {}),
        missing_target_tables: missingTargetTables,
        buckets,
        auth_user_count: authUserCount,
        target_counts: targetCounts,
      },
      null,
      2,
    ),
  );
}

run()
  .catch((error) => {
    console.error(
      "PREFLIGHT_FAILED",
      error.message || error.code || error.name,
    );
    process.exitCode = 1;
  })
  .finally(() => supabase.end());
