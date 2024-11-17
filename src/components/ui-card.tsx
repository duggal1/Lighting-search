"use client";
import React from "react";
import { WavyBackground } from "@/components/ui/wavy-background";

export function WavyBackgroundDemo() {
  return (
    <WavyBackground>
      <p className="font-bold text-2xl text-center text-white md:text-4xl lg:text-7xl inter-var">
        #1 Most Advanced AI Search Engine
      </p>
      <p className="mt-4 font-normal text-base text-center text-white md:text-lg inter-var">
        Do more with less time and get extremely fast queries
      </p>
    </WavyBackground>
  );
}
