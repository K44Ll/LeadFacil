import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { createDatabaseClient } from "../../scripts/db-client.mjs";

test("private routes require real authentication; login, signup and recovery are accessible", async ({
  page,
}) => {
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
    await expect(page).toHaveURL(/localhost:\d+\/$/);
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
      page.getByText("Conecte uma fonte para começar"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Buscar Leads", exact: true }),
    ).toBeDisabled();
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
