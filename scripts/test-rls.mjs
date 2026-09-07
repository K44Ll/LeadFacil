import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { createDatabaseClient } from "./db-client.mjs";
const client = createDatabaseClient();
try {
  await client.connect();
  await client.query("begin");
  const userA = randomUUID(),
    userB = randomUUID(),
    leadA = randomUUID(),
    leadB = randomUUID(),
    listB = randomUUID();
  await client.query("insert into auth.users(id) values($1),($2)", [
    userA,
    userB,
  ]);
  await client.query(
    "insert into public.leads(id,user_id,company_name,source,source_id) values($1,$2,'Teste A','test','a'),($3,$4,'Teste B','test','b')",
    [leadA, userA, leadB, userB],
  );
  await client.query(
    "insert into public.lists(id,user_id,name) values($1,$2,'Lista B')",
    [listB, userB],
  );
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claim.sub',$1,true)", [
    userA,
  ]);
  const rows = await client.query("select id from public.leads");
  assert.deepEqual(
    rows.rows.map((row) => row.id),
    [leadA],
  );
  console.log("PASS: usuário A só lê seus próprios leads.");
  await client.query("select public.crm_mutate($1::jsonb)", [
    JSON.stringify({ type: "status", ids: [leadA], status: "Interessado" }),
  ]);
  const own = await client.query(
    "select status from public.leads where id=$1",
    [leadA],
  );
  assert.equal(own.rows[0].status, "Interessado");
  const history = await client.query(
    "select count(*)::int as count from public.interactions where lead_id=$1 and observation like 'Status alterado%'",
    [leadA],
  );
  assert.equal(history.rows[0].count, 1);
  console.log("PASS: alteração de status e histórico são persistidos juntos.");
  await client.query("select public.crm_save_search($1::jsonb,$2::jsonb)", [
    JSON.stringify([
      {
        id: randomUUID(),
        company_name: "Teste A",
        category: "Barbearia",
        description: "",
        address: "Rua de Teste, 10",
        neighborhood: "Centro",
        city: "Teresópolis",
        state: "RJ",
        country: "Brasil",
        source: "test",
        source_id: "a",
        sources: ["test", "website"],
        phone: "+552122223333",
        google_maps_url: "https://www.google.com/maps/search/?api=1&query=Teste%20A",
        confidence: {
          phone: { value: "+552122223333", confidence: 0.98, source: "website" },
        },
        enrichment_confidence: 0.98,
        last_enriched_at: new Date().toISOString(),
        analysis: { mode: "unavailable" },
        score: 50,
        is_active: true,
        score_factors: [],
      },
    ]),
    JSON.stringify({
      id: randomUUID(),
      niche: "Barbearias",
      location: "Teresópolis, RJ, Brasil",
      quantity: 10,
      status: "completed",
      provider: "test",
    }),
  ]);
  const deduplicated = await client.query(
    "select count(*)::int as count,max(phone) as phone,max(status) as status from public.leads where source='test' and source_id='a'",
  );
  assert.equal(deduplicated.rows[0].count, 1);
  assert.equal(deduplicated.rows[0].phone, "+552122223333");
  assert.equal(deduplicated.rows[0].status, "Interessado");
  console.log("PASS: duplicata enriquece o lead existente e preserva o pipeline.");
  for (const [name, query, params] of [
    [
      "bloqueia mudança no lead de outro usuário",
      "select public.crm_mutate($1::jsonb)",
      [JSON.stringify({ type: "status", ids: [leadB], status: "Fechado" })],
    ],
    [
      "bloqueia associação à lista de outro usuário",
      "insert into public.lead_lists(lead_id,list_id,user_id) values($1,$2,$3)",
      [leadA, listB, userA],
    ],
    [
      "bloqueia troca de proprietário",
      "update public.leads set user_id=$1 where id=$2",
      [userB, leadA],
    ],
  ]) {
    await client.query("savepoint security_test");
    let blocked = false;
    try {
      await client.query(query, params);
    } catch {
      blocked = true;
      await client.query("rollback to savepoint security_test");
    }
    assert.equal(blocked, true, name);
    console.log(`PASS: ${name}.`);
  }
  await client.query("select public.crm_mutate($1::jsonb)", [
    JSON.stringify({
      type: "profile",
      name: "Pessoa de teste",
      avatar_url: "",
    }),
  ]);
  await client.query("select public.crm_mutate($1::jsonb)", [
    JSON.stringify({ type: "create_list", name: "Lista A", description: "" }),
  ]);
  const listA = (await client.query("select id from public.lists")).rows[0].id;
  await client.query("select public.crm_mutate($1::jsonb)", [
    JSON.stringify({
      type: "list_membership",
      ids: [leadA],
      list_id: listA,
      remove: false,
    }),
  ]);
  assert.equal(
    (await client.query("select count(*)::int as count from public.lead_lists"))
      .rows[0].count,
    1,
  );
  console.log("PASS: perfil, lista e associação do próprio usuário.");
  await client.query("set local role anon");
  await client.query("savepoint anon_test");
  let anonBlocked = false;
  try {
    await client.query("select * from public.leads");
  } catch {
    anonBlocked = true;
    await client.query("rollback to savepoint anon_test");
  }
  assert.equal(anonBlocked, true);
  console.log("PASS: acesso anônimo bloqueado.");
  await client.query("rollback");
  console.log(
    "Dados temporários revertidos. Nenhum usuário ou lead de teste foi mantido.",
  );
} catch (error) {
  await client.query("rollback").catch(() => {});
  console.error("Teste falhou.", { code: error.code, message: error.message });
  process.exitCode = 1;
} finally {
  await client.end();
}
