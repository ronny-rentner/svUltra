import { mount } from 'svelte';
import App from './App.svelte';

// Import global styles
import '@styles/app.css';

const app = mount(App, { target: document.getElementById('app') });
export default app;