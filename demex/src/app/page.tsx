"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TextHoverEffect } from "@/components/ui/text-hover-effect";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";

export default function Home() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const placeholders = [
    "What's the first rule of Fight Club?",
    "Who is Tyler Durden?",
    "Where is Andrew Laeddis Hiding?",
    "Write a Javascript method to reverse a string",
    "How to assemble your own PC?",
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value);
    setQuery(e.target.value);
  };
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    router.push("/search?query=" + query);
    console.log("submitted: ", query);
  };
  return (
    <>
      <div className="items-center justify-center min-h-screen pt-40">
        <TextHoverEffect text="DEMEX" />
        <PlaceholdersAndVanishInput
          placeholders={placeholders}
          onChange={handleChange}
          onSubmit={onSubmit}
        />
      </div>
    </>
  );
}
