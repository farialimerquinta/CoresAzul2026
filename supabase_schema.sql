-- Schema para o Torneio de Cores 2026

-- 1. Tabela de Perfis (Extensão do Supabase Auth)
-- Usaremos o Supabase Auth para segurança, mas esta tabela guarda o papel (role) e celular.
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  celular TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('admin', 'user')) DEFAULT 'user',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Tabela de Jogos (CONFRONTOS)
CREATE TABLE jogos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL,
  time_casa TEXT NOT NULL,
  time_visitante TEXT NOT NULL,
  sets_casa INTEGER DEFAULT 0,
  sets_visitante INTEGER DEFAULT 0,
  sumula_url TEXT,
  finalizado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Tabela de Classificação (Pode ser uma View ou Tabela)
-- Aqui criaremos como tabela para facilitar o cache, mas pode ser calculada dinamicamente.
CREATE TABLE classificacao (
  time_nome TEXT PRIMARY KEY,
  vitorias INTEGER DEFAULT 0,
  derrotas INTEGER DEFAULT 0,
  empates INTEGER DEFAULT 0,
  sets_pro INTEGER DEFAULT 0,
  sets_contra INTEGER DEFAULT 0,
  pontos INTEGER DEFAULT 0
);

-- Inserir os times iniciais
INSERT INTO classificacao (time_nome) VALUES 
('Azul'), ('Amarelo'), ('Verde'), ('Branco'), ('Roxo'), ('Vermelho');

-- Inserir os jogos iniciais (conforme solicitado)
INSERT INTO jogos (data, time_casa, time_visitante) VALUES 
('2026-03-21', 'Azul', 'Roxo'),
('2026-03-22', 'Azul', 'Amarelo'),
('2026-03-28', 'Azul', 'Verde'),
('2026-03-29', 'Finalistas', 'Finalistas');

-- SQL para tornar o usuário solicitado um ADMIN (Executar após criar no Auth)
-- INSERT INTO profiles (id, celular, role) 
-- SELECT id, '11985524500', 'admin' FROM auth.users WHERE email = '11985524500@torneio.com';

-- 4. Tabela de Confrontos de Jogadores (Os 18 confrontos por dia)
CREATE TABLE confrontos_jogadores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  jogo_id UUID REFERENCES jogos(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL,
  categoria TEXT NOT NULL,
  jogador1 TEXT NOT NULL,
  jogador2 TEXT NOT NULL,
  set1_j1 INTEGER,
  set1_j2 INTEGER,
  set2_j1 INTEGER,
  set2_j2 INTEGER,
  set3_j1 INTEGER,
  set3_j2 INTEGER,
  vencedor TEXT, -- 'jogador1' ou 'jogador2'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Inserir os 18 confrontos do Dia 21 (Exemplo)
-- Primeiro, precisamos do ID do jogo de 21/03. No SQL Editor, você pode fazer:
-- INSERT INTO confrontos_jogadores (jogo_id, ordem, categoria, jogador1, jogador2)
-- SELECT id, 1, 'B', 'NORIMITI FUKUMA', 'SHEILA OKAZAKI' FROM jogos WHERE data = '2026-03-21' LIMIT 1;
-- ... e assim por diante para os 18.

-- RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jogos ENABLE ROW LEVEL SECURITY;
ALTER TABLE classificacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE confrontos_jogadores ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "Perfis visíveis por todos" ON profiles FOR SELECT USING (true);
CREATE POLICY "Jogos visíveis por todos" ON jogos FOR SELECT USING (true);
CREATE POLICY "Classificação visível por todos" ON classificacao FOR SELECT USING (true);
CREATE POLICY "Confrontos visíveis por todos" ON confrontos_jogadores FOR SELECT USING (true);

-- Apenas Admins podem editar jogos e confrontos
CREATE POLICY "Admins podem editar jogos" ON jogos 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins podem editar confrontos" ON confrontos_jogadores 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Storage Bucket para Súmulas
-- (Isso deve ser feito na UI do Supabase, mas aqui está a referência)
-- Bucket Name: sumulas
