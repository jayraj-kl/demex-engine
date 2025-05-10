import { db } from "./db/index";
import { site, link, term, termsOnSites } from "./db/schema";
import { eq, asc, inArray, count, sql, desc } from "drizzle-orm";

export default async function index() {
  // await calculateIDFs();
  await pageRank();
}

// async function calculateIDFs() {
//     const start = Date.now();
//
//     // Count total sites
//     const siteCountResult = await db.select({ value: count() }).from(site);
//     const siteCount = siteCountResult[0].value;
//
//     // We'll need to implement this a bit differently since Drizzle doesn't have the same
//     // filtering capabilities as Prisma in a single query
//
//     // First, get all terms that have site relationships
//     const termsWithSites = await db.select({
//         termId: termsOnSites.termId
//     })
//     .from(termsOnSites)
//     .groupBy(termsOnSites.termId);
//
//     // Get terms where IDF equals 0
//     const termsWithZeroIDF = await db.select({
//         id: term.id,
//         name: term.name
//     })
//     .from(term)
//     .where(eq(term.IDF, 0));
//
//     // Intersect the two sets
//     const termIds = termsWithSites
//         .map(t => t.termId)
//         .filter(id => termsWithZeroIDF.some(t => t.id === id));
//
//     const termCount = termIds.length;
//     console.log(`begin idf ${Math.ceil(termCount / 2000)} batches`);
//
//     // Process in batches of 2000
//     for (let i = 0; i < termCount; i += 2000) {
//         const batchTermIds = termIds.slice(i, i + 2000);
//
//         // For each term, count how many sites contain it
//         const termSiteCounts = await Promise.all(
//             batchTermIds.map(async (termId) => {
//                 const result = await db.select({ count: count() })
//                     .from(termsOnSites)
//                     .where(eq(termsOnSites.termId, termId));
//
//                 return {
//                     termId,
//                     count: result[0].count
//                 };
//             })
//         );
//
//         // Update IDF values in a transaction
//         await db.transaction(async (tx) => {
//             for (const { termId, count: termSiteCount } of termSiteCounts) {
//                 const idf = Math.log10(siteCount / termSiteCount);
//
//                 await tx.update(term)
//                     .set({ IDF: idf })
//                     .where(eq(term.id, termId));
//             }
//         });
//
//         console.log(`finished idf batch ${Math.floor(i / 2000) + 1}/${Math.ceil(termCount / 2000)}`);
//     }
//
//     console.log(`calculated idfs in ${Date.now() - start}ms`);
// }

async function pageRank() {
  const damping = 0.85;
  const iterations = 25;

  // Get total site count
  const countResult = await db.select({ value: count() }).from(site);
  const siteCount = countResult[0].value;

  // Fetch all sites with their incoming links
  const allSites = await db
    .select({
      url: site.url,
      order: site.order,
      pageRank: site.pageRank,
    })
    .from(site);

  // Fetch all links
  const allLinks = await db
    .select({
      incomingUrl: link.incomingUrl,
      outgoingUrl: link.outgoingUrl,
    })
    .from(link);

  // Create a map of sites with their data for more efficient access
  const sites: {
    [key: string]: {
      url: string;
      order: number;
      pageRank: number;
      pageRankBuffer: number;
      incomingLinks: string[];
    };
  } = {};

  // Initialize sites map
  for (const s of allSites) {
    sites[s.url] = {
      url: s.url,
      order: s.order,
      pageRank: s.pageRank,
      pageRankBuffer: 0,
      incomingLinks: [],
    };
  }

  // Build incoming links for each site
  for (const l of allLinks) {
    if (sites[l.outgoingUrl]) {
      // If the site at outgoingUrl exists, add the incomingUrl to its list of incoming links
      sites[l.outgoingUrl].incomingLinks.push(l.incomingUrl);
    }
  }

  // Run PageRank algorithm
  for (let i = 0; i < iterations; i++) {
    // Calculate contributions to each site's PageRank
    for (const url in sites) {
      const currentSite = sites[url];
      currentSite.pageRankBuffer = 0;

      // Sum contributions from all incoming links
      for (const incomingUrl of currentSite.incomingLinks) {
        if (sites[incomingUrl]) {
          const incomingSite = sites[incomingUrl];
          const outgoingCount = incomingSite.incomingLinks.length || 1; // Avoid division by zero
          currentSite.pageRankBuffer += incomingSite.pageRank / outgoingCount;
        }
      }
    }

    // Update PageRank values
    for (const url in sites) {
      sites[url].pageRank =
        sites[url].pageRankBuffer * damping + (1 - damping) / siteCount;
    }

    console.log(`finished pagerank iteration ${i + 1}/${iterations}`);
  }

  // Update PageRank values in the database
  // To optimize performance, we'll do this in batches
  const batchSize = 500;
  const siteEntries = Object.values(sites);

  for (let i = 0; i < siteEntries.length; i += batchSize) {
    const batch = siteEntries.slice(i, i + batchSize);

    await db.transaction(async (tx) => {
      for (const siteEntry of batch) {
        await tx
          .update(site)
          .set({ pageRank: siteEntry.pageRank })
          .where(eq(site.url, siteEntry.url));
      }
    });

    console.log(
      `Updated PageRank for sites ${i} to ${Math.min(
        i + batchSize,
        siteEntries.length
      )} of ${siteEntries.length}`
    );
  }
}
