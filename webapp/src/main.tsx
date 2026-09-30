import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import './index.css'
import App from './App.tsx'
import { OverlayPage } from './components/OverlayPage.tsx'
import { store } from './store/store.ts'

const isOverlay = window.location.pathname === '/overlay'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      {isOverlay ? <OverlayPage /> : <App />}
    </Provider>
  </StrictMode>,
)
