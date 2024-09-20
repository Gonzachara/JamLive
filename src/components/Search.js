    import React, { useState, useEffect, useContext } from 'react';
    import { FaSearch } from 'react-icons/fa';
    import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc, increment, onSnapshot } from 'firebase/firestore';
    import { db } from '../services/firebase';
    import { UserContext } from '../App';
    import { SongContext } from '../contexts/SongContext';
    import '../styles/Search.css';
    import { LivePlayer } from './LivePlayer';
    import { Link } from 'react-router-dom';
    import { useNavigate } from 'react-router-dom';
    import { Preloader } from './Preloader';

    export function Search() {
        const [searchTerm, setSearchTerm] = useState('');
        const [allUsers, setAllUsers] = useState([]);
        const [allSongs, setAllSongs] = useState([]);
        const [results, setResults] = useState({ users: [], songs: [] });
        const [loading, setLoading] = useState(true);
        const user = useContext(UserContext);
        const { playSong, showLivePlayer, currentSong, closeLivePlayer, likedSongs, favoriteSongs, updateLikedSongs, updateFavoriteSongs } = useContext(SongContext);
        const navigate = useNavigate();
        const [showPreloader, setShowPreloader] = useState(true);
    
        useEffect(() => {
            const timer = setTimeout(() => {
                setShowPreloader(false);
            }, 1500);
    
            return () => clearTimeout(timer);
        }, []);

        useEffect(() => {
            const fetchData = async () => {
                try {
                    const usersRef = collection(db, 'users');
                    const songsRef = collection(db, 'songs');
                    const [userSnapshot, songSnapshot] = await Promise.all([
                        getDocs(usersRef),
                        getDocs(songsRef)
                    ]);

                    const users = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    const songs = songSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                    setAllUsers(users);
                    setAllSongs(songs);
                    setResults({ users: [], songs: songs });
                    setLoading(false);
                } catch (error) {
                    console.error("Error al cargar datos:", error);
                    setLoading(false);
                }
            };

            fetchData();
        }, []);

        useEffect(() => {
            if (searchTerm.trim() === '') {
                setResults({ users: [], songs: allSongs });
                return;
            }

            const normalizedTerm = searchTerm.toLowerCase().replace(/[^\w\s]/gi, '');

            const filteredUsers = allUsers.filter(user => 
                user.name?.toLowerCase().replace(/[^\w\s]/gi, '').includes(normalizedTerm) ||
                user.email?.toLowerCase().replace(/[^\w\s]/gi, '').includes(normalizedTerm)
            );

            const filteredSongs = allSongs.filter(song => 
                song.title?.toLowerCase().replace(/[^\w\s]/gi, '').includes(normalizedTerm) ||
                song.artist?.toLowerCase().replace(/[^\w\s]/gi, '').includes(normalizedTerm)
            );

            setResults({ users: filteredUsers, songs: filteredSongs });
        }, [searchTerm, allUsers, allSongs]);

        const handlePlay = async (song) => {
            playSong(song);
            const songRef = doc(db, 'songs', song.id);
            await updateDoc(songRef, {
                listeners: increment(1)
            });
        };
        
        const handleLike = async (song) => {
            if (!user) return;
            const isLiked = likedSongs.includes(song.id);
            updateLikedSongs(song.id, !isLiked);
        };
        
        const handleFavorite = async (song) => {
            if (!user) return;
            const isFavorite = favoriteSongs.includes(song.id);
            updateFavoriteSongs(song.id, !isFavorite);
        };

        const handleUserClick = (userId) => {
            navigate(`/artist/${userId}`);
        };

        if (showPreloader || loading) {
            return <Preloader />;
        }

        return (
            <div className="search-container-main">
                <h1>Búsqueda</h1>
                <div className="search-bar">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Buscar usuarios o canciones..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="search-icon">
                        <FaSearch />
                    </div>
                </div>
                <div className="search-results-container">
                    {searchTerm.trim() !== '' && results.users.length > 0 && (
                        <div className="search-result-section">
                            <h2>Usuarios</h2>
                            <ul className="search-user-list">
                                {results.users.map((user) => (
                                    <li key={user.id} onClick={() => handleUserClick(user.id)} className="search-user-item">
                                        <img src={user.avatar || '/placeholder.svg'} alt={user.name} className="search-user-avatar" />
                                        <div className="search-user-info">
                                            <span className="search-user-name">{user.name}</span>
                                            <span className="search-user-email">{user.email}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {results.songs.length > 0 && (
                        <div className="search-result-section">
                            <h2>{searchTerm.trim() === '' ? 'Todas las Canciones' : 'Canciones'}</h2>
                            <ul className="search-song-list">
                                {results.songs.map((song) => (
                                    <li key={song.id} className="search-song-item">
                                        <div className="search-song-info">
                                            <img src={song.coverUrl} alt={song.title} className="search-song-cover" />
                                            <div className="search-song-details">
                                                <span className="search-song-title">{song.title}</span>
                                                <span className="search-song-artist">
                                                    <Link to={`/artist/${song.uploadedBy}`} className="search-artist-link">
                                                        {song.artist}
                                                    </Link>
                                                    {song.featuredArtists && song.featuredArtists.length > 0 && (
                                                        <>
                                                            {' ft. '}
                                                            {song.featuredArtists.map((artist, index) => (
                                                                <React.Fragment key={artist.id}>
                                                                    <Link to={`/artist/${artist.id}`} className="search-artist-link">
                                                                        {artist.name}
                                                                    </Link>
                                                                    {index < song.featuredArtists.length - 1 && ', '}
                                                                </React.Fragment>
                                                            ))}
                                                        </>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="search-song-actions">
                                            <button onClick={() => handlePlay(song)} className="search-action-button search-play-button">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M8 5v14l11-7z"/>
                                                </svg>
                                                <span>{song.listeners || 0}</span>
                                            </button>
                                            <button onClick={() => handleLike(song)} className={`search-action-button search-like-button ${likedSongs.includes(song.id) ? 'active' : ''}`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                                </svg>
                                            </button>
                                            <button onClick={() => handleFavorite(song)} className={`search-action-button search-favorite-button ${favoriteSongs.includes(song.id) ? 'active' : ''}`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                                                </svg>
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                {showLivePlayer && currentSong && (
                    <LivePlayer
                        song={currentSong}
                        onClose={closeLivePlayer}
                        user={user}
                    />
                )}
            </div>
        );
    }