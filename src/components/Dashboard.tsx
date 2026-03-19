import React, { useEffect, useState, useMemo, useCallback } from 'react';
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

const PlayerBox = ({ name = '', category, label, isDupla = false, teamName = '', onUpdate, isAdmin = false, minimal = false }: { 
  name?: string, 
  category: string, 
  label: string,
  isDupla?: boolean,
  teamName?: string,
  onUpdate?: (val: string) => void,
  isAdmin?: boolean,
  minimal?: boolean
}) => {
  const colors = getTeamColor(teamName);
  const nameParts = (name || 'A DEFINIR').split(' ');
  const firstName = nameParts[0];
  const surname = nameParts.slice(1).join(' ') || 'TENISTA';
  
  if (minimal) {
    return (
      <div className="flex items-center gap-2 py-1 group">
        <div className={`w-6 h-6 md:w-8 md:h-8 rounded-lg flex items-center justify-center font-black text-[8px] md:text-xs shadow-inner flex-shrink-0 ${colors.bg} text-white`}>
          {category}
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          {isAdmin ? (
            <input
              type="text"
              value={name || ''}
              onChange={(e) => onUpdate?.(e.target.value)}
              className="bg-transparent border-none p-0 text-[10px] md:text-xs font-black tracking-tight uppercase leading-tight focus:ring-0 w-full text-white"
              placeholder="NOME"
            />
          ) : (
            <span className="text-[10px] md:text-sm font-black tracking-tight uppercase leading-tight truncate text-white group-hover:text-yellow-400 transition-colors">
              {name || 'A DEFINIR'}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`
      relative flex items-center gap-2 md:gap-3 p-1.5 md:p-2.5 rounded-[14px] md:rounded-[18px] border transition-all duration-300
      bg-[#0d121f] ${colors.border} shadow-md ${colors.shadow}
      group hover:scale-[1.02] w-full
    `}>
      <div className={`
        w-7 h-7 md:w-9 md:h-9 rounded-lg flex items-center justify-center font-black text-xs md:text-base shadow-inner
        ${colors.bg} text-white flex-shrink-0
      `}>
        {category}
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        {isAdmin ? (
          <input
            type="text"
            value={name || ''}
            onChange={(e) => onUpdate?.(e.target.value)}
            className="bg-transparent border-none p-0 text-[10px] md:text-sm font-black tracking-tight uppercase leading-tight focus:ring-0 w-full text-white"
            placeholder="NOME"
          />
        ) : (
          <>
            <span className="text-[7px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none truncate">
              {firstName}
            </span>
            <span className="text-xs md:text-base font-black tracking-tight uppercase leading-tight truncate text-yellow-400">
              {surname}
            </span>
          </>
        )}
      </div>
      
      <div className={`px-1.5 md:px-2 py-0.5 rounded-full ${colors.light} border ${colors.border} text-[5px] md:text-[6px] font-black ${colors.text} uppercase tracking-[0.2em] flex-shrink-0`}>
        {isDupla ? 'DUPLA' : 'SIMPLES'}
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [classificacao, setClassificacao] = useState<Classificacao[]>([]);
  const [confrontos, setConfrontos] = useState<ConfrontoJogador[]>([]);
  const [allConfrontos, setAllConfrontos] = useState<ConfrontoJogador[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [dismissStorageError, setDismissStorageError] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'jogos'>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>('2026-03-21');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const navigate = useNavigate();

  const ranking = useMemo(() => {
    const teams = ['Azul', 'Roxo', 'Verde', 'Amarelo', 'Laranja', 'Vermelho'];
    const stats: Record<string, any> = {};
    
    teams.forEach(t => {
      stats[t] = {
        nome: t,
        pontos: 0,
        vitorias: 0,
        empates: 0,
        derrotas: 0,
        setsGanhos: 0,
        vitoriasCategoria: { 'F': 0, 'E': 0, 'D': 0, 'C': 0, 'B': 0, 'A': 0 }
      };
    });

    jogos.forEach(jogo => {
      const jogoConfrontos = allConfrontos.filter(c => c.jogo_id === jogo.id);
      let vitoriasCasa = 0;
      let vitoriasVisitante = 0;

      jogoConfrontos.forEach(c => {
        let setsGanhosJ1 = 0;
        let setsGanhosJ2 = 0;

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

        stats[jogo.time_casa].setsGanhos += setsGanhosJ1;
        stats[jogo.time_visitante].setsGanhos += setsGanhosJ2;

        const vencedor = c.wo_vencedor || c.vencedor;
        if (vencedor === 'jogador1') {
          vitoriasCasa++;
          const cat = c.categoria?.toUpperCase();
          if (stats[jogo.time_casa].vitoriasCategoria[cat] !== undefined) {
            stats[jogo.time_casa].vitoriasCategoria[cat]++;
          }
        } else if (vencedor === 'jogador2') {
          vitoriasVisitante++;
          const cat = c.categoria?.toUpperCase();
          if (stats[jogo.time_visitante].vitoriasCategoria[cat] !== undefined) {
            stats[jogo.time_visitante].vitoriasCategoria[cat]++;
          }
        }
      });

      // Se o jogo está finalizado, calcula o resultado do confronto (dia)
      if (jogo.finalizado) {
        if (vitoriasCasa > vitoriasVisitante) {
          stats[jogo.time_casa].pontos += 3;
          stats[jogo.time_casa].vitorias += 1;
          stats[jogo.time_visitante].pontos += 1;
          stats[jogo.time_visitante].derrotas += 1;
        } else if (vitoriasVisitante > vitoriasCasa) {
          stats[jogo.time_visitante].pontos += 3;
          stats[jogo.time_visitante].vitorias += 1;
          stats[jogo.time_casa].pontos += 1;
          stats[jogo.time_casa].derrotas += 1;
        } else {
          stats[jogo.time_casa].pontos += 2;
          stats[jogo.time_casa].empates += 1;
          stats[jogo.time_visitante].pontos += 2;
          stats[jogo.time_visitante].empates += 1;
        }
      }
    });

    return Object.values(stats).sort((a, b) => {
      if (b.pontos !== a.pontos) return b.pontos - a.pontos;
      if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias;
      if (a.derrotas !== b.derrotas) return a.derrotas - b.derrotas; // Menos derrotas primeiro
      if (b.setsGanhos !== a.setsGanhos) return b.setsGanhos - a.setsGanhos;
      if (b.vitoriasCategoria['F'] !== a.vitoriasCategoria['F']) return b.vitoriasCategoria['F'] - a.vitoriasCategoria['F'];
      return b.vitoriasCategoria['E'] - a.vitoriasCategoria['E'];
    });
  }, [jogos, allConfrontos]);

  const stats = useMemo(() => {
    const currentConfrontos = confrontos || [];
    
    let vitoriasCasa = 0;
    let vitoriasVisitante = 0;
    let setsCasa = 0;
    let setsVisitante = 0;
    let partidasJogadas = 0;
    
    const catVitoriasCasa: Record<string, number> = { 'F': 0, 'E': 0, 'D': 0, 'C': 0, 'B': 0, 'A': 0 };
    const catVitoriasVisitante: Record<string, number> = { 'F': 0, 'E': 0, 'D': 0, 'C': 0, 'B': 0, 'A': 0 };

    currentConfrontos.forEach(c => {
      let setsGanhosJ1 = 0;
      let setsGanhosJ2 = 0;
      let jogou = false;

      const s1_1 = c.set1_j1;
      const s1_2 = c.set1_j2;
      const s2_1 = c.set2_j1;
      const s2_2 = c.set2_j2;
      const s3_1 = c.set3_j1;
      const s3_2 = c.set3_j2;

      if (s1_1 !== null || s1_2 !== null || s2_1 !== null || s2_2 !== null || s3_1 !== null || s3_2 !== null) {
        jogou = true;
      }

      if (s1_1 !== null && s1_2 !== null) {
        if (s1_1 > s1_2) setsGanhosJ1++;
        else if (s1_2 > s1_1) setsGanhosJ2++;
      }
      if (s2_1 !== null && s2_2 !== null) {
        if (s2_1 > s2_2) setsGanhosJ1++;
        else if (s2_2 > s2_1) setsGanhosJ2++;
      }
      if (s3_1 !== null && s3_2 !== null) {
        if (s3_1 > s3_2) setsGanhosJ1++;
        else if (s3_2 > s3_1) setsGanhosJ2++;
      }

      if (jogou) {
        partidasJogadas++;
        setsCasa += setsGanhosJ1;
        setsVisitante += setsGanhosJ2;
        
        const cat = c.categoria?.toUpperCase();
        if (setsGanhosJ1 > setsGanhosJ2) {
          vitoriasCasa++;
          if (catVitoriasCasa[cat] !== undefined) catVitoriasCasa[cat]++;
        } else if (setsGanhosJ2 > setsGanhosJ1) {
          vitoriasVisitante++;
          if (catVitoriasVisitante[cat] !== undefined) catVitoriasVisitante[cat]++;
        }
      }
    });

    return {
      vitoriasCasa,
      vitoriasVisitante,
      setsCasa,
      setsVisitante,
      partidasJogadas,
      jogosFaltando: 18 - partidasJogadas,
      catVitoriasCasa,
      catVitoriasVisitante
    };
  }, [confrontos]);

  const dates = ['2026-03-21', '2026-03-22', '2026-03-28', '2026-03-29'];

  const checkUser = useCallback(async () => {
    const savedUser = localStorage.getItem('torneio_user');
    if (!savedUser) {
      navigate('/');
      return;
    }

    try {
      const profileData = JSON.parse(savedUser) as Profile;
      setProfile(profileData);
    } catch (e) {
      localStorage.removeItem('torneio_user');
      navigate('/');
    }
  }, [navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    try {
      const { error: listError } = await supabase.storage.from('sumulas').list('', { limit: 1 });
      if (listError && (listError.message.includes('not found') || listError.message.includes('does not exist'))) {
        setStorageError('O bucket "sumulas" não foi encontrado. Crie-o no painel Storage do Supabase como "Public".');
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
      
      const [classRes, confRes, allConfRes] = await Promise.all([
        supabase.from('classificacao').select('*').order('pontos', { ascending: false }),
        currentJogo 
          ? supabase.from('confrontos_jogadores').select('*').eq('jogo_id', currentJogo.id).order('ordem', { ascending: true })
          : Promise.resolve({ data: [] }),
        supabase.from('confrontos_jogadores').select('*')
      ]);

      if (classRes.data) setClassificacao(classRes.data);
      if (confRes.data) setConfrontos(confRes.data);
      if (allConfRes.data) setAllConfrontos(allConfRes.data);
    }
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (jogos.length > 0) {
      const jogo = jogos.find(j => j.data === selectedDate);
      if (jogo && selectedTeam !== jogo.time_casa) {
        setSelectedTeam(jogo.time_casa);
      }
    }
  }, [selectedDate, jogos, selectedTeam]);

  const handleLocalScoreChange = (confId: string, field: string, value: string) => {
    const numValue = value === '' ? null : parseInt(value);
    const updateFn = (prev: ConfrontoJogador[]) => prev.map(c => 
      c.id === confId ? { ...c, [field]: numValue } : c
    );
    setConfrontos(updateFn);
    setAllConfrontos(updateFn);
  };

  const handleLogout = async () => {
    localStorage.removeItem('torneio_user');
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
    if (profile?.role !== 'admin') {
      alert('Apenas administradores podem salvar placares.');
      return;
    }

    const confronto = confrontos.find(c => c.id === confId);
    if (!confronto) {
      alert('Confronto não encontrado.');
      return;
    }

    const updates: any = {
      set1_j1: confronto.set1_j1,
      set1_j2: confronto.set1_j2,
      set2_j1: confronto.set2_j1,
      set2_j2: confronto.set2_j2,
      set3_j1: confronto.set3_j1,
      set3_j2: confronto.set3_j2,
    };

    // Calcular vencedor se houver sets preenchidos (Melhor de 3)
    let vitoriasJ1 = 0;
    let vitoriasJ2 = 0;
    
    if (updates.set1_j1 !== null && updates.set1_j2 !== null) {
      if (updates.set1_j1 > updates.set1_j2) vitoriasJ1++;
      else if (updates.set1_j2 > updates.set1_j1) vitoriasJ2++;
    }
    if (updates.set2_j1 !== null && updates.set2_j2 !== null) {
      if (updates.set2_j1 > updates.set2_j2) vitoriasJ1++;
      else if (updates.set2_j2 > updates.set2_j1) vitoriasJ2++;
    }
    if (updates.set3_j1 !== null && updates.set3_j2 !== null) {
      if (updates.set3_j1 > updates.set3_j2) vitoriasJ1++;
      else if (updates.set3_j2 > updates.set3_j1) vitoriasJ2++;
    }

    // Se alguém ganhou 2 sets, é o vencedor
    if (vitoriasJ1 >= 2) updates.vencedor = 'jogador1';
    else if (vitoriasJ2 >= 2) updates.vencedor = 'jogador2';
    else updates.vencedor = null; // Ainda em andamento ou empate (não deveria ocorrer em tênis)

    setLoading(true);
    const { error } = await supabase
      .from('confrontos_jogadores')
      .update(updates)
      .eq('id', confId);

    if (!error) {
      await fetchData();
      alert('Placar salvo com sucesso!');
    } else {
      console.error('Erro ao salvar placar:', error);
      alert('Erro ao salvar placar: ' + error.message);
    }
    setLoading(false);
  };

  const handleImportPDF = async () => {
    const jogo = jogos.find(j => j.data === selectedDate);
    if (!jogo) return;

    setLoading(true);
    try {
      const pdfData = [
        { ordem: 1, categoria: 'B', azul1: 'Norimiti Fukuma', azul2: 'Sheila Okazaki', roxo1: 'Luiz Sakamoto', roxo2: 'Humberto Matsui' },
        { ordem: 2, categoria: 'F', azul1: 'Roberto Brito', azul2: 'Midori Tukiama', roxo1: 'Maria Shimura', roxo2: 'Giovana Hidaka' },
        { ordem: 3, categoria: 'E', azul1: 'Sayuri Takata', azul2: 'Alan Yogui', roxo1: 'Claudio Yara', roxo2: 'Marcia Higa' },
        { ordem: 4, categoria: 'D', azul1: 'Adriana Watanabe', azul2: 'Leandro Enjoji', roxo1: 'Luis Yamamoto', roxo2: 'Alexandre Fugimoto' },
        { ordem: 5, categoria: 'C', azul1: 'Eric Shigetomi', azul2: 'Kenzo Iwasaki', roxo1: 'Helena Omoto', roxo2: 'Daniel Matsunaga' },
        { ordem: 6, categoria: 'B', azul1: 'Fabricio Oliveira', azul2: 'Maysa Nakashima', roxo1: 'Hugo Higashi', roxo2: 'Natalia Bordegatto' },
        { ordem: 7, categoria: 'F', azul1: 'Luciana Oliveira', azul2: 'Adriana Irino', roxo1: 'Daiane Santos', roxo2: 'Regina Yara' },
        { ordem: 8, categoria: 'E', azul1: 'Katia Goshi', azul2: 'Guilherme Haraguchi', roxo1: 'Fernanda Nakai', roxo2: 'Erika Uchida' },
        { ordem: 9, categoria: 'D', azul1: 'Thiago Irino', azul2: 'Marcell Anno', roxo1: 'Marcos Igutti', roxo2: 'Elaine Gusukuma' },
        { ordem: 10, categoria: 'C', azul1: 'Willian Kubota', azul2: 'Rose Taketani', roxo1: 'Marcelo Hashimoto', roxo2: 'Ricardo Shimabukuro' },
        { ordem: 11, categoria: 'B', azul1: 'Claudio Udo', azul2: 'Alexandre Uehara', roxo1: 'Julio Yokoyama', roxo2: 'Andrey Nakamura' },
        { ordem: 12, categoria: 'A', azul1: 'Julio Nuruki', azul2: 'Pedro Tomiyoshi', roxo1: 'Marcus Momesso', roxo2: 'Ricardo Matsumoto' },
        { ordem: 13, categoria: 'F', azul1: 'Nayara Costa', azul2: 'Raquel Honda', roxo1: 'Lilian Ribeiro', roxo2: 'Henrique Fukace' },
        { ordem: 14, categoria: 'E', azul1: 'Jefferson Sena', azul2: 'Rodrigo Galo', roxo1: 'Fabio Okamoto', roxo2: 'Helio Murata' },
        { ordem: 15, categoria: 'D', azul1: 'Aquino Ito', azul2: 'Elia Yamakawa', roxo1: 'Marina Hamada', roxo2: 'Claudio Habara' },
        { ordem: 16, categoria: 'C', azul1: 'Marcio Muramoto', azul2: 'Maria Ishikawa', roxo1: 'Maria Yokoyama', roxo2: 'Julio Sunto' },
        { ordem: 17, categoria: 'B', azul1: 'Fernando Higa', azul2: 'Victor Sunto', roxo1: 'Paulo Uezu', roxo2: 'Abilio Tsunoushi' },
        { ordem: 18, categoria: 'A', azul1: 'Eric Hayashida', azul2: 'Savino Micco', roxo1: 'Eduardo Hoshino', roxo2: 'Anderson Vieira' }
      ];

      const isAzulCasa = jogo.time_casa === 'Azul';

      for (const item of pdfData) {
        const { data: existing } = await supabase
          .from('confrontos_jogadores')
          .select('id')
          .eq('jogo_id', jogo.id)
          .eq('ordem', item.ordem)
          .single();

        const updateData = {
          jogo_id: jogo.id,
          ordem: item.ordem,
          categoria: item.categoria,
          jogador1: isAzulCasa ? item.azul1 : item.roxo1,
          jogador1_dupla: isAzulCasa ? item.azul2 : item.roxo2,
          jogador2: isAzulCasa ? item.roxo1 : item.azul1,
          jogador2_dupla: isAzulCasa ? item.roxo2 : item.azul2
        };

        if (existing) {
          await supabase
            .from('confrontos_jogadores')
            .update(updateData)
            .eq('id', existing.id);
        } else {
          await supabase
            .from('confrontos_jogadores')
            .insert(updateData);
        }
      }
      await fetchData();
    } catch (error) {
      console.error('Erro ao importar PDF:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWO = async (confId: string, winner: 'jogador1' | 'jogador2') => {
    if (profile?.role !== 'admin') return;

    const updates = {
      set1_j1: winner === 'jogador1' ? 6 : 0,
      set1_j2: winner === 'jogador2' ? 6 : 0,
      set2_j1: winner === 'jogador1' ? 6 : 0,
      set2_j2: winner === 'jogador2' ? 6 : 0,
      set3_j1: null,
      set3_j2: null,
      vencedor: winner
    };

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
          className="relative p-[2px] rounded-[34px] bg-gradient-to-r from-blue-500 via-purple-500 via-emerald-500 via-yellow-500 to-red-500 shadow-2xl shadow-blue-500/20"
        >
          <div className="bg-[#111827] px-4 py-4 md:px-12 md:py-6 rounded-[32px] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 opacity-50" />
            <h1 className="relative text-2xl md:text-5xl font-black italic tracking-tighter text-white uppercase leading-none text-center">
              TORNEIO DE <span className="text-blue-500">CORES</span> 2026
            </h1>
          </div>
        </motion.div>
      </section>

      <main className="max-w-6xl mx-auto px-4 space-y-6 relative z-20">
        {/* Main Navigation - Larger & Professional */}
        <section className="flex flex-col gap-4">
          <div className="flex gap-4">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 flex items-center justify-center gap-2 md:gap-4 py-3 md:py-6 px-4 md:px-10 rounded-[32px] transition-all border-2 ${
                activeTab === 'dashboard' 
                ? 'bg-white border-white shadow-2xl shadow-white/10' 
                : 'bg-white/5 border-white/5 hover:bg-white/10'
              }`}
            >
              <LayoutDashboard className={`w-6 h-6 ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className={`text-sm font-black uppercase tracking-[0.3em] ${activeTab === 'dashboard' ? 'text-slate-900' : 'text-slate-400'}`}>Pontuação Geral</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab('jogos')}
              className={`flex-1 flex items-center justify-center gap-2 md:gap-4 py-3 md:py-6 px-4 md:px-10 rounded-[32px] transition-all border-2 ${
                activeTab === 'jogos' 
                ? 'bg-white border-white shadow-2xl shadow-white/10' 
                : 'bg-white/5 border-white/5 hover:bg-white/10'
              }`}
            >
              <Trophy className={`w-6 h-6 ${activeTab === 'jogos' ? 'text-purple-600' : 'text-slate-400'}`} />
              <span className={`text-sm font-black uppercase tracking-[0.3em] ${activeTab === 'jogos' ? 'text-slate-900' : 'text-slate-400'}`}>Jogos</span>
            </motion.button>
          </div>

          {activeTab === 'jogos' && (
            <div className="flex gap-2 p-2 bg-white/5 border border-white/5 rounded-[32px]">
              {dates.map(date => (
                <button 
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`flex-1 py-5 rounded-[24px] text-xs font-black uppercase tracking-[0.2em] transition-all ${
                    selectedDate === date 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {formatDate(date)}
                </button>
              ))}
            </div>
          )}
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
            {/* Ranking Table */}
            <div className="bg-[#111827] border border-white/5 rounded-[40px] p-6 md:p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] -mr-32 -mt-32" />
              
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-widest text-white italic">Classificação Geral</h3>
                </div>
                <button onClick={handleLogout} className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 hover:bg-rose-500/10 transition-all flex items-center gap-3 bg-white/5 px-6 py-3 rounded-full border border-white/5">
                  <LogOut className="w-3 h-3" /> Sair
                </button>
              </div>

              <div className="overflow-x-auto relative z-10">
                <table className="w-full text-left border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-[8px] md:text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                      <th className="px-2 md:px-4 py-2">Pos</th>
                      <th className="px-2 md:px-4 py-2">Equipe</th>
                      <th className="px-1 md:px-4 py-2 text-center">P</th>
                      <th className="px-1 md:px-4 py-2 text-center">V</th>
                      <th className="px-1 md:px-4 py-2 text-center">E</th>
                      <th className="px-1 md:px-4 py-2 text-center">D</th>
                      <th className="px-1 md:px-4 py-2 text-center">SG</th>
                      <th className="px-1 md:px-4 py-2 text-center">F</th>
                      <th className="px-1 md:px-4 py-2 text-center">E</th>
                      <th className="px-1 md:px-4 py-2 text-center">D</th>
                      <th className="px-1 md:px-4 py-2 text-center">C</th>
                      <th className="px-1 md:px-4 py-2 text-center">B</th>
                      <th className="px-1 md:px-4 py-2 text-center">A</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((team, index) => (
                      <tr key={team.nome} className="bg-white/5 hover:bg-white/10 transition-colors group">
                        <td className="px-2 md:px-4 py-3 md:py-4 rounded-l-2xl">
                          <span className={`text-sm md:text-lg font-black italic ${index < 3 ? 'text-yellow-500' : 'text-slate-500'}`}>
                            {index + 1}º
                          </span>
                        </td>
                        <td className="px-2 md:px-4 py-3 md:py-4">
                          <div className="flex items-center gap-2 md:gap-3">
                            <span className="text-[10px] md:text-sm font-black uppercase tracking-widest text-white">{team.nome}</span>
                          </div>
                        </td>
                        <td className="px-1 md:px-4 py-3 md:py-4 text-center">
                          <span className="text-sm md:text-lg font-black text-blue-500">{team.pontos}</span>
                        </td>
                        <td className="px-1 md:px-4 py-3 md:py-4 text-center text-slate-400 font-bold text-xs md:text-sm">{team.vitorias}</td>
                        <td className="px-1 md:px-4 py-3 md:py-4 text-center text-slate-400 font-bold text-xs md:text-sm">{team.empates}</td>
                        <td className="px-1 md:px-4 py-3 md:py-4 text-center text-slate-400 font-bold text-xs md:text-sm">{team.derrotas}</td>
                        <td className="px-1 md:px-4 py-3 md:py-4 text-center text-emerald-500 font-bold text-xs md:text-sm">{team.setsGanhos}</td>
                        <td className="px-1 md:px-4 py-3 md:py-4 text-center text-slate-400 font-bold text-[10px] md:text-sm">{team.vitoriasCategoria['F'] || 0}</td>
                        <td className="px-1 md:px-4 py-3 md:py-4 text-center text-slate-400 font-bold text-[10px] md:text-sm">{team.vitoriasCategoria['E'] || 0}</td>
                        <td className="px-1 md:px-4 py-3 md:py-4 text-center text-slate-400 font-bold text-[10px] md:text-sm">{team.vitoriasCategoria['D'] || 0}</td>
                        <td className="px-1 md:px-4 py-3 md:py-4 text-center text-slate-400 font-bold text-[10px] md:text-sm">{team.vitoriasCategoria['C'] || 0}</td>
                        <td className="px-1 md:px-4 py-3 md:py-4 text-center text-slate-400 font-bold text-[10px] md:text-sm">{team.vitoriasCategoria['B'] || 0}</td>
                        <td className="px-1 md:px-4 py-3 md:py-4 text-center text-slate-400 font-bold text-[10px] md:text-sm rounded-r-2xl">{team.vitoriasCategoria['A'] || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Regras Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-[#111827] border border-white/5 rounded-[40px] p-10 space-y-6">
                <h4 className="text-sm font-black uppercase tracking-[0.3em] text-blue-500">Pontuação nas Classificatórias</h4>
                <ul className="space-y-4">
                  <li className="flex items-center gap-4 text-xs font-bold text-slate-400">
                    VITÓRIA: 3 PONTOS
                  </li>
                  <li className="flex items-center gap-4 text-xs font-bold text-slate-400">
                    EMPATE: 2 PONTOS
                  </li>
                  <li className="flex items-center gap-4 text-xs font-bold text-slate-400">
                    DERROTA: 1 PONTO
                  </li>
                </ul>
              </div>

              <div className="bg-[#111827] border border-white/5 rounded-[40px] p-10 space-y-6">
                <h4 className="text-sm font-black uppercase tracking-[0.3em] text-purple-500">Critérios de Desempate</h4>
                <ul className="space-y-4">
                  <li className="flex items-center gap-4 text-xs font-bold text-slate-400">
                    <span className="text-purple-500">1.</span> PONTOS GANHOS
                  </li>
                  <li className="flex items-center gap-4 text-xs font-bold text-slate-400">
                    <span className="text-purple-500">2.</span> VITÓRIAS (CONFRONTOS GANHOS)
                  </li>
                  <li className="flex items-center gap-4 text-xs font-bold text-slate-400">
                    <span className="text-purple-500">3.</span> MENOS DERROTAS
                  </li>
                  <li className="flex items-center gap-4 text-xs font-bold text-slate-400">
                    <span className="text-purple-500">4.</span> QTD. DE SETS GANHOS
                  </li>
                  <li className="flex items-center gap-4 text-xs font-bold text-slate-400">
                    <span className="text-purple-500">5.</span> VITÓRIAS CATEGORIA F
                  </li>
                  <li className="flex items-center gap-4 text-xs font-bold text-slate-400">
                    <span className="text-purple-500">6.</span> VITÓRIAS CATEGORIA E
                  </li>
                </ul>
              </div>
            </div>
          </section>
        ) : (
          <section className="space-y-8 max-w-5xl mx-auto">
            {/* Header do Dia - Centralizado e Compacto */}
            <div className="text-center space-y-2 md:space-y-4 px-4 py-4 md:py-6 relative">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-600/5 to-transparent blur-3xl -z-10" />
              <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.5em] text-yellow-500/80">Confrontos do Dia</span>
              
              <div className="flex items-center justify-center gap-4 md:gap-12">
                <div className="flex flex-col items-center gap-1 md:gap-2">
                  <h2 className={`text-3xl md:text-8xl font-black italic uppercase tracking-tighter drop-shadow-2xl ${getTeamColor(jogos.find(j => j.data === selectedDate)?.time_casa || '').text}`}>
                    {jogos.find(j => j.data === selectedDate)?.time_casa}
                  </h2>
                </div>
                
                <div className="flex flex-col items-center">
                  <span className="text-sm md:text-3xl font-black text-white/20 italic tracking-widest">VS</span>
                </div>

                <div className="flex flex-col items-center gap-1 md:gap-2">
                  <h2 className={`text-3xl md:text-8xl font-black italic uppercase tracking-tighter drop-shadow-2xl ${getTeamColor(jogos.find(j => j.data === selectedDate)?.time_visitante || '').text}`}>
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

            {/* Header Stats - Compact & Responsive */}
            <div className="bg-[#0d121f]/80 backdrop-blur-xl border border-white/5 rounded-[24px] md:rounded-[32px] p-3 md:p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] -mr-32 -mt-32 transition-all group-hover:bg-blue-600/20" />
              
              <div className="relative z-10 flex flex-col items-center gap-4 md:gap-6">
                <div className="w-full max-w-2xl space-y-2 md:space-y-3">
                  {/* Main Stats */}
                  {[
                    { label: 'Vitórias', val1: stats.vitoriasCasa, val2: stats.vitoriasVisitante, color: 'text-emerald-500' },
                    { label: 'Sets Vencidos', val1: stats.setsCasa, val2: stats.setsVisitante, color: 'text-blue-500' },
                  ].map((stat, i) => (
                    <div key={i} className="grid grid-cols-3 items-center">
                      <div className="text-right pr-2 md:pr-4">
                        <span className={`text-xl md:text-4xl font-black italic tracking-tighter ${stat.color}`}>
                          {stat.val1}
                        </span>
                      </div>
                      <div className="text-center">
                        <span className="text-[7px] md:text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] whitespace-nowrap opacity-60">
                          {stat.label}
                        </span>
                      </div>
                      <div className="text-left pl-2 md:pl-4">
                        <span className={`text-xl md:text-4xl font-black italic tracking-tighter ${stat.color}`}>
                          {stat.val2}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Categories Grid - Requested online update */}
                <div className="w-full grid grid-cols-3 md:grid-cols-6 gap-2 pt-2 border-t border-white/5">
                  {['F', 'E', 'D', 'C', 'B', 'A'].map(cat => (
                    <div key={cat} className="bg-white/5 rounded-xl p-2 flex flex-col items-center border border-white/5">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{cat}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-blue-500">{stats.catVitoriasCasa[cat]}</span>
                        <span className="text-[8px] text-slate-700">|</span>
                        <span className="text-xs font-black text-purple-500">{stats.catVitoriasVisitante[cat]}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 w-full pt-2">
                  <div className="bg-yellow-500/5 border border-yellow-500/10 px-4 py-1.5 rounded-full flex items-center gap-2 transition-all">
                    <span className="text-[8px] font-black uppercase tracking-widest text-yellow-500/80">{stats.jogosFaltando} Jogos Restantes</span>
                  </div>
                  <button 
                    onClick={handleLogout} 
                    className="text-[8px] font-black uppercase tracking-widest text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/10 transition-all flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/5"
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
                    
                    <div className="relative bg-[#0d121f]/95 backdrop-blur-3xl border border-white/5 rounded-[32px] overflow-hidden">
                      {/* Match Header - Compacto: Match e Categoria lado a lado */}
                      <div className="bg-gradient-to-r from-slate-900 via-[#111827] to-slate-900 border-b border-white/5 py-1.5 px-4 flex items-center justify-between relative">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black uppercase text-blue-500/60 tracking-widest">MATCH</span>
                          <span className="text-xl font-black italic text-white tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                            {c.ordem}
                          </span>
                          <div className="w-px h-3 bg-white/10 mx-1" />
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">CAT.</span>
                          <span className={`text-xs font-black uppercase tracking-tighter ${getTeamColor(jogo.time_casa).text}`}>
                            {c.categoria}
                          </span>
                        </div>

                        {c.vencedor && (
                          <div className="flex items-center">
                            <span className="text-[7px] font-black text-emerald-500 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              Finalizado
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-3 md:p-4">
                        <div className="flex flex-col gap-3">
                          
                          {/* Linha Time Casa */}
                          <div className={`flex items-center justify-between group p-2 rounded-2xl transition-all ${c.vencedor === jogo.time_casa ? 'bg-blue-500/10 border border-blue-500/20' : ''}`}>
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="flex flex-col min-w-0">
                                <div className="flex flex-col">
                                  {(() => {
                                    const parts = c.jogador1.trim().split(' ');
                                    const first = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
                                    const last = parts[parts.length - 1];
                                    return (
                                      <div className="flex flex-col leading-none">
                                        <span className={`text-[9px] font-medium uppercase tracking-wider ${c.vencedor === jogo.time_casa ? 'text-white/60' : 'text-slate-500'}`}>{first}</span>
                                        <span className="text-xs font-black text-yellow-400 uppercase tracking-tight">{last}</span>
                                      </div>
                                    );
                                  })()}
                                  {c.jogador1_dupla && (() => {
                                    const parts = c.jogador1_dupla.trim().split(' ');
                                    const first = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
                                    const last = parts[parts.length - 1];
                                    return (
                                      <div className="flex flex-col leading-none mt-1">
                                        <span className={`text-[9px] font-medium uppercase tracking-wider ${c.vencedor === jogo.time_casa ? 'text-white/60' : 'text-slate-500'}`}>{first}</span>
                                        <span className="text-xs font-black text-yellow-400 uppercase tracking-tight">{last}</span>
                                      </div>
                                    );
                                  })()}
                                </div>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className={`text-[8px] font-black uppercase tracking-widest ${getTeamColor(jogo.time_casa).text}`}>
                                    {jogo.time_casa}
                                  </span>
                                  {profile?.role === 'admin' && (
                                    <button 
                                      onClick={() => handleWO(c.id, 'jogador2')}
                                      className="text-[7px] font-black uppercase text-rose-500/60 hover:text-rose-500 transition-colors"
                                    >
                                      [ W.O. CASA ]
                                    </button>
                                  )}
                                </div>
                              </div>
                              {c.vencedor === jogo.time_casa && (
                                <Check size={14} className="text-emerald-500" strokeWidth={4} />
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1 ml-4">
                              {[1, 2, 3].map(setNum => {
                                const s1 = c[`set${setNum}_j1` as keyof ConfrontoJogador];
                                const s2 = c[`set${setNum}_j2` as keyof ConfrontoJogador];
                                const isWinner = s1 !== null && s2 !== null && Number(s1) > Number(s2);
                                return (
                                  <input 
                                    key={setNum}
                                    type="number" 
                                    value={s1 ?? ''} 
                                    onChange={(e) => handleLocalScoreChange(c.id, `set${setNum}_j1`, e.target.value)}
                                    disabled={profile?.role !== 'admin'}
                                    className={`w-9 h-9 md:w-11 md:h-11 bg-slate-800/50 border border-white/5 rounded-xl text-center text-base md:text-lg font-black transition-all disabled:opacity-100 ${isWinner ? 'text-yellow-400 border-yellow-500/30' : 'text-white'} ${c.vencedor === jogo.time_casa ? 'bg-indigo-500/20 border-indigo-500/30' : ''}`}
                                  />
                                );
                              })}
                            </div>
                          </div>

                          {/* Linha Time Visitante */}
                          <div className={`flex items-center justify-between group p-2 rounded-2xl transition-all ${c.vencedor === jogo.time_visitante ? 'bg-purple-500/10 border border-purple-500/20' : ''}`}>
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="flex flex-col min-w-0">
                                <div className="flex flex-col">
                                  {(() => {
                                    const parts = c.jogador2.trim().split(' ');
                                    const first = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
                                    const last = parts[parts.length - 1];
                                    return (
                                      <div className="flex flex-col leading-none">
                                        <span className={`text-[9px] font-medium uppercase tracking-wider ${c.vencedor === jogo.time_visitante ? 'text-white/60' : 'text-slate-500'}`}>{first}</span>
                                        <span className="text-xs font-black text-yellow-400 uppercase tracking-tight">{last}</span>
                                      </div>
                                    );
                                  })()}
                                  {c.jogador2_dupla && (() => {
                                    const parts = c.jogador2_dupla.trim().split(' ');
                                    const first = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
                                    const last = parts[parts.length - 1];
                                    return (
                                      <div className="flex flex-col leading-none mt-1">
                                        <span className={`text-[9px] font-medium uppercase tracking-wider ${c.vencedor === jogo.time_visitante ? 'text-white/60' : 'text-slate-500'}`}>{first}</span>
                                        <span className="text-xs font-black text-yellow-400 uppercase tracking-tight">{last}</span>
                                      </div>
                                    );
                                  })()}
                                </div>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className={`text-[8px] font-black uppercase tracking-widest ${getTeamColor(jogo.time_visitante).text}`}>
                                    {jogo.time_visitante}
                                  </span>
                                  {profile?.role === 'admin' && (
                                    <button 
                                      onClick={() => handleWO(c.id, 'jogador1')}
                                      className="text-[7px] font-black uppercase text-rose-500/60 hover:text-rose-500 transition-colors"
                                    >
                                      [ W.O. VISIT ]
                                    </button>
                                  )}
                                </div>
                              </div>
                              {c.vencedor === jogo.time_visitante && (
                                <Check size={14} className="text-emerald-500" strokeWidth={4} />
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1 ml-4">
                              {[1, 2, 3].map(setNum => {
                                const s1 = c[`set${setNum}_j1` as keyof ConfrontoJogador];
                                const s2 = c[`set${setNum}_j2` as keyof ConfrontoJogador];
                                const isWinner = s1 !== null && s2 !== null && Number(s2) > Number(s1);
                                return (
                                  <input 
                                    key={setNum}
                                    type="number" 
                                    value={s2 ?? ''} 
                                    onChange={(e) => handleLocalScoreChange(c.id, `set${setNum}_j2`, e.target.value)}
                                    disabled={profile?.role !== 'admin'}
                                    className={`w-9 h-9 md:w-11 md:h-11 bg-slate-800/50 border border-white/5 rounded-xl text-center text-base md:text-lg font-black transition-all disabled:opacity-100 ${isWinner ? 'text-yellow-400 border-yellow-500/30' : 'text-white'} ${c.vencedor === jogo.time_visitante ? 'bg-indigo-500/20 border-indigo-500/30' : ''}`}
                                  />
                                );
                              })}
                            </div>
                          </div>

                          {/* Ações (Rodapé do Card) */}
                          {profile?.role === 'admin' && (
                            <div className="flex items-center justify-end pt-2 mt-1 border-t border-white/5">
                              <button 
                                onClick={() => saveMatchScores(c.id)}
                                className="px-6 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 rounded-xl"
                              >
                                <Save size={12} /> Salvar Placar
                              </button>
                            </div>
                          )}
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
