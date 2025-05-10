import {
  pgTable,
  serial,
  text,
  boolean,
  doublePrecision,
  primaryKey,
  integer,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Site table
export const site = pgTable(
  "Site",
  {
    order: serial("order").primaryKey(),
    url: text("url").notNull().unique(),
    crawled: boolean("crawled").default(false).notNull(),
    pageRank: doublePrecision("pageRank").default(0.25).notNull(),
    title: text("title").default("").notNull(),
    icon: text("icon").default("").notNull(),
    description: text("description")
      .default("No description provided")
      .notNull(),
  },
  (table) => [index("url_idx").on(table.url)]
);

// Link table (join table for self-relation in Site)
export const link = pgTable(
  "Link",
  {
    incomingUrl: text("incomingUrl")
      .notNull()
      .references(() => site.url),
    outgoingUrl: text("outgoingUrl")
      .notNull()
      .references(() => site.url),
  },
  (table) => [primaryKey({ columns: [table.incomingUrl, table.outgoingUrl] })]
);

// Term table
export const term = pgTable(
  "Term",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull().unique(),
  },
  (table) => [index("name_idx").on(table.name)]
);

// TermsOnSites table (join table)
export const termsOnSites = pgTable(
  "TermsOnSites",
  {
    termId: integer("termId")
      .notNull()
      .references(() => term.id, { onDelete: "cascade" }),
    siteId: integer("siteId")
      .notNull()
      .references(() => site.order, { onDelete: "cascade" }),
    frequency: doublePrecision("frequency").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.termId, table.siteId] }),
    index("termId_idx").on(table.termId),
  ]
);

// Relations remain the same
export const siteRelations = relations(site, ({ many }) => ({
  outgoingLinks: many(link, { relationName: "incomingLinks" }),
  incomingLinks: many(link, { relationName: "outgoingLinks" }),
  terms: many(termsOnSites),
}));

export const termRelations = relations(term, ({ many }) => ({
  sites: many(termsOnSites),
}));

export const linkRelations = relations(link, ({ one }) => ({
  incomingSite: one(site, {
    fields: [link.incomingUrl],
    references: [site.url],
    relationName: "incomingLinks",
  }),
  outgoingSite: one(site, {
    fields: [link.outgoingUrl],
    references: [site.url],
    relationName: "outgoingLinks",
  }),
}));

export const termsOnSitesRelations = relations(termsOnSites, ({ one }) => ({
  term: one(term, {
    fields: [termsOnSites.termId],
    references: [term.id],
  }),
  site: one(site, {
    fields: [termsOnSites.siteId],
    references: [site.order],
  }),
}));
