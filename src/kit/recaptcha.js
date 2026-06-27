let recaptchaPromise;

export function loadRecaptcha(siteKey = window?.config?.recaptchaKey, nonce = window?.config?.nonce) {
  if (recaptchaPromise) return recaptchaPromise;

  if (!siteKey) {
    return Promise.reject(new Error('reCAPTCHA site key is missing (none provided and none in window.config)'));
  }

  recaptchaPromise = new Promise((resolve, reject) => {
    const script   = document.createElement('script');
    script.src     = `https://www.recaptcha.net/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    script.async   = true;
    script.defer   = true;
    if (nonce) script.setAttribute('nonce', nonce);

    script.onload  = () => window.grecaptcha.ready(() => {
      console.log('recaptcha ready');
      resolve(window.grecaptcha);
    });

    script.onerror = () => {
      console.log('recaptcha failed');
      script.remove();
      recaptchaPromise = undefined;
      reject(new Error('Failed to load reCAPTCHA script'));
    };

    document.head.appendChild(script);
  });

  return recaptchaPromise;
}

export async function executeRecaptcha(action, siteKey = window?.config?.recaptchaKey) {
  if (!action) {
    console.error('reCAPTCHA: “action” must be a non-empty string');
    return null;
  }

  if (!siteKey) {
    console.error('reCAPTCHA: site-key missing (none provided and none in window.config)');
    return null;
  }

  try {
    const grecaptcha = await loadRecaptcha(siteKey);
    const token      = await grecaptcha.execute(siteKey, { action });
    console.log('recaptcha token retrieved');
    return token; 
  } catch (err) {
    console.error('reCAPTCHA error:', err);
    return null;
  }
}

