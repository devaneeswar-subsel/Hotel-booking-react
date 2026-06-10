import { useEffect, useState } from "react";

const phrases = ["Comfort", "Elegance", "Serenity", "Indulgence", "Perfection"];

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
        mb-[22px]
        max-w-[700px]
        font-[var(--font-display)]
        text-[clamp(2.8rem,7vw,5.5rem)]
        font-semibold
        leading-[1.05]
        tracking-[-1px]
        text-white
      "
    >
      Where Luxury
      <br />
      Meets
      <br />
      <em
        className="italic text-[var(--gold-light)] inline-block transition-all duration-400 ease-in-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 400ms ease, transform 400ms ease",
        }}
      >
        {phrases[index]}
      </em>
    </h1>
  );
}