//console.log('init.js');

//Monkey patch Boolean type to allow toggle()
if (!Boolean.prototype.toggle) {
    Boolean.prototype.toggle = function () {
        return new Boolean(!this.valueOf()); // Returns a new Boolean object
    };
}

//Monkey patch localStorage with set and get methods
Storage.prototype.set = function(key, value) {
  this.setItem(key, JSON.stringify(value));
}
Storage.prototype.get = function(key, defaultValue = null) {
  const value = this.getItem(key);
  return value ? JSON.parse(value) : defaultValue;
}

// Define global config
window.config = window.config || {};

window.config.dev = import.meta.env.DEV;

//Default animation duration
if (!window.config.animationDuration) {
  window.config.animationDuration = '400';
}

//localStorage might contain actively selected setting which has priority.
if (localStorage.getItem('theme') === 'dark') {
  window.config.darkMode = true;
} else if (localStorage.getItem('theme') === 'light') {
  window.config.darkMode = false;
} else {
  // Check if the user prefers dark mode if nothing was set explicitly
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    window.config.darkMode = true;
  } else {
    window.config.darkMode = false;
  }
}

// Set the apiBaseUrl if it hasn't been set before, but only for dev
if (!window.config.apiBaseUrl && import.meta.env.DEV) {
  window.config.apiBaseUrl = 'http://localhost:8000/api';
}
