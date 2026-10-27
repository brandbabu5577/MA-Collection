// MA Collection â€” owner authentication gate (Step 1).
//
// Adds a signup / login gate and one-time store setup in front of the existing
// demo app, using the shared Supabase JS v2 client (frontend/js/supabase-client.js).
// Only authentication and the owner's initial store are handled here: products,
// sales, inventory, Khata and every other feature stay on demo data for now.
//
// Security notes:
//  - Authentication is verified by Supabase Auth only. No localStorage flag is
//    read or trusted for "am I logged in" decisions.
//  - The store id is resolved from the database (public.store_members) under
//    Row Level Security, never from client storage.
//  - Only the publishable / anon key is used; no service-role key is referenced.

const gate = document.getElementById('authGate');
const appRoot = document.getElementById('appRoot');

const state = {
  client: null,
  user: null,
  store: null,
  mode: 'login', // login | signup | confirm | setup | loading | config
  busy: false,
  status: null, // { type: 'error' | 'info', text }
  enteredUserId: null,
  pendingEmail: '',
  pendingName: '',
  memberships: [],
  pendingStoreName: ''
};

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function describeError(error) {
  const message = error && error.message ? String(error.message) : 'Something went wrong. Please try again.';
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) return 'Incorrect email or password. Please try again.';
  if (lower.includes('email not confirmed')) return 'This email is not confirmed yet. Open the confirmation link we emailed you, then log in.';
  if (lower.includes('user already registered')) return 'An account with this email already exists. Try logging in instead.';
  if (lower.includes('already owns a store')) return 'This account already has a shop. Log in to continue.';
  if (lower.includes('password should be at least')) return 'Choose a password with at least 6 characters.';
  if (lower.includes('rate limit') || lower.includes('too many')) return 'Too many attempts just now. Please wait a moment and try again.';
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('load failed')) return 'Could not reach the server. Check your internet connection and try again.';
  return message;
}

function statusMarkup() {
  if (!state.status) return '';
  return `<div class="auth-status ${state.status.type}">${esc(state.status.text)}</div>`;
}

function card(inner) {
  return `<div class="auth-card"><div class="auth-brand"><div class="brand-mark">MA</div><div><div class="brand-name">MA Collection</div><div class="brand-caption">Retail Studio</div></div></div>${inner}</div>`;
}

