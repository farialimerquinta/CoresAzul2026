import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Jogo, Classificacao, Profile, ConfrontoJogador } from '../types';
import { Trophy, Calendar, Upload, Save, Image as ImageIcon, CheckCircle2, AlertCircle, LogOut, LayoutDashboard, Users, ArrowLeftRight, PlusCircle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [classificacao, setClassificacao] = useState<Classificacao[]>([]);
  const [confrontos, setConfrontos] = useState<ConfrontoJogador[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'jogos'>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>('2026-03-21');
  const [selectedTeam, setSelectedTeam] = useState<'Azul' | 'Roxo' | 'Amarelo' | 'Verde' | ''>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const navigate = useNavigate();

  const dates = ['2026-03-21', '2026-03-22', '2026-03-28', '2026-03-29'];

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/');
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileData) {
      setProfile(profileData);
    } else {
      // Fallback para desenvolvimento: se não houver perfil, assume admin para o usuário logado
      setProfile({ id: user.id, role: 'admin', celular: user.email || '0000000000' } as Profile);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    
    const { data: jogosData } = await supabase
      .from('jogos')
      .select('*')
      .order('data', { ascending: true });

    if (jogosData) {
      setJogos(jogosData);
      const currentJogo = jogosData.find(j => j.data === selectedDate);
      
      const [classRes, confRes] = await Promise.all([
        supabase.from('classificacao').select('*').order('pontos', { ascending: false }),
        currentJogo 
          ? supabase.from('confrontos_jogadores').select('*').eq('jogo_id', currentJogo.id).order('ordem', { ascending: true })
          : Promise.resolve({ data: [] })
      ]);

      if (classRes.data) setClassificacao(classRes.data);
      
      if (confRes.data && confRes.data.length > 0) {
        setConfrontos(confRes.data);
      } else {
        // Mock data based on the spreadsheet image for demo
        const mockConfrontos: ConfrontoJogador[] = [
          { id: '1', jogo_id: 'mock', ordem: 1, categoria: 'B', jogador1: 'NORIMITI FUKUMA', jogador2: 'SHEILA OKAZAKI', set1_j1: null, set1_j2: null, set2_j1: null, set2_j2: null, set3_j1: null, set3_j2: null, vencedor: null },
          { id: '2', jogo_id: 'mock', ordem: 2, categoria: 'F', jogador1: 'ROBERTO BRITO', jogador2: 'MIDORI TUKIAMA', set1_j1: null, set1_j2: null, set2_j1: null, set2_j2: null, set3_j1: null, set3_j2: null, vencedor: null },
          { id: '3', jogo_id: 'mock', ordem: 3, categoria: 'E', jogador1: 'SAYURI TAKATA', jogador2: 'ALAN YOGUI', set1_j1: null, set1_j2: null, set2_j1: null, set2_j2: null, set3_j1: null, set3_j2: null, vencedor: null },
          { id: '4', jogo_id: 'mock', ordem: 4, categoria: 'D', jogador1: 'ADRIANA WATANABE', jogador2: 'LEANDRO ENJOJI', set1_j1: null, set1_j2: null, set2_j1: null, set2_j2: null, set3_j1: null, set3_j2: null, vencedor: null },
          { id: '5', jogo_id: 'mock', ordem: 5, categoria: 'C', jogador1: 'ERIC SHIGETOMI', jogador2: 'KENZO IWASAKI', set1_j1: null, set1_j2: null, set2_j1: null, set2_j2: null, set3_j1: null, set3_j2: null, vencedor: null },
          { id: '6', jogo_id: 'mock', ordem: 6, categoria: 'B', jogador1: 'FABRICIO OLIVEIRA', jogador2: 'MAYSA NAKASHIMA', set1_j1: null, set1_j2: null, set2_j1: null, set2_j2: null, set3_j1: null, set3_j2: null, vencedor: null },
          { id: '7', jogo_id: 'mock', ordem: 7, categoria: 'F', jogador1: 'LUCIANA OLIVEIRA', jogador2: 'ADRIANA IRINO', set1_j1: null, set1_j2: null, set2_j1: null, set2_j2: null, set3_j1: null, set3_j2: null, vencedor: null },
          { id: '8', jogo_id: 'mock', ordem: 8, categoria: 'E', jogador1: 'KATIA GOSHI', jogador2: 'GUILHERME HARAGUCHI', set1_j1: null, set1_j2: null, set2_j1: null, set2_j2: null, set3_j1: null, set3_j2: null, vencedor: null },
          { id: '9', jogo_id: 'mock', ordem: 9, categoria: 'D', jogador1: 'THIAGO IRINO', jogador2: 'MARCELL ANNO', set1_j1: null, set1_j2: null, set2_j1: null, set2_j2: null, set3_j1: null, set3_j2: null, vencedor: null },
          { id: '10', jogo_id: 'mock', ordem: 10, categoria: 'C', jogador1: 'WILLIAN KUBOTA', jogador2: 'ROSE TAKETANI', set1_j1: null, set1_j2: null, set2_j1: null, set2_j2: null, set3_j1: null, set3_j2: null, vencedor: null },
          { id: '11', jogo_id: 'mock', ordem: 11, categoria: 'B', jogador1: 'CLAUDIO UDO', jogador2: 'ALEXANDRE UEHARA', set1_j1: null, set1_j2: null, set2_j1: null, set2_j2: null, set3_j1: null, set3_j2: null, vencedor: null },
          { id: '12', jogo_id: 'mock', ordem: 12, categoria: 'A', jogador1: 'JULIO NURUKI', jogador2: 'PEDRO TOMIYOSHI', set1_j1: null, set1_j2: null, set2_j1: null, set2_j2: null, set3_j1: null, set3_j2: null, vencedor: null },
          { id: '13', jogo_id: 'mock', ordem: 13, categoria: 'F', jogador1: 'NAYARA COSTA', jogador2: 'RAQUEL HONDA', set1_j1: null, set1_j2: null, set2_j1: null, set2_j2: null, set3_j1: null, set3_j2: null, vencedor: null },
          { id: '14', jogo_id: 'mock', ordem: 14, categoria: 'E', jogador1: 'JEFFERSON SENA', jogador2: 'RODRIGO GALO', set1_j1: null, set1_j2: null, set2_j1: null, set2_j2: null, set3_j1: null, set3_j2: null, vencedor: null },
          { id: '15', jogo_id: 'mock', ordem: 15, categoria: 'D', jogador1: 'AQUINO ITO', jogador2: 'ELIA YAMAKAWA', set1_j1: null, set1_j2: null, set2_j1: null, set2_j2: null, set3_j1: null, set3_j2: null, vencedor: null },
          { id: '16', jogo_id: 'mock', ordem: 16, categoria: 'C', jogador1: 'MARCIO MURAMOTO', jogador2: 'MARIA ISHIKAWA', set1_j1: null, set1_j2: null, set2_j1: null, set2_j2: null, set3_j1: null, set3_j2: null, vencedor: null },
          { id: '17', jogo_id: 'mock', ordem: 17, categoria: 'B', jogador1: 'FERNANDO HIGA', jogador2: 'VICTOR SUNTO', set1_j1: null, set1_j2: null, set2_j1: null, set2_j2: null, set3_j1: null, set3_j2: null, vencedor: null },
          { id: '18', jogo_id: 'mock', ordem: 18, categoria: 'A', jogador1: 'ERIC HAYASHIDA', jogador2: 'SAVINO MICCO', set1_j1: null, set1_j2: null, set2_j1: null, set2_j2: null, set3_j1: null, set3_j2: null, vencedor: null },
        ];
        setConfrontos(mockConfrontos);
      }
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleFileUpload = async () => {
    const jogo = jogos.find(j => j.data === selectedDate);
    
    if (!uploadFile || !jogo) {
      alert('Por favor, selecione um dia válido e um arquivo.');
      return;
    }

    // Verifica se o usuário é admin (com fallback para permitir testes se o perfil não estiver no DB)
    if (profile?.role !== 'admin') {
      console.warn('Usuário não é admin no banco de dados, mas prosseguindo para teste.');
    }

    const jogoId = jogo.id;
    const fileExt = uploadFile.name.split('.').pop()?.toLowerCase();
    const fileName = `${jogoId}-${selectedTeam}-${Date.now()}.${fileExt}`;
    const filePath = `sumulas/${fileName}`;

    console.log('Iniciando upload:', { filePath, jogoId, selectedTeam });

    try {
      // 1. Upload para o Storage
      const { error: uploadError } = await supabase.storage
        .from('sumulas')
        .upload(filePath, uploadFile);

      if (uploadError) {
        console.error('Erro no Storage:', uploadError);
        throw new Error(`Erro no Storage: ${uploadError.message}. Certifique-se de que o bucket "sumulas" existe no Supabase.`);
      }

      // 2. Obter URL Pública
      const { data: { publicUrl } } = supabase.storage
        .from('sumulas')
        .getPublicUrl(filePath);

      // 3. Atualizar o Jogo com a sumula_url
      const { error: updateError } = await supabase
        .from('jogos')
        .update({ sumula_url: publicUrl })
        .eq('id', jogoId);

      if (updateError) {
        console.error('Erro no Database:', updateError);
        throw new Error(`Erro no Database: ${updateError.message}`);
      }

      // 4. Tentar processar se for CSV para montar os confrontos
      if (fileExt === 'csv') {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const text = e.target?.result as string;
          await parseCSVAndMountConfrontos(text, jogoId, selectedTeam);
          fetchData();
        };
        reader.readAsText(uploadFile);
      }

      setShowUploadModal(false);
      setUploadFile(null);
      fetchData();
      alert('Súmula enviada com sucesso!');
    } catch (error: any) {
      alert(error.message || 'Erro inesperado no upload');
    }
  };

  const parseCSVAndMountConfrontos = async (csvText: string, jogoId: string, team: string) => {
    const lines = csvText.split('\n');
    const jogo = jogos.find(j => j.id === jogoId);
    if (!jogo) return;

    const isCasa = jogo.time_casa.toLowerCase() === team.toLowerCase();
    const fieldToUpdate = isCasa ? 'jogador1' : 'jogador2';

    for (const line of lines) {
      if (!line.trim()) continue;
      
      const parts = line.includes(';') ? line.split(';') : line.split(',');
      
      if (parts.length >= 3) {
        const ordem = parseInt(parts[0].trim());
        const categoria = parts[1].trim();
        const jogador = parts[2].trim();

        if (!isNaN(ordem) && jogador) {
          // Busca se já existe o confronto para atualizar, senão insere
          const { data: existing } = await supabase
            .from('confrontos_jogadores')
            .select('id')
            .eq('jogo_id', jogoId)
            .eq('ordem', ordem)
            .single();

          if (existing) {
            await supabase
              .from('confrontos_jogadores')
              .update({ [fieldToUpdate]: jogador, categoria })
              .eq('id', existing.id);
          } else {
            await supabase
              .from('confrontos_jogadores')
              .insert({ 
                jogo_id: jogoId, 
                ordem: ordem, 
                categoria: categoria,
                [fieldToUpdate]: jogador,
                jogador1: isCasa ? jogador : 'A definir',
                jogador2: isCasa ? 'A definir' : jogador
              });
          }
        }
      }
    }
  };

  const updatePlacar = async (confId: string, field: string, value: number) => {
    if (profile?.role !== 'admin') return;
    
    const { error } = await supabase
      .from('confrontos_jogadores')
      .update({ [field]: value })
      .eq('id', confId);

    if (!error) fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}`;
  };

  const stats = {
    vitoriasDesafio: jogos.reduce((acc, j) => acc + (j.sets_casa > j.sets_visitante ? 1 : 0), 0),
    derrotasDesafio: jogos.reduce((acc, j) => acc + (j.sets_casa < j.sets_visitante ? 1 : 0), 0),
    setsVencidos: confrontos.reduce((acc, c) => {
      let count = 0;
      if (c.set1_j1 !== null && c.set1_j2 !== null && c.set1_j1 > c.set1_j2) count++;
      if (c.set2_j1 !== null && c.set2_j2 !== null && c.set2_j1 > c.set2_j2) count++;
      if (c.set3_j1 !== null && c.set3_j2 !== null && c.set3_j1 > c.set3_j2) count++;
      return acc + count;
    }, 0),
    setsPerdidos: confrontos.reduce((acc, c) => {
      let count = 0;
      if (c.set1_j1 !== null && c.set1_j2 !== null && c.set1_j1 < c.set1_j2) count++;
      if (c.set2_j1 !== null && c.set2_j2 !== null && c.set2_j1 < c.set2_j2) count++;
      if (c.set3_j1 !== null && c.set3_j2 !== null && c.set3_j1 < c.set3_j2) count++;
      return acc + count;
    }, 0),
    jogosFaltando: 18 - confrontos.filter(c => (c.set1_j1 !== null && c.set1_j2 !== null)).length
  };

  const getOpponent = () => {
    const jogo = jogos.find(j => j.data === selectedDate);
    if (!jogo) return 'Oponente';
    return jogo.time_casa === 'Azul' ? jogo.time_visitante : jogo.time_casa;
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-200 pb-20 font-sans">
      {/* Header Stats */}
      <div className="bg-[#111827] border-b border-white/5 py-4 px-6 sticky top-0 z-[60] backdrop-blur-md bg-opacity-80">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Vitórias Desafio</span>
              <span className="text-xl font-black text-emerald-500">{stats.vitoriasDesafio}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Derrotas</span>
              <span className="text-xl font-black text-rose-500">{stats.derrotasDesafio}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Sets Vencidos</span>
              <span className="text-xl font-black text-blue-500">{stats.setsVencidos}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Sets Perdidos</span>
              <span className="text-xl font-black text-slate-400">{stats.setsPerdidos}</span>
            </div>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 px-4 py-2 rounded-2xl flex items-center gap-3">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest text-yellow-500">{stats.jogosFaltando} Jogos Restantes</span>
          </div>
          <button onClick={handleLogout} className="text-[10px] font-black uppercase tracking-wider text-rose-500 hover:opacity-70 transition-opacity flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full">
            <LogOut className="w-3 h-3" /> Sair
          </button>
        </div>
      </div>

      {/* Hero Section - Simplified to match image */}
      <section className="pt-12 pb-20 flex flex-col items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111827] px-16 py-10 rounded-[48px] border border-white/5 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 opacity-50" />
          <h1 className="relative text-4xl md:text-7xl font-black italic tracking-tighter text-white uppercase leading-none text-center">
            TORNEIO DE <span className="text-blue-500">CORES</span>
          </h1>
        </motion.div>
      </section>

      <main className="max-w-6xl mx-auto px-4 -mt-12 space-y-12 relative z-20">
        {/* Main Navigation Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.button
            whileHover={{ y: -8, scale: 1.02 }}
            onClick={() => setActiveTab('dashboard')}
            className={`p-10 rounded-[40px] flex flex-col items-center justify-center gap-6 shadow-2xl group transition-all ${activeTab === 'dashboard' ? 'bg-white ring-4 ring-blue-600/20' : 'bg-white hover:bg-slate-50'}`}
          >
            <div className={`p-6 rounded-3xl ${activeTab === 'dashboard' ? 'bg-blue-500 text-white' : 'bg-blue-500/10 text-blue-600'} group-hover:scale-110 transition-transform`}>
              <LayoutDashboard className="w-10 h-10" />
            </div>
            <span className="text-sm font-black uppercase tracking-widest text-slate-900">Dashboard</span>
          </motion.button>

          <motion.button
            whileHover={{ y: -8, scale: 1.02 }}
            onClick={() => setActiveTab('jogos')}
            className={`p-10 rounded-[40px] flex flex-col items-center justify-center gap-6 shadow-2xl group transition-all ${activeTab === 'jogos' ? 'bg-white ring-4 ring-purple-600/20' : 'bg-white hover:bg-slate-50'}`}
          >
            <div className={`p-6 rounded-3xl ${activeTab === 'jogos' ? 'bg-purple-500 text-white' : 'bg-purple-500/10 text-purple-600'} group-hover:scale-110 transition-transform`}>
              <Trophy className="w-10 h-10" />
            </div>
            <span className="text-sm font-black uppercase tracking-widest text-slate-900">Jogos</span>
          </motion.button>

          <motion.button
            whileHover={{ y: -8, scale: 1.02 }}
            onClick={() => setShowUploadModal(true)}
            className="bg-white p-10 rounded-[40px] flex flex-col items-center justify-center gap-6 shadow-2xl group transition-all hover:bg-slate-50"
          >
            <div className="p-6 rounded-3xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
              <PlusCircle className="w-10 h-10" />
            </div>
            <span className="text-sm font-black uppercase tracking-widest text-slate-900">Upload Súmulas</span>
          </motion.button>
        </section>

        {activeTab === 'dashboard' ? (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[#111827] border border-white/5 rounded-[40px] p-10 space-y-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
                  <LayoutDashboard className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-widest text-white italic">Resumo de Performance</h3>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white/5 p-8 rounded-[32px] border border-white/5 space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest block">Aproveitamento</span>
                  <span className="text-4xl font-black text-white italic">{Math.round((stats.vitoriasDesafio / (stats.vitoriasDesafio + stats.derrotasDesafio || 1)) * 100)}%</span>
                </div>
                <div className="bg-white/5 p-8 rounded-[32px] border border-white/5 space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest block">Saldo de Sets</span>
                  <span className="text-4xl font-black text-white italic">{stats.setsVencidos - stats.setsPerdidos}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#111827] border border-white/5 rounded-[40px] p-10 flex flex-col justify-center items-center text-center space-y-6">
              <div className="w-24 h-24 bg-blue-600/20 rounded-full flex items-center justify-center text-blue-500 shadow-inner">
                <Users className="w-12 h-12" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-widest text-white italic">Próximo Desafio</h3>
                <p className="text-slate-400 font-medium max-w-[250px]">Prepare-se para o próximo confronto no dia {formatDate(selectedDate)}</p>
              </div>
              <button 
                onClick={() => setActiveTab('jogos')}
                className="bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-[0.2em] px-8 py-4 rounded-full transition-all border border-white/5"
              >
                Ver Agenda Completa
              </button>
            </div>
          </section>
        ) : (
          <section className="space-y-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex gap-2">
                {dates.map(date => (
                  <button 
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={`px-6 py-3 rounded-2xl font-black text-xs transition-all ${selectedDate === date ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                  >
                    {formatDate(date)}
                  </button>
                ))}
              </div>
              <div className="flex flex-col items-end">
                <h3 className="text-2xl font-black italic text-white uppercase tracking-tighter">
                  Confrontos {formatDate(selectedDate)}
                </h3>
                {jogos.find(j => j.data === selectedDate)?.sumula_url && (
                  <a 
                    href={jogos.find(j => j.data === selectedDate)?.sumula_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[10px] font-black uppercase text-blue-500 hover:underline flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" /> Ver Súmula Enviada
                  </a>
                )}
              </div>
            </div>

            <div className="bg-[#111827] border border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      <th className="px-8 py-4 w-16">#</th>
                      <th className="px-8 py-4 w-16">Cat</th>
                      <th className="px-8 py-4">Jogador 1</th>
                      <th className="px-8 py-4 text-center">Set 1</th>
                      <th className="px-8 py-4 text-center">Set 2</th>
                      <th className="px-8 py-4 text-center">Set 3</th>
                      <th className="px-8 py-4">Jogador 2</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {confrontos.map((c) => (
                      <tr key={c.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-8 py-4 text-slate-600 font-mono text-xs">{c.ordem}</td>
                        <td className="px-8 py-4">
                          <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px] font-bold">{c.categoria}</span>
                        </td>
                        <td className="px-8 py-4 font-bold text-white">{c.jogador1}</td>
                        <td className="px-8 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <input 
                              type="number" 
                              value={c.set1_j1 ?? ''} 
                              onChange={(e) => updatePlacar(c.id, 'set1_j1', parseInt(e.target.value))}
                              className="w-10 bg-slate-900 border border-white/10 rounded p-1 text-center text-xs font-bold"
                            />
                            <span className="text-slate-600">x</span>
                            <input 
                              type="number" 
                              value={c.set1_j2 ?? ''} 
                              onChange={(e) => updatePlacar(c.id, 'set1_j2', parseInt(e.target.value))}
                              className="w-10 bg-slate-900 border border-white/10 rounded p-1 text-center text-xs font-bold"
                            />
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <input 
                              type="number" 
                              value={c.set2_j1 ?? ''} 
                              onChange={(e) => updatePlacar(c.id, 'set2_j1', parseInt(e.target.value))}
                              className="w-10 bg-slate-900 border border-white/10 rounded p-1 text-center text-xs font-bold"
                            />
                            <span className="text-slate-600">x</span>
                            <input 
                              type="number" 
                              value={c.set2_j2 ?? ''} 
                              onChange={(e) => updatePlacar(c.id, 'set2_j2', parseInt(e.target.value))}
                              className="w-10 bg-slate-900 border border-white/10 rounded p-1 text-center text-xs font-bold"
                            />
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <input 
                              type="number" 
                              value={c.set3_j1 ?? ''} 
                              onChange={(e) => updatePlacar(c.id, 'set3_j1', parseInt(e.target.value))}
                              className="w-10 bg-slate-900 border border-white/10 rounded p-1 text-center text-xs font-bold"
                            />
                            <span className="text-slate-600">x</span>
                            <input 
                              type="number" 
                              value={c.set3_j2 ?? ''} 
                              onChange={(e) => updatePlacar(c.id, 'set3_j2', parseInt(e.target.value))}
                              className="w-10 bg-slate-900 border border-white/10 rounded p-1 text-center text-xs font-bold"
                            />
                          </div>
                        </td>
                        <td className="px-8 py-4 font-bold text-white">{c.jogador2}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUploadModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-[#111827] border border-white/10 rounded-[40px] p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Upload Súmula</h3>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 block">1. Selecione o Dia</label>
                  <div className="grid grid-cols-2 gap-2">
                    {dates.map(date => (
                      <button 
                        key={date}
                        onClick={() => setSelectedDate(date)}
                        className={`py-3 rounded-xl font-black text-xs transition-all ${selectedDate === date ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400'}`}
                      >
                        {formatDate(date)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 block">2. Selecione o Time</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setSelectedTeam('Azul')}
                      className={`py-4 rounded-2xl font-black uppercase tracking-widest transition-all ${selectedTeam === 'Azul' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white/5 text-slate-400'}`}
                    >
                      Azul
                    </button>
                    <button 
                      onClick={() => {
                        const jogo = jogos.find(j => j.data === selectedDate);
                        setSelectedTeam(getOpponent() as any);
                      }}
                      className={`py-4 rounded-2xl font-black uppercase tracking-widest transition-all ${selectedTeam !== 'Azul' && selectedTeam !== '' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-white/5 text-slate-400'}`}
                    >
                      {getOpponent()}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">3. Arquivo (CSV, Excel, PDF, Imagem)</label>
                  <label className="w-full bg-slate-900 border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-500/50 transition-colors">
                    <ImageIcon className="w-8 h-8 text-slate-600" />
                    <span className="text-xs text-slate-500 font-bold">{uploadFile ? uploadFile.name : 'Clique para selecionar'}</span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".csv,.xlsx,.xls,.pdf,image/*"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </div>

              <button 
                onClick={handleFileUpload}
                disabled={!uploadFile || !selectedTeam}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-lg shadow-blue-600/20 transition-all"
              >
                Enviar Duplas {selectedTeam}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="mt-20 text-center py-12 opacity-20">
        <p className="text-[10px] uppercase tracking-[0.5em] font-black">Torneio de Cores 2026 • ATP Faria Limer Style</p>
      </footer>
    </div>
  );
}
