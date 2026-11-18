import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { loadShortShare } from './lib/shareLink';
import './styles.css';

const root = createRoot(document.getElementById('root')!);

// Un lien court /a/<id> arrive avec son album dans la page : rien à attendre dans le cas normal.
void loadShortShare().then((initial) =>
  root.render(
    <StrictMode>
      <App initial={initial} />
    </StrictMode>,
  ),
);
