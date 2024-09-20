import React, { createContext, useState, useEffect, useContext } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { UserContext } from '../App';

export const SongContext = createContext();

export const SongProvider = ({ children }) => {
    const [songs, setSongs] = useState([]);
    const [likedSongs, setLikedSongs] = useState([]);
    const [favoriteSongs, setFavoriteSongs] = useState([]);
    const [currentSong, setCurrentSong] = useState(null);
    const [showLivePlayer, setShowLivePlayer] = useState(false);
    const [userRatings, setUserRatings] = useState({});
    const user = useContext(UserContext);

    useEffect(() => {
        const fetchUserSongs = async () => {
            if (user && user.uid) {
                const userRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userRef);
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setLikedSongs(userData.likedSongs || []);
                    setFavoriteSongs(userData.favoriteSongs || []);
                }
            }
        };

        fetchUserSongs();
    }, [user]);

    const updateLikedSongs = (songId, isLiked) => {
        setLikedSongs(prev => 
            isLiked ? [...prev, songId] : prev.filter(id => id !== songId)
        );
    };

    const updateFavoriteSongs = (songId, isFavorite) => {
        setFavoriteSongs(prev => 
            isFavorite ? [...prev, songId] : prev.filter(id => id !== songId)
        );
    };

    const playSong = (song) => {
        setCurrentSong(song);
        setShowLivePlayer(true);
    };

    const closeLivePlayer = () => {
        setShowLivePlayer(false);
    };

    const updateSongRating = (songId, newAverageRating) => {
        setSongs(prevSongs => 
            prevSongs.map(song => 
                song.id === songId ? { ...song, averageRating: newAverageRating } : song
            )
        );
        // Actualizar la puntuación en userRatings también
        setUserRatings(prev => ({ ...prev, [songId]: newAverageRating }));
    };

    return (
        <SongContext.Provider value={{
            songs,
            likedSongs,
            favoriteSongs,
            userRatings,
            updateLikedSongs,
            updateFavoriteSongs,
            currentSong,
            showLivePlayer,
            playSong,
            closeLivePlayer,
            updateSongRating
        }}>
            {children}
        </SongContext.Provider>
    );
};