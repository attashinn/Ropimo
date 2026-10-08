"use client";

import React from "react";
import { BookingCard } from "./booking-card";
import { HoursPill } from "./hours-pill";

export function YellowCard() {
  return (
    <div className="relative w-full max-w-[440px] sm:max-w-[480px] lg:max-w-[500px] aspect-square mx-auto rounded-[36px] sm:rounded-[44px] bg-[#FFE76A] shadow-[0_16px_44px_rgba(255,231,106,0.35)] overflow-hidden select-none flex items-end justify-center">
      {/* Woman with glasses in pink hoodie with laptop */}
      <div className="relative w-full h-[95%] flex items-end justify-center pointer-events-none">
        <img
          src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80"
          alt="Woman with laptop in pink hoodie"
          className="w-full h-full object-cover object-top scale-105"
        />
      </div>

      {/* Floating Card (Booking App - Top Left) */}
      <div className="absolute top-4 left-4 sm:top-5 sm:left-5 z-20">
        <BookingCard />
      </div>

      {/* Bottom Pill (Hours Worked) */}
      <div className="absolute bottom-5 inset-x-5 z-20">
        <HoursPill />
      </div>
    </div>
  );
}

export default YellowCard;
