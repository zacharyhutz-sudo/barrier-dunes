import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.js';

import { routes } from '../lib/routes.js';
const adminUrl = routes.admin;

const form = document.querySelector('[data-login-form]');
const message = document.querySelector('[data-login-message]');
const submitButton = document.querySelector('[data-login-submit]');

function setMessage(text, type = 'info') {
  if (!message) return;
  message.textContent = text;
  message.dataset.type = type;
}

async function init() {
  if (!form || !message || !submitButton) return;

  if (!isSupabaseConfigured) {
    setMessage('Supabase is not configured yet. Add PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY.', 'error');
    submitButton.disabled = true;
    return;
  }

  const { data } = await supabase.auth.getSession();
  if (data.session) {
    window.location.assign(adminUrl);
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');

    if (!email || !password) {
      setMessage('Enter both email and password.', 'error');
      return;
    }

    submitButton.disabled = true;
    setMessage('Signing in…');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(error.message, 'error');
      submitButton.disabled = false;
      return;
    }

    setMessage('Signed in. Redirecting…', 'success');
    window.location.assign(adminUrl);
  });
}

init();
