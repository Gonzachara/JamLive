import React, { useState, useEffect, createContext } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebase';
import { Home } from './components/Home';
import { LivePlayer } from './components/LivePlayer';
import { ArtistProfile } from './components/ArtistProfile';
import { Search } from './components/Search';
import { Login } from './components/Login';
import { UploadSong } from './components/UploadSong';
import './App.css';
import { SongProvider } from './contexts/SongContext';
import { Preloader } from './components/Preloader';
import { EditSong } from './components/EditSong';
import { Logo } from './components/Logo'; // Importar el nuevo componente Logo

export const UserContext = createContext(null);

function Navigation({ user }) {
    const navigate = useNavigate();

    return (
        <nav className="navigation">
            <button onClick={() => navigate('/')} className="nav-button">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            </button>
            <button onClick={() => navigate('/search')} className="nav-button">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </button>
            <button onClick={() => navigate('/profile')} className="nav-button">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </button>
            <button onClick={() => navigate('/upload')} className="nav-button">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            </button>
        </nav>
    );
}

export default function App() {
    const [user, setUser] = useState(null);
    const [livePlayerSong, setLivePlayerSong] = useState(null);
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark'); // Cargar tema desde localStorage

    const toggleTheme = () => {
        setTheme((prevTheme) => {
            const newTheme = prevTheme === 'light' ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme); // Guardar el nuevo tema en localStorage
            return newTheme;
        });
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return <Preloader />;
    }

    return (
        <UserContext.Provider value={user}>
            <SongProvider>
                <Router>
                    <div className={`app ${theme}`}>
                        <header className="app-header">
                            <Logo /> {/* Agregar el logo aquí */}
                        </header>
                        <main className="main-content">
                            <Routes>
                                <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
                                <Route path="/" element={user ? <Home /> : <Navigate to="/login" />} />
                                <Route path="/search" element={user ? <Search /> : <Navigate to="/login" />} />
                                <Route path="/profile" element={user ? <ArtistProfile /> : <Navigate to="/login" />} />
                                <Route path="/artist/:id" element={user ? <ArtistProfile /> : <Navigate to="/login" />} />
                                <Route path="/upload" element={user ? <UploadSong /> : <Navigate to="/login" />} />
                                <Route path="/edit/:id" element={user ? <EditSong /> : <Navigate to="/login" />} />
                            </Routes>
                        </main>
                        {user && <Navigation user={user} />}
                        {livePlayerSong && (
                            <LivePlayer 
                                song={livePlayerSong} 
                                onClose={() => setLivePlayerSong(null)} 
                                user={user}
                            />
                        )}
                        <button onClick={toggleTheme} className="theme-toggle-button">Cambiar tema</button>
                    </div>
                </Router>
            </SongProvider>
        </UserContext.Provider>
    );
}