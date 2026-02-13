"use client";

import { useEffect, useState } from "react";

interface HomeGreetingProps {
  firstName: string;
}

export function HomeGreeting({ firstName }: HomeGreetingProps) {
  const [greeting, setGreeting] = useState("");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    let g = "Good morning";
    if (hour >= 12 && hour < 17) g = "Good afternoon";
    else if (hour >= 17) g = "Good evening";
    setGreeting(g);

    setDateStr(
      now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    );
  }, []);

  return (
    <>
      <p className="text-sm text-muted-foreground">{dateStr}</p>
      <h1 className="mt-1 text-2xl font-medium text-[#1e1f21]">
        {greeting ? `${greeting}, ${firstName}` : `\u00A0`}
      </h1>
    </>
  );
}
