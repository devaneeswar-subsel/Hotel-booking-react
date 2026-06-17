import { useEffect, useState } from "react";

const phrases = [
  "Comfort",
  "Elegance",
  "Serenity",
  "Indulgence",
  "Perfection",
];

export default function HeroHeading() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);

      setTimeout(() => {
        setIndex((i) => (i + 1) % phrases.length);
        setVisible(true);
      }, 400);
    }, 2800);

    return () => clearInterval(interval);
  }, []);

  return (
    <h1
      className="
        mb-[clamp(12px,2vw,24px)]
        max-w-[12ch]

        font-[var(--font-display)]
        font-semibold

        text-[clamp(2.5rem,7vw,5.8rem)]

        leading-[0.95]
        tracking-[-0.03em]

        text-white
      "
    >
      Where Luxury
      <br />
      Meets
      <br />

      <em
        className="
          inline-block
          italic
          text-[var(--gold-light)]
        "
        style={{
          opacity: visible ? 1 : 0,
          transform: visible
            ? "translateY(0)"
            : "translateY(12px)",
          transition:
            "opacity 400ms ease, transform 400ms ease",
        }}
      >
        {phrases[index]}
      </em>
    </h1>
  );
}