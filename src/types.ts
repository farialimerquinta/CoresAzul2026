export type Role = 'admin' | 'user';

export interface Profile {
  id: string;
  celular: string;
  role: Role;
}

export interface Jogo {
  id: string;
  data: string;
  time_casa: string;
  time_visitante: string;
  sets_casa: number;
  sets_visitante: number;
  sumula_url: string | null;
  finalizado: boolean;
}

export interface Classificacao {
  time_nome: string;
  vitorias: number;
  derrotas: number;
  empates: number;
  sets_pro: number;
  sets_contra: number;
  pontos: number;
}

export interface ConfrontoJogador {
  id: string;
  jogo_id: string;
  ordem: number;
  categoria: string;
  jogador1: string;
  jogador1_dupla: string | null;
  jogador2: string;
  jogador2_dupla: string | null;
  set1_j1: number | null;
  set1_j2: number | null;
  set2_j1: number | null;
  set2_j2: number | null;
  set3_j1: number | null;
  set3_j2: number | null;
  vencedor: 'jogador1' | 'jogador2' | null;
  wo_vencedor: 'jogador1' | 'jogador2' | null;
}
