"use client";

export function ScallopedEdge({
  fillColor = "#EFECE0",
  bottomBgColor = "#FAF9F6",
  className = "",
}: {
  fillColor?: string;
  bottomBgColor?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative w-full overflow-hidden leading-none select-none pointer-events-none ${className}`}
      style={{ backgroundColor: bottomBgColor }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1200 70"
        fill="none"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-[50px] sm:h-[70px] md:h-[90px] lg:h-[110px] block -mt-[1px]"
      >
        <path
          d="M 0 0
             L 0 0
             C 45 68, 155 68, 200 0
             C 245 68, 355 68, 400 0
             C 445 68, 555 68, 600 0
             C 645 68, 755 68, 800 0
             C 845 68, 955 68, 1000 0
             C 1045 68, 1155 68, 1200 0
             L 1200 0 L 0 0 Z"
          fill={fillColor}
        />
      </svg>
    </div>
  );
}
