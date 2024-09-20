    import React, { useState, useEffect, useContext } from 'react';
    import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc, increment, onSnapshot } from 'firebase/firestore';
    import { db } from '../services/firebase';
    import { LivePlayer } from './LivePlayer';
    import { UserContext } from '../App';
    import { SongContext } from '../contexts/SongContext';
    import '../styles/Home.css';
    import { Preloader } from './Preloader';
    import { Link } from 'react-router-dom';

    export function Home() {
        const [songs, setSongs] = useState([]);
        const [loading, setLoading] = useState(true);
        const [recommendedSongs, setRecommendedSongs] = useState([]);
        const [featuredSongs, setFeaturedSongs] = useState([]);
        const user = useContext(UserContext);
        const { likedSongs, favoriteSongs, updateLikedSongs, updateFavoriteSongs, playSong, showLivePlayer, currentSong, closeLivePlayer, updateSongRating } = useContext(SongContext);
        const [userRatings, setUserRatings] = useState({}); // Agregar estado para las calificaciones
    
        useEffect(() => {
            const fetchSongs = async () => {
                setLoading(true);
                const songsCollection = collection(db, 'songs');
                const songSnapshot = await getDocs(songsCollection);
                const songPromises = songSnapshot.docs.map(async (docSnapshot) => {
                    const songData = docSnapshot.data();
                    const artistRef = doc(db, 'artists', songData.uploadedBy);
                    const artistDoc = await getDoc(artistRef);
                    const artistName = artistDoc.exists() ? artistDoc.data().name : 'Artista Desconocido';
                    return {
                        id: docSnapshot.id,
                        ...songData,
                        artist: artistName
                    };
                });
                const songList = await Promise.all(songPromises);
                setSongs(songList);
                setLoading(false);
                fetchRecommendations(songList);
                fetchFeaturedSongs(songList);
            };
    
            fetchSongs();
        }, []);

        const fetchFeaturedSongs = (allSongs) => {
            // Filtrar canciones que tienen muchas reproducciones y "me gusta"
            const featured = allSongs.filter(song => song.playCount > 100 && likedSongs.includes(song.id));
            setFeaturedSongs(featured.slice(0, 5)); // Limitar a las 5 canciones más destacadas
        };

        const fetchRecommendations = async (allSongs) => {
            if (!user) return;

            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            const likedSongIds = userDoc.exists() ? userDoc.data().likedSongs || [] : [];
            const userRatingsData = userDoc.exists() ? userDoc.data().ratings || {} : {}; // Obtener calificaciones del usuario
            setUserRatings(userRatingsData); // Guardar calificaciones en el estado

            const recommended = allSongs.filter(song => !likedSongIds.includes(song.id));
            setRecommendedSongs(recommended.slice(0, 5));
        };

        const handleRate = async (songId, rating) => {
            const songRef = doc(db, 'songs', songId);
            const userRef = doc(db, 'users', user.uid);
    
            // Obtener la puntuación actual y el conteo
            const songDoc = await getDoc(songRef);
            const { averageRating, ratingCount } = songDoc.data();
    
            // Calcular nueva puntuación promedio
            const newRatingCount = ratingCount + 1;
            const newAverageRating = ((averageRating * ratingCount) + rating) / newRatingCount;
    
            // Actualizar la puntuación en la colección de canciones
            await updateDoc(songRef, {
                averageRating: newAverageRating,
                ratingCount: newRatingCount
            });
    
            // Guardar la puntuación del usuario
            await updateDoc(userRef, {
                ratings: {
                    ...userRatings,
                    [songId]: rating
                }
            });
    
            // Actualizar el estado local
            setUserRatings(prev => ({ ...prev, [songId]: rating }));
    
            // Actualizar el contexto para que Home.js tenga la puntuación actualizada
            updateSongRating(songId, newAverageRating);
        };

        if (loading) {
            return <Preloader />;
        }

        return (
            <div className="home-container">
            <header className="home-header">
                <h1>Descubre Nueva Música</h1>
                <p>Explora las últimas tendencias y artistas emergentes</p>
            </header>

            <section className="recommended-section">
                        <h2>Recomendaciones para Ti</h2>
                        <div className="recommended-songs">
                            {recommendedSongs.length > 0 ? (
                                recommendedSongs.map(song => (
                                    <SongCard 
                                    key={song.id} 
                                    song={{ ...song, averageRating: userRatings[song.id] || song.averageRating }} // Asegúrate de que la puntuación promedio se pase correctamente
                                    onPlay={playSong}
                                    onLike={() => updateLikedSongs(song.id, !likedSongs.includes(song.id))}
                                    onFavorite={() => updateFavoriteSongs(song.id, !favoriteSongs.includes(song.id))}
                                    onRate={(rating) => handleRate(song.id, rating)}
                                    userRating={userRatings[song.id]}
                                    />
                                ))
                            ) : (
                                <p>No hay recomendaciones disponibles.</p>
                            )}
                        </div>
                    </section>

                    <section className="featured-section">
                        <h2>Destacados de la Semana</h2>
                        <div className="featured-songs">
                            {featuredSongs.length > 0 ? (
                                featuredSongs.map((song) => (
                                    <FeaturedSongCard 
                                        key={song.id} 
                                        song={{ ...song, averageRating: userRatings[song.id] || song.averageRating }} // Asegúrate de que la puntuación promedio se pase correctamente
                                        onPlay={playSong}
                                        onLike={() => updateLikedSongs(song.id, !likedSongs.includes(song.id))}
                                        onFavorite={() => updateFavoriteSongs(song.id, !favoriteSongs.includes(song.id))}
                                        onRate={(rating) => handleRate(song.id, rating)}
                                        userRating={userRatings[song.id]}
                                    />
                                ))
                            ) : (
                                <p>No hay canciones destacadas disponibles.</p>
                            )}
                        </div>
                    </section>

            <section className="all-songs-section">
    <h2>Todas las Canciones</h2>
    <div className="all-songs-grid">
        {songs.map((song) => (
            <SongCard 
            key={song.id} 
            song={{ ...song, averageRating: userRatings[song.id] || song.averageRating }} // Asegúrate de que la puntuación promedio se pase correctamente
            onPlay={playSong}
            onLike={() => updateLikedSongs(song.id, !likedSongs.includes(song.id))}
            onFavorite={() => updateFavoriteSongs(song.id, !favoriteSongs.includes(song.id))}
            onRate={(rating) => handleRate(song.id, rating)}
            userRating={userRatings[song.id]}
            />
        ))}
    </div>
</section>

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

    function FeaturedSongCard({ song, onPlay, onLike, onFavorite, onRate, userRating, user }) {
        const { likedSongs, favoriteSongs } = useContext(SongContext);
        const isLiked = likedSongs.includes(song.id);
        const isFavorite = favoriteSongs.includes(song.id);

        const handleLike = () => {
            onLike();
        };

        const handleFavorite = () => {
            onFavorite();
        };

        return (
            <div className="song-card featured-song-card">
                <img src={song.coverUrl} alt={song.title} className="song-cover" />
                <div className="song-info">
                    <h3 className="song-title">{song.title}</h3>
                    <p className="song-artist">
                        <Link to={`/artist/${song.uploadedBy}`} className="artist-link">
                            {song.artist}
                        </Link>
                        {song.featuredArtists && song.featuredArtists.length > 0 && (
                            <>
                                {' ft. '}
                                {song.featuredArtists.map((artist, index) => (
                                    <React.Fragment key={artist.id}>
                                        <Link to={`/artist/${artist.id}`} className="artist-link">
                                            {artist.name}
                                        </Link>
                                        {index < song.featuredArtists.length - 1 && ', '}
                                    </React.Fragment>
                                ))}
                            </>
                        )}
                    </p>
                    <div className="song-actions">
                        <button className="play-button" onClick={() => onPlay(song)}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                            <span>{song.listeners || 0}</span>
                        </button>
                        <div className="action-buttons">
                            <button className={`action-button ${isLiked ? 'active' : ''}`} onClick={handleLike}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                </svg>
                            </button>
                            <button className={`action-button ${isFavorite ? 'active' : ''}`} onClick={handleFavorite}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="average-rating-home">
                        <div className="rating-stars-home">
                            {Array.from({ length: 5 }, (_, index) => (
                                <span key={index} className={`star ${song.averageRating && index < Math.round(song.averageRating) ? 'filled' : ''}`}>
                                    ★
                                </span>
                            ))}
                        </div>
                        <span className="average-rating-text">{song.averageRating ? song.averageRating.toFixed(1) : 'No calificado'}</span>
                    </div>
                </div>
                <div className="overlay">
                    <button className="play-button-overlay" onClick={() => onPlay(song)}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/> {/* Ícono de "play" */}
                        </svg>
                    </button>
                </div>
            </div>
        );
    }

    function SongCard({ song, onPlay, onLike, onFavorite, onRate, userRating }) {
        const { likedSongs, favoriteSongs } = useContext(SongContext);
        const isLiked = likedSongs.includes(song.id);
        const isFavorite = favoriteSongs.includes(song.id);
        const [listeners, setListeners] = useState(song.listeners || 0);
    
        useEffect(() => {
            const songRef = doc(db, 'songs', song.id);
            const unsubscribe = onSnapshot(songRef, (doc) => {
                if (doc.exists()) {
                    setListeners(doc.data().listeners || 0);
                }
            });
    
            return () => unsubscribe();
        }, [song.id]);
    
        const handleLike = () => {
            onLike();
        };
    
        const handleFavorite = () => {
            onFavorite();
        };
    
        return (
            <div className="song-card">
                <img src={song.coverUrl} alt={song.title} className="song-cover" />
                <div className="song-info">
                    <h3 className="song-title">{song.title}</h3>
                    <p className="song-artist">
                        <Link to={`/artist/${song.uploadedBy}`} className="artist-link">
                            {song.artist}
                        </Link>
                        {song.featuredArtists && song.featuredArtists.length > 0 && (
                            <>
                                {' ft. '}
                                {song.featuredArtists.map((artist, index) => (
                                    <React.Fragment key={artist.id}>
                                        <Link to={`/artist/${artist.id}`} className="artist-link">
                                            {artist.name}
                                        </Link>
                                        {index < song.featuredArtists.length - 1 && ', '}
                                    </React.Fragment>
                                ))}
                            </>
                        )}
                    </p>
                    <div className="song-actions">
                        <button className="play-button" onClick={() => onPlay(song)}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                            <span>{listeners}</span>
                        </button>
                        <div className="action-buttons">
                            <button className={`action-button ${isLiked ? 'active' : ''}`} onClick={handleLike}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                </svg>
                            </button>
                            <button className={`action-button ${isFavorite ? 'active' : ''}`} onClick={handleFavorite}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="average-rating-home">
                        <div className="rating-stars-home">
                            {Array.from({ length: 5 }, (_, index) => (
                                <span key={index} className={`star ${song.averageRating && index < Math.round(song.averageRating) ? 'filled' : ''}`}>
                                    ★
                                </span>
                            ))}
                        </div>
                        <span className="average-rating-text">{song.averageRating ? song.averageRating.toFixed(1) : 'No calificado'}</span>
                    </div>
                </div>
                <div className="overlay">
                    <button className="play-button-overlay" onClick={() => onPlay(song)}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/> {/* Ícono de "play" */}
                        </svg>
                    </button>
                </div>
            </div>
        );
    }