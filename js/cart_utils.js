const CART_KEY = 'boardsports.cart.v1'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function sanitizeQuantity(quantity) {
  const parsed = Number.parseInt(quantity, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

function normalizeItem(item) {
  const productId = item.product_id ?? item.id
  return {
    id: productId,
    product_id: productId,
    nome: item.nome || item.produto_nome || 'Produto',
    preco: Number(item.preco) || 0,
    empresa_id: item.empresa_id || null,
    empresa_nome: item.empresa_nome || 'Empresa',
    imagem: item.imagem || '',
    stock: Number.isFinite(Number(item.stock)) ? Number(item.stock) : 0,
    modalidade_nome: item.modalidade_nome || '',
    quantity: sanitizeQuantity(item.quantity)
  }
}

export function loadCart() {
  if (!canUseStorage()) return []

  try {
    const raw = window.localStorage.getItem(CART_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.map(normalizeItem) : []
  } catch (error) {
    console.error('Erro ao ler carrinho local:', error)
    return []
  }
}

export function saveCart(items) {
  if (!canUseStorage()) return []

  const normalized = (items || [])
    .map(normalizeItem)
    .filter((item) => item.product_id)

  window.localStorage.setItem(CART_KEY, JSON.stringify(normalized))
  window.dispatchEvent(new CustomEvent('boardsports:cart-sync', { detail: normalized }))
  return normalized
}

export function addToCart(product, quantity = 1) {
  const cart = loadCart()
  const nextItem = normalizeItem({ ...product, quantity })
  const existingIndex = cart.findIndex((item) => item.product_id === nextItem.product_id)

  if (existingIndex >= 0) {
    const current = cart[existingIndex]
    const requestedQuantity = current.quantity + nextItem.quantity
    cart[existingIndex] = {
      ...current,
      ...nextItem,
      quantity: Math.min(requestedQuantity, Math.max(nextItem.stock, 1))
    }
  } else {
    cart.push({
      ...nextItem,
      quantity: Math.min(nextItem.quantity, Math.max(nextItem.stock, 1))
    })
  }

  return saveCart(cart)
}

export function updateCartQuantity(productId, quantity) {
  const cart = loadCart()
  const normalizedQuantity = sanitizeQuantity(quantity)
  const nextCart = cart
    .map((item) => {
      if (item.product_id !== productId) return item

      return {
        ...item,
        quantity: Math.min(normalizedQuantity, Math.max(item.stock, 1))
      }
    })
    .filter((item) => item.quantity > 0)

  return saveCart(nextCart)
}

export function removeFromCart(productId) {
  const cart = loadCart().filter((item) => item.product_id !== productId)
  return saveCart(cart)
}

export function clearCart() {
  return saveCart([])
}

export function getCartCount() {
  return loadCart().reduce((total, item) => total + item.quantity, 0)
}

export function getCartTotal() {
  return loadCart().reduce((total, item) => total + (Number(item.preco) || 0) * item.quantity, 0)
}
