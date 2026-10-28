/* Conexão com o Supabase (opcional).
   Preencha a URL e a chave pública (anon key) do seu projeto para que todos
   os noivos já abram o app conectados e só precisem criar a conta/entrar.
   A anon key é pública por natureza; a proteção dos dados vem das regras
   de segurança (RLS) criadas pelo arquivo supabase/schema.sql.
   Deixe como null para usar o app só no aparelho. */

window.APP_CONFIG = null;

// Exemplo:
// window.APP_CONFIG = {
//   url: 'https://SEU-PROJETO.supabase.co',
//   anonKey: 'SUA-ANON-KEY',
// };

/* Link do botão "Quero o Planner Premium" no Planner Essencial (página de vendas ou checkout).
   Deixe como null para mostrar "Fale com a Bi" no lugar do botão. */
window.UPGRADE_URL = null;
