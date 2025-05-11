"use client";
import Image from "next/image";
import type React from "react";

import Link from "next/link";
import { Icons } from "@/components/icons";
import { StarIcon } from "@heroicons/react/24/solid";
import { CiSearch } from "react-icons/ci";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { query as queryDb, type QueryOut } from "@/actions/query";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import { ScrollProgress } from "@/components/magicui/scroll-progress";
import { RainbowButton } from "@/components/magicui/rainbow-button";
import { VideoTextDemo } from "@/components/VideoText";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [sites, setSites] = useState<QueryOut[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState(searchParams.get("query") ?? "");

  const placeholders = ["Welcome to the DEMEX", "Search for anything"];

  useEffect(() => {
    (async () => {
      setSites(await queryDb(query, 50, 0));
      setLoaded(true);
    })();
  }, [searchParams]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key == "/") {
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoaded(false);
    setSites([]);
    router.push("/search?query=" + query);
  };

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header with search and logo */}
      <div className="flex items-center p-5 backdrop-blur-lg bg-gray-900/20 sticky top-0 z-10">
        {/* Logo section */}
        <div className="flex-shrink-0 mr-4 flex items-center">
          <VideoTextDemo />
        </div>

        {/* Search section - taking most of the space */}
        <div className="flex-1 max-w-2xl mx-auto px-4">
          <PlaceholdersAndVanishInput
            placeholders={placeholders}
            onChange={(e) => setQuery(e.target.value)}
            onSubmit={handleSubmit}
          />
        </div>

        {/* GitHub button section */}
        <div className="flex-shrink-0 ml-4">
          <RainbowButton>
            <div className="flex items-center">
              <Icons.gitHub className="size-4" />
              <span className="ml-2 lg:hidden">Star</span>
              <span className="ml-2 hidden lg:inline">Star on GitHub</span>
            </div>
            <div className="ml-3 flex items-center text-sm md:flex">
              <StarIcon className="size-4 text-gray-500 transition-all duration-300 group-hover:text-yellow-300" />
            </div>
          </RainbowButton>
        </div>
      </div>

      {/* Progress bar */}
      <ScrollProgress className="top-[105px]" />

      {/* Main content area */}
      <div className="flex-1 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Search info */}
          {query && loaded && (
            <div className="mb-4 text-sm text-gray-400">
              {sites.length} results found for "{query}"
            </div>
          )}

          {/* Results area */}
          <div className="space-y-6">
            {!loaded ? (
              <div className="flex justify-center py-20">
                <div className="animate-pulse flex flex-col space-y-4 w-full">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-24 bg-gray-800/30 rounded-lg w-full"
                    ></div>
                  ))}
                </div>
              </div>
            ) : sites.length === 0 ? (
              <div className="flex flex-col items-center py-16">
                <CiSearch className="text-gray-400 text-6xl mb-4" />
                <p className="text-lg text-gray-300">
                  No results matched your search query
                </p>
                <div className="mt-6">
                  <p className="text-gray-400 text-sm">Try searching for:</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {placeholders.slice(0, 3).map((placeholder, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setQuery(placeholder);
                          handleSubmit(new Event("submit") as any);
                        }}
                        className="px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 rounded-full text-sm text-gray-300"
                      >
                        {placeholder}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              sites.map((site, i) => (
                <div
                  key={i}
                  className="w-full bg-gray-800/30 p-4 rounded-lg hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex gap-3 items-center mb-1">
                    {site.icon && (
                      <Image
                        src={site.icon || "/placeholder.svg"}
                        alt={`icon for ${site.title}`}
                        width={16}
                        height={16}
                        className="size-5"
                      />
                    )}
                    <Link
                      href={site.url}
                      className="text-blue-400 hover:text-blue-300 font-medium text-lg break-words"
                    >
                      {site.title || site.url}
                    </Link>
                  </div>
                  {site.title && (
                    <p className="text-gray-400 text-xs mb-2 text-ellipsis w-full overflow-hidden">
                      {site.url}
                    </p>
                  )}
                  <p className="text-gray-300 text-sm">{site.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer with keyboard shortcuts */}
      {loaded && sites.length > 0 && (
        <div className="mt-auto border-t border-gray-800 py-4 px-8">
          <div className="max-w-4xl mx-auto flex justify-between items-center text-sm text-gray-400">
            <div>
              Press{" "}
              <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">/</kbd> to
              focus search
            </div>
            <div className="flex gap-4">
              <span>Results: {sites.length}</span>
              <Link href="/" className="hover:text-gray-300">
                Home
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
