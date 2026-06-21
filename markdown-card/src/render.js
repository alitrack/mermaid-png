
const { renderMarkdown } = require("marknative");
const fs = require("fs");

const md = fs.readFileSync("/tmp/marknative-test/test2.md", "utf-8");

(async () => {
  try {
    const pages = await renderMarkdown(md);
    console.log("Pages:", pages.length);
    for (let i = 0; i < pages.length; i++) {
      const out = `/tmp/wechat-publisher/marknative-page-${i+1}.png`;
      fs.writeFileSync(out, pages[i].data);
      console.log(`  Page ${i+1}: ${pages[i].format} -> ${out} (${pages[i].data.length} bytes)`);
    }
  } catch (e) {
    console.error("ERROR:", e.message);
  }
})();
