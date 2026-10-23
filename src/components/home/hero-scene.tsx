// Isometric illustration for the homepage hero: hostels around a campus
// building, with lit windows standing for open rooms. Pure SVG, no runtime
// cost beyond the markup; HeroTilt adds a gentle pointer-driven 3D tilt.

const S = 15; // unit size
const C = Math.cos(Math.PI / 6);
const OX = 300;
const OY = 140;

function iso(x: number, y: number, z: number): [number, number] {
  return [OX + (x - y) * C * S, OY + (x + y) * 0.5 * S - z * S];
}

function poly(points: [number, number, number][]) {
  return points.map((p) => iso(...p).map((n) => n.toFixed(1)).join(",")).join(" ");
}

type Block = { x: number; y: number; w: number; d: number; h: number; floors: number; lit: number[]; tone: "navy" | "slate" | "sand" };

const TONES = {
  navy: { top: "#2C5677", left: "#173B57", right: "#21496A" },
  slate: { top: "#E7EDF3", left: "#B9C6D3", right: "#CED8E2" },
  sand: { top: "#F3EEE4", left: "#D8CDB8", right: "#E6DDCB" },
};

function Building({ b, delayBase }: { b: Block; delayBase: number }) {
  const t = TONES[b.tone];
  const { x, y, w, d, h } = b;
  const windows: React.ReactNode[] = [];
  const perFloor = Math.max(1, Math.floor(w / 1.5));
  let i = 0;
  for (let f = 0; f < b.floors; f++) {
    const z0 = (h / b.floors) * f + 0.55;
    const z1 = z0 + (h / b.floors) * 0.45;
    for (let k = 0; k < perFloor; k++) {
      const x0 = x + 0.45 + (k * (w - 0.6)) / perFloor;
      const x1 = x0 + ((w - 0.6) / perFloor) * 0.55;
      const lit = b.lit.includes(i);
      windows.push(
        <polygon
          key={`w${i}`}
          points={poly([[x0, y + d, z0], [x1, y + d, z0], [x1, y + d, z1], [x0, y + d, z1]])}
          className={lit ? "hero-window-lit" : undefined}
          style={lit ? { animationDelay: `${delayBase + i * 90}ms` } : undefined}
          fill={lit ? "var(--brand-secondary)" : b.tone === "navy" ? "#0F2C42" : "#9FB0C1"}
          opacity={lit ? 1 : 0.55}
        />,
      );
      i++;
    }
  }
  return (
    <g>
      <polygon points={poly([[x, y + d, 0], [x + w, y + d, 0], [x + w, y + d, h], [x, y + d, h]])} fill={t.left} />
      <polygon points={poly([[x + w, y, 0], [x + w, y + d, 0], [x + w, y + d, h], [x + w, y, h]])} fill={t.right} />
      <polygon points={poly([[x, y, h], [x + w, y, h], [x + w, y + d, h], [x, y + d, h]])} fill={t.top} />
      {windows}
    </g>
  );
}

const BLOCKS: Block[] = [
  { x: 1, y: 1, w: 4, d: 3, h: 6, floors: 4, lit: [1, 4, 6], tone: "navy" },
  { x: 7, y: 0.5, w: 3, d: 3, h: 4, floors: 3, lit: [0, 5], tone: "slate" },
  { x: 2, y: 7, w: 3, d: 2.5, h: 3, floors: 2, lit: [2, 3], tone: "sand" },
];

export function HeroScene() {
  return (
    <svg viewBox="0 0 600 440" role="img" aria-labelledby="hero-scene-title" className="h-auto w-full">
      <title id="hero-scene-title">Illustration of hostels near a campus, with lit windows marking available rooms</title>
      {/* Ground plot */}
      <polygon points={poly([[-1, -1, 0], [13, -1, 0], [13, 12, 0], [-1, 12, 0]])} fill="#EEF3F7" />
      <polygon points={poly([[-1, 12, 0], [13, 12, 0], [13, 12, -0.6], [-1, 12, -0.6]])} fill="#D6E0E9" />
      <polygon points={poly([[13, -1, 0], [13, 12, 0], [13, 12, -0.6], [13, -1, -0.6]])} fill="#E2E9F0" />
      {/* Footpath to campus */}
      <polygon points={poly([[5.6, 4.6, 0.01], [6.6, 4.6, 0.01], [6.6, 11.5, 0.01], [5.6, 11.5, 0.01]])} fill="#DCE5EC" />
      <polygon points={poly([[6.6, 8.2, 0.01], [12.5, 8.2, 0.01], [12.5, 9.2, 0.01], [6.6, 9.2, 0.01]])} fill="#DCE5EC" />
      {/* Trees */}
      {[[11.2, 3.5], [0.2, 5.5], [9.6, 11.2], [11.8, 5.6]].map(([tx, ty], n) => {
        const [cx, cy] = iso(tx, ty, 1.4);
        return (
          <g key={n}>
            <ellipse cx={iso(tx, ty, 0)[0]} cy={iso(tx, ty, 0)[1]} rx="12" ry="5" fill="#C9D6E1" />
            <circle cx={cx} cy={cy} r="13" fill="#9CCFC6" />
            <circle cx={cx - 4} cy={cy - 4} r="6" fill="#B8E0D9" />
          </g>
        );
      })}
      {BLOCKS.map((b, n) => (
        <Building key={n} b={b} delayBase={300 + n * 250} />
      ))}
      {/* Campus building with columns */}
      <g>
        <polygon points={poly([[8, 7, 0], [12, 7, 0], [12, 7, 2.6], [8, 7, 2.6]])} fill="#D8CDB8" transform="translate(0,0)" />
        <polygon points={poly([[8, 10.4, 0], [12, 10.4, 0], [12, 10.4, 2.6], [8, 10.4, 2.6]])} fill="#E6DDCB" />
        <polygon points={poly([[12, 7, 0], [12, 10.4, 0], [12, 10.4, 2.6], [12, 7, 2.6]])} fill="#E6DDCB" />
        <polygon points={poly([[8, 7, 2.6], [12, 7, 2.6], [12, 10.4, 2.6], [8, 10.4, 2.6]])} fill="#F3EEE4" />
        <polygon points={poly([[8, 8.7, 3.8], [12, 8.7, 3.8], [12, 10.4, 2.6], [8, 10.4, 2.6]])} fill="#173B57" />
        <polygon points={poly([[8, 7, 2.6], [12, 7, 2.6], [12, 8.7, 3.8], [8, 8.7, 3.8]])} fill="#2C5677" />
        {[8.5, 9.5, 10.5, 11.5].map((cx) => (
          <polygon key={cx} points={poly([[cx, 10.4, 0], [cx + 0.25, 10.4, 0], [cx + 0.25, 10.4, 2.3], [cx, 10.4, 2.3]])} fill="#FFFFFF" opacity="0.85" />
        ))}
      </g>
      {/* Location pin over the main hostel */}
      <g className="hero-pin">
        {(() => {
          const [px, py] = iso(3, 2.5, 8.4);
          return (
            <g transform={`translate(${px} ${py})`}>
              <path d="M0 18c-7-9-11-14-11-20a11 11 0 1 1 22 0c0 6-4 11-11 20z" fill="var(--brand-secondary)" />
              <circle cx="0" cy="-2" r="4.2" fill="#FFFFFF" />
            </g>
          );
        })()}
      </g>
    </svg>
  );
}
