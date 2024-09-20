import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../services/firebase';
import { UserContext } from '../App';
import '../styles/EditSong.css';

export function EditSong() {
    const { id } = useParams();
    const user = useContext(UserContext);
    const navigate = useNavigate();
    const [song, setSong] = useState(null);
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [newAudio, setNewAudio] = useState(null);
    const [newCover, setNewCover] = useState(null);

    useEffect(() => {
        const fetchSong = async () => {
            const songDoc = await getDoc(doc(db, 'songs', id));
            if (songDoc.exists()) {
                const songData = songDoc.data();
                setSong(songData);
                setTitle(songData.title);
                setArtist(songData.artist);
            } else {
                navigate('/');
            }
        };
        fetchSong();
    }, [id, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user || song.uploadedBy !== user.uid) {
            alert('No tienes permiso para editar esta canción');
            return;
        }

        try {
            let audioUrl = song.audioUrl;
            let coverUrl = song.coverUrl;

            if (newAudio) {
                const audioRef = ref(storage, `songs/${id}_${Date.now()}`);
                await uploadBytes(audioRef, newAudio);
                audioUrl = await getDownloadURL(audioRef);
            }

            if (newCover) {
                const coverRef = ref(storage, `covers/${id}_${Date.now()}`);
                await uploadBytes(coverRef, newCover);
                coverUrl = await getDownloadURL(coverRef);
            }

            await updateDoc(doc(db, 'songs', id), {
                title,
                artist,
                audioUrl,
                coverUrl,
            });

            navigate(`/artist/${user.uid}`);
        } catch (error) {
            console.error('Error updating song:', error);
        }
    };

    if (!song) return <div>Loading...</div>;

    return (
        <div className="edit-song">
            <h2>Editar Canción</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Título:</label>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div>
                    <label>Artista:</label>
                    <input type="text" value={artist} onChange={(e) => setArtist(e.target.value)} required />
                </div>
                <div>
                    <label>Nuevo Audio:</label>
                    <input type="file" accept="audio/*" onChange={(e) => setNewAudio(e.target.files[0])} />
                </div>
                <div>
                    <label>Nueva Portada:</label>
                    <input type="file" accept="image/*" onChange={(e) => setNewCover(e.target.files[0])} />
                </div>
                <button type="submit">Guardar Cambios</button>
            </form>
        </div>
    );
}