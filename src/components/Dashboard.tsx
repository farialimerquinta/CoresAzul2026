import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Jogo, Classificacao, Profile, ConfrontoJogador } from '../types';
import { Trophy, Calendar, Upload, Save, Image as ImageIcon, CheckCircle2, AlertCircle, LogOut, LayoutDashboard, Users, ArrowLeftRight, PlusCircle, FileText, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

import { GoogleGenAI, Type } from "@google/genai";
import * as XLSX from 'xlsx';

const getTeamColor = (teamName: string) => {
  const name = teamName?.toLowerCase() || '';
  if (name.includes('azul')) return { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500/30', shadow: 'shadow-blue-500/20', light: 'bg-blue-500/10' };
  if (name.includes('roxo')) return { bg: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-500/30', shadow: 'shadow-purple-500/20', light: 'bg-purple-500/10' };
  if (name.includes('verde')) return { bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-500/30', shadow: 'shadow-emerald-500/20', light: 'bg-emerald-500/10' };
  if (name.includes('amarelo')) return { bg: 'bg-yellow-400', text: 'text-yellow-400', border: 'border-yellow-400/30', shadow: 'shadow-yellow-400/20', light: 'bg-yellow-400/10' };
  if (name.includes('laranja')) return { bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-500/30', shadow: 'shadow-orange-500/20', light: 'bg-orange-500/10' };
  if (name.includes('vermelho')) return { bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-500/30', shadow: 'shadow-red-500/20', light: 'bg-red-500/10' };
  return { bg: 'bg-slate-500', text: 'text-slate-500', border: 'border-slate-500/30', shadow: 'shadow-slate-500/20', light: 'bg-slate-500/10' };
};

const PlayerBox = ({ name = '', category, label, isDupla = false, teamName = '', onUpdate, isAdmin = false }: { 
  name?: string, 
  category: string, 
  label: string,
  isDupla?: boolean,
  teamName?: string,
  onUpdate?: (val: string) => void,
  isAdmin?: boolean
}) => {
  const colors = getTeamColor(teamName);
  const nameParts = (name || 'A DEFINIR').split(' ');
  const firstName = nameParts[0];
  const surname = nameParts.slice(1).join(' ') || 'TENISTA';
  
  return (
    <div className={`
      relative flex items-center gap-3 p-3 rounded-[20px] border transition-all duration-300
      bg-[#111827] ${colors.border} shadow-lg ${colors.shadow}
      group hover:scale-[1.01] w-full
    `}>
      <div className={`
        w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shadow-inner
        ${colors.bg} text-white
      `}>
        {category}
      </div>
      <div className="flex flex-col flex-1">
        {isAdmin ? (
          <input
            type="text"
            value={name || ''}
            onChange={(e) => onUpdate?.(e.target.value)}
            className="bg-transparent border-none p-0 text-base font-black tracking-tight uppercase leading-tight focus:ring-0 w-full text-white"
            placeholder="NOME DO TENISTA"
          />
        ) : (
          <>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
              {firstName}
            </span>
            <span className="text-lg font-black tracking-tight uppercase leading-tight text-white">
              {surname}
            </span>
          </>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <div className={`px-2 py-1 rounded-full ${colors.light} border ${colors.border} text-[7px] font-black ${colors.text} uppercase tracking-[0.2em]`}>
          {isDupla ? 'DUPLA' : 'SIMPLES'}
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [classificacao, setClassificacao] = useState<Classificacao[]>([]);
  const [confrontos, setConfrontos] = useState<ConfrontoJogador[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [dismissStorageError, setDismissStorageError] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
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

  const stats = useMemo(() => {
    const currentConfrontos = confrontos || [];
    
    let vitoriasCasa = 0;
    let vitoriasVisitante = 0;
    let setsCasa = 0;
    let setsVisitante = 0;
    let partidasJogadas = 0;

    currentConfrontos.forEach(c => {
      let setsGanhosJ1 = 0;
      let setsGanhosJ2 = 0;
      let jogou = false;

      // Uma partida é considerada jogada se pelo menos um set tem placar diferente de zero
      const s1_1 = c.set1_j1 || 0;
      const s1_2 = c.set1_j2 || 0;
      const s2_1 = c.set2_j1 || 0;
      const s2_2 = c.set2_j2 || 0;
      const s3_1 = c.set3_j1 || 0;
      const s3_2 = c.set3_j2 || 0;

      if (s1_1 > 0 || s1_2 > 0 || s2_1 > 0 || s2_2 > 0 || s3_1 > 0 || s3_2 > 0) {
        jogou = true;
      }

      if (c.set1_j1 !== null && c.set1_j2 !== null) {
        if (c.set1_j1 > c.set1_j2) setsGanhosJ1++;
        else if (c.set1_j2 > c.set1_j1) setsGanhosJ2++;
      }
      if (c.set2_j1 !== null && c.set2_j2 !== null) {
        if (c.set2_j1 > c.set2_j2) setsGanhosJ1++;
        else if (c.set2_j2 > c.set2_j1) setsGanhosJ2++;
      }
      if (c.set3_j1 !== null && c.set3_j2 !== null) {
        if (c.set3_j1 > c.set3_j2) setsGanhosJ1++;
        else if (c.set3_j2 > c.set3_j1) setsGanhosJ2++;
      }

      if (jogou) {
        partidasJogadas++;
        setsCasa += setsGanhosJ1;
        setsVisitante += setsGanhosJ2;
        if (setsGanhosJ1 > setsGanhosJ2) vitoriasCasa++;
        else if (setsGanhosJ2 > setsGanhosJ1) vitoriasVisitante++;
      }
    });

    return {
      vitoriasCasa,
      vitoriasVisitante,
      derrotasCasa: vitoriasVisitante,
      derrotasVisitante: vitoriasCasa,
      setsCasa,
      setsVisitante,
      partidasJogadas,
      jogosFaltando: 18 - partidasJogadas
    };
  }, [confrontos]);

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
    
    // Check Storage Health - More robust check
    try {
      // Em vez de getBucket (que exige admin), tentamos listar arquivos. 
      // Se o bucket não existir, dará erro.
      const { error: listError } = await supabase.storage.from('sumulas').list('', { limit: 1 });
      
      if (listError) {
        if (listError.message.includes('not found') || listError.message.includes('does not exist')) {
          setStorageError('O bucket "sumulas" não foi encontrado. Crie-o no painel Storage do Supabase como "Public".');
        } else {
          // Outros erros (permissão) ignoramos
          setStorageError(null);
        }
      } else {
        setStorageError(null);
      }
    } catch (e) {
      setStorageError(null);
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
      
      if (confRes.data) {
        setConfrontos(confRes.data);
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
    setIsProcessingAI(true);
    try {
      // 1. PROCESSAMENTO INTELIGENTE PRIMEIRO (Garantir que os dados entrem no banco)
      console.log('Iniciando processamento de arquivo...');
      if (fileExt === 'csv') {
        const text = await uploadFile.text();
        await parseCSVAndMountConfrontos(text, jogoId, selectedTeam);
      } else {
        // Usar Gemini para ler Print Screen, PDF ou Excel
        await parseFileWithAI(uploadFile, jogoId, selectedTeam);
      }
      
      console.log('Dados processados com sucesso. Tentando salvar arquivo no Storage...');

      // 2. TENTAR UPLOAD PARA STORAGE (Como backup/referência)
      try {
        const { error: uploadError } = await supabase.storage
          .from('sumulas')
          .upload(filePath, uploadFile, {
            cacheControl: '3600',
            upsert: true
          });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('sumulas')
            .getPublicUrl(filePath);

          await supabase
            .from('jogos')
            .update({ sumula_url: publicUrl })
            .eq('id', jogoId);
          console.log('Arquivo salvo no Storage com sucesso.');
        } else {
          console.warn('Erro ao salvar arquivo (Storage), mas os dados foram processados:', uploadError.message);
        }
      } catch (storageErr) {
        console.warn('Falha silenciosa no Storage:', storageErr);
      }

      setShowUploadModal(false);
      setUploadFile(null);
      await fetchData();
      alert('Dados extraídos e salvos com sucesso!');
    } catch (error: any) {
      console.error('Erro crítico no processamento:', error);
      alert(`Erro ao processar arquivo: ${error.message || 'Verifique se o arquivo está legível.'}`);
    } finally {
      setLoading(false);
      setIsProcessingAI(false);
    }
  };

  const parseFileWithAI = async (file: File, jogoId: string, team: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.type.includes('spreadsheet');
    
    let base64Data = '';
    let excelText = '';

    if (isExcel) {
      // Processar Excel localmente primeiro
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      excelText = XLSX.utils.sheet_to_csv(firstSheet);
      console.log('Excel convertido para texto:', excelText);
    } else {
      // Converter imagem/PDF para base64
      base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          if (result && result.includes(',')) {
            resolve(result.split(',')[1]);
          } else {
            reject(new Error('Falha ao ler arquivo'));
          }
        };
        reader.onerror = () => reject(new Error('Erro na leitura do arquivo'));
        reader.readAsDataURL(file);
      });
    }

    const prompt = `Analise esta súmula de tênis. 
    ${isExcel ? `Abaixo está o conteúdo da planilha em formato CSV:\n\n${excelText}\n\n` : 'O arquivo é uma imagem ou PDF.'}
    Extraia os confrontos para o time "${team}".
    Retorne uma lista de objetos JSON com:
    - ordem: número do confronto (1 a 18)
    - categoria: letra da categoria (A, B, C, D, E, F)
    - jogador: nome do primeiro jogador do time "${team}"
    - jogadorDupla: nome do segundo jogador do time "${team}" (se for dupla, senão null)
    
    Ignore os jogadores do time adversário. Foque apenas no time "${team}".`;

    try {
      const parts: any[] = [{ text: prompt }];
      
      if (!isExcel) {
        parts.push({
          inlineData: {
            mimeType: file.type || 'image/jpeg',
            data: base64Data
          }
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                ordem: { type: Type.INTEGER },
                categoria: { type: Type.STRING },
                jogador: { type: Type.STRING },
                jogadorDupla: { type: Type.STRING, nullable: true }
              },
              required: ["ordem", "categoria", "jogador"]
            }
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error('Resposta da IA vazia');
      
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('Formato de resposta da IA inválido');

      console.log('Dados extraídos pela IA:', data);

      // Atualizar banco de dados com os dados da IA
      for (const item of data) {
        const jogo = jogos.find(j => j.id === jogoId);
        if (!jogo) continue;

        const isCasa = jogo.time_casa.toLowerCase() === team.toLowerCase();
        const fieldToUpdate = isCasa ? 'jogador1' : 'jogador2';
        const fieldDuplaToUpdate = isCasa ? 'jogador1_dupla' : 'jogador2_dupla';

        await supabase
          .from('confrontos_jogadores')
          .update({ 
            [fieldToUpdate]: item.jogador || 'A DEFINIR', 
            [fieldDuplaToUpdate]: item.jogadorDupla || null,
            categoria: item.categoria || 'B'
          })
          .eq('jogo_id', jogoId)
          .eq('ordem', item.ordem);
      }
    } catch (e: any) {
      console.error('Erro na IA:', e);
      throw new Error(`Erro na IA: ${e.message || 'A IA não conseguiu ler este arquivo.'}`);
    }
  };

  const parseCSVAndMountConfrontos = async (csvText: string, jogoId: string, team: string) => {
    const lines = csvText.split(/\r?\n/);
    const jogo = jogos.find(j => j.id === jogoId);
    if (!jogo) return;

    console.log(`Processando ${lines.length} linhas do CSV para o time ${team}...`);

    const isCasa = jogo.time_casa.toLowerCase() === team.toLowerCase();
    const fieldToUpdate = isCasa ? 'jogador1' : 'jogador2';
    const fieldDuplaToUpdate = isCasa ? 'jogador1_dupla' : 'jogador2_dupla';
    const otherField = isCasa ? 'jogador2' : 'jogador1';
    const otherFieldDupla = isCasa ? 'jogador2_dupla' : 'jogador1_dupla';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.toLowerCase().includes('ordem')) continue; // Pula cabeçalho
      
      const parts = trimmedLine.includes(';') ? trimmedLine.split(';') : trimmedLine.split(',');
      
      if (parts.length >= 3) {
        const ordem = parseInt(parts[0].trim());
        const categoria = parts[1].trim();
        const jogador = parts[2].trim();
        const jogadorDupla = parts[3] && parts[3].trim() !== '' ? parts[3].trim() : null;

        if (!isNaN(ordem) && jogador) {
          console.log(`Atualizando confronto ${ordem}: ${jogador}`);
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
    console.log('Processamento de CSV concluído.');
  };

  const updateJogador = async (confId: string, field: string, value: string | null) => {
    if (profile?.role !== 'admin') return;
    
    const { error } = await supabase
      .from('confrontos_jogadores')
      .update({ [field]: value })
      .eq('id', confId);

    if (!error) fetchData();
  };

  const updatePlacar = async (confId: string, field: string, value: number | null) => {
    if (profile?.role !== 'admin') return;
    
    const { error } = await supabase
      .from('confrontos_jogadores')
      .update({ [field]: value })
      .eq('id', confId);

    if (!error) fetchData();
  };

  const saveMatchScores = async (confId: string) => {
    if (profile?.role !== 'admin') return;

    const updates: any = {};
    [1, 2, 3].forEach(setNum => {
      const v1 = (document.getElementById(`set${setNum}_j1_${confId}`) as HTMLInputElement)?.value;
      const v2 = (document.getElementById(`set${setNum}_j2_${confId}`) as HTMLInputElement)?.value;
      updates[`set${setNum}_j1`] = v1 === '' ? null : parseInt(v1);
      updates[`set${setNum}_j2`] = v2 === '' ? null : parseInt(v2);
    });

    const { error } = await supabase
      .from('confrontos_jogadores')
      .update(updates)
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

      <main className="max-w-6xl mx-auto px-4 space-y-6 relative z-20">
        {/* Main Navigation - Compact & Professional */}
        <section className="flex flex-col md:flex-row gap-3">
          <div className="flex flex-1 gap-3">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 flex items-center justify-center gap-3 py-3 px-6 rounded-2xl transition-all border ${
                activeTab === 'dashboard' 
                ? 'bg-white border-white shadow-lg shadow-white/5' 
                : 'bg-white/5 border-white/5 hover:bg-white/10'
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${activeTab === 'dashboard' ? 'text-slate-900' : 'text-slate-400'}`}>Dashboard</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab('jogos')}
              className={`flex-1 flex items-center justify-center gap-3 py-3 px-6 rounded-2xl transition-all border ${
                activeTab === 'jogos' 
                ? 'bg-white border-white shadow-lg shadow-white/5' 
                : 'bg-white/5 border-white/5 hover:bg-white/10'
              }`}
            >
              <Trophy className={`w-4 h-4 ${activeTab === 'jogos' ? 'text-purple-600' : 'text-slate-400'}`} />
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${activeTab === 'jogos' ? 'text-slate-900' : 'text-slate-400'}`}>Jogos</span>
            </motion.button>
          </div>

          <div className="flex flex-1 gap-3">
            {profile?.role === 'admin' && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowUploadModal(true)}
                className="flex-1 flex items-center justify-center gap-3 py-3 px-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all group"
              >
                <PlusCircle className="w-4 h-4 text-emerald-500 group-hover:rotate-90 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Upload Súmulas</span>
              </motion.button>
            )}

            {activeTab === 'jogos' && (
              <div className="flex-[2] flex gap-1 p-1 bg-white/5 border border-white/5 rounded-2xl">
                {dates.map(date => (
                  <button 
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                      selectedDate === date 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {formatDate(date)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {storageError && !dismissStorageError && profile?.role === 'admin' && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-[32px] p-6 flex items-center justify-between gap-4 text-amber-500">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <div className="space-y-1">
                <p className="font-black uppercase text-[10px] tracking-[0.2em]">Configuração Necessária</p>
                <p className="text-sm font-medium opacity-80">{storageError}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => fetchData()}
                className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Verificar
              </button>
              <button 
                onClick={() => setDismissStorageError(true)}
                className="p-2 hover:bg-white/5 rounded-full transition-colors"
                title="Fechar aviso"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' ? (
          <section className="space-y-8">
            {/* Header Stats - Now inside Dashboard Tab */}
            <div className="bg-[#111827] border border-white/5 rounded-[40px] p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] -mr-32 -mt-32" />
              <div className="flex flex-wrap items-center justify-between gap-12 relative z-10">
                <div className="flex-1 max-w-2xl mx-auto space-y-4">
                  <div className="grid grid-cols-3 items-center text-center">
                    <span className="text-4xl font-black text-emerald-500 italic">{stats.vitoriasCasa}</span>
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Vitórias</span>
                    <span className="text-4xl font-black text-emerald-500 italic">{stats.vitoriasVisitante}</span>
                  </div>
                  <div className="grid grid-cols-3 items-center text-center">
                    <span className="text-4xl font-black text-rose-500 italic">{stats.derrotasCasa}</span>
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Derrotas</span>
                    <span className="text-4xl font-black text-rose-500 italic">{stats.derrotasVisitante}</span>
                  </div>
                  <div className="grid grid-cols-3 items-center text-center">
                    <span className="text-4xl font-black text-blue-500 italic">{stats.setsCasa}</span>
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Sets Vencidos</span>
                    <span className="text-4xl font-black text-blue-500 italic">{stats.setsVisitante}</span>
                  </div>
                  <div className="grid grid-cols-3 items-center text-center">
                    <span className="text-4xl font-black text-slate-400 italic">{stats.setsVisitante}</span>
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Sets Perdidos</span>
                    <span className="text-4xl font-black text-slate-400 italic">{stats.setsCasa}</span>
                  </div>
                  <div className="grid grid-cols-3 items-center text-center">
                    <span className="text-4xl font-black text-white italic">{stats.partidasJogadas}</span>
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Partidas Jogadas</span>
                    <span className="text-4xl font-black text-white italic">{stats.partidasJogadas}</span>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                  <span className="text-4xl font-black text-white italic">{Math.round((stats.vitoriasCasa / (stats.vitoriasCasa + stats.vitoriasVisitante || 1)) * 100)}%</span>
                </div>
                <div className="bg-white/5 p-8 rounded-[32px] border border-white/5 space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest block">Saldo de Sets</span>
                  <span className="text-4xl font-black text-white italic">{stats.setsCasa - stats.setsVisitante}</span>
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
            </div>
          </section>
        ) : (
          <section className="space-y-8 max-w-5xl mx-auto">
            {/* Header do Dia - Centralizado e Compacto */}
            <div className="text-center space-y-4 px-4 py-6 relative">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-600/5 to-transparent blur-3xl -z-10" />
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-yellow-500/80">Confrontos do Dia</span>
              
              <div className="flex items-center justify-center gap-6 md:gap-12">
                <div className="flex flex-col items-center gap-2">
                  <h2 className={`text-5xl md:text-8xl font-black italic uppercase tracking-tighter drop-shadow-2xl ${getTeamColor(jogos.find(j => j.data === selectedDate)?.time_casa || '').text}`}>
                    {jogos.find(j => j.data === selectedDate)?.time_casa}
                  </h2>
                </div>
                
                <div className="flex flex-col items-center">
                  <span className="text-xl md:text-3xl font-black text-white/20 italic tracking-widest">VS</span>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <h2 className={`text-5xl md:text-8xl font-black italic uppercase tracking-tighter drop-shadow-2xl ${getTeamColor(jogos.find(j => j.data === selectedDate)?.time_visitante || '').text}`}>
                    {jogos.find(j => j.data === selectedDate)?.time_visitante}
                  </h2>
                </div>
              </div>

              <div className="flex justify-center pt-4">
                {jogos.find(j => j.data === selectedDate)?.sumula_url && (
                  <a 
                    href={jogos.find(j => j.data === selectedDate)?.sumula_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="bg-white/5 border border-white/10 px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest text-blue-500 hover:bg-white/10 transition-all flex items-center gap-2"
                  >
                    <FileText className="w-3 h-3" /> Ver Súmula Original
                  </a>
                )}
              </div>
            </div>

            {/* Header Stats - Centralizado, Compacto e com Frames Responsivos */}
            <div className="bg-[#0d121f]/80 backdrop-blur-xl border border-white/5 rounded-[48px] p-8 md:p-12 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[120px] -mr-48 -mt-48 transition-all group-hover:bg-blue-600/20" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/10 blur-[120px] -ml-48 -mb-48 transition-all group-hover:bg-purple-600/20" />
              
              <div className="relative z-10 flex flex-col items-center gap-10">
                <div className="w-full max-w-3xl space-y-6">
                  {/* Linhas de Stats Centralizadas */}
                  {[
                    { label: 'Vitórias', val1: stats.vitoriasCasa, val2: stats.vitoriasVisitante, color: 'text-emerald-500' },
                    { label: 'Derrotas', val1: stats.derrotasCasa, val2: stats.derrotasVisitante, color: 'text-rose-500' },
                    { label: 'Sets Vencidos', val1: stats.setsCasa, val2: stats.setsVisitante, color: 'text-blue-500' },
                    { label: 'Sets Perdidos', val1: stats.setsVisitante, val2: stats.setsCasa, color: 'text-slate-400' },
                    { label: 'Partidas Jogadas', val1: stats.partidasJogadas, val2: stats.partidasJogadas, color: 'text-white' },
                  ].map((stat, i) => (
                    <div key={i} className="grid grid-cols-3 items-center group/row">
                      <div className="text-right pr-8">
                        <span className={`text-4xl md:text-5xl font-black italic tracking-tighter transition-transform group-hover/row:scale-110 inline-block ${stat.color}`}>
                          {stat.val1}
                        </span>
                      </div>
                      <div className="text-center">
                        <span className="text-[9px] md:text-[11px] font-black uppercase text-slate-500 tracking-[0.3em] whitespace-nowrap opacity-60 group-hover/row:opacity-100 transition-opacity">
                          {stat.label}
                        </span>
                      </div>
                      <div className="text-left pl-8">
                        <span className={`text-4xl md:text-5xl font-black italic tracking-tighter transition-transform group-hover/row:scale-110 inline-block ${stat.color}`}>
                          {stat.val2}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4 w-full">
                  <div className="bg-yellow-500/5 border border-yellow-500/10 px-8 py-3 rounded-full flex items-center gap-4 transition-all hover:bg-yellow-500/10">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-500/80">{stats.jogosFaltando} Jogos Restantes</span>
                  </div>
                  <button 
                    onClick={handleLogout} 
                    className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/10 transition-all flex items-center gap-3 bg-white/5 px-8 py-3 rounded-full border border-white/5"
                  >
                    <LogOut className="w-3 h-3" /> Sair
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de Confrontos */}
            <div className="space-y-6">
              {confrontos.map((c, idx) => {
                const jogo = jogos.find(j => j.data === selectedDate);
                if (!jogo) return null;

                return (
                  <motion.div 
                    key={c.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group relative"
                  >
                    {/* Glow Effect on Hover */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-[40px] blur opacity-0 group-hover:opacity-100 transition duration-500" />
                    
                    <div className="relative bg-[#0d121f]/90 backdrop-blur-2xl border border-white/5 rounded-[40px] overflow-hidden">
                      {/* Match Header Centralizado */}
                      <div className="bg-[#111827] border-b border-white/5 py-4 flex flex-col items-center justify-center relative">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em] mb-1">MATCH</span>
                        <span className="text-4xl font-black italic text-white leading-none tracking-tighter">{c.ordem}</span>
                        <div className={`absolute right-8 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl ${getTeamColor(jogo.time_casa).bg} flex items-center justify-center text-white font-black text-sm shadow-xl ${getTeamColor(jogo.time_casa).shadow}`}>
                          {c.categoria}
                        </div>
                      </div>

                      <div className="flex flex-col items-stretch">
                        {/* Main Content Area */}
                        <div className="flex-1 p-6 lg:p-10">
                          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-8 lg:gap-12">
                            
                            {/* Time Casa (Esquerda) */}
                            <div className="space-y-3">
                              <PlayerBox 
                                name={c.jogador1} 
                                category={c.categoria} 
                                label="BOX 1"
                                teamName={jogo.time_casa}
                                isAdmin={profile?.role === 'admin'}
                                onUpdate={(val) => updateJogador(c.id, 'jogador1', val)}
                              />
                              {c.jogador1_dupla && (
                                <PlayerBox 
                                  name={c.jogador1_dupla} 
                                  category={c.categoria} 
                                  label="BOX 2"
                                  isDupla
                                  teamName={jogo.time_casa}
                                  isAdmin={profile?.role === 'admin'}
                                  onUpdate={(val) => updateJogador(c.id, 'jogador1_dupla', val)}
                                />
                              )}
                            </div>

                            {/* Placar Central */}
                            <div className="flex flex-col items-center justify-center bg-slate-900/40 rounded-[32px] p-6 border border-white/5 min-w-[220px] order-last md:order-none">
                              <div className="space-y-4 w-full">
                                {[1, 2, 3].map(setNum => {
                                  const s1 = c[`set${setNum}_j1` as keyof ConfrontoJogador];
                                  const s2 = c[`set${setNum}_j2` as keyof ConfrontoJogador];
                                  const isVisible = s1 !== null || s2 !== null || profile?.role === 'admin';
                                  
                                  if (!isVisible) return null;

                                  return (
                                    <div key={setNum} className="flex flex-col items-center gap-2">
                                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em]">Set {setNum}</span>
                                      <div className="flex items-center gap-3">
                                        <input 
                                          type="number" 
                                          defaultValue={s1 ?? ''} 
                                          disabled={profile?.role !== 'admin'}
                                          id={`set${setNum}_j1_${c.id}`}
                                          className={`w-14 h-14 bg-slate-900 border border-white/10 rounded-2xl text-center text-2xl font-black text-white focus:ring-2 transition-all disabled:opacity-100 ${getTeamColor(jogo.time_casa).border} focus:ring-${getTeamColor(jogo.time_casa).text.split('-')[1]}-500/20`}
                                        />
                                        <div className="w-1 h-1 rounded-full bg-slate-700" />
                                        <input 
                                          type="number" 
                                          defaultValue={s2 ?? ''} 
                                          disabled={profile?.role !== 'admin'}
                                          id={`set${setNum}_j2_${c.id}`}
                                          className={`w-14 h-14 bg-slate-900 border border-white/10 rounded-2xl text-center text-2xl font-black text-white focus:ring-2 transition-all disabled:opacity-100 ${getTeamColor(jogo.time_visitante).border} focus:ring-${getTeamColor(jogo.time_visitante).text.split('-')[1]}-500/20`}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}

                                {profile?.role === 'admin' && (
                                  <div className="pt-4 flex justify-center">
                                    <button 
                                      onClick={() => saveMatchScores(c.id)}
                                      className="flex items-center gap-2 px-6 py-2 bg-emerald-500/20 text-emerald-500 rounded-xl hover:bg-emerald-500/30 transition-all border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest"
                                    >
                                      <Save size={14} /> Salvar
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Time Visitante (Direita) */}
                            <div className="space-y-3">
                              <PlayerBox 
                                name={c.jogador2} 
                                category={c.categoria} 
                                label="BOX 1"
                                teamName={jogo.time_visitante}
                                isAdmin={profile?.role === 'admin'}
                                onUpdate={(val) => updateJogador(c.id, 'jogador2', val)}
                              />
                              {c.jogador2_dupla && (
                                <PlayerBox 
                                  name={c.jogador2_dupla} 
                                  category={c.categoria} 
                                  label="BOX 2"
                                  isDupla
                                  teamName={jogo.time_visitante}
                                  isAdmin={profile?.role === 'admin'}
                                  onUpdate={(val) => updateJogador(c.id, 'jogador2_dupla', val)}
                                />
                              )}
                            </div>

                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
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
                  {isProcessingAI ? (
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8" />
                  )}
                </div>
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                  {isProcessingAI ? 'Processando com IA...' : 'Upload Súmula'}
                </h3>
                {isProcessingAI && (
                  <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mt-2 animate-pulse">
                    Lendo nomes dos tenistas...
                  </p>
                )}
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
