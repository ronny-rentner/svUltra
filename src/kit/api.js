// Default stubs for per-app API calls used by the kit's chrome (UserMenu,
// LoginForm, ContactForm). Each function logs a warning and returns a
// resolved promise so the chrome compiles and renders out of the box.
//
// The starter / a real consumer overrides this file via Vite alias:
//   { 'svultra/kit/api.js': path.resolve(__dirname, 'src/api.js') }
// and supplies a per-app implementation that talks to its auth backend.

function todo(name) {
  console.warn(`svultra/kit/api.js: ${name}() called on the default stub. Override svultra/kit/api.js in your Vite alias to wire up your auth backend.`);
}

export async function signOut() {
  todo('signOut');
}

export async function submitSigninForm(data) {
  todo('submitSigninForm');
  return { ok: false };
}

export async function submitContactForm(data) {
  todo('submitContactForm');
  return { ok: false };
}
