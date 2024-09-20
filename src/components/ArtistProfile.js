import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { collection, query, where, getDocs, getDoc, doc, setDoc, updateDoc, arrayUnion, arrayRemove, increment, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signOut } from 'firebase/auth';
import { db, storage, auth } from '../services/firebase';
import { UserContext } from '../App';
import { SongContext } from '../contexts/SongContext';
import { LivePlayer } from './LivePlayer';
import '../styles/ArtistProfile.css';
import { Preloader } from './Preloader';

export function ArtistProfile() {
    const { id } = useParams();
    const user = useContext(UserContext);
    const navigate = useNavigate();
    const { likedSongs, favoriteSongs, updateLikedSongs, updateFavoriteSongs, playSong, showLivePlayer, currentSong, closeLivePlayer } = useContext(SongContext);
    const [artist, setArtist] = useState(null);
    const [songs, setSongs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState('');
    const [editedBio, setEditedBio] = useState('');
    const [newAvatar, setNewAvatar] = useState(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const fileInputRef = useRef(null);
    const [likedSongsData, setLikedSongsData] = useState([]);
    const [favoriteSongsData, setFavoriteSongsData] = useState([]);
    const [showPreloader, setShowPreloader] = useState(true);

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowPreloader(false);
        }, 1500);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const fetchArtistData = async () => {
            if (!user) return;
            
            const profileId = id || user.uid;
            try {
                console.log("Intentando obtener datos del artista:", profileId);
                console.log("Usuario autenticado:", user.uid);
                
                const artistDoc = await getDoc(doc(db, 'artists', profileId));
                if (artistDoc.exists()) {
                    const artistData = artistDoc.data();
                    console.log("Datos del artista obtenidos:", artistData);
                    
                    const songsCollection = collection(db, 'songs');
                    const artistSongsQuery = query(songsCollection, where('uploadedBy', '==', profileId));
                    const songSnapshot = await getDocs(artistSongsQuery);
                    const songList = songSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    
                    setArtist({
                        id: profileId,
                        ...artistData,
                        songs: songList.length
                    });
                    setSongs(songList);
                    setEditedName(artistData.name);
                    setEditedBio(artistData.bio);
                    setIsFollowing(artistData.followersList?.includes(user?.uid) || false);
    
                    // Obtener canciones favoritas y que le gustaron al usuario
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        const likedSongIds = userData.likedSongs || [];
                        const favoriteSongIds = userData.favoriteSongs || [];
    
                        const likedSongsPromises = likedSongIds.map(id => getDoc(doc(db, 'songs', id)));
                        const favoriteSongsPromises = favoriteSongIds.map(id => getDoc(doc(db, 'songs', id)));
    
                        const [likedSongDocs, favoriteSongDocs] = await Promise.all([
                            Promise.all(likedSongsPromises),
                            Promise.all(favoriteSongsPromises)
                        ]);
    
                        setLikedSongsData(likedSongDocs.map(doc => ({ id: doc.id, ...doc.data() })));
                        setFavoriteSongsData(favoriteSongDocs.map(doc => ({ id: doc.id, ...doc.data() })));
                    }
                } else {
                    console.log("No se encontró el documento del artista");
                    // Crear un nuevo documento de artista si no existe
                    const newArtistData = {
                        name: 'Artista Desconocido',
                        avatar: '/placeholder.svg',
                        bio: 'Este artista aún no ha completado su perfil.',
                        followers: 0,
                        followersList: [],
                    };
                    await setDoc(doc(db, 'artists', profileId), newArtistData);
                    setArtist({ id: profileId, ...newArtistData, songs: 0 });
                    setSongs([]);
                    setEditedName(newArtistData.name);
                    setEditedBio(newArtistData.bio);
                }
                setLoading(false);
            } catch (error) {
                console.error("Error al obtener datos del artista:", error);
                setLoading(false);
            }
        };
    
        fetchArtistData();
    }, [id, user]);

    useEffect(() => {
        const fetchSongsData = async () => {
            if (user && (likedSongs.length > 0 || favoriteSongs.length > 0)) {
                const songsToFetch = [...new Set([...likedSongs, ...favoriteSongs])];
                const songsData = await Promise.all(
                    songsToFetch.map(async (songId) => {
                        const songDoc = await getDoc(doc(db, 'songs', songId));
                        return songDoc.exists() ? { id: songDoc.id, ...songDoc.data() } : null;
                    })
                );
                const validSongsData = songsData.filter(song => song !== null);
                
                setLikedSongsData(validSongsData.filter(song => likedSongs.includes(song.id)));
                setFavoriteSongsData(validSongsData.filter(song => favoriteSongs.includes(song.id)));
            }
        };

        fetchSongsData();
    }, [user, likedSongs, favoriteSongs]);

    const handleFollowToggle = async () => {
        if (!user) return;
        
        try {
            const artistRef = doc(db, 'artists', id);
            if (isFollowing) {
                await updateDoc(artistRef, {
                    followers: increment(-1),
                    followersList: arrayRemove(user.uid)
                });
                setIsFollowing(false);
                setArtist(prev => ({...prev, followers: prev.followers - 1}));
            } else {
                await updateDoc(artistRef, {
                    followers: increment(1),
                    followersList: arrayUnion(user.uid)
                });
                setIsFollowing(true);
                setArtist(prev => ({...prev, followers: prev.followers + 1}));
            }
        } catch (error) {
            console.error("Error updating follow status:", error);
        }
    };

    const handleEditProfile = () => {
        setIsEditing(true);
    };

    const handleSaveProfile = async () => {
        const profileId = id || user.uid;
    
        if (profileId !== user.uid) {
            console.error("No tienes permiso para editar este perfil");
            return;
        }
        try {
            let avatarUrl = artist.avatar;
            if (newAvatar) {
                const avatarRef = ref(storage, `avatars/${user.uid}_${Date.now()}`);
                await uploadBytes(avatarRef, newAvatar);
                avatarUrl = await getDownloadURL(avatarRef);
            }
    
            const updatedArtistData = {
                name: editedName,
                bio: editedBio,
                avatar: avatarUrl,
            };
    
            // Cambiar la referencia del documento aquí
            await updateDoc(doc(db, 'artists', user.uid), updatedArtistData);
    
            setArtist(prevArtist => ({
                ...prevArtist,
                ...updatedArtistData
            }));
    
            setIsEditing(false);
            setNewAvatar(null);
        } catch (error) {
            console.error("Error updating profile:", error);
        }
    };

    const handleAvatarClick = () => {
        if (isEditing && fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleAvatarChange = (e) => {
        if (e.target.files[0]) {
            setNewAvatar(e.target.files[0]);
        }
    };

    const handlePlay = (song) => {
        playSong(song);
    };

    const handleLike = async (song) => {
        if (!user) return;
        try {
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            
            if (!userDoc.exists()) {
                await setDoc(userRef, { likedSongs: [song.id] });
            } else {
                if (likedSongs.includes(song.id)) {
                    await updateDoc(userRef, {
                        likedSongs: arrayRemove(song.id)
                    });
                } else {
                    await updateDoc(userRef, {
                        likedSongs: arrayUnion(song.id)
                    });
                }
            }
            updateLikedSongs(song.id, !likedSongs.includes(song.id));
        } catch (error) {
            console.error("Error al actualizar los me gusta:", error);
        }
    };

    const handleFavorite = async (song) => {
        if (!user) return;
        try {
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            
            if (!userDoc.exists()) {
                await setDoc(userRef, { favoriteSongs: [song.id] });
            } else {
                if (favoriteSongs.includes(song.id)) {
                    await updateDoc(userRef, {
                        favoriteSongs: arrayRemove(song.id)
                    });
                } else {
                    await updateDoc(userRef, {
                        favoriteSongs: arrayUnion(song.id)
                    });
                }
            }
            updateFavoriteSongs(song.id, !favoriteSongs.includes(song.id));
        } catch (error) {
            console.error("Error al actualizar los favoritos:", error);
        }
    };

    const handleDelete = async (song) => {
    if (!user || song.uploadedBy !== user.uid) {
        alert('No tienes permiso para eliminar esta canción');
        return;
    }
    if (window.confirm('¿Estás seguro de que quieres eliminar esta canción?')) {
        try {
            await deleteDoc(doc(db, 'songs', song.id));
            setSongs(songs.filter(s => s.id !== song.id));
            alert('Canción eliminada con éxito');
        } catch (error) {
            console.error('Error al eliminar la canción:', error);
            alert('Hubo un error al eliminar la canción');
        }
    }
};

    if (showPreloader || loading || !artist) {
        return <Preloader />;
    }

    const isOwnProfile = user && user.uid === artist.id;

    return (
        <div className="artist-profile">
            <div className="main-content">
                <div className="artist-header">
                    <div className="avatar-container" onClick={handleAvatarClick}>
                        <img 
                            src={newAvatar ? URL.createObjectURL(newAvatar) : artist.avatar} 
                            alt={artist.name} 
                            className="artist-avatar" 
                        />
                        {isEditing && (
                            <div className="avatar-overlay">
                                <span>Cambiar foto</span>
                            </div>
                        )}
                    </div>
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleAvatarChange} 
                        accept="image/*" 
                        style={{ display: 'none' }}
                    />
                    <div className="artist-info">
                        {isEditing ? (
                            <input
                                type="text"
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                className="edit-name"
                            />
                        ) : (
                            <h2 className="artist-name">{artist.name}</h2>
                        )}
                        <div className="artist-stats">
                            <span>{artist.followers} seguidores</span>
                            <span>•</span>
                            <span>{artist.songs} canciones</span>
                        </div>
                    </div>
                    {isOwnProfile ? (
                        <>
                            {isEditing ? (
                                <button onClick={handleSaveProfile} className="save-button">Guardar</button>
                            ) : (
                                <button onClick={handleEditProfile} className="edit-button">Editar Perfil</button>
                            )}
                            <button onClick={handleSignOut} className="sign-out-button">
                                Cerrar sesión
                            </button>
                        </>
                    ) : (
                        <button onClick={handleFollowToggle} className="follow-button">
                            {isFollowing ? 'Dejar de seguir' : 'Seguir'}
                        </button>
                    )}
                </div>
                <div className="artist-bio">
                    <h3>Sobre el artista</h3>
                    {isEditing ? (
                        <textarea
                            value={editedBio}
                            onChange={(e) => setEditedBio(e.target.value)}
                            className="edit-bio"
                        />
                    ) : (
                        <p>{artist.bio}</p>
                    )}
                </div>
                <div className="artist-songs">
                    <h3>Canciones</h3>
                    <div className="song-list-profile">
                        {songs.length > 0 ? (
                            songs.map((song) => (
                                <SongItem key={song.id} song={song} onPlay={handlePlay} onLike={handleLike} onFavorite={handleFavorite} onDelete={handleDelete} user={user} navigate={navigate} />
                            ))
                        ) : (
                            <p style={{ color: '#b3b3b3' }}>Este artista no tiene canciones publicadas</p>
                        )}
                    </div>
                </div>
                <div className="liked-and-favorite-songs">
                    <div className="liked-songs">
                        <h3>Canciones que te gustan</h3>
                        <div className="song-list">
                            {likedSongsData.length > 0 ? (
                                likedSongsData.map((song) => (
                                    <SongItem key={song.id} song={song} onPlay={handlePlay} onLike={handleLike} onFavorite={handleFavorite} user={user} navigate={navigate} />
                                ))
                            ) : (
                                <p style={{ color: '#b3b3b3' }}>No hay canciones que te gusten</p>
                            )}
                        </div>
                    </div>
                    <div className="favorite-songs">
                        <h3>Canciones favoritas</h3>
                        <div className="song-list">
                            {favoriteSongsData.length > 0 ? (
                                favoriteSongsData.map((song) => (
                                    <SongItem key={song.id} song={song} onPlay={handlePlay} onLike={handleLike} onFavorite={handleFavorite} user={user} navigate={navigate} />
                                ))
                            ) : (
                                <p style={{ color: '#b3b3b3' }}>No hay canciones favoritas</p>
                            )}
                        </div>
                    </div>
                </div>
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

function SongItem({ song, onPlay, onLike, onFavorite, onDelete, user, navigate }) {
    const { likedSongs, favoriteSongs } = useContext(SongContext);
    const isLiked = likedSongs.includes(song.id);
    const isFavorite = favoriteSongs.includes(song.id);

    const displayArtists = () => {
        if (song.featuredArtists && song.featuredArtists.length > 0) {
            return (
                <>
                    <Link to={`/artist/${song.uploadedBy}`}>{song.artist}</Link>
                    {` ft. ${song.featuredArtists.map(artist => 
                        <Link key={artist.id} to={`/artist/${artist.id}`}>{artist.name}</Link>
                    ).join(', ')}`}
                </>
            );
        }
        return <Link to={`/artist/${song.uploadedBy}`}>{song.artist}</Link>;
    };

    return (
        <div className="song-item-card-profile">
            <img src={song.coverUrl} alt={song.title} className="song-cover-profile" />
            <div className="song-info-card-profile">
                <h4 className="song-title-card-profile">{song.title}</h4>
                <p className="song-artist-card-profile">{displayArtists()}</p>
            </div>
            <div className="song-actions-profile">
                <button onClick={() => onPlay(song)} className="action-button-profile play-button-profile">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </button>
                <button onClick={() => onLike(song)} className={`action-button-profile like-button-profile ${isLiked ? 'active' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </button>
                <button onClick={() => onFavorite(song)} className={`action-button-profile favorite-button-profile ${isFavorite ? 'active' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                    </svg>
                </button>
                {song.uploadedBy === user.uid && (
                    <>
                        <button onClick={() => navigate(`/edit/${song.id}`)} className="action-button-profile edit-button-profile">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button onClick={() => onDelete(song)} className="action-button-profile delete-button-profile">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}