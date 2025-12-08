import React, { useState } from 'react';
import { Eye, EyeOff, Truck } from 'lucide-react';
import { signIn } from '../lib/auth';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
      onLogin();
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Verifique suas credenciais e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-screen w-full flex-col bg-slate-900 overflow-hidden font-sans text-white">
      <div className="flex h-full grow flex-col">
        <div className="relative flex flex-1 items-center justify-center py-5">
          <div className="z-10 flex w-full max-w-md flex-col items-center px-4 animate-in fade-in zoom-in-95 duration-500">

            {/* Header / Logo */}
            <div className="mb-10 flex flex-col items-center text-center">
              <div className="flex flex-col items-center gap-3 mb-1 group">
                <div className="w-20 h-20 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                  <img
                    src="https://i.imgur.com/qmc8Yl5.png"
                    alt="Voltrucks Logo"
                    className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                  />
                </div>
                <div className="flex flex-col items-center">
                  <h1 className="text-2xl font-bold text-white leading-none tracking-tight">VOLTRUCKS</h1>
                  <span className="text-xs text-blue-500 font-bold tracking-[0.3em] leading-none mt-1.5 uppercase pl-0.5">AI</span>
                </div>
              </div>
              <p className="mt-4 text-base text-gray-400">
                Faça login para acessar o painel
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="w-full space-y-5">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm text-center">
                  {error}
                </div>
              )}
              <label className="flex flex-col w-full">
                <p className="text-gray-300 text-sm font-medium leading-normal pb-2 ml-1">Email</p>
                <div className="relative flex w-full flex-1 items-center">
                  <div className="absolute left-4 z-10 text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
                      <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
                    </svg>
                  </div>
                  <input
                    className="w-full rounded-xl text-white focus:outline-0 focus:ring-2 focus:ring-blue-500/50 border border-gray-700 bg-gray-800 h-12 placeholder:text-gray-500 pl-11 pr-4 text-base font-normal transition-all"
                    placeholder="Digite seu email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </label>

              <label className="flex flex-col w-full">
                <p className="text-gray-300 text-sm font-medium leading-normal pb-2 ml-1">Senha</p>
                <div className="relative flex w-full flex-1 items-center">
                  <div className="absolute left-4 z-10 text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    className="w-full rounded-xl text-white focus:outline-0 focus:ring-2 focus:ring-blue-500/50 border border-gray-700 bg-gray-800 h-12 placeholder:text-gray-500 pl-11 pr-12 text-base font-normal transition-all"
                    placeholder="Digite sua senha"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <div
                    className="text-gray-500 absolute right-4 flex items-center justify-center cursor-pointer hover:text-blue-500 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </div>
                </div>
              </label>

              <div className="flex w-full justify-end pt-1">
                <button type="button" className="text-gray-400 text-sm font-normal hover:text-blue-400 transition-colors">Esqueceu a senha?</button>
              </div>

              <div className="w-full pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-5 bg-blue-600 text-white text-base font-bold tracking-wide hover:bg-blue-500 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? 'ENTRANDO...' : 'ENTRAR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};