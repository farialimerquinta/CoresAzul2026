import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Upload, X, Trophy, User } from 'lucide-react';

interface Player {
  id: number;
  name: string;
  category: string;
  photo: string | null;
  nickname: string | null;
  court_position: string | null;
  availability_21: string | null;
  availability_22: string | null;
  availability_28: string | null;
}

interface Settings {
  logo: string | null;
  voting_deadline: string | null;
}

interface LogoOption {
  id: number;
  image: string;
  votes: number;
}

export default function App() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [settings, setSettings] = useState<Settings>({ logo: null, voting_deadline: null });
  const [logoOptions, setLogoOptions] = useState<LogoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPlayer, setEditPlayer] = useState<Player | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingLogoOption, setIsUploadingLogoOption] = useState(false);
  const [isVotingView, setIsVotingView] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tempNickname, setTempNickname] = useState('');
  const [tempPhoto, setTempPhoto] = useState<string | null>(null);
  const [tempCourtPosition, setTempCourtPosition] = useState('');
  const [tempAvailability21, setTempAvailability21] = useState('');
  const [tempAvailability22, setTempAvailability22] = useState('');
  const [tempAvailability28, setTempAvailability28] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [playersRes, settingsRes, logoOptionsRes] = await Promise.all([
        fetch('/api/players'),
        fetch('/api/settings'),
        fetch('/api/logo-options')
      ]);
      const playersData = await playersRes.json();
      const settingsData = await settingsRes.json();
      const logoOptionsData = await logoOptionsRes.json();
      setPlayers(playersData);
      setSettings(settingsData);
      setLogoOptions(logoOptionsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      if (isUploadingLogo) {
        try {
          await fetch('/api/settings/logo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photo: base64 })
          });
          fetchData();
          setIsUploadingLogo(false);
        } catch (error) {
          console.error('Error uploading logo:', error);
        }
      } else if (isUploadingLogoOption) {
        try {
          await fetch('/api/logo-options', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64 })
          });
          fetchData();
          setIsUploadingLogoOption(false);
        } catch (error) {
          console.error('Error uploading logo option:', error);
        }
      } else {
        setTempPhoto(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleVote = async (optionId: number) => {
    try {
      const res = await fetch(`/api/logo-options/${optionId}/vote`, {
        method: 'POST'
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Erro ao votar');
        return;
      }
      fetchData();
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleSavePlayer = async () => {
    if (!editPlayer || isSaving) return;

    setIsSaving(true);
    try {
      // Only send photo if it's different from the original to save bandwidth
      const photoToSend = tempPhoto !== editPlayer.photo ? tempPhoto : undefined;

      const response = await fetch(`/api/players/${editPlayer.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          photo: photoToSend, 
          nickname: tempNickname,
          court_position: tempCourtPosition,
          availability_21: tempAvailability21,
          availability_22: tempAvailability22,
          availability_28: tempAvailability28
        })
      });

      if (!response.ok) throw new Error('Failed to save');

      // Close modal immediately for better UX
      setEditPlayer(null);
      
      // Then refresh data in background
      await fetchData();
      
      // Reset states
      setTempPhoto(null);
      setTempNickname('');
      setTempCourtPosition('');
      setTempAvailability21('');
      setTempAvailability22('');
      setTempAvailability28('');
    } catch (error) {
      console.error('Error saving player:', error);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const triggerUpload = (player: Player | null, isLogo = false) => {
    if (isLogo) {
      setIsUploadingLogo(true);
      setIsUploadingLogoOption(false);
      fileInputRef.current?.click();
    } else if (player) {
      setEditPlayer(player);
      setTempNickname(player.nickname || '');
      setTempPhoto(player.photo);
      setTempCourtPosition(player.court_position || '');
      setTempAvailability21(player.availability_21 || '');
      setTempAvailability22(player.availability_22 || '');
      setTempAvailability28(player.availability_28 || '');
    }
  };

  const triggerLogoOptionUpload = () => {
    setIsUploadingLogoOption(true);
    setIsUploadingLogo(false);
    fileInputRef.current?.click();
  };

  const renderCategoryRow = (category: string, count: number) => {
    const categoryPlayers = players.filter(p => p.category === category);
    
    return (
      <div className="flex items-center gap-4 mb-6" key={category}>
        <div className="w-12 h-12 flex items-center justify-center bg-white/20 rounded-lg text-white font-bold text-3xl">
          {category}
        </div>
        <div className="flex flex-wrap gap-3">
          {categoryPlayers.map((player) => (
            <div 
              key={player.id}
              onClick={() => triggerUpload(player)}
              className="group relative w-24 h-32 bg-white/10 rounded-lg border-2 border-white/20 overflow-hidden cursor-pointer hover:border-white/50 transition-all"
            >
              {player.photo ? (
                <img 
                  src={player.photo} 
                  alt={player.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white/40">
                  <User size={32} />
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1.5 text-center leading-tight backdrop-blur-md border-t border-white/10">
                <div className="text-[8px] text-white/50 truncate uppercase tracking-wider mb-0.5">{player.name}</div>
                <div className="text-[13px] font-black truncate text-[#0ABAB5] leading-none py-0.5">
                  {player.nickname || '---'}
                </div>
              </div>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="text-white" size={20} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0088cc] flex items-center justify-center text-white">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Trophy size={48} />
          <p className="text-xl font-medium">Carregando Torneio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0088cc] p-8 font-sans selection:bg-white/30">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*"
        onChange={handlePhotoUpload}
      />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          <div className="flex flex-col">
          </div>
          <div className="text-right">
            <h1 className="text-white text-6xl font-black tracking-tighter uppercase leading-none">
              Torneio de Cores
            </h1>
            <span className="text-white text-7xl font-black tracking-tighter leading-none block">
              2026
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Content Area */}
          <div className="lg:col-span-9">
            <AnimatePresence mode="wait">
              {isVotingView ? (
                <motion.div 
                  key="voting"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white/5 backdrop-blur-md rounded-[40px] p-10 border border-white/10"
                >
                  <div className="flex justify-between items-center mb-10">
                    <div>
                      <h2 className="text-white text-4xl font-black uppercase italic tracking-tighter">Votação do Logo</h2>
                      <p className="text-white/60 font-medium">
                        Prazo final: <span className="text-[#0ABAB5] font-bold">{settings.voting_deadline ? new Date(settings.voting_deadline).toLocaleDateString('pt-BR') : 'A definir'}</span>
                      </p>
                    </div>
                    <button 
                      onClick={() => setIsVotingView(false)}
                      className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-full font-bold transition-colors"
                    >
                      Voltar ao Grid
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {logoOptions.map((option) => (
                      <div key={option.id} className="group relative bg-white rounded-3xl p-4 shadow-xl flex flex-col items-center gap-4">
                        <div className="w-full aspect-square bg-gray-50 rounded-2xl overflow-hidden flex items-center justify-center">
                          <img src={option.image} alt="Logo Option" className="w-full h-full object-contain p-4" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex flex-col items-center gap-2 w-full">
                          <div className="text-[#0088cc] font-black text-2xl">{option.votes} votos</div>
                          <button 
                            onClick={() => handleVote(option.id)}
                            className="w-full bg-[#0088cc] text-white py-2 rounded-xl font-bold uppercase text-sm hover:bg-[#0077bb] transition-colors"
                          >
                            Votar
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    <button 
                      onClick={triggerLogoOptionUpload}
                      className="aspect-square bg-white/5 border-4 border-dashed border-white/20 rounded-3xl flex flex-col items-center justify-center text-white/40 hover:text-white hover:border-white/40 transition-all group"
                    >
                      <Upload size={48} className="mb-2 group-hover:scale-110 transition-transform" />
                      <span className="font-bold uppercase tracking-widest text-sm">Enviar Logo</span>
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="grid"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  {renderCategoryRow('A', 4)}
                  {renderCategoryRow('B', 8)}
                  {renderCategoryRow('C', 6)}
                  {renderCategoryRow('D', 6)}
                  {renderCategoryRow('E', 6)}
                  {renderCategoryRow('F', 6)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-3 flex flex-col items-center lg:items-stretch gap-6">
            <div className="text-right lg:text-center">
              <h2 className="text-white text-4xl font-black tracking-tighter uppercase italic">
                Time Azul
              </h2>
            </div>

            <div className="flex flex-col items-center gap-6">
              <div className="w-full flex flex-col gap-3">
                <div 
                  onClick={() => triggerUpload(null, true)}
                  className="group relative w-full aspect-square max-w-[200px] mx-auto bg-white rounded-3xl border-4 border-white/30 overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform shadow-2xl"
                >
                  {settings.logo ? (
                    <img 
                      src={settings.logo} 
                      alt="Logo" 
                      className="w-full h-full object-contain p-6"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                      <Upload size={48} className="mb-2" />
                      <span className="text-xl font-bold uppercase tracking-widest">Logo</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="bg-white text-[#0088cc] px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                      Alterar
                    </span>
                  </div>
                </div>

                <button 
                  onClick={() => setIsVotingView(!isVotingView)}
                  className="w-full bg-[#0ABAB5] text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-[#09a09b] active:scale-[0.98] transition-all shadow-xl flex items-center justify-center gap-2"
                >
                  <Trophy size={20} />
                  {isVotingView ? 'Ver Jogadores' : 'Votar no Logo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for Editing Player */}
      <AnimatePresence>
        {editPlayer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditPlayer(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0088cc] rounded-[40px] border border-white/20 shadow-2xl overflow-hidden"
            >
              <div className="p-8 md:p-12">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-white text-4xl font-black uppercase italic tracking-tighter leading-none mb-2">Informações do Tenista</h2>
                    <p className="text-white/60 font-bold uppercase tracking-widest text-sm">Categoria {editPlayer.category} • {editPlayer.name}</p>
                  </div>
                  <button 
                    onClick={() => setEditPlayer(null)}
                    className="w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  {/* Photo Section */}
                  <div className="md:col-span-4">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="group relative aspect-[3/4] bg-white/10 rounded-3xl border-4 border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all hover:border-white/40"
                    >
                      {tempPhoto ? (
                        <img src={tempPhoto} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex flex-col items-center text-white/20">
                          <Camera size={48} className="mb-2" />
                          <span className="font-black uppercase text-xs tracking-widest">Foto</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                        <Upload size={32} className="text-white mb-2" />
                        <span className="text-white font-bold uppercase text-xs">Alterar Foto</span>
                      </div>
                    </div>
                  </div>

                  {/* Fields Section */}
                  <div className="md:col-span-8 space-y-6">
                    {/* Nickname */}
                    <div>
                      <label className="block text-white/60 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Apelido</label>
                      <input 
                        type="text"
                        value={tempNickname}
                        onChange={(e) => setTempNickname(e.target.value)}
                        placeholder="Como quer ser chamado?"
                        className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-2xl text-white text-lg font-bold placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all"
                      />
                    </div>

                    {/* Court Position */}
                    <div>
                      <label className="block text-white/60 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Posição em Quadra</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['DIREITA', 'ESQUERDA', 'TANTO FAZ'].map((pos) => (
                          <button
                            key={pos}
                            onClick={() => setTempCourtPosition(pos)}
                            className={`py-3 rounded-xl font-black text-xs transition-all ${
                              tempCourtPosition === pos 
                                ? 'bg-[#0ABAB5] text-white shadow-lg scale-[1.02]' 
                                : 'bg-white/10 text-white/40 hover:bg-white/20'
                            }`}
                          >
                            {pos}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Availability */}
                    <div>
                      <label className="block text-white/60 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Disponibilidade</label>
                      <div className="space-y-3">
                        {[
                          { date: '21/03', state: tempAvailability21, setter: setTempAvailability21 },
                          { date: '22/03', state: tempAvailability22, setter: setTempAvailability22 },
                          { date: '28/03', state: tempAvailability28, setter: setTempAvailability28 },
                        ].map((day) => (
                          <div key={day.date} className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/10">
                            <span className="text-white font-black text-sm w-16">{day.date}</span>
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              {['MANHÃ', 'TARDE'].map((period) => (
                                <button
                                  key={period}
                                  onClick={() => day.setter(day.state === period ? '' : period)}
                                  className={`py-2 rounded-lg font-black text-[10px] transition-all ${
                                    day.state === period 
                                      ? 'bg-white text-[#0088cc]' 
                                      : 'bg-white/5 text-white/30 hover:bg-white/10'
                                  }`}
                                >
                                  {period}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex gap-4">
                  <button 
                    onClick={() => setEditPlayer(null)}
                    className="flex-1 py-5 rounded-3xl font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/5 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSavePlayer}
                    disabled={isSaving}
                    className={`flex-[2] py-5 rounded-3xl font-black uppercase tracking-widest transition-all shadow-2xl flex items-center justify-center gap-2 ${
                      isSaving 
                        ? 'bg-white/20 text-white/40 cursor-not-allowed' 
                        : 'bg-white text-[#0088cc] hover:bg-white/90 active:scale-[0.98]'
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar Alterações'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <div className="fixed bottom-4 right-4 text-white/50 text-xs font-medium">
        Clique em um box para inserir a foto do tenista
      </div>
    </div>
  );
}
