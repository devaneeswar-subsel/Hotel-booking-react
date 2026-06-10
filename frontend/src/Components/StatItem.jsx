import { useEffect, useRef, useState, useCallback } from "react";

function useCountUp(target, decimals = 0, duration = 1800) {
  const [value, setValue] = useState(0);
  const triggered = useRef(false);

  const start = useCallback(() => {
    if (triggered.current) return;
    triggered.current = true;
    const startTime = performance.now();
    const ease = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      setValue(parseFloat((target * ease(progress)).toFixed(decimals)));
      if (progress < 1) requestAnimationFrame(tick);
      else setValue(target);
    };

    requestAnimationFrame(tick);
  }, [target, decimals, duration]);

  return { value, start };
}

function StatItem({ target, suffix, label, decimals }) {
  const ref = useRef(null);
  const { value, start } = useCountUp(target, decimals);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { start(); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [start]);

  return (
    <div ref={ref} className="w-[calc(50%-1.25rem)] sm:w-auto">
  <div className="mb-1 font-[var(--font-display)] text-[1.8rem] font-semibold leading-none text-white">
    {value.toFixed(decimals)}{suffix}
  </div>
  <div className="text-[0.68rem] uppercase tracking-[1.5px] text-white/45">
    {label}
  </div>
</div>
  );
}

export default StatItem;