function renderGate() {
  appRoot.hidden = true;

  if (state.mode === 'config') {
    gate.innerHTML = card(`
      <h1 class="auth-title">Connect your Supabase project</h1>
      <p class="auth-sub">Set your project URL and publishable / anon key in <code>frontend/js/supabase-config.js</code>, then reload this page.</p>
      ${statusMarkup()}
    `);
    return;
  }

  if (state.mode === 'loading') {
    gate.innerHTML = card(`<h1 class="auth-title">MA Collection</h1><p class="auth-sub">Checking your sessionâ€¦</p>`);
    return;
  }

  if (state.mode === 'confirm') {
    gate.innerHTML = card(`
      <h1 class="auth-title">Confirm your email</h1>
      <p class="auth-sub">We sent a confirmation link to <strong>${esc(state.pendingEmail)}</strong>. Open it, then come back and log in.</p>
      ${statusMarkup()}
      <button class="btn primary full" type="button" data-auth="login">Back to log in</button>
      <div class="auth-foot"><button class="link-button" type="button" data-auth="resend">Resend confirmation email</button></div>
    `);
    return;
  }

  if (state.mode === 'select-store') {
    const choices = state.memberships.map((store, index) =>
      '<button class="btn full" type="button" data-auth="choose-store" data-index="' + index + '" style="margin-bottom:10px;text-align:left">' +
      esc(store.name) + ' <span style="opacity:.7">— ' +
      esc(store.role.charAt(0).toUpperCase() + store.role.slice(1)) +
      '</span></button>'
    ).join('');
    gate.innerHTML = card(
      '<h1 class="auth-title">Choose your shop</h1>' +
      '<p class="auth-sub">Choose the shop and role you want to use.</p>' +
      statusMarkup() +
      '<div class="auth-form">' + choices + '</div>' +
      '<div class="auth-foot"><button class="link-button" type="button" data-auth="logout-link">Sign out</button></div>'
    );
    return;
  }

  if (state.mode === 'setup') {
    gate.innerHTML = card(`
      <h1 class="auth-title">Set up your shop</h1>
      <p class="auth-sub">Your owner account is ready. Add your shop details to finish setting up MA Collection. One account owns one shop.</p>
      ${statusMarkup()}
      <form class="auth-form" data-auth-form="setup" novalidate>
        <div><label for="storeName">Shop name</label><input id="storeName" name="storeName" type="text" required maxlength="120" placeholder="e.g. MA Collection" value="${esc(state.pendingStoreName)}"></div>
        <div><label for="businessType">Business type</label>
          <select id="businessType" name="businessType">
            <option value="Clothing &amp; garments">Clothing &amp; garments</option>
            <option value="Retail boutique">Retail boutique</option>
            <option value="Accessories">Accessories</option>
          </select>
        </div>
        <div><label for="storePhone">Phone (optional)</label><input id="storePhone" name="storePhone" type="tel" maxlength="30" placeholder="03xx xxxxxxx"></div>
        <div><label for="storeAddress">Address (optional)</label><input id="storeAddress" name="storeAddress" type="text" maxlength="300" placeholder="Shop address"></div>
        <button class="btn primary full" type="submit" ${state.busy ? 'disabled' : ''}>${state.busy ? 'Creating your shopâ€¦' : 'Create my shop'}</button>
      </form>
      <div class="auth-foot"><button class="link-button" type="button" data-auth="logout-link">Sign out</button></div>
    `);
    return;
  }

  const isSignup = state.mode === 'signup';
  gate.innerHTML = card(`
    <h1 class="auth-title">${isSignup ? 'Create your owner account' : 'Log in to MA Collection'}</h1>
    <p class="auth-sub">${isSignup ? 'One account owns one shop. Sign up to set up your store.' : 'Sign in with the owner account for your shop.'}</p>
    <div class="auth-tabs">
      <button type="button" class="${isSignup ? '' : 'active'}" data-auth="tab-login">Log in</button>
      <button type="button" class="${isSignup ? 'active' : ''}" data-auth="tab-signup">Sign up</button>
    </div>
    ${statusMarkup()}
    <form class="auth-form" data-auth-form="${isSignup ? 'signup' : 'login'}" novalidate>
      ${isSignup ? `<div><label for="fullName">Your name (optional)</label><input id="fullName" name="fullName" type="text" maxlength="120" autocomplete="name" placeholder="Shop owner name" value="${esc(state.pendingName)}"></div>` : ''}
      <div><label for="email">Email</label><input id="email" name="email" type="email" required autocomplete="email" placeholder="you@example.com" value="${esc(state.pendingEmail)}"></div>
      <div><label for="password">Password</label><input id="password" name="password" type="password" required minlength="6" autocomplete="${isSignup ? 'new-password' : 'current-password'}" placeholder="${isSignup ? 'At least 6 characters' : 'Your password'}"></div>
      <button class="btn primary full" type="submit" ${state.busy ? 'disabled' : ''}>${state.busy ? 'Please waitâ€¦' : (isSignup ? 'Create account' : 'Log in')}</button>
    </form>
    <div class="auth-demo">Sample data is still shown in this build. Products, sales, inventory and Khata are not connected to the database yet.</div>
  `);
  const first = gate.querySelector('input');
  if (first) first.focus();
}

async function submitLogin(form) {
  const email = form.email.value.trim();
  const password = form.password.value;
  if (!email || !password) {
    state.status = { type: 'error', text: 'Enter your email and password.' };
    return renderGate();
  }
  state.busy = true;
  state.pendingEmail = email;
  renderGate();
  const { error } = await state.client.auth.signInWithPassword({ email, password });
  state.busy = false;
  if (error) {
    state.status = { type: 'error', text: describeError(error) };
    return renderGate();
  }
  // Success is handled by the auth state listener, which enters the app.
}

