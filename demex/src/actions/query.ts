"use server";
import { cache } from "react";
import { db } from "../db";
import { site, link, term, termsOnSites } from "../db/schema"; // Import your schema
import { eq, asc, inArray, count, sql, and } from "drizzle-orm";

export interface QueryOut {
  url: string;
  title: string;
  icon: string;
  description: string;
  score: number;
}

export const query = cache(
  async (query: string, amount: number, page: number) => {
    // Get total site count
    const countResult = await db.select({ value: count() }).from(site);
    const siteCount = countResult[0].value;

    // Process query terms
    const terms = query
      .toLowerCase()
      .replace(/\W/g, " ")
      .split(/\s/g)
      .filter((t) => t.length > 0);
    const ids: { [term: string]: number } = {};
    terms.forEach((x) => {
      ids[x] = -1;
    });

    // Fetch term information
    const dbTerms = await db
      .select({
        id: term.id,
        name: term.name,
      })
      .from(term)
      .where(inArray(term.name, terms));

    // Calculate IDF values for each term
    const idf: { [id: number]: number } = {};
    for (const t of dbTerms) {
      // Get count of sites for this term
      const termSiteCount = await db
        .select({ value: count() })
        .from(termsOnSites)
        .where(eq(termsOnSites.termId, t.id));

      // Calculate and store IDF
      idf[t.id] = Math.log10(siteCount / termSiteCount[0].value);
      ids[t.name] = t.id;
    }

    // Get valid term IDs (terms that exist in our database)
    const validTermIds = Object.values(ids).filter((id) => id !== -1);

    if (validTermIds.length === 0) {
      return []; // No valid terms found
    }

    // Build query to get sites that contain ALL of the search terms
    // This requires a more complex approach with Drizzle

    // First, get all sites that have ANY of the terms
    const sitesWithTerms = await db
      .select({
        siteId: termsOnSites.siteId,
        termCount: count(termsOnSites.termId),
      })
      .from(termsOnSites)
      .where(inArray(termsOnSites.termId, validTermIds))
      .groupBy(termsOnSites.siteId)
      .having(sql`count(${termsOnSites.termId}) = ${validTermIds.length}`); // Only sites with ALL terms

    if (sitesWithTerms.length === 0) {
      return []; // No sites match all terms
    }

    const matchingSiteIds = sitesWithTerms.map((s) => s.siteId);

    // Get full site details for matching sites
    const sites = await db
      .select({
        order: site.order,
        url: site.url,
        title: site.title,
        icon: site.icon,
        description: site.description,
        pageRank: site.pageRank,
      })
      .from(site)
      .where(inArray(site.order, matchingSiteIds));

    // Get term frequencies for each site
    const termFrequencies = await db
      .select({
        siteId: termsOnSites.siteId,
        termId: termsOnSites.termId,
        frequency: termsOnSites.frequency,
      })
      .from(termsOnSites)
      .where(
        and(
          inArray(termsOnSites.siteId, matchingSiteIds),
          inArray(termsOnSites.termId, validTermIds)
        )
      );

    // Group term frequencies by site
    const siteTerms: {
      [siteId: number]: { termId: number; frequency: number }[];
    } = {};
    for (const tf of termFrequencies) {
      if (!siteTerms[tf.siteId]) {
        siteTerms[tf.siteId] = [];
      }
      siteTerms[tf.siteId].push({
        termId: tf.termId,
        frequency: tf.frequency,
      });
    }

    // Calculate scores and build result
    const out: QueryOut[] = sites
      .map((site) => {
        const siteTermFrequencies = siteTerms[site.order] || [];
        const score =
          siteTermFrequencies
            .map((term) => term.frequency * idf[term.termId])
            .reduce((p, c) => p + c, 0) * site.pageRank;

        return {
          url: site.url,
          title: site.title,
          icon: site.icon,
          description: site.description,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(amount * page, amount * (page + 1));

    return out;
  }
);
