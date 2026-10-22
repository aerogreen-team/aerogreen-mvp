const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function loadArticles() {
  const context = { window: {} };
  const vm = require("node:vm");
  vm.createContext(context);
  vm.runInContext(read("js/articles-data.js"), context);
  return context.window.VUONPHO_ARTICLES;
}

test("bài viết có sẵn có slug duy nhất và đủ trường hiển thị", () => {
  const articles = loadArticles();
  assert.equal(articles.length, 6);

  const slugs = new Set();
  for (const item of articles) {
    for (const key of ["slug", "title", "summary", "category", "cover_image", "body_html"]) {
      assert.ok(Object.hasOwn(item, key), `thiếu ${key} trong ${item.slug}`);
    }
    assert.match(item.slug, /^[a-z0-9-]+$/);
    assert.ok(!slugs.has(item.slug), `slug trùng: ${item.slug}`);
    slugs.add(item.slug);
    assert.ok(item.body_html.trim().length > 200);
    assert.ok(!/<script/i.test(item.body_html), "nội dung tĩnh không được chứa script");
    assert.ok(fs.existsSync(path.join(root, item.cover_image)), `thiếu ảnh ${item.cover_image}`);
  }
});

test("noi-dung.html có đủ vùng nội dung và nạp đúng script", () => {
  const html = read("noi-dung.html");
  for (const id of [
    "nd-title",
    "nd-hero-lead",
    "nd-filters",
    "nd-list",
    "nd-detail-section",
    "nd-body",
    "nd-related",
    "nd-state-section",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`), `thiếu #${id}`);
  }
  assert.match(html, /js\/articles-data\.js/);
  assert.match(html, /js\/content-page\.js/);
  assert.match(html, /href="noi-dung\.html"/);
});

test("các trang chính đều có liên kết Bài viết trên nav và footer", () => {
  for (const file of ["index", "about", "services", "products", "materials", "contact"]) {
    const html = read(file + ".html");
    const count = (html.match(/<a href="noi-dung\.html"[^>]*>Bài viết<\/a>/g) || []).length;
    assert.ok(count >= 2, `${file}.html cần link Bài viết ở nav desktop và mobile`);
    assert.match(
      html,
      /<li><a href="noi-dung\.html">Bài viết<\/a><\/li>/,
      `${file}.html thiếu link Bài viết trong footer`
    );
  }
});

test("CSS bài viết dùng token thiết kế hiện tại và có breakpoint", () => {
  const css = read("css/style.css");
  assert.match(css, /\.content-grid\{display:grid/);
  assert.match(css, /\.article-layout\{display:grid/);
  assert.match(css, /var\(--green-900\)/);
  assert.match(css, /@media \(max-width: 640px\)\{/);
});

test("bài so sánh dùng danh mục Kiến thức, đủ sáu tiêu chí và CTA sản phẩm", () => {
 const articles=loadArticles();assert.equal(articles.filter(a=>a.category==='kien-thuc').length,2);const article=articles.find(a=>a.slug==='so-sanh-khi-canh-thuy-canh-va-trong-dat');assert.ok(article);assert.equal(article.category,'kien-thuc');
 for(const label of ['Oxy cho rễ','Năng suất','Nước','Rủi ro lây bệnh','Chi phí đầu tư','Không gian'])assert.ok(article.body_html.includes(label));assert.equal((article.body_html.match(/scope="row"/g)||[]).length,6);assert.match(article.body_html,/href="products.html"/);assert.doesNotMatch(article.body_html,/98%|≥ 2|gấp đôi|sinh trưởng vượt trội/);for(const file of ['index.html','about.html'])assert.doesNotMatch(read(file),/<table[^>]*comparison-table/);
});
