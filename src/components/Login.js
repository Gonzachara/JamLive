import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import '../styles/Login.css';
import { Preloader } from './Preloader';

export function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState('');
    const [showPreloader, setShowPreloader] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowPreloader(false);
        }, 1500);

        return () => clearTimeout(timer);
    }, []);

    if (showPreloader) {
        return <Preloader />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isSignUp) {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await setDoc(doc(db, 'artists', userCredential.user.uid), {
                    name: fullName,
                    email: email,
                    avatar: '/placeholder.svg',
                    bio: 'Nuevo artista en JamLive',
                    followers: 0,
                    followersList: []
                });
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (error) {
            console.error('Error:', error);
            if (error.code === 'auth/invalid-credential') {
                setError('Credenciales inválidas. Por favor, verifica tu email y contraseña.');
            } else if (error.code === 'auth/email-already-in-use') {
                setError('Este email ya está en uso. Por favor, intenta con otro.');
            } else {
                setError('Ocurrió un error durante la autenticación. Por favor, intenta de nuevo.');
            }
        }
    };

    const handleGoogleSignIn = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            // Verificar si el usuario ya existe en la colección de artistas
            const artistRef = doc(db, 'artists', user.uid);
            await setDoc(artistRef, {
                name: user.displayName,
                email: user.email,
                avatar: user.photoURL || '/placeholder.svg',
                bio: 'Nuevo artista en JamLive',
                followers: 0,
                followersList: []
            }, { merge: true });
        } catch (error) {
            console.error('Error al iniciar sesión con Google:', error);
            setError('Error al iniciar sesión con Google. Por favor, intenta de nuevo.');
        }
    };

    return (
        <div className="login-container">
        <h2>{isSignUp ? 'Registrarse' : 'Iniciar sesión'}</h2>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleSubmit} className="login-form">
            {isSignUp && (
                <input
                type="text"
                placeholder="Nombre completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                />
            )}
            <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            />
            <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            />
            <button type="submit">{isSignUp ? 'Registrarse' : 'Iniciar sesión'}</button>
        </form>
        <button onClick={handleGoogleSignIn} className="google-sign-in">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
            </svg>
            <span>Iniciar sesión con Google</span>
        </button>
        <button onClick={() => setIsSignUp(!isSignUp)} className="toggle-auth">
            {isSignUp ? '¿Ya tienes una cuenta? Inicia sesión' : '¿Necesitas una cuenta? Regístrate'}
        </button>
        </div>
    );
    }