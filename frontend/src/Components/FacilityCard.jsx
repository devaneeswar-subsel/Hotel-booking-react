import { useEffect, useRef } from "react";

function FacilityCard({ icon: FacilityIcon, name, desc, index }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
        } else {
          el.style.opacity = "0";
          el.style.transform = "translateY(32px)";
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
  ref={ref}
  style={{
    opacity: 0,
    transform: "translateY(32px)",
    transition: `opacity 500ms ease ${index * 80}ms, transform 500ms ease ${index * 80}ms, background-color 300ms ease, border-color 300ms ease, box-shadow 300ms ease`,
  }}
  className="
    group
    bg-[var(--white)]
    border
    border-[var(--gray-200)]
    rounded-[var(--radius-md)]
    px-4
    pt-7
    pb-6
    flex
    flex-col
    items-center
    text-center
    gap-3
    shadow-[var(--shadow-sm)]
    hover:bg-[var(--navy)]
    hover:border-[var(--navy)]
    hover:-translate-y-1
    hover:shadow-[var(--shadow-md)]
  "
>
      <div
        className="
          w-11 h-11 rounded-full flex items-center justify-center
          bg-[var(--gray-100)] text-[var(--navy)]
          transition-all duration-300
          group-hover:bg-[rgba(201,168,76,0.15)]
          group-hover:text-[var(--gold)]
        "
      >
        <FacilityIcon size={20} />
      </div>

      <h3
        className="
          text-[0.8rem] font-semibold text-[var(--navy)]
          transition-colors duration-300
          group-hover:text-white/75
        "
      >
        {name}
      </h3>

      <p
        className="
          text-[0.72rem] text-[var(--gray-400)] -mt-1
          transition-colors duration-300
          group-hover:text-white/75
        "
      >
        {desc}
      </p>
    </div>
  );
}

export default FacilityCard;