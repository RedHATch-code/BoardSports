/**
 * BoardSports Inc - Sistema de Navegação Responsiva
 * Gerencia o menu hambúrguer e comportamento mobile
 */

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
  initResponsiveNav();
  handleViewportResize();
});

/**
 * Inicializa a navegação responsiva
 */
function initResponsiveNav() {
  const navbar = document.querySelector('.navbar');
  const navbarMenu = document.querySelector('.navbar-menu');
  
  if (!navbar || !navbarMenu) return;

  // Criar botão hambúrguer se não existir
  let toggleBtn = document.querySelector('.navbar-toggle');
  if (!toggleBtn) {
    toggleBtn = createToggleButton();
    const navbarContainer = navbar.querySelector('.navbar-container');
    if (navbarContainer) {
      // Inserir após o navbar-brand
      const brand = navbarContainer.querySelector('.navbar-brand');
      if (brand) {
        brand.insertAdjacentElement('afterend', toggleBtn);
      } else {
        navbarContainer.insertBefore(toggleBtn, navbarContainer.firstChild);
      }
    }
  }

  // Criar overlay se não existir
  let overlay = document.querySelector('.navbar-overlay');
  if (!overlay) {
    overlay = createOverlay();
    document.body.appendChild(overlay);
  }

  // Event listeners
  toggleBtn.addEventListener('click', () => toggleMenu(toggleBtn, navbarMenu, overlay));
  overlay.addEventListener('click', () => closeMenu(toggleBtn, navbarMenu, overlay));
  
  // Fechar menu ao clicar em links
  const menuLinks = navbarMenu.querySelectorAll('a');
  menuLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        closeMenu(toggleBtn, navbarMenu, overlay);
      }
    });
  });

  // Fechar menu ao redimensionar para desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && navbarMenu.classList.contains('active')) {
      closeMenu(toggleBtn, navbarMenu, overlay);
    }
  });

  // Prevenir scroll quando menu está aberto
  const observer = new MutationObserver(() => {
    if (navbarMenu.classList.contains('active')) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  });

  observer.observe(navbarMenu, { attributes: true, attributeFilter: ['class'] });
}

/**
 * Cria o botão hambúrguer
 */
function createToggleButton() {
  const button = document.createElement('button');
  button.className = 'navbar-toggle';
  button.setAttribute('aria-label', 'Menu de navegação');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = '☰';
  return button;
}

/**
 * Cria o overlay de fundo
 */
function createOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'navbar-overlay';
  return overlay;
}

/**
 * Alterna o estado do menu
 */
function toggleMenu(toggleBtn, navbarMenu, overlay) {
  const isActive = navbarMenu.classList.contains('active');
  
  if (isActive) {
    closeMenu(toggleBtn, navbarMenu, overlay);
  } else {
    openMenu(toggleBtn, navbarMenu, overlay);
  }
}

/**
 * Abre o menu mobile
 */
function openMenu(toggleBtn, navbarMenu, overlay) {
  navbarMenu.classList.add('active');
  overlay.classList.add('active');
  toggleBtn.classList.add('active');
  toggleBtn.innerHTML = '✕';
  toggleBtn.setAttribute('aria-expanded', 'true');
}

/**
 * Fecha o menu mobile
 */
function closeMenu(toggleBtn, navbarMenu, overlay) {
  navbarMenu.classList.remove('active');
  overlay.classList.remove('active');
  toggleBtn.classList.remove('active');
  toggleBtn.innerHTML = '☰';
  toggleBtn.setAttribute('aria-expanded', 'false');
}

/**
 * Gerencia eventos de redimensionamento
 */
function handleViewportResize() {
  let resizeTimer;
  
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    
    resizeTimer = setTimeout(() => {
      // Ajustar altura do mapa se existir
      const map = document.getElementById('map');
      if (map && window.innerWidth <= 768) {
        adjustMapHeight();
      }

      // Ajustar tabelas responsivas
      makeTablesResponsive();
    }, 250);
  });

  // Executar uma vez no carregamento
  makeTablesResponsive();
}

/**
 * Ajusta a altura do mapa para mobile
 */
function adjustMapHeight() {
  const map = document.getElementById('map');
  if (!map) return;

  const viewportHeight = window.innerHeight;
  const maxHeight = Math.min(400, viewportHeight * 0.5);
  
  if (window.innerWidth <= 480) {
    map.style.height = '300px';
  } else if (window.innerWidth <= 768) {
    map.style.height = '400px';
  }
}

/**
 * Torna tabelas responsivas adicionando data-labels
 */
function makeTablesResponsive() {
  const tables = document.querySelectorAll('.table');
  
  tables.forEach(table => {
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    const rows = table.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      cells.forEach((cell, index) => {
        if (headers[index]) {
          cell.setAttribute('data-label', headers[index]);
        }
      });
    });
  });
}

/**
 * Detecção de touch device
 */
function isTouchDevice() {
  return (('ontouchstart' in window) ||
     (navigator.maxTouchPoints > 0) ||
     (navigator.msMaxTouchPoints > 0));
}

/**
 * Adiciona classe para touch devices
 */
if (isTouchDevice()) {
  document.documentElement.classList.add('touch-device');
}

/**
 * Smooth scroll para âncoras
 */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href === '#') return;
    
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});