async function submitSignup(form) {
  const email = form.email.value.trim();
  const password = form.password.value;
  const fullName = form.fullName ? form.fullName.value.trim() : '';
  if (!email || !password) {
    state.status = { type: 'error', text: 'Enter your email and a password.' };
    return renderGate();
  }
  if (password.length < 6) {
    state.status = { type: 'error', text: 'Choose a password with at least 6 characters.' };
    return renderGate();
  }
  state.busy = true;
  state.pendingEmail = email;
  state.pendingName = fullName;
  renderGate();
  const { data, error } = await state.client.auth.signUp({
    email,
    password,
    options: fullName ? { data: { full_name: fullName } } : {}
  });
  state.busy = false;
  if (error) {
    state.status = { type: 'error', text: describeError(error) };
    return renderGate();
  }
  if (!data || !data.session) {
    state.mode = 'confirm';
    state.status = { type: 'info', text: 'Account created. Please confirm your email to continue.' };
    return renderGate();
  }
  // Auto-confirmed: the auth state listener moves on to store setup.
}

async function submitSetup(form) {
  const name = form.storeName.value.trim();
  const businessType = form.businessType.value;
  const phone = form.storePhone.value.trim();
  const address = form.storeAddress.value.trim();
  state.pendingStoreName = name;
  if (!name) {
    state.status = { type: 'error', text: 'Enter a shop name.' };
    return renderGate();
  }
  state.busy = true;
  renderGate();
  const { data, error } = await state.client.rpc('create_store', {
    p_name: name,
    p_business_type: businessType,
    p_phone: phone || null,
    p_address: address || null
  });
  state.busy = false;
  if (error) {
    state.status = { type: 'error', text: describeError(error) };
    return renderGate();
  }
  unlockApp({ id: data, name, business_type: businessType, phone: phone || '', address: address || '', logo_path: '', role: 'owner' });
}

async function resendConfirmation(trigger) {
  if (!state.pendingEmail) {
    state.mode = 'signup';
    return renderGate();
  }
  trigger.disabled = true;
  const { error } = await state.client.auth.resend({ type: 'signup', email: state.pendingEmail });
  state.status = error
    ? { type: 'error', text: describeError(error) }
    : { type: 'info', text: 'Confirmation email sent again to ' + state.pendingEmail + '.' };
  renderGate();
}

async function handleSession(session) {
  const user = session && session.user;
  if (!user) {
    state.user = null;
    state.memberships = [];
    state.mode = 'login';
    return renderGate();
  }
  if (state.enteredUserId === user.id && state.store) return;

  state.user = user;
  state.mode = 'loading';
  state.status = null;
  renderGate();

  const { data, error } = await state.client
    .from('store_members')
    .select('store_id, role, stores(name, business_type, phone, address, logo_path)')
    .eq('user_id', user.id)
    .order('store_id');

  if (error) {
    state.status = { type: 'error', text: describeError(error) };
    state.mode = 'login';
    return renderGate();
  }

  const rows = Array.isArray(data) ? data : [];
  const allowedRoles = ['owner', 'manager', 'cashier'];
  const memberships = rows
    .filter(row => row && row.store_id && allowedRoles.includes(row.role))
    .map(row => ({
      id: row.store_id,
      name: row.stores && row.stores.name ? row.stores.name : 'MA Collection',
      business_type: row.stores && row.stores.business_type ? row.stores.business_type : 'Clothing & garments',
      phone: row.stores && row.stores.phone ? row.stores.phone : '',
      address: row.stores && row.stores.address ? row.stores.address : '',
      logo_path: row.stores && row.stores.logo_path ? row.stores.logo_path : '',
      role: row.role
    }));

  if (rows.length > 0 && memberships.length === 0) {
    state.status = {
      type: 'error',
      text: 'Your store role is invalid. Please contact the store owner.'
    };
    state.mode = 'login';
    await state.client.auth.signOut();
    return renderGate();
  }

  if (memberships.length === 0) {
    state.memberships = [];
    state.mode = 'setup';
    return renderGate();
  }

  state.memberships = memberships;
  if (memberships.length === 1) {
    unlockApp(memberships[0]);
    return;
  }

  state.mode = 'select-store';
  renderGate();
}

