import React from 'react';

export function StarRating({ rating, onRate }) {
    const stars = Array(5).fill(0); // Crea un array de 5 elementos

    return (
        <div className="star-rating-player">
            {stars.map((_, index) => (
                <svg
                    key={index}
                    className={`star-player ${index < rating ? 'filled' : 'empty'}`}
                    onClick={() => onRate(index + 1)} // Llama a onRate con la nueva puntuación
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
            ))}
        </div>
    );
}