import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { createDatabaseClient } from "../../scripts/db-client.mjs";

test("private routes require real authentication; login, signup and recovery are accessible", async ({
  page,
}) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  for (const path of [
    "/",
    "/leads",
    "/pipeline",
    "/listas",
    "/historico",
    "/configuracoes",
    "/buscar",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: "Bom ter você por aqui." }),
    ).toBeVisible();
  }
  expect((await page.request.post("/api/search", { data: {} })).status()).toBe(
    401,
  );
  expect(
    (
      await page.request.post("/api/ai/outreach", {
        data: { lead_id: randomUUID(), channel: "whatsapp" },
      })
    ).status(),
  ).toBe(401);
  await expect(page.getByText(/demonstração/i)).toHaveCount(0);
  for (const [name, id] of [
    ["Light", "light"],
    ["Dark", "dark"],
    ["OLED", "oled"],
    ["Neon", "neon"],
    ["Tokyo Night", "tokyo"],
    ["Miami Vibe", "miami"],
  ]) {
    await page.getByRole("button", { name: "Alterar tema" }).click();
    await page.getByRole("menuitem", { name, exact: true }).click();
    await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${id}\\b`));
    await page.screenshot({
      path: `artifacts/verification/login-${id}.png`,
      caret: "initial",
      fullPage: true,
    });
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      ),
      JSON.stringify(
        result.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
      ),
    ).toEqual([]);
  }
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/\bmiami\b/);
  await page.getByRole("link", { name: "Comece por aqui" }).click();
  await expect(
    page.getByRole("heading", { name: "Novas conexões começam aqui." }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Seu nome" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Criar minha conta" }),
  ).toBeVisible();
  await page.goto("/recuperar-senha");
  await expect(
    page.getByRole("button", { name: "Enviar link de recuperação" }),
  ).toBeVisible();
  await page.goto("/auth/confirm?token_hash=invalid&type=invalid");
  await expect(page).toHaveURL(/\/login\?error=link/);
  await expect(
    page.getByText("Este link expirou ou é inválido.", { exact: false }),
  ).toBeVisible();
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/verification/login-${width}.png`,
      caret: "initial",
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});

