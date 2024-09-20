import React, { useState, useContext, useEffect } from 'react';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../services/firebase';
import { UserContext } from '../App';
import '../styles/UploadSong.css';
import { Preloader } from './Preloader';

export function UploadSong() {
    const [title, setTitle] = useState('');
    const [lyrics, setLyrics] = useState('');
    const [coverImage, setCoverImage] = useState(null);
    const [audioFile, setAudioFile] = useState(null);
    const [featuredArtists, setFeaturedArtists] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showResults, setShowResults] = useState(false);
    const user = useContext(UserContext);
    const [showPreloader, setShowPreloader] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowPreloader(false);
        }, 1500);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const fetchUsers = async () => {
            const artistsCollection = collection(db, 'artists');
            const artistSnapshot = await getDocs(artistsCollection);
            const artistList = artistSnapshot.docs.map(doc => ({
                id: doc.id,
                displayName: doc.data().name,
                ...doc.data()
            })).filter(a => a.id !== user.uid);
            setAllUsers(artistList);
        };
    
        fetchUsers();
    }, [user.uid]);

    if (showPreloader) {
        return <Preloader />;
    }

    const filteredUsers = allUsers.filter(artist => 
        artist.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCoverChange = (e) => {
        if (e.target.files[0]) {
            setCoverImage(e.target.files[0]);
        }
    };

    const handleAudioChange = (e) => {
        if (e.target.files[0]) {
            setAudioFile(e.target.files[0]);
        }
    };

    const handleAddFeaturedArtist = (artist) => {
        if (!featuredArtists.some(a => a.id === artist.id)) {
            setFeaturedArtists([...featuredArtists, artist]);
        }
        setSearchTerm('');
        setShowResults(false);
    };

    const handleRemoveFeaturedArtist = (artistId) => {
        setFeaturedArtists(featuredArtists.filter(artist => artist.id !== artistId));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            alert('Debes iniciar sesión para subir canciones.');
            return;
        }
        try {
            let coverUrl = '';
            if (coverImage) {
                const coverRef = ref(storage, `covers/${Date.now()}_${coverImage.name}`);
                await uploadBytes(coverRef, coverImage);
                coverUrl = await getDownloadURL(coverRef);
            }
            let audioUrl = '';
            if (audioFile) {
                const audioRef = ref(storage, `songs/${Date.now()}_${audioFile.name}`);
                await uploadBytes(audioRef, audioFile);
                audioUrl = await getDownloadURL(audioRef);
            }
            await addDoc(collection(db, 'songs'), {
                title,
                artist: user.displayName,
                featuredArtists: featuredArtists.map(artist => artist.displayName),
                lyrics,
                coverUrl,
                audioUrl,
                uploadedBy: user.uid,
                createdAt: new Date()
            });
            alert('Canción subida con éxito!');
            // ... (resto del código)
        } catch (error) {
            console.error('Error al subir la canción:', error);
            alert('Hubo un error al subir la canción. Por favor, intenta de nuevo.');
        }
    };

return (
    <div className="upload-song-container">
        <div className="upload-song-form">
            <h2>Comparte tu música</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <input
                        type="text"
                        placeholder="Título de la canción"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <textarea
                        placeholder="Letra de la canción"
                        value={lyrics}
                        onChange={(e) => setLyrics(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <div className="search-container">
                        <input
                            type="text"
                            placeholder="Buscar artista colaborador"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setShowResults(true);
                            }}
                            onFocus={() => setShowResults(true)}
                        />
                        {showResults && searchTerm && (
                            <div className="search-results">
                                {filteredUsers.map(artist => (
                                    <div 
                                        key={artist.id} 
                                        className="search-result-item"
                                        onClick={() => handleAddFeaturedArtist(artist)}
                                    >
                                        {artist.displayName}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                {featuredArtists.length > 0 && (
                    <div className="selected-artists">
                        {featuredArtists.map(artist => (
                            <div key={artist.id} className="selected-artist">
                                {artist.displayName}
                                <button 
                                    type="button" 
                                    className="remove-artist"
                                    onClick={() => handleRemoveFeaturedArtist(artist.id)}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                <div className="file-uploads">
                    <div className="file-upload">
                        <label className="file-label">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleCoverChange}
                                className="file-input"
                            />
                            <span>{coverImage ? coverImage.name : 'Subir Portada'}</span>
                        </label>
                    </div>
                    <div className="file-upload">
                        <label className="file-label">
                            <input
                                type="file"
                                accept="audio/*"
                                onChange={handleAudioChange}
                                required
                                className="file-input"
                            />
                            <span>{audioFile ? audioFile.name : 'Subir Audio'}</span>
                        </label>
                    </div>
                </div>
                <button type="submit" className="submit-button">
                    Subir Canción
                </button>
            </form>
        </div>
    </div>
);
}
