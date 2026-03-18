import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LogIn, Phone, Lock, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [celular, setCelular] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Limpa caracteres não numéricos do celular para comparação
      const celularLimpo = celular.replace(/\D/g, '');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('celular', celularLimpo)
        .eq('senha', senha)
        .single();

      if (profileError || !profile) {
        console.error('Erro no login:', profileError);
        throw new Error('Celular ou senha incorretos.');
      }

      // Salva o perfil no localStorage para manter a sessão
      localStorage.setItem('torneio_user', JSON.stringify(profile));
      
      // Dispara evento para o App.tsx atualizar a sessão instantaneamente
      window.dispatchEvent(new Event('login-success'));
      
      navigate('/dashboard');
    } catch (err: any) {
      if (err.message?.includes('PGRST116')) {
        setError('Usuário não encontrado ou senha incorreta.');
      } else if (err.message?.includes('policy')) {
        setError('Erro de permissão no banco de dados. Verifique as políticas RLS.');
      } else {
        setError(err.message || 'Erro ao fazer login.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-8 shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4 shadow-lg shadow-blue-500/20">
            <LogIn className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">Torneio de Cores 2026</h1>
          <p className="text-slate-400 mt-2 italic">Administração - Time Azul</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Celular</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="(00) 00000-0000"
                className="w-full bg-slate-800 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={celular}
                onChange={(e) => setCelular(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="password"
                placeholder="••••••••"
                className="w-full bg-slate-800 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-mono">
            Acesso Restrito
          </p>
        </div>
      </motion.div>
    </div>
  );
}