function applyAccountLabels() {
  const email = state.user && state.user.email ? state.user.email : 'Account';
  const role = state.store && state.store.role ? state.store.role : 'owner';
  const roleLabel = role === 'owner' ? 'Owner' :
    role === 'manager' ? 'Manager' :
    role === 'cashier' ? 'Cashier' : 'Employee';

  const meta = document.querySelector('.store-meta');
  if (meta) {
    const name = meta.querySelector('strong');
    if (name && state.store) name.textContent = state.store.name;
    const sub = meta.querySelector('span');
    if (sub) sub.textContent = roleLabel + ' workspace';
  }

  const mini = document.querySelector('.user-mini .user-info');
  if (mini) {
    const strong = mini.querySelector('strong');
    if (strong) strong.textContent = email;
    const span = mini.querySelector('span');
    if (span) span.textContent = roleLabel;
  }

  const top = document.querySelector('.top-avatar .user-info');
  if (top) {
    const span = top.querySelector('span');
    if (span) span.textContent = email;
    const small = top.querySelector('small');
    if (small) small.textContent = roleLabel + ' account';
  }
}

function unlockApp(store) {
  state.store = store;
  state.enteredUserId = state.user ? state.user.id : null;
  window.MA_STORE = { id: store.id, name: store.name, business_type: store.business_type || 'Clothing & garments', phone: store.phone || '', address: store.address || '', logo_path: store.logo_path || '', role: store.role };
  window.MA_USER = state.user ? { id: state.user.id, email: state.user.email } : null;
  applyAccountLabels();
  gate.hidden = true;
  appRoot.hidden = false;
  window.dispatchEvent(new Event('ma-store-ready'));
  const content = document.getElementById('pageContent');
  if (content && typeof content.focus === 'function') content.focus();
}

function lockApp() {
  state.store = null;
  state.user = null;
  state.memberships = [];
  state.enteredUserId = null;
  window.MA_STORE = null;
  window.MA_USER = null;
  appRoot.hidden = true;
}

async function signOut() {
  if (!state.client) return;
  state.busy = true;
  const { error } = await state.client.auth.signOut();
  state.busy = false;
  if (error) {
    state.status = { type: 'error', text: describeError(error) };
    return renderGate();
  }
  lockApp();
  state.mode = 'login';
  state.status = { type: 'info', text: 'You have been signed out.' };
  renderGate();
}

gate.addEventListener('submit', event => {
  const form = event.target.closest('form[data-auth-form]');
  if (!form) return;
  event.preventDefault();
  state.status = null;
  const kind = form.dataset.authForm;
  if (kind === 'setup') return void submitSetup(form);
  if (kind === 'signup') return void submitSignup(form);
  return void submitLogin(form);
});

gate.addEventListener('click', event => {
  const trigger = event.target.closest('[data-auth]');
  if (!trigger) return;
  const action = trigger.dataset.auth;
  if (action === 'tab-login' || action === 'login') {
    state.mode = 'login';
    state.status = null;
    return renderGate();
  }
  if (action === 'tab-signup') {
    state.mode = 'signup';
    state.status = null;
    return renderGate();
  }
  if (action === 'resend') return void resendConfirmation(trigger);
  if (action === 'choose-store') {
    const index = Number(trigger.dataset.index);
    const selected = Number.isInteger(index) ? state.memberships[index] : null;
    if (!selected) {
      state.status = { type: 'error', text: 'Please select a valid shop.' };
      return renderGate();
    }
    return unlockApp(selected);
  }
  if (action === 'logout-link') return void signOut();
});

document.addEventListener('click', event => {
  if (!event.target.closest('[data-auth-action="logout"]')) return;
  if (window.confirm('Sign out of MA Collection?')) void signOut();
});

async function init() {
  if (!gate || !appRoot) return;
  appRoot.hidden = true;

  try {
    const module = await import('./supabase-client.js');
    state.client = module.supabase || module.default;
  } catch (error) {
    state.mode = 'config';
    state.status = { type: 'info', text: describeError(error) };
    return renderGate();
  }

  state.mode = 'loading';
  renderGate();

  const { data } = await state.client.auth.getSession();
  if (data && data.session) await handleSession(data.session);
  else {
    state.mode = 'login';
    renderGate();
  }

  state.client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      lockApp();
      state.mode = 'login';
      return renderGate();
    }
    if (session && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
      void handleSession(session);
    }
  });
}

void init();