test("real Supabase login, empty workspace, persisted profile/lists/tags, themes and logout", async ({
  page,
}) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const db = createDatabaseClient();
  await db.connect();
  const userId = randomUUID();
  const email = `e2e-${userId}@example.test`;
  const password = `Lf!${randomUUID()}7a`;
  try {
    await db.query(
      "insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change) values('00000000-0000-0000-0000-000000000000',$1,'authenticated','authenticated',$2,extensions.crypt($3,extensions.gen_salt('bf')),now(),'{\"provider\":\"email\",\"providers\":[\"email\"]}','{\"name\":\"Teste de autenticação\"}',now(),now(),'','','','')",
      [userId, email, password],
    );
    await db.query(
      "insert into auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at) values($1::text,$1::uuid,jsonb_build_object('sub',$1::text,'email',$2::text,'email_verified',true),'email',now(),now())",
      [userId, email],
    );
    await page.goto("/login");
    await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
    await page.getByLabel("Senha", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Entrar no workspace" }).click();
    await expect(page).toHaveURL(/localhost:\d+\/$/, { timeout: 60000 });
    await expect(
      page.getByRole("heading", { name: /Olá, Teste/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Você ainda não possui leads." }),
    ).toBeVisible();
    await page.screenshot({
      path: "artifacts/verification/dashboard-empty.png",
      fullPage: true,
    });
    await page.goto("/leads");
    await expect(
      page.getByRole("heading", { name: "Você ainda não possui leads." }),
    ).toBeVisible();
    await page.goto("/pipeline");
    await expect(
      page.getByRole("heading", { name: "Seu pipeline está vazio." }),
    ).toBeVisible();
    await page.goto("/buscar");
    await expect(
      page.getByRole("heading", { name: "Defina sua próxima oportunidade" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Buscar leads", exact: true }),
    ).toBeEnabled();
    await page.goto("/configuracoes#ia");
    await expect(page.getByRole("radio", { name: /Groq/ })).toBeVisible();
    await expect(page.getByRole("radio", { name: /Ollama local/ })).toBeVisible();
    await page.getByRole("radio", { name: /^OpenAI\b/ }).click();
    await page.getByRole("combobox", { name: /Modelo/ }).fill("gpt-5-mini");
    await page
      .getByLabel("Chave da API da OpenAI")
      .fill("sk-chave-pessoal-de-teste");
    await expect(page.getByText("API pessoal configurada")).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("radio", { name: /^OpenAI\b/ }),
    ).toBeChecked();
    await expect(page.getByRole("combobox", { name: /Modelo/ })).toHaveValue(
      "gpt-5-mini",
    );
    await expect(page.getByLabel("Chave da API da OpenAI")).toHaveValue(
      "sk-chave-pessoal-de-teste",
    );
    await page.getByRole("radio", { name: /Groq/ }).click();
    await expect(page.getByRole("combobox", { name: /Modelo/ })).toHaveValue(
      "llama-3.3-70b-versatile",
    );
    await page
      .getByLabel("Chave da API da Groq")
      .fill("gsk-chave-pessoal-de-teste");
    await page.getByRole("radio", { name: /Ollama local/ }).click();
    await expect(page.getByText("Sem chave de API")).toBeVisible();
    await expect(page.getByText("API pessoal configurada")).toBeVisible();
    await page.getByRole("radio", { name: /^OpenAI\b/ }).click();
    await expect(page.getByLabel("Chave da API da OpenAI")).toHaveValue(
      "sk-chave-pessoal-de-teste",
    );
    const aiSettingsAccessibility = await new AxeBuilder({ page })
      .include("#ia")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      aiSettingsAccessibility.violations.filter(
        (violation) =>
          violation.impact === "critical" || violation.impact === "serious",
      ),
      JSON.stringify(aiSettingsAccessibility.violations),
    ).toEqual([]);
    const leadId = randomUUID();
    await db.query(
      "insert into public.leads(id,user_id,company_name,category,description,city,state,phone,whatsapp,website,domain,instagram,google_rating,review_count,source,source_id,notes) values($1,$2,'Academia StrongFit','Academia','Academia local com presença digital ativa.','Teresópolis','RJ','+552122223333','+5521999998888','https://strongfit.example','strongfit.example','https://instagram.com/strongfit',4.8,127,'e2e','strongfit','Contato interessado em crescimento digital.')",
      [leadId, userId],
    );
    let generatedRequests = 0;
    let outreachPayload: Record<string, unknown> | undefined;
    await page.route("**/api/ai/outreach", async (route) => {
      generatedRequests += 1;
      outreachPayload = route.request().postDataJSON() as Record<
        string,
        unknown
      >;
      await new Promise((resolve) => setTimeout(resolve, 250));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          text:
            generatedRequests === 1
              ? "Oi! Vi que a StrongFit tem uma presença digital ativa. Trabalho com sites para academias e posso te mostrar uma ideia rápida para facilitar novos agendamentos."
              : "A StrongFit já conversa com bastante gente online. Posso montar uma sugestão curta de site para transformar esse interesse em agendamentos?",
          model: "modelo-de-teste",
        }),
      });
    });
    await page.goto(`/leads/${leadId}`);
    await page.getByRole("button", { name: "Gerar abordagem com IA" }).click();
    await expect(
      page.getByRole("heading", { name: "Chegador na Empresa" }),
    ).toBeVisible();
    await expect(page.getByText("Academia StrongFit").first()).toBeVisible();
    await expect(page.getByText("strongfit.example").first()).toBeVisible();
    await page
      .getByRole("textbox", { name: "Serviço que você oferece" })
      .fill("criação de sites para academias");
    await page.getByRole("radio", { name: /Especialista/ }).click();
    await page.getByRole("radio", { name: /Amigável/ }).click();
    await page.getByRole("button", { name: /Adicionar contexto/ }).click();
    await page
      .getByRole("textbox", { name: "Contexto adicional para a abordagem" })
      .fill("Quero oferecer um fluxo simples de agendamento online.");
    await page.getByRole("button", { name: "Gerar agora" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Criando uma abordagem para Academia StrongFit...",
      }),
    ).toBeVisible();
    await expect(page.getByText("Sua abordagem está pronta")).toBeVisible();
    const outreachAccessibility = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      outreachAccessibility.violations.filter(
        (violation) =>
          violation.impact === "critical" || violation.impact === "serious",
      ),
      JSON.stringify(outreachAccessibility.violations),
    ).toEqual([]);
    await page.screenshot({
      path: "artifacts/verification/chegador-desktop.png",
      fullPage: true,
    });
    expect(outreachPayload).toMatchObject({
      lead_id: leadId,
      offered_service: "criação de sites para academias",
      personality: "specialist",
      tone: "friendly",
      length: "short",
      ai: {
        provider: "openai",
        model: "gpt-5-mini",
        api_key: "sk-chave-pessoal-de-teste",
      },
    });
    await page.getByRole("button", { name: "Editar" }).click();
    await page
      .getByRole("textbox", { name: "Editar abordagem gerada" })
      .fill("Mensagem ajustada manualmente.");
    await page.getByRole("button", { name: "Concluir" }).click();
    await expect(
      page.getByText("Mensagem ajustada manualmente."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Gerar novamente" }).click();
    await expect(
      page.getByText("A StrongFit já conversa com bastante gente online."),
    ).toBeVisible();
    expect(outreachPayload).toMatchObject({
      previous_message: "Mensagem ajustada manualmente.",
    });
    await page.setViewportSize({ width: 375, height: 800 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "artifacts/verification/chegador-mobile.png",
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await page.unroute("**/api/ai/outreach");
    expect(
      (
        await page.request.post("/api/ai/outreach", {
          data: { ...validOutreachPayload(leadId), tone: "aggressive" },
        })
      ).status(),
    ).toBe(400);
    await page.getByRole("button", { name: "Remover lead" }).click();
    await expect(
      page.getByRole("heading", { name: "Remover “Academia StrongFit”?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Excluir lead" }).click();
    await expect(page).toHaveURL(/\/leads$/);
    await expect(
      page.getByRole("heading", { name: "Você ainda não possui leads." }),
    ).toBeVisible();
    await page.goto("/listas?nova=1");
    await page
      .getByRole("textbox", { name: "Nome da lista" })
      .fill("Próximos contatos");
    await page
      .getByRole("textbox", { name: "Descrição", exact: true })
      .fill("Lista criada no teste de persistência");
    await page
      .getByRole("button", { name: "Criar lista", exact: true })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Próximos contatos", exact: true }),
    ).toBeVisible();
    await page.goto("/configuracoes");
    await page
      .getByRole("textbox", { name: "Nome", exact: true })
      .fill("Perfil verificado");
    await page.getByRole("button", { name: "Salvar perfil" }).click();
    await expect(page.getByText("Alterações salvas.").first()).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("textbox", { name: "Nome", exact: true }),
    ).toHaveValue("Perfil verificado");
    await page
      .getByRole("textbox", { name: "Nome da nova tag" })
      .fill("Prospectar");
    await page.getByRole("button", { name: "Criar tag", exact: true }).click();
    await expect(page.getByText("Prospectar", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Remover" }).click();
    await expect(
      page.getByText("Não configurada", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Chave da API da OpenAI")).toHaveValue("");
    for (const [name, id] of [
      ["Light", "light"],
      ["Dark", "dark"],
      ["OLED", "oled"],
      ["Neon", "neon"],
      ["Tokyo Night", "tokyo"],
      ["Miami Vibe", "miami"],
    ]) {
      await page.getByRole("button", { name: new RegExp(`^${name} `) }).click();
      await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${id}\\b`));
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        result.violations.filter(
          (v) => v.impact === "critical" || v.impact === "serious",
        ),
        JSON.stringify(
          result.violations.map((v) => ({
            id: v.id,
            targets: v.nodes.map((n) => n.target),
          })),
        ),
      ).toEqual([]);
    }
    await page.evaluate(() => document.dispatchEvent(new Event("keydown")));
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page
      .getByPlaceholder("O que você está procurando?")
      .fill("Próximos contatos");
    await expect(
      page.getByRole("option", { name: "Próximos contatos" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      if (width === 375) {
        await page.getByRole("button", { name: "Abrir menu" }).click();
        await page
          .getByRole("navigation", { name: "Navegação mobile" })
          .getByRole("link", { name: "Leads 0", exact: true })
          .click();
        await expect(
          page.getByRole("heading", { name: "Seus próximos clientes" }),
        ).toBeVisible();
      }
    }
    await page.getByRole("button", { name: "Menu da conta" }).click();
    await page.getByRole("menuitem", { name: "Sair", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/leads");
    await expect(page).toHaveURL(/\/login$/);
    expect(errors).toEqual([]);
  } finally {
    await db.query("delete from auth.users where id=$1 and email=$2", [
      userId,
      email,
    ]);
    await db.end();
  }
});

function validOutreachPayload(leadId: string) {
  return {
    lead_id: leadId,
    offered_service: "criação de sites",
    user_context: "",
    personality: "partner",
    tone: "friendly",
    length: "short",
  };
}
