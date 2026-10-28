/* Armazenamento: salva sempre no aparelho (localStorage) e, se o Supabase
   estiver configurado e a pessoa estiver logada, sincroniza com a nuvem.
   O planner inteiro é guardado como um único documento JSON por conta. */

const Store = (() => {
  const KEY = 'unb_planner_v1';
  const CFG_KEY = 'unb_supabase_cfg';
  const TABLE = 'planners';
  const BASE_KEY = KEY + '_base';
  // O Planner Essencial fica sempre só no aparelho; login e nuvem são do Premium.
  const BASICO = window.EDICAO === 'basico';

  let state = load();
  // Última versão combinada com a nuvem: serve para juntar o que o noivo e a noiva mudaram em aparelhos diferentes.
  let base = loadBase();
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

  function loadBase() {
    try { return JSON.parse(localStorage.getItem(BASE_KEY)); } catch { return null; }
  }

  function setBase(data) {
    base = JSON.parse(JSON.stringify(data));
    localStorage.setItem(BASE_KEY, JSON.stringify(base));
  }

  const dirty = () => !base || (state.updatedAt || 0) > (base.updatedAt || 0);

  function writeLocal() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function clearLocal() {
    state = blank();
    base = null;
    localStorage.removeItem(KEY);
    localStorage.removeItem(BASE_KEY);
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
    // Se o outro aparelho salvou depois da última sincronização, junta as duas versões antes de enviar.
    if (base) {
      const { data } = await client.from(TABLE).select('data').eq('user_id', user.id).maybeSingle();
      const remote = data && data.data;
      if (remote && (remote.updatedAt || 0) > (base.updatedAt || 0)) {
        state = Object.assign(blank(), merge3(base, state, remote));
        state.updatedAt = Date.now();
        writeLocal();
        listeners.remote.forEach(fn => fn());
      }
    }
    const sent = JSON.parse(JSON.stringify(state));
    const { error } = await client.from(TABLE).upsert({
      user_id: user.id,
      data: state,
      updated_at: new Date(state.updatedAt || Date.now()).toISOString(),
    });
    setStatus(error ? 'error' : 'synced');
    if (error) console.error('Supabase upsert', error);
    else setBase(sent);
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
    const remote = data && data.data;
    if (remote && base && dirty() && (remote.updatedAt || 0) > (base.updatedAt || 0)) {
      await push(); // mudanças dos dois lados: push junta e envia
    } else if (remote && (base ? !dirty() : (remote.updatedAt || 0) >= (state.updatedAt || 0))) {
      if ((remote.updatedAt || 0) !== (state.updatedAt || 0)) {
        state = Object.assign(blank(), remote);
        writeLocal();
        listeners.remote.forEach(fn => fn());
      }
      setBase(remote);
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
    cfg = BASICO ? null : window.APP_CONFIG || cfg || getConfig();
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
  // Ao voltar para o app (ou a cada minuto com ele aberto), busca o que o outro aparelho mudou.
  const refresh = () => {
    if (client && user && ready && document.visibilityState === 'visible' && navigator.onLine && status !== 'pending' && status !== 'syncing') pull();
  };
  document.addEventListener('visibilitychange', refresh);
  setInterval(refresh, 60000);

  /* Junta três versões: o que mudou só aqui ou só lá entra; listas com id são combinadas item a item. */
  function merge3(b, l, r) {
    const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
    if (same(l, b)) return r;
    if (same(r, b)) return l;
    const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
    if (isObj(l) && isObj(r)) {
      const out = {};
      for (const k of new Set([...Object.keys(r), ...Object.keys(l)])) {
        const v = merge3(isObj(b) ? b[k] : undefined, l[k], r[k]);
        if (v !== undefined) out[k] = v;
      }
      return out;
    }
    if (Array.isArray(l) && Array.isArray(r)) {
      const bArr = Array.isArray(b) ? b : [];
      const withId = [...l, ...r].every(x => isObj(x) && x.id);
      if (withId) {
        const bm = new Map(bArr.filter(isObj).map(x => [x.id, x]));
        const lm = new Map(l.map(x => [x.id, x]));
        const rm = new Map(r.map(x => [x.id, x]));
        const out = [];
        for (const x of r) {
          if (bm.has(x.id) && !lm.has(x.id)) continue; // apagado aqui
          out.push(lm.has(x.id) ? merge3(bm.get(x.id), lm.get(x.id), x) : x);
        }
        for (const x of l) if (!rm.has(x.id) && !bm.has(x.id)) out.push(x); // novo aqui
        return out;
      }
      const key = x => JSON.stringify(x);
      const bk = new Set(bArr.map(key)), lk = new Set(l.map(key)), rk = new Set(r.map(key));
      return [...r.filter(x => !(bk.has(key(x)) && !lk.has(key(x)))), ...l.filter(x => !bk.has(key(x)) && !rk.has(key(x)))];
    }
    return l;
  }

  return {
    get state() { return state; },
    get user() { return user; },
    get connected() { return !!client; },
    get managed() { return !BASICO && !!(window.APP_CONFIG && window.APP_CONFIG.url); },
    get ready() { return ready; },
    get status() { return status; },
    merge3, save, connect, disconnect, getConfig, signIn, signUp, signOut, resetPassword, updatePassword, replace,
    onStatus: fn => listeners.status.push(fn),
    onRemote: fn => listeners.remote.push(fn),
    onAuth: fn => listeners.auth.push(fn),
    onRecovery: fn => listeners.recovery.push(fn),
  };
})();
