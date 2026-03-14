import { useEffect, useState } from "react";

const COLORS = ["#22c55e", "#f97316", "#3b82f6", "#eab308", "#ec4899", "#8b5cf6"];

interface Piece {
  id: number;
  color: string;
  left: string;
  delay: string;
  size: number;
}

interface Props {
  trigger: boolean;
  onDone?: () => void;
}

export function ConfettiBurst({ trigger, onDone }: Props) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (!trigger) return;
    const newPieces: Piece[] = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      color: COLORS[i % COLORS.length],
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 0.4}s`,
      size: 6 + Math.random() * 6,
    }));
    setPieces(newPieces);
    const t = setTimeout(() => {
      setPieces([]);
      onDone?.();
    }, 1400);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!pieces.length) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl z-10">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            top: "0%",
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}
