import { check, parse } from "./robot";
import { db } from "../db/index";
import { site, link, term, termsOnSites } from "../db/schema"; // Import your schema
import { eq, asc, inArray, count } from "drizzle-orm";

const userAgentToken = "";
const limit = 50000;
let crawled = 0;

function logTime(event: String, start: number) {
  console.log(`${event} took ${Date.now() - start}ms`);
  start = Date.now();
}

export async function populate() {
  try {
    await db.insert(site).values([
      {
        url: "https://en.wikipedia.org/wiki/Lists_of_websites",
      },
    ]);
    console.log("Successfully populated the 'site' table.");
  } catch (error) {
    console.error("Error populating the 'site' table:", error);
  }
}

export async function start() {
  const crawledCount = await db
    .select({ count: count() })
    .from(site)
    .where(eq(site.crawled, true));

  crawled = crawledCount[0]?.count || 0;

  while (true) {
    const entries = await db
      .select()
      .from(site)
      .where(eq(site.crawled, false))
      .orderBy(asc(site.order))
      .limit(1);

    const entry = entries[0];
    if (!entry) break;

    const totalSites = await db.select({ count: count() }).from(site);
    await search(entry, (totalSites[0]?.count || 0) > limit);
  }

  const totalCount = await db.select({ count: count() }).from(site);
  console.log(totalCount[0]?.count);
}

