# Torneio de Cores 2026 - Time Azul 🎾

Aplicação web responsiva para administração e acompanhamento do Torneio de Cores 2026.

## 🚀 Configuração do Supabase

1. **Crie um projeto no Supabase.**
2. **Execute o SQL:** Copie o conteúdo de `supabase_schema.sql` e execute no SQL Editor do Supabase.
3. **Storage:** Crie um bucket público chamado `sumulas`.
4. **Auth:** Habilite o login por Email (usaremos o formato `celular@torneio.com` para simular o login por celular solicitado).

### Criando o usuário solicitado (11985524500)
1. No menu **Authentication** do Supabase, clique em **Add User** > **Create new user**.
2. No campo e-mail, coloque: `11985524500@torneio.com`
3. No campo senha, coloque: `2026`
4. Após criar, execute o seguinte SQL no **SQL Editor** para torná-lo Admin:

```sql
INSERT INTO profiles (id, celular, role) 
SELECT id, '11985524500', 'admin' 
FROM auth.users 
WHERE email = '11985524500@torneio.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

## ☁️ Deployment na Vercel

1. Conecte seu repositório GitHub à Vercel.
2. Adicione as seguintes **Environment Variables**:
   - `VITE_SUPABASE_URL`: Sua URL do projeto Supabase.
   - `VITE_SUPABASE_ANON_KEY`: Sua chave anônima do Supabase.

## 🛠 Tecnologias
- React 19
- Tailwind CSS 4
- Supabase (Auth, Database, Storage)
- Lucide React (Ícones)
- Motion (Animações)
