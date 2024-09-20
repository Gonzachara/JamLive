    import React, { useEffect, useState } from 'react';
    import '../styles/Preloader.css';

    export function Preloader() {
    const [show, setShow] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
        setShow(false);
        }, 1500);

        return () => clearTimeout(timer);
    }, []);

    if (!show) return null;

    return (
        <div className="preloader">
        <div className="music-bars">
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
        </div>
        </div>
    );
    }