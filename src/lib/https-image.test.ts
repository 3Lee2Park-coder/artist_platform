import assert from "node:assert/strict";
import test from "node:test";
import { upgradeImageUrl, upgradeImagesInHtml } from "./https-image";

test("upgrades culture.go.kr http image URLs", () => {
  assert.equal(
    upgradeImageUrl("http://www.culture.go.kr/a.jpg"),
    "https://www.culture.go.kr/a.jpg"
  );
  assert.equal(
    upgradeImageUrl("http://culture.go.kr/a.jpg"),
    "https://culture.go.kr/a.jpg"
  );
});

test("upgrades nlcy.go.kr http image URLs", () => {
  assert.equal(
    upgradeImageUrl("http://www.nlcy.go.kr/a.png"),
    "https://www.nlcy.go.kr/a.png"
  );
});

test("leaves unrelated hosts and https URLs alone", () => {
  assert.equal(
    upgradeImageUrl("http://example.com/a.jpg"),
    "http://example.com/a.jpg"
  );
  assert.equal(
    upgradeImageUrl("https://www.culture.go.kr/a.jpg"),
    "https://www.culture.go.kr/a.jpg"
  );
  assert.equal(upgradeImageUrl(""), undefined);
  assert.equal(upgradeImageUrl(null), undefined);
});

test("rewrites allowlisted http URLs inside HTML", () => {
  const html =
    '<p><img src="http://www.culture.go.kr/a.jpg"><img src="http://example.com/b.jpg"></p>';
  assert.equal(
    upgradeImagesInHtml(html),
    '<p><img src="https://www.culture.go.kr/a.jpg"><img src="http://example.com/b.jpg"></p>'
  );
});
