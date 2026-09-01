/*
  Static check on the app's routing, run without a device or a bundler.

  Two classes of bug live here and neither shows up until someone taps the wrong
  thing on a handset:

    1. A screen inside Social sending people out of Social. The footers each
       hardcoded "HomeScreen" -- the module chooser -- so a Home tap from the
       timeline, or from the messenger reached through Social's inbox, dropped
       you outside the module you were using.

    2. A navigate() to a route that was never registered. `navigate("Dashboard")`
       ran as the finish-and-close callback of the reel composer for as long as
       anyone can tell; there is no route by that name, so posting a reel left
       you stuck on the create screen with an error in the log.

  Both are invisible to the type checker (route names are strings) and to the
  existing jest suite (which does not currently run at all -- React Native
  modules are not transformed).

  Run from the mobile directory:  node scripts/check-social-routes.mjs
*/

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SRC = join(ROOT, "src");

let pass = 0, failed = 0;
const failures = [];
const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { failed++; failures.push(name); console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
};
const section = (t) => console.log(`\n${"=".repeat(64)}\n${t}\n${"=".repeat(64)}`);

const CODE = /\.(js|jsx|ts|tsx)$/;
const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (CODE.test(entry)) out.push(full);
  }
  return out;
};
const read = (p) => readFileSync(p, "utf8");
const rel = (p) => relative(ROOT, p).split(sep).join("/");

/*
  Files that are "inside Social" for the purposes of this check.

  The messenger and its footer count: Social's top-bar message icon and the
  Inbox button on the profile both open ChatScreen, so it is reached from
  inside the module even though it lives in its own folder.
*/
const socialFiles = [
  ...walk(join(SRC, "screens", "social")),
  join(SRC, "screens", "whatsapps", "Footer.tsx"),
  join(SRC, "component", "food", "CustomTabBar.tsx"),
].filter((f) => !/ copy\.|\.txt$/i.test(f));

/* Copies kept beside the real files ("MyProfile copy.js") are not wired into
   the navigator and are excluded rather than reported forever. */
const liveSocialFiles = socialFiles.filter((f) => !/copy/i.test(f));

section("1. Home lands inside Social");

const homeRoute = read(join(SRC, "navigation", "homeRoute.ts"));
check(
  "homeRoute.ts exists and declares HUB_ENABLED",
  /export const HUB_ENABLED\s*=/.test(homeRoute)
);
check(
  "the hub is switched off for phase one",
  /export const HUB_ENABLED\s*=\s*false/.test(homeRoute),
  "HUB_ENABLED is true — the app will open on the module chooser again"
);
check(
  "HOME_ROUTE resolves to HomeSocial while the hub is off",
  /HUB_ENABLED \? 'HomeScreen' : 'HomeSocial'/.test(homeRoute)
);

const first = read(join(SRC, "screens", "FirstScreen.tsx"));
check(
  "a returning user is sent to HOME_ROUTE, not a hardcoded screen",
  /routes: \[\{ name: HOME_ROUTE as never \}\]/.test(first),
  "FirstScreen still names a screen directly"
);
check(
  "FirstScreen resets rather than pushes",
  /navigation\.reset\(/.test(first)
);

section("2. Nothing inside Social escapes to the hub");

const escapes = [];
for (const file of liveSocialFiles) {
  const src = read(file);
  src.split("\n").forEach((line, i) => {
    if (/navigate\(\s*["']HomeScreen["']/.test(line)) {
      escapes.push(`${rel(file)}:${i + 1}`);
    }
  });
}
check(
  "no navigate(\"HomeScreen\") anywhere inside Social",
  escapes.length === 0,
  escapes.join("\n        ")
);

for (const [label, file] of [
  ["the Social footer", join(SRC, "screens", "social", "Footerpage.tsx")],
  ["the messenger footer", join(SRC, "screens", "whatsapps", "Footer.tsx")],
  ["the food tab bar", join(SRC, "component", "food", "CustomTabBar.tsx")],
]) {
  const src = read(file);
  check(`${label} routes Home through HOME_ROUTE`, /navigate\(HOME_ROUTE\)/.test(src));
  check(`${label} imports HOME_ROUTE`, /from ['"].*navigation\/homeRoute['"]/.test(src));
}

section("3. Signing out goes to the sign-in screen");

const myProfile = read(join(SRC, "screens", "social", "profile", "MyProfile.js"));
check(
  "logout resets to AuthScreen",
  /routes: \[\{ name: "AuthScreen" \}\]/.test(myProfile),
  "a signed-out person would land on the timeline"
);
check(
  "logout does not route through a home screen",
  !/navigate\(\s*["']HomeScreen["']/.test(myProfile)
);

section("4. Every route Social navigates to is registered");

const navigator = read(join(SRC, "navigation", "StackNavigator.tsx"));
const registered = new Set(
  [...navigator.matchAll(/<Stack\.Screen\s+[^>]*name=["']([A-Za-z0-9_]+)["']/g)].map((m) => m[1])
);
check("the navigator registers a plausible number of screens", registered.size > 50, `${registered.size} found`);

/* The hub is parked, not deleted: still registered so a stray navigation to it
   is a working screen rather than a crash, and so it can still be worked on. */
check("the hub is still registered (parked, not removed)", registered.has("HomeScreen"));
check("the hub is annotated as parked", /PARKED, not removed/.test(navigator));
check("HomeSocial is registered", registered.has("HomeSocial"));
check("MyWall is registered", registered.has("MyWall"));

const unknown = new Map();
for (const file of liveSocialFiles) {
  const src = read(file);
  src.split("\n").forEach((line, i) => {
    for (const m of line.matchAll(/navigate\(\s*["']([A-Za-z0-9_]+)["']/g)) {
      const target = m[1];
      if (registered.has(target)) continue;
      if (!unknown.has(target)) unknown.set(target, []);
      unknown.get(target).push(`${rel(file)}:${i + 1}`);
    }
  });
}
check(
  "Social never navigates to an unregistered route",
  unknown.size === 0,
  [...unknown.entries()].map(([t, where]) => `${t} <- ${where.join(", ")}`).join("\n        ")
);

section("5. The composers land somewhere real");

for (const [label, file] of [
  ["the reel composer", join(SRC, "screens", "social", "reel", "create", "NewReels.js")],
  ["the story composer", join(SRC, "screens", "social", "story", "create", "CreateStory.js")],
]) {
  const src = read(file);
  check(`${label} no longer targets "Dashboard"`, !/navigate\(\s*["']Dashboard["']/.test(src));
  check(`${label} finishes on HOME_ROUTE`, /name: HOME_ROUTE/.test(src));
}

console.log(`\n${"=".repeat(64)}`);
console.log(`  ${pass} passed, ${failed} failed`);
if (failures.length) console.log(`  failing: ${failures.join(", ")}`);
console.log("=".repeat(64));
process.exitCode = failed ? 1 : 0;
