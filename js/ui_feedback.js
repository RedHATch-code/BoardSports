const STYLE_ID = 'boardsports-feedback-style'
const TOAST_ROOT_ID = 'boardsports-toast-root'

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    #${TOAST_ROOT_ID} {
      position: fixed;
      right: 18px;
      bottom: 18px;
      z-index: 4000;
      display: grid;
      gap: 12px;
      width: min(360px, calc(100vw - 24px));
    }

    .boardsports-toast {
      padding: 14px 16px;
      border-radius: 18px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(13, 16, 22, 0.92);
      box-shadow: 0 22px 42px rgba(0, 0, 0, 0.28);
      color: #f3f4f6;
      line-height: 1.5;
      backdrop-filter: blur(14px);
      transform: translateY(12px);
      opacity: 0;
      transition: opacity 0.22s ease, transform 0.22s ease;
    }

    .boardsports-toast.is-visible {
      opacity: 1;
      transform: translateY(0);
    }

    .boardsports-toast[data-type="success"] {
      border-color: rgba(68, 194, 132, 0.45);
    }

    .boardsports-toast[data-type="error"] {
      border-color: rgba(241, 99, 99, 0.48);
    }

    .boardsports-toast[data-type="warning"] {
      border-color: rgba(255, 168, 75, 0.48);
    }

    .boardsports-confirm {
      position: fixed;
      inset: 0;
      z-index: 4100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(4, 7, 12, 0.7);
      backdrop-filter: blur(10px);
    }

    .boardsports-confirm__dialog {
      width: min(460px, 100%);
      padding: 24px;
      border-radius: 26px;
      background: linear-gradient(180deg, rgba(20, 22, 28, 0.98), rgba(10, 12, 17, 0.99));
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #f3f4f6;
      box-shadow: 0 32px 80px rgba(0, 0, 0, 0.34);
    }

    .boardsports-confirm__dialog h3 {
      margin: 0 0 12px;
      font-size: 1.3rem;
    }

    .boardsports-confirm__dialog p {
      margin: 0;
      color: rgba(243, 244, 246, 0.8);
      line-height: 1.6;
    }

    .boardsports-confirm__actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 22px;
    }

    .boardsports-confirm__button {
      min-height: 44px;
      padding: 0 18px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.04);
      color: #f3f4f6;
      font-weight: 700;
      cursor: pointer;
    }

    .boardsports-confirm__button--danger {
      background: linear-gradient(135deg, #f97373 0%, #dc2626 100%);
      border-color: rgba(248, 113, 113, 0.44);
      color: white;
    }

    .boardsports-confirm__button--primary {
      background: linear-gradient(135deg, #d9c2a1 0%, #d66d24 100%);
      border-color: rgba(255, 181, 95, 0.44);
      color: #141414;
    }
  `

  document.head.appendChild(style)
}

function ensureToastRoot() {
  ensureStyles()

  let root = document.getElementById(TOAST_ROOT_ID)
  if (!root) {
    root = document.createElement('div')
    root.id = TOAST_ROOT_ID
    document.body.appendChild(root)
  }

  return root
}

export function showToast(message, options = {}) {
  if (!message) return

  const { type = 'info', duration = 3200 } = options
  const root = ensureToastRoot()
  const toast = document.createElement('div')
  toast.className = 'boardsports-toast'
  toast.dataset.type = type
  toast.textContent = message

  root.appendChild(toast)

  requestAnimationFrame(() => {
    toast.classList.add('is-visible')
  })

  window.setTimeout(() => {
    toast.classList.remove('is-visible')
    window.setTimeout(() => toast.remove(), 220)
  }, duration)
}

export function showConfirm(options = {}) {
  ensureStyles()

  const {
    title = 'Confirmar acao',
    message = 'Queres continuar?',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    danger = false
  } = options

  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.className = 'boardsports-confirm'
    overlay.innerHTML = `
      <div class="boardsports-confirm__dialog" role="dialog" aria-modal="true" aria-labelledby="boardsports-confirm-title">
        <h3 id="boardsports-confirm-title">${title}</h3>
        <p>${message}</p>
        <div class="boardsports-confirm__actions">
          <button type="button" class="boardsports-confirm__button" data-confirm-cancel>${cancelText}</button>
          <button type="button" class="boardsports-confirm__button ${danger ? 'boardsports-confirm__button--danger' : 'boardsports-confirm__button--primary'}" data-confirm-accept>${confirmText}</button>
        </div>
      </div>
    `

    const cleanup = (value) => {
      overlay.remove()
      document.removeEventListener('keydown', onKeyDown)
      resolve(value)
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        cleanup(false)
      }
    }

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        cleanup(false)
      }
    })

    overlay.querySelector('[data-confirm-cancel]')?.addEventListener('click', () => cleanup(false))
    overlay.querySelector('[data-confirm-accept]')?.addEventListener('click', () => cleanup(true))

    document.addEventListener('keydown', onKeyDown)
    document.body.appendChild(overlay)
  })
}


