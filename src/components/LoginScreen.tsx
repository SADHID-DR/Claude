import React, { useState } from 'react';
import { UserBaseEntry } from '../types';
import { googleSignIn } from '../googleAuth';
import { loadUsersDb, loadGlobalUsers, saveGlobalUser } from '../firestoreService';
import { getAuth, signOut } from 'firebase/auth';

import { AppLogo } from './AppLogo';

interface LoginScreenProps {
  onLogin: (username: string) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      const resultPromise = googleSignIn();
      setIsGoogleLoading(true);
      const result = await resultPromise;
      if (result && result.user && result.user.email) {
        const userEmail = result.user.email.toLowerCase();
        
        let localUsers: UserBaseEntry[] = [];
        try {
          const lsData = localStorage.getItem('nom_construction_users_db');
          if (lsData) {
            const parsed = JSON.parse(lsData);
            localUsers = Array.isArray(parsed) ? parsed : (parsed.users || []);
            if (!Array.isArray(localUsers)) localUsers = [];
          }
        } catch (e) {
          console.error("Error al leer localStorage", e);
        }

        let foundUser = localUsers.find(u => u.email && u.email.toLowerCase() === userEmail);
        let cloudUsers: UserBaseEntry[] = [];
        
        if (!foundUser) {
          cloudUsers = await loadGlobalUsers();
          foundUser = cloudUsers.find(u => u.email && u.email.toLowerCase() === userEmail);
        } else {
          try { cloudUsers = await loadGlobalUsers(); } catch(e){} // Needed to check if there are any users at all
        }

        const isAnyUserRegistered = localUsers.length > 0 || cloudUsers.length > 0;

        if (foundUser) {
          setError('');
          onLogin(foundUser.name);
        } else if (!isAnyUserRegistered) {
          const newUser: UserBaseEntry = {
            id: 'admin-' + Date.now(),
            name: result.user.displayName || 'Administrador',
            email: userEmail,
            phone: '',
            occupation: 'Administrador Principal',
            role: 'admin',
            password: '123',
            projectRoles: {}
          };
          
          await saveGlobalUser(newUser);

          localUsers.push(newUser);
          localStorage.setItem('nom_construction_users_db', JSON.stringify({
             users: localUsers,
             timestamp: Date.now(),
             lastModifiedBy: newUser.id
          }));

          setError('');
          onLogin('Administrador');
        } else {
          // Si no lo encuentra y ya hay otros usuarios, muestra el error actual pero con la sugerencia nueva
          const isMasterAdmin = userEmail === 'marlonechavarria@gmail.com' || userEmail === 'admin@local';
          if (isMasterAdmin) {
             setError('');
             onLogin(result.user.displayName || 'Marlon Echavarria');
          } else {
             setError(`El correo ${userEmail} no está registrado en el sistema.`);
          }
        }
      }
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/popup-blocked') {
        setError('Error al conectar con Google.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Por favor ingresa correo y contraseña.');
      return;
    }

    const emailLower = email.trim().toLowerCase();

    // Check emergency override
    if (emailLower === 'admin' || emailLower === 'admin@local') {
      if (password === '123') {
        setError('');
        onLogin('Administrador Local');
        return;
      }
    }

    const users = await loadGlobalUsers();
    
    const user = users.find(u => u.email && u.email.toLowerCase() === emailLower);
    
    if (user) {
      const correctPassword = user.password || '123';
      if (password === correctPassword) {
        setError('');
        onLogin(user.name);
      } else {
        if (emailLower === 'marlonechavarria@gmail.com') {
          setError('Contraseña incorrecta. (Pista: matricula)');
        } else {
          setError('Contraseña incorrecta.');
        }
      }
    } else {
      if (emailLower === 'marlonechavarria@gmail.com') {
        if (password === '94-1249') {
          setError('');
          onLogin('Marlon Echavarria');
        } else {
          setError('Contraseña incorrecta. (Pista: matricula)');
        }
        return;
      }

      setError('Acceso denegado: El correo proporcionado no coincide con ningún usuario registrado en el sistema.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 border border-slate-100 flex flex-col space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center">
          <div className="mx-auto mb-4 w-10 flex items-center justify-center">
            <AppLogo className="w-full" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800">MaresNominas</h2>
          <p className="text-xs text-slate-500 font-bold mt-1 uppercase">Inicio de Sesión</p>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading}
          className="w-full px-4 py-3 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-sm font-bold text-slate-700 transition-all flex justify-center items-center gap-2"
        >
          {isGoogleLoading ? (
            <span className="animate-spin h-5 w-5 border-2 border-slate-600 border-t-transparent rounded-full" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          <span>Continuar con Google</span>
        </button>

        <div className="relative flex items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase">ó correo y clave</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Correo Electrónico:</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 font-bold text-slate-800"
              placeholder="correo@ejemplo.com"
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Contraseña:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 font-bold"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full px-4 py-3 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-sm cursor-pointer mt-2"
          >
            Ingresar
          </button>
        </form>

        <div className="text-center text-[10px] text-slate-400 font-bold pt-4 border-t border-slate-100">
          Inicia sesión con tu correo registrado para acceder al sistema.
        </div>
      </div>
    </div>
  );
}
