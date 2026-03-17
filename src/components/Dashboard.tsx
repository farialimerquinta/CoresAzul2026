import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Jogo, Classificacao, Profile, ConfrontoJogador } from '../types';
import { Trophy, Calendar, Upload, Save, Image as ImageIcon, CheckCircle2, AlertCircle, LogOut, LayoutDashboard, Users, ArrowLeftRight, PlusCircle, FileText, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

const PlayerBox = ({ name, category, label, isDupla = false, isAdversario = false }: { 
  name: string, 
  category: string, 
  label: string,
  isDupla?: boolean,
  isAdversario?: boolean
}) => (
  <div className={`
    relative flex items-center gap-3 p-3 rounded-[20px] border transition-all duration-300
    ${isAdversario ? 'bg-slate-900/40 border-white/5' : 'bg-[#111827] border-yellow-400/30 shadow-lg shadow-yellow-400/5'}
    group hover:scale-[1.01] w-full
  `}>
    <div className={`
      w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shadow-inner
      ${isAdversario ? 'bg-slate-700 text-slate-300' : 'bg-yellow-400 text-slate-900'}
    `}>
      {category}
    </div>
    <div className="flex flex-col flex-1">
      <span className={`text-base font-black tracking-tight uppercase leading-tight ${isAdversario ? 'text-slate-300' : 'text-white'}`}>
        {name.split(' ')[0]}
      </span>
      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
        {name.split(' ').slice(1).join(' ') || 'TENISTA'}
      </span>
    </div>
    
    <div className="flex items-center gap-2">
      <div className="px-2 py-1 rounded-full bg-slate-900/60 border border-white/5 text-[7px] font-black text-slate-500 uppercase tracking-[0.2em]">
        TANTO FAZ
      </div>
      <button className="text-slate-600 hover:text-red-400 transition-colors">
        <X size={14} />
      </button>
    </div>
  </div>
);

export default function Dashboard() {
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [classificacao, setClassificacao] = useState<Classificacao[]>([]);
  const [confrontos, setConfrontos] = useState<ConfrontoJogador[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'jogos'>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>('2026-03-21');
  const [selectedTeam, setSelectedTeam] = useState<string>('');

  useEffect(() => {
    const jogo = jogos.find(j => j.data === selectedDate);
    if (jogo) {
      setSelectedTeam(jogo.time_casa);
    }
  }, [selectedDate, jogos]);
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
    
    // Check Storage Health
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
      console.warn('Não foi possível verificar os buckets de storage:', bucketError.message);
    } else {
      const hasSumulas = buckets?.some(b => b.id === 'sumulas');
      if (!hasSumulas) {
        setStorageError('Atenção: O bucket "sumulas" não foi encontrado no seu Storage. O upload de súmulas não funcionará até que você o crie no painel do Supabase.');
      } else {
        setStorageError(null);
      }
    }

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
        const mockConfrontos: ConfrontoJogador[] = Array.from({ length: 18 }, (_, i) => ({
          id: `${i + 1}`,
          jogo_id: 'mock',
          ordem: i + 1,
          categoria: ['B', 'F', 'E', 'D', 'C', 'B', 'A', 'A', 'B', 'C', 'D', 'E', 'F', 'A', 'B', 'C', 'D', 'E'][i] || 'B',
          jogador1: i === 0 ? 'NORIMITI' : i === 1 ? 'ROBERTO' : i === 2 ? 'SAYURI' : 'A DEFINIR',
          jogador1_dupla: i === 0 ? 'SHEILA' : i === 1 ? 'MIDORI' : i === 2 ? 'TAKATA' : null,
          jogador2: 'A DEFINIR',
          jogador2_dupla: null,
          set1_j1: 0,
          set1_j2: 0,
          set2_j1: 0,
          set2_j2: 0,
          set3_j1: 0,
          set3_j2: 0,
          vencedor: null
        }));
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

    const jogoId = jogo.id;
    const fileExt = uploadFile.name.split('.').pop()?.toLowerCase();
    const fileName = `${jogoId}-${selectedTeam}-${Date.now()}.${fileExt}`;
    const filePath = `sumulas/${fileName}`;

    setLoading(true);
    try {
      // Tenta fazer o upload
      let { error: uploadError } = await supabase.storage
        .from('sumulas')
        .upload(filePath, uploadFile);

      // Se o erro for "Bucket not found", tenta criar o bucket (pode falhar se não for admin)
      if (uploadError?.message?.includes('Bucket not found')) {
        console.log('Bucket "sumulas" não encontrado. Tentando criar...');
        const { error: createError } = await supabase.storage.createBucket('sumulas', {
          public: true
        });

        if (!createError) {
          // Tenta o upload novamente após criar o bucket
          const { error: retryError } = await supabase.storage
            .from('sumulas')
            .upload(filePath, uploadFile);
          uploadError = retryError;
        } else {
          throw new Error('O bucket "sumulas" não existe no seu Supabase. Por favor, crie um bucket chamado "sumulas" no painel do Supabase (Storage -> New Bucket) e marque-o como Público.');
        }
      }

      if (uploadError) {
        throw new Error(`Erro no Storage: ${uploadError.message}`);
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
        throw new Error(`Erro no Database: ${updateError.message}`);
      }

      // 4. Tentar processar se for CSV
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
    } finally {
      setLoading(false);
    }
  };

  const parseCSVAndMountConfrontos = async (csvText: string, jogoId: string, team: string) => {
    const lines = csvText.split('\n');
    const jogo = jogos.find(j => j.id === jogoId);
    if (!jogo) return;

    const isCasa = jogo.time_casa.toLowerCase() === team.toLowerCase();
    const fieldToUpdate = isCasa ? 'jogador1' : 'jogador2';
    const fieldDuplaToUpdate = isCasa ? 'jogador1_dupla' : 'jogador2_dupla';
    const otherField = isCasa ? 'jogador2' : 'jogador1';
    const otherFieldDupla = isCasa ? 'jogador2_dupla' : 'jogador1_dupla';

    for (const line of lines) {
      if (!line.trim()) continue;
      
      const parts = line.includes(';') ? line.split(';') : line.split(',');
      
      if (parts.length >= 3) {
        const ordem = parseInt(parts[0].trim());
        const categoria = parts[1].trim();
        const jogador = parts[2].trim();
        const jogadorDupla = parts[3] ? parts[3].trim() : null;

        if (!isNaN(ordem) && jogador) {
          const { data: existing } = await supabase
            .from('confrontos_jogadores')
            .select('id, jogador1, jogador2, jogador1_dupla, jogador2_dupla')
            .eq('jogo_id', jogoId)
            .eq('ordem', ordem)
            .single();

          if (existing) {
            await supabase
              .from('confrontos_jogadores')
              .update({ 
                [fieldToUpdate]: jogador, 
                [fieldDuplaToUpdate]: jogadorDupla,
                categoria,
                [otherField]: existing[otherField] || 'A definir',
                [otherFieldDupla]: existing[otherFieldDupla] || null
              })
              .eq('id', existing.id);
          } else {
            await supabase
              .from('confrontos_jogadores')
              .insert({ 
                jogo_id: jogoId, 
                ordem: ordem, 
                categoria: categoria,
                [fieldToUpdate]: jogador,
                [fieldDuplaToUpdate]: jogadorDupla,
                [otherField]: 'A definir',
                [otherFieldDupla]: null
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
      {/* Hero Section - Narrower as requested */}
      <section className="pt-8 pb-12 flex flex-col items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111827] px-12 py-6 rounded-[32px] border border-white/5 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 opacity-50" />
          <h1 className="relative text-3xl md:text-5xl font-black italic tracking-tighter text-white uppercase leading-none text-center">
            TORNEIO DE <span className="text-blue-500">CORES</span>
          </h1>
        </motion.div>
      </section>

      <main className="max-w-6xl mx-auto px-4 space-y-8 relative z-20">
        {/* Main Navigation Grid */}
        <section className={`grid gap-6 transition-all duration-500 ${activeTab === 'dashboard' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-4'}`}>
          <motion.button
            whileHover={{ y: -4, scale: 1.01 }}
            onClick={() => setActiveTab('dashboard')}
            className={`rounded-[32px] flex items-center justify-center gap-4 shadow-xl group transition-all ${activeTab === 'dashboard' ? 'bg-white p-10 flex-col' : 'bg-white/5 border border-white/10 p-4'}`}
          >
            <div className={`rounded-2xl ${activeTab === 'dashboard' ? 'bg-blue-500 text-white p-6' : 'bg-blue-500/10 text-blue-600 p-3'} group-hover:scale-110 transition-transform`}>
              <LayoutDashboard className={activeTab === 'dashboard' ? "w-10 h-10" : "w-5 h-5"} />
            </div>
            <span className={`font-black uppercase tracking-widest ${activeTab === 'dashboard' ? 'text-sm text-slate-900' : 'text-[10px] text-slate-400'}`}>Dashboard</span>
          </motion.button>

          <motion.button
            whileHover={{ y: -4, scale: 1.01 }}
            onClick={() => setActiveTab('jogos')}
            className={`rounded-[32px] flex items-center justify-center gap-4 shadow-xl group transition-all ${activeTab === 'jogos' ? 'bg-white p-10 flex-col' : 'bg-white/5 border border-white/10 p-4'}`}
          >
            <div className={`rounded-2xl ${activeTab === 'jogos' ? 'bg-purple-500 text-white p-6' : 'bg-purple-500/10 text-purple-600 p-3'} group-hover:scale-110 transition-transform`}>
              <Trophy className={activeTab === 'jogos' ? "w-10 h-10" : "w-5 h-5"} />
            </div>
            <span className={`font-black uppercase tracking-widest ${activeTab === 'jogos' ? 'text-sm text-slate-900' : 'text-[10px] text-slate-400'}`}>Jogos</span>
          </motion.button>

          <motion.button
            whileHover={{ y: -4, scale: 1.01 }}
            onClick={() => setShowUploadModal(true)}
            className={`rounded-[32px] flex items-center justify-center gap-4 shadow-xl group transition-all bg-white/5 border border-white/10 ${activeTab === 'dashboard' ? 'p-10 flex-col' : 'p-4'}`}
          >
            <div className={`rounded-2xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform ${activeTab === 'dashboard' ? 'p-6' : 'p-3'}`}>
              <PlusCircle className={activeTab === 'dashboard' ? "w-10 h-10" : "w-5 h-5"} />
            </div>
            <span className={`font-black uppercase tracking-widest text-slate-400 ${activeTab === 'dashboard' ? 'text-sm' : 'text-[10px]'}`}>Upload Súmulas</span>
          </motion.button>

          {activeTab !== 'dashboard' && (
            <div className="flex gap-2 items-center justify-center bg-white/5 border border-white/10 rounded-[32px] p-2">
              {dates.map(date => (
                <button 
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedDate === date ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {formatDate(date)}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Header Stats - Now Large and below Menu */}
        <div className="bg-[#111827] border border-white/5 rounded-[40px] p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] -mr-32 -mt-32" />
          <div className="flex flex-wrap items-center justify-between gap-12 relative z-10">
            <div className="flex items-center gap-16 flex-1 justify-around md:justify-start">
              <div className="flex flex-col">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-[0.2em] mb-2">Vitórias Desafio</span>
                <span className="text-6xl font-black text-emerald-500 italic leading-none tracking-tighter">{stats.vitoriasDesafio}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-[0.2em] mb-2">Derrotas</span>
                <span className="text-6xl font-black text-rose-500 italic leading-none tracking-tighter">{stats.derrotasDesafio}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-[0.2em] mb-2">Sets Vencidos</span>
                <span className="text-6xl font-black text-blue-500 italic leading-none tracking-tighter">{stats.setsVencidos}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-[0.2em] mb-2">Sets Perdidos</span>
                <span className="text-6xl font-black text-slate-400 italic leading-none tracking-tighter">{stats.setsPerdidos}</span>
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="bg-yellow-500/10 border border-yellow-500/20 px-8 py-4 rounded-3xl flex items-center gap-4">
                <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                <span className="text-sm font-black uppercase tracking-[0.2em] text-yellow-500">{stats.jogosFaltando} Jogos Restantes</span>
              </div>
              <button onClick={handleLogout} className="text-xs font-black uppercase tracking-[0.2em] text-rose-500 hover:bg-rose-500/10 transition-all flex items-center gap-3 bg-white/5 px-8 py-4 rounded-3xl border border-white/5">
                <LogOut className="w-4 h-4" /> Sair
              </button>
            </div>
          </div>
        </div>

        {storageError && profile?.role === 'admin' && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-[32px] p-6 flex items-start gap-4 text-amber-500">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-black uppercase text-[10px] tracking-[0.2em]">Configuração Necessária</p>
              <p className="text-sm font-medium opacity-80">{storageError}</p>
            </div>
          </div>
        )}

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
            <div className="flex items-center justify-between px-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Confrontos do Dia</span>
                <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">
                  {jogos.find(j => j.data === selectedDate)?.time_casa} <span className="text-blue-500">VS</span> {jogos.find(j => j.data === selectedDate)?.time_visitante}
                </h2>
              </div>
              {jogos.find(j => j.data === selectedDate)?.sumula_url && (
                <a 
                  href={jogos.find(j => j.data === selectedDate)?.sumula_url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-500 hover:bg-white/10 transition-all flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" /> Ver Súmula Original
                </a>
              )}
            </div>

            <div className="space-y-6">
              {confrontos.map((c, idx) => (
                <motion.div 
                  key={c.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-[#0d121f] border border-white/5 rounded-[40px] overflow-hidden flex flex-col lg:flex-row items-stretch group relative"
                >
                  {/* Top Right Button: Analisar */}
                  <div className="absolute top-6 right-8 z-10">
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/10 transition-all">
                      <FileText className="w-3 h-3" /> Analisar
                    </button>
                  </div>

                  {/* Left Sidebar: Match Info */}
                  <div className="bg-[#111827] border-r border-white/5 px-8 py-10 flex flex-col items-center justify-center min-w-[140px] gap-4 relative">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em] mb-1">MATCH</span>
                      <span className="text-6xl font-black italic text-white leading-none tracking-tighter">{c.ordem}</span>
                    </div>
                    <div className="w-14 h-14 bg-yellow-400 text-slate-900 rounded-[20px] flex items-center justify-center font-black text-2xl shadow-xl shadow-yellow-400/20">
                      {c.categoria}
                    </div>
                  </div>

                  {/* Main Content: Players and Scores */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center p-6 md:p-10 gap-6 md:gap-10">
                    
                    {/* Team 1 (Left) */}
                    <div className="space-y-4">
                      <PlayerBox 
                        name={c.jogador1} 
                        category={c.categoria} 
                        label="BOX 1"
                      />
                      <PlayerBox 
                        name={c.jogador1_dupla || 'A DEFINIR'} 
                        category={c.categoria} 
                        label="BOX 2"
                        isDupla
                      />
                    </div>

                    {/* Scores Section (Middle) */}
                    <div className="bg-slate-900/30 border border-white/5 rounded-[32px] p-6 flex flex-col gap-4 min-w-[200px] order-last md:order-none">
                      {[1, 2, 3].map(setNum => (
                        <div key={setNum} className="flex items-center justify-between gap-4">
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em] w-10">{setNum}.SET</span>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              value={c[`set${setNum}_j1` as keyof ConfrontoJogador] ?? ''} 
                              onChange={(e) => updatePlacar(c.id, `set${setNum}_j1`, parseInt(e.target.value))}
                              className="w-12 h-12 bg-slate-900 border border-white/10 rounded-xl text-center text-xl font-black text-white focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 outline-none transition-all"
                            />
                            <input 
                              type="number" 
                              value={c[`set${setNum}_j2` as keyof ConfrontoJogador] ?? ''} 
                              onChange={(e) => updatePlacar(c.id, `set${setNum}_j2`, parseInt(e.target.value))}
                              className="w-12 h-12 bg-slate-900 border border-white/10 rounded-xl text-center text-xl font-black text-white focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 outline-none transition-all"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Team 2 (Right) */}
                    <div className="space-y-4">
                      <PlayerBox 
                        name={c.jogador2} 
                        category={c.categoria} 
                        label="BOX 1"
                        isAdversario
                      />
                      <PlayerBox 
                        name={c.jogador2_dupla || 'A DEFINIR'} 
                        category={c.categoria} 
                        label="BOX 2"
                        isDupla
                        isAdversario
                      />
                    </div>

                  </div>
                </motion.div>
              ))}
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

                {jogos.find(j => j.data === selectedDate) && (
                  <div className="bg-blue-600/10 border border-blue-600/20 rounded-2xl p-4 text-center">
                    <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-1">Confronto do Dia</p>
                    <p className="text-lg font-black text-white italic uppercase">
                      {jogos.find(j => j.data === selectedDate)?.time_casa} 
                      <span className="text-blue-500 mx-2 text-sm">VS</span> 
                      {jogos.find(j => j.data === selectedDate)?.time_visitante}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 block">2. Selecione o Time</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setSelectedTeam(jogos.find(j => j.data === selectedDate)?.time_casa || '')}
                      className={`py-4 rounded-2xl font-black uppercase tracking-widest transition-all ${selectedTeam === jogos.find(j => j.data === selectedDate)?.time_casa ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white/5 text-slate-400'}`}
                    >
                      {jogos.find(j => j.data === selectedDate)?.time_casa}
                    </button>
                    <button 
                      onClick={() => setSelectedTeam(jogos.find(j => j.data === selectedDate)?.time_visitante || '')}
                      className={`py-4 rounded-2xl font-black uppercase tracking-widest transition-all ${selectedTeam === jogos.find(j => j.data === selectedDate)?.time_visitante ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-white/5 text-slate-400'}`}
                    >
                      {jogos.find(j => j.data === selectedDate)?.time_visitante}
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
