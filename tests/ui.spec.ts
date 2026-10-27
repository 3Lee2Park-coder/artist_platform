import { expect, test } from "@playwright/test";

test("홈이 열리고 이동 메뉴가 보인다", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.locator("main")).toBeVisible();
  if (testInfo.project.name === "mobile") {
    await expect(page.getByRole("navigation", { name: "모바일 하단 메뉴" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "모바일 하단 메뉴" }).getByRole("link", { name: "홈" })).toBeVisible();
  } else {
    await expect(page.getByRole("link", { name: /OOOF/ }).first()).toBeVisible();
  }
});

test("전시 목록에 예정 필터가 있다", async ({ page }) => {
  await page.goto("/exhibitions");
  await expect(page.getByRole("heading", { name: "이번에 찾아낸 전시" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "예정" })).toBeVisible();
  await page.getByRole("tab", { name: "예정" }).click();
  await expect(page.getByRole("tab", { name: "예정" })).toHaveAttribute("aria-selected", "true");
});

test("전시 상세는 있는 전시로 들어가고 없는 전시는 404다", async ({ page }) => {
  await page.goto("/exhibitions");
  const card = page.locator("a[href^='/exhibitions/']").first();
  await expect(card).toBeVisible();
  const href = await card.getAttribute("href");
  expect(href).toBeTruthy();
  await page.goto(href!);
  await expect(page.locator("h1")).toBeVisible();

  await page.goto("/exhibitions/this-show-does-not-exist-404");
  await expect(page.getByRole("heading", { name: "페이지를 찾을 수 없습니다" })).toBeVisible();
});
