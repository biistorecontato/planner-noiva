/* Armazenamento: salva sempre no aparelho (localStorage) e, se o Supabase
   estiver configurado e a pessoa estiver logada, sincroniza com a nuvem.
   O planner inteiro é guardado como um único documento JSON por conta. */

const Store = (() => {
  const KEY = 'unb_planner_v1';
  const CFG_KEY = 'unb_supabase_cfg';
  const TABLE = 'planners';

  let state = load();
  let client = null;
  let user = null;
  let status = 'local';
  let ready = false;
  let pushTimer = null;
  const listeners = { status: [], remote: [], auth: [], recovery: [] };

  function blank() {
    return { version: 1, updatedAt: 0, fields: {}, chips: {}, checks: {}, tables: {} };
  }

  function load() {
    try {
      return Object.assign(blank(), JSON.parse(localStorage.getItem(KEY)) || {});
    } catch {
      return blank();
    }
  }

  function writeLocal() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function clearLocal() {
    state = blank();
    localStorage.removeItem(KEY);
    listeners.remote.forEach(fn => fn());
  }

  function setStatus(s) {
    status = s;
    listeners.status.forEach(fn => fn(s));
  }

  function save() {
    state.updatedAt = Date.now();
    if (user) state.owner = user.id;
    writeLocal();
    if (client && user) {
      clearTimeout(pushTimer);
      setStatus('pending');
      pushTimer = setTimeout(push, 1200);
    }
  }

  async function push() {
    if (!client || !user) return;
    if (!navigator.onLine) return setStatus('offline');
    setStatus('syncing');
    const { error } = await client.from(TABLE).upsert({
      user_id: user.id,
      data: state,
      updated_at: new Date(state.updatedAt || Date.now()).toISOString(),
    });
    setStatus(error ? 'error' : 'synced');
    if (error) console.error('Supabase upsert', error);
  }

  async function pull() {
    if (!client || !user) return;
    // Dados locais de outra conta (aparelho compartilhado) nunca vão para esta conta.
    if (state.owner && state.owner !== user.id) clearLocal();
    setStatus('syncing');
    const { data, error } = await client.from(TABLE).select('data').eq('user_id', user.id).maybeSingle();
    if (error) {
      console.error('Supabase select', error);
      return setStatus('error');
    }
    if (data && data.data && (data.data.updatedAt || 0) >= (state.updatedAt || 0)) {
      state = Object.assign(blank(), data.data);
      writeLocal();
      listeners.remote.forEach(fn => fn());
      setStatus('synced');
    } else {
      state.owner = user.id;
      writeLocal();
      await push();
    }
  }

  function getConfig() {
    try { return JSON.parse(localStorage.getItem(CFG_KEY)) || null; } catch { return null; }
  }

  async function connect(cfg) {
    if (cfg) localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
    cfg = window.APP_CONFIG || cfg || getConfig();
    if (!cfg || !cfg.url || !cfg.anonKey || !window.supabase) {
      client = null;
      ready = true;
      return false;
    }
    client = window.supabase.createClient(cfg.url, cfg.anonKey);
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') listeners.recovery.forEach(fn => fn());
      const was = user && user.id;
      user = session ? session.user : null;
      // setTimeout: o Supabase recomenda não chamar o banco dentro deste callback.
      if (user && user.id !== was && ready) setTimeout(() => pull().then(() => listeners.auth.forEach(fn => fn())), 0);
      if (!user && was) {
        clearLocal();
        setStatus('loggedout');
        listeners.auth.forEach(fn => fn());
      }
    });
    const { data } = await client.auth.getSession();
    user = data.session ? data.session.user : null;
    if (user) await pull(); else setStatus('loggedout');
    ready = true;
    return true;
  }

  function disconnect() {
    localStorage.removeItem(CFG_KEY);
    client = null;
    user = null;
    setStatus('local');
  }

  const redirectTo = () => location.origin + location.pathname;

  async function signIn(email, password) {
    const { error } = await client.auth.signInWithPassword({ email, password });
    return error;
  }

  async function signUp(email, password) {
    const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo() } });
    return { error, needsConfirmation: !error && !data.session };
  }

  async function resetPassword(email) {
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: redirectTo() });
    return error;
  }

  async function updatePassword(password) {
    const { error } = await client.auth.updateUser({ password });
    return error;
  }

  async function signOut() {
    clearTimeout(pushTimer);
    if (status === 'pending') await push();
    await client.auth.signOut();
  }

  function replace(newState) {
    state = Object.assign(blank(), newState);
    save();
  }

  window.addEventListener('online', () => { if (client && user) push(); });

  return {
    get state() { return state; },
    get user() { return user; },
    get connected() { return !!client; },
    get managed() { return !!(window.APP_CONFIG && window.APP_CONFIG.url); },
    get ready() { return ready; },
    get status() { return status; },
    save, connect, disconnect, getConfig, signIn, signUp, signOut, resetPassword, updatePassword, replace,
    onStatus: fn => listeners.status.push(fn),
    onRemote: fn => listeners.remote.push(fn),
    onAuth: fn => listeners.auth.push(fn),
    onRecovery: fn => listeners.recovery.push(fn),
  };
})();
