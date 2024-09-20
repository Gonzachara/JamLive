import React from 'react';
import '../styles/Logo.css';

export function Logo() {
    return (
        <div className="logo">
            <div className="music-bars">
                <div className="bar"></div>
                <div className="bar"></div>
                <div className="bar"></div>
                <div className="bar"></div>
                <div className="bar"></div>
            </div>
            <h1 className="logo-title">JamLive</h1>
        </div>
    );
}