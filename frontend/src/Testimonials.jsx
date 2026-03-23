import React from "react";

function Testimonials() {
  const data = [
    {
      rating: "⭐⭐⭐⭐⭐",
      text: "Amazing stay! Very clean and comfortable rooms."
    },
    {
      rating: "⭐⭐⭐⭐⭐",
      text: "Excellent service and beautiful ambiance!"
    },
    {
      rating: "⭐⭐⭐⭐⭐",
      text: "Best hotel experience ever. Highly recommended!"
    }
  ];

  return (
    <div className="section">
      <h2>The Words of Our Guests</h2>

      <div className="testimonials">
        {data.map((item, index) => (
          <div className="testimonial-card" key={index}>
            <p>{item.rating}</p>
            <p>{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Testimonials;