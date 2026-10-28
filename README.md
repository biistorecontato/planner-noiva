# Planner de Casamento — Universo Noiva da Bi

App do "Planner Completo de Casamento": checklist por período, fornecedores,
financeiro, convidados, cerimônia, identidade visual, cronograma do grande dia
e anotações. Funciona no computador e no celular (pode ser instalado na tela inicial).

## Como abrir

Abra o arquivo `index.html` no navegador. Os dados ficam salvos no próprio aparelho.

## Duas edições

- **Premium**: `index.html` (raiz). Com o Supabase configurado, pede login; noivo e noiva usam o mesmo e-mail e senha.
- **Essencial**: `basico/index.html`. Mesmo código, com as seções de `PREMIUM` (em `js/schema.js`) trancadas. Nunca usa login: salva só no aparelho.
- O link do botão de compra fica em `window.UPGRADE_URL`, em `js/config.js`.

## Banco de dados (Supabase): login do Premium

1. Crie uma conta e um projeto em https://supabase.com.
2. No projeto, abra **SQL Editor > New query**, cole o conteúdo de `supabase/schema.sql` e clique em **Run**.
3. Em **Project Settings > API**, copie a **Project URL** e a chave **anon public** e cole em `js/config.js`.
4. Em **Authentication > URL Configuration**, coloque em **Site URL** e em **Redirect URLs** o endereço do app: `https://biistorecontato.github.io/planner-noiva/`.
5. Em **Authentication > Sign In / Providers**, desligue **Allow new users to sign up**: só entra quem comprou.
6. A cada venda: **Authentication > Users > Add user > Send invitation**, com o e-mail da compradora.
   Ela recebe o convite, cria a senha no app e já entra. Cada conta só enxerga o próprio planner.

Para não exigir confirmação por e-mail no cadastro: **Authentication > Sign In / Providers > Email > Confirm email** (desligar).

## GitHub: salvar o projeto online e publicar o app

1. Em https://github.com/new, crie um repositório novo (ex.: `planner-noiva`), sem README.
2. Nesta pasta, rode:
   ```
   git remote add origin https://github.com/SEU-USUARIO/planner-noiva.git
   git push -u origin main
   ```
3. Para o app ganhar um link público: no repositório, **Settings > Pages > Branch: main / (root) > Save**.
   Em alguns minutos ele fica disponível em `https://SEU-USUARIO.github.io/planner-noiva/`.
   Por esse link, o app pode ser instalado no celular ("Adicionar à tela inicial").

## Estrutura

- `index.html`: página do app
- `css/styles.css`: visual (creme e dourado)
- `js/schema.js`: todo o conteúdo do planner (textos, checklists, tabelas). Para mudar um item, edite aqui.
- `js/app.js`: telas e cálculos
- `js/store.js`: salvamento no aparelho e sincronização com o Supabase
- `supabase/schema.sql`: tabela e regras de segurança do banco
