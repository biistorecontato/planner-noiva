/* Armazenamento: salva sempre no aparelho (localStorage) e, se o Supabase
   estiver configurado e o casal estiver logado, sincroniza com a nuvem.
   O planner inteiro é guardado como um único documento JSON por conta. */

const Store = (() => {
  const KEY = 'unb_planner_v1';
  const CFG_KEY = 'unb_supabase_cfg';
  const TABLE = 'planners';

  let state = load();
  let client = null;
  let user = null;
  let status = 'local';
  let pushTimer = null;
  const listeners = { status: [], remote: [] };

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

  function setStatus(s) {
    status = s;
    listeners.status.forEach(fn => fn(s));
  }

  function save() {
    state.updatedAt = Date.now();
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
    setStatus('syncing');
    const { data, error } = await client.from(TABLE).select('data').eq('user_id', user.id).maybeSingle();
    if (error) {
      console.error('Supabase select', error);
      return setStatus('error');
    }
    if (data && data.data && (data.data.updatedAt || 0) > (state.updatedAt || 0)) {
      state = Object.assign(blank(), data.data);
      writeLocal();
      listeners.remote.forEach(fn => fn());
      setStatus('synced');
    } else {
      await push();
    }
  }

  function getConfig() {
    try { return JSON.parse(localStorage.getItem(CFG_KEY)) || null; } catch { return null; }
  }

  async function connect(cfg) {
    if (cfg) localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
    cfg = cfg || getConfig() || window.APP_CONFIG;
    if (!cfg || !cfg.url || !cfg.anonKey || !window.supabase) {
      client = null;
      return false;
    }
    client = window.supabase.createClient(cfg.url, cfg.anonKey);
    const { data } = await client.auth.getSession();
    user = data.session ? data.session.user : null;
    client.auth.onAuthStateChange((_event, session) => {
      const was = user && user.id;
      user = session ? session.user : null;
      if (user && user.id !== was) pull();
      if (!user) setStatus('loggedout');
    });
    if (user) await pull(); else setStatus('loggedout');
    return true;
  }

  function disconnect() {
    localStorage.removeItem(CFG_KEY);
    client = null;
    user = null;
    setStatus('local');
  }

  async function signIn(email, password) {
    const { error } = await client.auth.signInWithPassword({ email, password });
    return error;
  }

  async function signUp(email, password) {
    const { data, error } = await client.auth.signUp({ email, password });
    return { error, needsConfirmation: !error && !data.session };
  }

  async function signOut() {
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
    get status() { return status; },
    save, connect, disconnect, getConfig, signIn, signUp, signOut, replace,
    onStatus: fn => listeners.status.push(fn),
    onRemote: fn => listeners.remote.push(fn),
  };
})();
