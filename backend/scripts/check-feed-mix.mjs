/*
  The timeline has to read as a timeline, not as one person'''s blog.

  Ranking used to compare relationship first and fall through to recency only
  on a tie -- a hard partition, so every post by someone you follow outranked
  every post by anyone you did not, whatever the dates. Following one prolific
  account meant sixteen of their cards in a row, two-week-old posts included,
  before another name appeared.

  Run against a server with the demo data:
    node scripts/check-feed-mix.mjs
    BASE=http://localhost:5051/apis node scripts/check-feed-mix.mjs
*/
const B = process.env.BASE || "http://localhost:5000/apis";
const VIEWERS = { Omar: "6a830332316418fdbc512052", Yusuf: "6a830332316418fdbc512054" };
let pass = 0, fail = 0;
const check = (n, c, d = "") => { if (c) { pass++; console.log("  PASS  " + n); } else { fail++; console.log("  FAIL  " + n + (d ? "  — " + d : "")); } };
const longestRun = (names) => { let best = 0, run = 0, prev = null; for (const n of names) { run = n === prev ? run + 1 : 1; prev = n; best = Math.max(best, run); } return best; };

for (const [who, id] of Object.entries(VIEWERS)) {
  /* A page is what someone actually sees. Judge that, not the whole result
     set: one account holds 16 of the 22 posts here, so once the other five
     authors are used up the tail is necessarily all theirs -- and holding
     posts back to avoid that would mean dropping them. */
  const r = await (await fetch(`${B}/postreel/lasttenpost?page=1&limit=10&userid=${id}`)).json();
  const names = (r.reels || []).map(p => p.userInfo?.name || "?");
  const distinct = new Set(names).size;
  const run = longestRun(names);

  console.log(`\n${who} — first page of 10:`);
  console.log("  " + names.join(" → "));
  check(`${who}: no author appears 3 times in a row`, run <= 2, `longest run ${run}`);
  check(`${who}: at least 3 different authors on the page`, distinct >= 3, `${distinct}`);
  check(`${who}: a full page came back`, names.length === 10, `${names.length}`);

  // and the whole set must still contain everything
  const all = await (await fetch(`${B}/postreel/lasttenpost?page=1&limit=40&userid=${id}`)).json();
  check(`${who}: nothing dropped by the reorder`, (all.reels || []).length >= 20, `${(all.reels||[]).length}`);
}

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
