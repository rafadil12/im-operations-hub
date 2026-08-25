"use client";

import { ChartCard } from "./ChartCard";

export function TopTechnicianCard({
  title,
  technicians,
}: {
  title: string;
  technicians: { name: string; count: number }[];
}) {
  return (
    <ChartCard title={title}>
      <div className="relative h-[280px] w-full overflow-hidden">
        {technicians.map((item, index) => {
          const COLORS = ["#2563EB", "#F59E0B", "#10B981", "#EC4899", "#8B5CF6"];

          const maxSize = 80; // sebelumnya 100
          const minSize = 35; // sebelumnya 45

          const POSITIONS = technicians.map((item, index) => {
            const angle = (2 * Math.PI * index) / technicians.length - Math.PI / 2;

            // Radius lingkaran diperkecil
            const radius =
              technicians.length <= 3
                ? 18 // sebelumnya 25
                : technicians.length <= 6
                  ? 24 // sebelumnya 32
                  : 28; // sebelumnya 38

            return {
              left: `${50 + radius * Math.cos(angle)}%`,
              top: `${50 + radius * Math.sin(angle)}%`,
              size: Math.round(
                Math.max(
                  minSize,
                  maxSize - index * ((maxSize - minSize) / Math.max(1, technicians.length - 1))
                )
              ),
            };
          });
          const p = POSITIONS[index];
          if (!p) return null;
          return (
            <div
              key={item.name}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: p.left,
                top: p.top,
              }}
            >
              <div
                className="
            animate-bubble-in
            relative
            flex
            items-center
            justify-center
            rounded-full
            border-4
            border-white
            text-white
            font-bold
            shadow-xl
            transition-all
            duration-500
            hover:scale-110
            "
                style={{
                  width: p.size,
                  height: p.size,
                  background: `linear-gradient(135deg, ${COLORS[index]}, ${COLORS[index]}CC)`,
                  boxShadow: `0 10px 25px ${COLORS[index]}55`,
                  animationDelay: `${index * 200}ms`,
                  animationFillMode: "both",
                }}
              >
                {item.count}
              </div>

              <div className="mt-3 text-center text-sm font-semibold">{item.name}</div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}
