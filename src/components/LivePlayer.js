import React, { useState, useEffect, useContext, useRef } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, limit, doc, updateDoc, arrayUnion, arrayRemove, setDoc, deleteDoc, where, getDoc } from 'firebase/firestore';
import { db, listenersRef } from '../services/firebase';
import { UserContext } from '../App';
import { SongContext } from '../contexts/SongContext';
import { Link, useLocation } from 'react-router-dom'; // Importar useLocation
import '../styles/LivePlayer.css';
import { StarRating } from './StarRating'; 

export function LivePlayer({ onClose, user }) {
    const location = useLocation(); // Obtener la ubicación actual
    const { currentSong, updateLikedSongs, updateFavoriteSongs, likedSongs, favoriteSongs, updateSongRating } = useContext(SongContext);
    
    // Lógica para no mostrar el LivePlayer si estamos en el perfil del artista
    const isArtistProfile = location.pathname.startsWith('/artist/');

    // Hooks
    const [isPlaying, setIsPlaying] = useState(true);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const audioRef = useRef(new Audio(currentSong.audioUrl));
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [lyrics, setLyrics] = useState('');
    const [isLiked, setIsLiked] = useState(likedSongs.includes(currentSong.id));
    const [isFavorite, setIsFavorite] = useState(favoriteSongs.includes(currentSong.id));
    const [listeners, setListeners] = useState(0);
    const [userRatings, setUserRatings] = useState({}); // Agregar estado para las calificaciones

    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        const audio = audioRef.current;
        audio.src = currentSong.audioUrl;

        const handleLoadedMetadata = () => setDuration(audio.duration);
        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);

        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('timeupdate', handleTimeUpdate);

        if (isPlaying) {
            audio.play().catch(error => console.error("Error playing audio:", error));
        } else {
            audio.pause();
        }

        const messagesRef = collection(db, 'songs', currentSong.id, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(50));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const messages = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMessages(messages.reverse());
        });

        // Agregar el usuario actual como oyente
        const addListener = async () => {
            if (user) {
                const listenerDocRef = doc(listenersRef, `${currentSong.id}_${user.uid}`);
                await setDoc(listenerDocRef, { userId: user.uid, songId: currentSong.id });
            }
        };

        // Obtener el número de oyentes en tiempo real
        const listenersQuery = query(collection(db, 'listeners'), where('songId', '==', currentSong.id));
        const unsubscribeListeners = onSnapshot(listenersQuery, (snapshot) => {
            setListeners(snapshot.size);
        });

        addListener();

        // Cargar la letra de la canción
        if (currentSong.lyrics) {
            setLyrics(currentSong.lyrics);
        }

        return () => {
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            unsubscribe();
            unsubscribeListeners();
            audio.pause(); // Detener el audio cuando el componente se desmonta
            // Eliminar al usuario como oyente cuando se cierra el componente
            if (user) {
                const listenerDocRef = doc(listenersRef, `${currentSong.id}_${user.uid}`);
                deleteDoc(listenerDocRef);
            }
        };
    }, [currentSong, user]);

    useEffect(() => {
        if (isPlaying) {
            audioRef.current.play().catch(error => console.error("Error playing audio:", error));
        } else {
            audioRef.current.pause();
        }
    }, [isPlaying]);

    const togglePlay = () => {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (message.trim() === '' || !user) return;
    
        const messageData = {
            text: message,
            user: user.email,
            userName: user.displayName || user.email.split('@')[0], // Usa el displayName si está disponible, si no, usa la parte del email antes del @
            timestamp: new Date()
        };
    
        try {
            const messagesRef = collection(db, 'songs', currentSong.id, 'messages');
            await addDoc(messagesRef, messageData);
            setMessage('');
        } catch (error) {
            console.error("Error al enviar el mensaje:", error);
        }
    };

    const formatTime = (time) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const handleLike = async () => {
        if (!user) return;
        try {
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            
            if (!userDoc.exists()) {
                // Crear un nuevo documento de usuario si no existe
                await setDoc(userRef, { likedSongs: [currentSong.id] });
            } else {
                // Actualizar el documento existente
                if (isLiked) {
                    await updateDoc(userRef, {
                        likedSongs: arrayRemove(currentSong.id)
                    });
                } else {
                    await updateDoc(userRef, {
                        likedSongs: arrayUnion(currentSong.id)
                    });
                }
            }
            updateLikedSongs(currentSong.id, !isLiked);
            setIsLiked(!isLiked);
        } catch (error) {
            console.error("Error al actualizar los me gusta:", error);
        }
    };

    const handleFavorite = async () => {
        if (!user) return;
        try {
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            
            if (!userDoc.exists()) {
                // Crear un nuevo documento de usuario si no existe
                await setDoc(userRef, { favoriteSongs: [currentSong.id] });
            } else {
                // Actualizar el documento existente
                if (isFavorite) {
                    await updateDoc(userRef, {
                        favoriteSongs: arrayRemove(currentSong.id)
                    });
                } else {
                    await updateDoc(userRef, {
                        favoriteSongs: arrayUnion(currentSong.id)
                    });
                }
            }
            updateFavoriteSongs(currentSong.id, !isFavorite);
            setIsFavorite(!isFavorite);
        } catch (error) {
            console.error("Error al actualizar los favoritos:", error);
        }
    };

    useEffect(() => {
        const fetchUserRatings = async () => {
            if (user) {
                const userRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userRef);
                const ratings = userDoc.exists() ? userDoc.data().ratings || {} : {};
                setUserRatings(ratings);
            }
        };

        fetchUserRatings();
    }, [user]);

    const handleRate = async (rating) => {
        setUserRatings(prev => ({ ...prev, [currentSong.id]: rating }));
        const songRef = doc(db, 'songs', currentSong.id);
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
                [currentSong.id]: rating
            }
        });

        // Actualizar el contexto para que Home.js tenga la puntuación actualizada
        updateSongRating(currentSong.id, newAverageRating); // Asegúrate de que esta línea esté aquí
    };

    // Si estamos en el perfil del artista, no renderizar el LivePlayer
    if (isArtistProfile) {
        audioRef.current.pause(); // Asegurarse de que el audio se detenga
        return null;
    }

    return (
        <div className="live-player-fullscreen">
            <div className="live-player">
                <div className="lyrics-section">
                    <h3>Letra</h3>
                    <div className="lyrics-content">
                        {lyrics ? (
                            <pre>{lyrics}</pre>
                        ) : (
                            <p>No hay letra disponible para esta canción.</p>
                        )}
                    </div>
                </div>
                <div className="player-section">
                <div className="player-info">
                    <img src={currentSong.coverUrl} alt={currentSong.title} className="player-cover" />
                    <h2 className="player-title">{currentSong.title}</h2>
                    <p className="player-artist">
                        <Link to={`/artist/${currentSong.uploadedBy}`} className="artist-link">
                            {currentSong.artist}
                        </Link>
                    </p>
                    <div className="player-controls">
                        <button onClick={togglePlay} className="control-button play-pause-button">
                            {isPlaying ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                            )}
                        </button>
                    </div>
                        <div className="player-actions">
                            <button onClick={handleLike} className={`action-button like-button ${isLiked ? 'active' : ''}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                </svg>
                            </button>
                            <button onClick={handleFavorite} className={`action-button favorite-button ${isFavorite ? 'active' : ''}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="progress-bar">
                        <input
                            type="range"
                            min="0"
                            max={duration}
                            value={currentTime}
                            onChange={(e) => {
                                const time = Number(e.target.value);
                                audioRef.current.currentTime = time;
                                setCurrentTime(time);
                            }}
                        />
                        <div className="time-display">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>
                    <div className="listeners-count">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <span>{listeners} escuchando ahora</span>
                    </div>
                    <div className="rating-text">Puntúa la canción:</div>
                    <StarRating rating={userRatings[currentSong.id] || 0} onRate={handleRate} />
                </div>
                <div className="chat-section">
                    <div className="chat-messages">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`chat-message ${user && msg.user === user.email ? 'own-message' : ''}`}>
                                <p className="chat-user">
                                    {user && msg.user === user.email ? 'Tú' : msg.userName || msg.user}
                                </p>
                                <p className="message-text">{msg.text}</p>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                    <form onSubmit={handleSendMessage} className="chat-input">
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="¿Qué opinas de la canción?"
                        />
                        <button type="submit">Enviar</button>
                    </form>
                </div>
            </div>
            <button onClick={onClose} className="close-button">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
    );
}