async function search(entry: typeof site.$inferSelect, skipUrls?: boolean) {
  let start = Date.now();
  function logTime(event: string) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`${event} ${Date.now() - start}ms`);
      start = Date.now();
    }
  }

  const url = new URL(entry.url);
  console.log("crawling " + url.href);
  crawled++;

  await db.update(site).set({ crawled: true }).where(eq(site.url, url.href));

  const robots = await parse(url, userAgentToken);

  if (!check(robots)) {
    console.log("rejected by robots.txt");
    return; // not allowed to crawl here
  }

  if (url.pathname == "/") {
    if (robots?.sitemap) {
      const sitemapRaw = await fetch(robots.sitemap);
      const sitemapText = await sitemapRaw.text();
      const sitemap = Array.from(
        sitemapText.matchAll(/(?<=<loc>).*(?=<\/loc>)/g)
      ); // TODO recursively parse further sitemaps

      await db
        .insert(site)
        .values(
          sitemap.map((loc) => ({
            url: loc[0],
            crawled: false,
          }))
        )
        .onConflictDoNothing();
    }
  }

  // logTime("robots");

  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    if (!(e instanceof TypeError)) {
      throw e;
    }
    console.log("url does not exist");
    return;
  }

  // logTime("request");

  if (!res.ok) {
    console.log("erroneous response");
    return;
  }

  if (res.redirected) {
    console.log("redirected to " + res.url);

    // Check if site exists
    const existingSite = await db
      .select()
      .from(site)
      .where(eq(site.url, res.url))
      .limit(1);

    if (existingSite.length > 0) {
      // Site exists, just create link
      await db
        .insert(link)
        .values({
          incomingUrl: url.href,
          outgoingUrl: res.url,
        })
        .onConflictDoNothing();
    } else {
      // Create site and link
      await db.insert(site).values({
        url: res.url,
        crawled: false,
      });

      await db.insert(link).values({
        incomingUrl: url.href,
        outgoingUrl: res.url,
      });
    }

    return;
  }

  const raw = await res.text();

  if (!raw.toLowerCase().includes("<!doctype html>")) {
    console.log("not HTML file");
    return;
  }

  const rendered = raw; // TODO: run javascript

  // logTime("to text");

  // match all urls
  const urls = [
    ...rendered.matchAll(
      /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s'"]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s'"]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s'"]{2,}|www\.[a-zA-Z0-9]+\.[^\s'"]{2,})|((?<=href=").*?(?="))/gm
    ),
  ]
    .map((x) => {
      try {
        return new URL(
          x[0].startsWith("//")
            ? url.protocol + x[0]
            : x[0].startsWith("/")
            ? url.origin + x[0]
            : x[0]
        );
      } catch (e) {
        if (e instanceof TypeError) {
          return null;
        } else {
          throw e;
        }
      }
    })
    .reverse();

  let urlCount = 0;
  let newLinks = [];
  let newSites = [];

  for (let i = 0; i < urls.length; i++) {
    const match = urls[i];
    // invalid url or deduplicate
    if (
      !match ||
      !match.host ||
      urls.findIndex((x) => x && x.href == match.href) !== i
    )
      continue;

    const outgoingUrl = match.href;

    if (skipUrls) {
      // Only create links for existing sites
      const siteExists = await db
        .select()
        .from(site)
        .where(eq(site.url, outgoingUrl))
        .limit(1);

      if (siteExists.length > 0) {
        newLinks.push({
          incomingUrl: url.href,
          outgoingUrl: outgoingUrl,
        });
      }
    } else {
      // Create both sites and links
      newSites.push({
        url: outgoingUrl,
        crawled: false,
      });

      newLinks.push({
        incomingUrl: url.href,
        outgoingUrl: outgoingUrl,
      });
    }

    urlCount++;
  }

  // logTime("urls");

  try {
    // Insert new sites first
    if (newSites.length > 0) {
      await db.insert(site).values(newSites).onConflictDoNothing();
    }

    // Insert links
    if (newLinks.length > 0) {
      await db.insert(link).values(newLinks).onConflictDoNothing();
    }
  } catch (e) {
    console.error("Error inserting links:", e);
  }

  console.log(urlCount + " urls found");
  // logTime("urls db");

  const title = rendered.match(/(?<=<title>).*?(?=<\/title>)/)?.[0] ?? url.href;
  let icon = "";
  let description = "No description provided";

  const links = [...rendered.matchAll(/<link[\s\S]*?>/g)];
  for (const candidate of links) {
    if (candidate[0].includes('rel="icon"')) {
      icon = new URL(
        candidate[0].match(/(?<=href=").*?(?=")/g)?.[0] ?? "",
        url.origin
      ).href;
      break;
    }
  }
  const metas = [...rendered.matchAll(/<meta[\s\S]*?>/g)];
  for (const candidate of metas) {
    if (candidate[0].includes('name="description"')) {
      description =
        candidate[0].match(/(?<=content=").*?(?=")/g)?.[0] ?? description;
      break;
    }
  }

  // logTime("meta");

  await db
    .update(site)
    .set({
      title,
      icon,
      description,
    })
    .where(eq(site.url, url.href));

  // logTime("meta db");

  const textOnly = rendered
    .replaceAll(/(<[\s\S]*?>)|(<\/[\s\S]*?>)/gm, "")
    .toLowerCase(); // remove html tags

  // get count of all terms in the document
  const termCounts: { [term: string]: number } = {};
  let total = 0;
  let curr = "";
  for (const c of textOnly) {
    if (c.match(/\s/g)) {
      if (curr != "" && curr.length < 100) {
        if (curr in termCounts && typeof termCounts[curr] == "number")
          termCounts[curr]++;
        else termCounts[curr] = 1;
        total++;
      }
      curr = "";
    } else if (c.match(/\w/g)) {
      curr += c;
    }
  }
  for (const c of title + " " + description) {
    if (c.match(/\s/g)) {
      if (curr != "" && curr.length < 100) {
        if (curr in termCounts && typeof termCounts[curr] == "number")
          termCounts[curr] += 2;
        else termCounts[curr] = 2;
        total += 2;
      }
      curr = "";
    } else if (c.match(/\w/g)) {
      curr += c;
    }
  }

  // logTime("terms");

  // Insert terms
  const termNames = Object.keys(termCounts);
  await db
    .insert(term)
    .values(termNames.map((name) => ({ name })))
    .onConflictDoNothing();

  // Get term IDs
  const termsIds: { [key: string]: number } = {};
  const termRecords = await db
    .select()
    .from(term)
    .where(inArray(term.name, termNames));

  termRecords.forEach((t) => {
    termsIds[t.name] = t.id;
  });

  // Insert term-site relationships
  await db
    .insert(termsOnSites)
    .values(
      Object.entries(termCounts).map(([termName, termCount]) => ({
        termId: termsIds[termName],
        siteId: entry.order,
        frequency: termCount / total,
      }))
    )
    .onConflictDoNothing();

  // logTime("terms db");

  const totalSitesCount = await db.select({ count: count() }).from(site);

  console.log(
    `finished ${url.href} in ${Date.now() - start}ms\n${crawled}/${
      totalSitesCount[0]?.count || 0
    } crawled`
  );
}
