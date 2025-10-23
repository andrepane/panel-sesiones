import React from 'https://esm.sh/react@18.2.0';
import ReactDOM from 'https://esm.sh/react-dom@18.2.0/client';
import { App } from './components/App.js';

const container = document.getElementById('app');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(<App />);
}
