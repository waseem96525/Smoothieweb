import { INGREDIENTS } from './data.js';

// === STATE MANAGEMENT ===
const state = {
    view: 'hero', // hero, app, admin
    cart: [],
    orders: JSON.parse(localStorage.getItem('joy_smoothie_orders') || '[]'),
    builder: {
        currentStep: 'base', // base, fruits, boosters, review
        selection: {
            base: null,
            fruits: [],
            boosters: []
        }
    }
};

// === DOM ELEMENTS ===
const views = {
    hero: document.getElementById('hero-view'),
    app: document.getElementById('app-view'),
    admin: document.getElementById('admin-view')
};

const nav = document.getElementById('main-nav');
const builderInterface = document.getElementById('builder-interface');
const previewName = document.getElementById('preview-name');
const previewPrice = document.getElementById('preview-price');
const previewCals = document.getElementById('preview-cals');
const addToCartBtn = document.getElementById('add-to-cart-btn');
const liquid = document.getElementById('cup-liquid');
const cartCount = document.getElementById('cart-count');
const ordersBoard = document.getElementById('orders-board');

// === INIT ===
function init() {
    setupNavigation();
    setupCartEvents();
    setupScrollHero(); // The original prototype logic
    updateCartCount();

    // Check for admin flag in URL for testing
    if (window.location.hash === '#admin') {
        switchView('admin');
    }
}

// === NAVIGATION ===
function setupNavigation() {
    document.getElementById('start-builder-btn').addEventListener('click', () => {
        switchView('app');
        startBuilder();
    });

    document.getElementById('nav-builder').addEventListener('click', () => {
        switchView('app');
        startBuilder();
    });

    document.getElementById('nav-admin').addEventListener('click', () => {
        switchView('admin');
        renderAdmin();
    });

    document.getElementById('exit-admin').addEventListener('click', () => {
        switchView('app');
    });

    // Step clicks
    document.querySelectorAll('.step').forEach(el => {
        el.addEventListener('click', (e) => {
            const step = e.target.dataset.step;
            if (state.view === 'app') goToStep(step);
        });
    });

    addToCartBtn.addEventListener('click', addToCart);
}

function switchView(viewName) {
    // Hide all
    Object.values(views).forEach(el => el.classList.add('hidden'));
    nav.classList.add('hidden');

    // Show target
    views[viewName].classList.remove('hidden');
    state.view = viewName;

    // Nav logic
    if (viewName === 'app' || viewName === 'admin') {
        nav.classList.remove('hidden');
    }

    window.scrollTo(0, 0);
}

// === CART & CHECKOUT EVENTS ===
function setupCartEvents() {
    document.getElementById('nav-cart').addEventListener('click', toggleCart);
    document.getElementById('close-cart').addEventListener('click', toggleCart);
    document.getElementById('cart-overlay').addEventListener('click', toggleCart);
    document.getElementById('checkout-btn').addEventListener('click', processCheckout);
    document.getElementById('close-modal-btn').addEventListener('click', () => {
        document.getElementById('order-modal').classList.add('hidden');
    });
}

function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
    renderCart(); // Refresh cart UI whenever opened
}


// === BUILDER ENGINE ===
function startBuilder() {
    // Reset State
    state.builder.selection = { base: null, fruits: [], boosters: [] };
    state.builder.currentStep = 'base';
    renderBuilderUI();
    updatePreview();
}

function goToStep(step) {
    // Validation: Can't go to fruits if no base
    if (step === 'fruits' && !state.builder.selection.base) {
        alert("Please choose a base first!");
        return;
    }
    state.builder.currentStep = step;
    renderBuilderUI();
}

function renderBuilderUI() {
    // Update Wizard Steps Visuals
    document.querySelectorAll('.step').forEach(el => {
        el.classList.toggle('active', el.dataset.step === state.builder.currentStep);
    });

    builderInterface.innerHTML = '';

    const step = state.builder.currentStep;

    if (step === 'review') {
        renderReview();
        return;
    }

    // Grid Container
    const grid = document.createElement('div');
    grid.className = 'ingredient-grid';

    // Get Data source
    let dataKey = step;
    if (step === 'base') dataKey = 'bases';

    const items = INGREDIENTS[dataKey] || [];

    if (items.length === 0) {
        builderInterface.innerHTML = `<p>No items found for ${step}.</p>`;
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = `ingredient-card ${isSelected(step, item.id) ? 'selected' : ''}`;

        // Use Image if available, otherwise Icon (fallback though all now have images)
        const visual = item.image
            ? `<img src="${item.image}" alt="${item.name}" class="ingredient-img">`
            : `<div style="font-size: 3rem; margin-bottom: 10px;">${getIcon(item.id)}</div>`;

        card.innerHTML = `
            ${visual}
            <h4>${item.name}</h4>
            <p class="price-tag">₹${item.price}</p>
            <p class="cal-tag">${item.calories} cal</p>
        `;

        card.addEventListener('click', () => toggleSelection(step, item));
        grid.appendChild(card);
    });

    builderInterface.appendChild(grid);
}

function isSelected(category, id) {
    if (category === 'base') return state.builder.selection.base?.id === id;
    if (category === 'fruits') return state.builder.selection.fruits.some(i => i.id === id);
    if (category === 'boosters') return state.builder.selection.boosters.some(i => i.id === id);
    return false;
}

function toggleSelection(category, item) {
    const sel = state.builder.selection;

    if (category === 'base') {
        sel.base = item;
        // Auto advance after base
        setTimeout(() => goToStep('fruits'), 300);
    }
    else if (category === 'fruits') {
        const exists = sel.fruits.find(i => i.id === item.id);
        if (exists) {
            sel.fruits = sel.fruits.filter(i => i.id !== item.id);
        } else {
            if (sel.fruits.length >= 3) {
                alert("Maximum 3 fruits allowed!");
                return;
            }
            sel.fruits.push(item);
        }
    }
    else if (category === 'boosters') {
        const exists = sel.boosters.find(i => i.id === item.id);
        if (exists) {
            sel.boosters = sel.boosters.filter(i => i.id !== item.id);
        } else {
            sel.boosters.push(item);
        }
    }

    renderBuilderUI(); // Re-render to show selection state
    updatePreview();
}

function renderReview() {
    const sel = state.builder.selection;
    if (!sel.base) {
        builderInterface.innerHTML = "<p>Please start by selecting a base.</p>";
        return;
    }

    builderInterface.innerHTML = `
        <div style="text-align:center;">
            <h3>Your Custom Blend</h3>
            <ul style="list-style:none; padding: 0; margin: 20px 0;">
                <li><strong>Base:</strong> ${sel.base.name}</li>
                <li><strong>Fruits:</strong> ${sel.fruits.map(f => f.name).join(', ') || 'None'}</li>
                <li><strong>Boosters:</strong> ${sel.boosters.map(b => b.name).join(', ') || 'None'}</li>
            </ul>
        </div>
    `;
}

function updatePreview() {
    const sel = state.builder.selection;

    // Calculate Totals
    let total = 0;
    let cals = 0;
    let name = "Custom Blend";

    if (sel.base) {
        total += sel.base.price;
        cals += sel.base.calories;
        name = `${sel.base.name} Blend`;
    }

    sel.fruits.forEach(f => { total += f.price; cals += f.calories; });
    sel.boosters.forEach(b => { total += b.price; cals += b.calories; });

    // Update UI
    previewName.textContent = name;
    previewPrice.textContent = `₹${total}`;
    previewCals.textContent = `${cals} cal`;

    // Visuals
    if (sel.base) {
        liquid.style.height = '100%';
        liquid.style.backgroundColor = sel.base.color;
    } else {
        liquid.style.height = '0%';
    }

    // Enable Button logic
    if (sel.base && sel.fruits.length > 0) {
        addToCartBtn.disabled = false;
        addToCartBtn.textContent = "Add to Cart";
    } else {
        addToCartBtn.disabled = true;
        addToCartBtn.textContent = "Pick Base & Fruit";
    }
}

function getIcon(id) {
    const icons = {
        'almond_milk': '🥛', 'coconut_water': '🥥', 'oat_milk': '🌾', 'orange_juice': '🍊',
        'mango': '🥭', 'strawberry': '🍓', 'banana': '🍌', 'blueberry': '🫐', 'spinach': '🥬', 'avocado': '🥑',
        'whey_protein': '💪', 'chia_seeds': '🌱', 'spirulina': '🌊', 'honey': '🍯'
    };
    return icons[id] || '🥤';
}

// === CART LOGIC ===
function addToCart() {
    const btn = document.getElementById('add-to-cart-btn');
    const cup = document.getElementById('cup-visual');

    // 1. Trigger Animation
    btn.disabled = true;
    btn.textContent = "Blending...";
    cup.classList.add('blending');

    // Simulate color blend effect (Aeration -> Lighter)
    const liquid = document.getElementById('cup-liquid');
    const originalColor = liquid.style.backgroundColor;
    liquid.style.transition = 'background-color 0.2s';
    liquid.style.backgroundColor = '#fffacd'; // Aerated smoothie color (light cream)

    // 2. Wait for blend
    setTimeout(() => {
        cup.classList.remove('blending');
        liquid.style.backgroundColor = originalColor; // Restore (or keep blended looking)
        liquid.style.maskImage = 'none'; // Reset vortex mask
        liquid.style.webkitMaskImage = 'none';

        // 3. Add to Cart Logic
        const orderItem = {
            ...state.builder.selection,
            tempId: Date.now()
        };

        state.cart.push(orderItem);
        updateCartCount();

        // Feedback
        toggleCart(); // Show cart

        // Reset builder
        startBuilder();

    }, 10000); // 10s blend time
}

function updateCartCount() {
    document.getElementById('cart-count').textContent = state.cart.length;
}

function renderCart() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total-price');
    container.innerHTML = '';

    if (state.cart.length === 0) {
        container.innerHTML = '<p class="empty-cart-msg" style="text-align:center; color:#999; margin-top:2rem;">Your cart is empty.</p>';
        totalEl.textContent = '₹0';
        return;
    }

    let grandTotal = 0;

    state.cart.forEach(item => {
        let price = item.base.price;
        item.fruits.forEach(f => price += f.price);
        item.boosters.forEach(b => price += b.price);
        grandTotal += price;

        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-info">
                <h4>${item.base.name} Blend</h4>
                <p>+ ${item.fruits.map(f => f.name).join(', ')}</p>
            </div>
            <div style="text-align:right;">
                <p style="font-weight:600;">₹${price}</p>
                <button class="remove-item-btn" style="color:red;border:none;background:none;cursor:pointer;font-size:0.8rem;" data-id="${item.tempId}">Remove</button>
            </div>
        `;
        container.appendChild(cartItem);
    });

    totalEl.textContent = `₹${grandTotal}`;

    // Add Remove Listeners
    container.querySelectorAll('.remove-item-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.dataset.id);
            state.cart = state.cart.filter(i => i.tempId !== id);
            updateCartCount();
            renderCart();
        });
    });
}

function processCheckout() {
    if (state.cart.length === 0) return;

    // Convert Cart to Orders
    state.cart.forEach(cartItem => {
        const order = {
            ...cartItem,
            id: Date.now() + Math.floor(Math.random() * 1000),
            status: 'pending',
            timestamp: new Date().toISOString()
        };
        state.orders.unshift(order);
    });

    // Save
    localStorage.setItem('joy_smoothie_orders', JSON.stringify(state.orders));

    // Clear Cart
    state.cart = [];
    updateCartCount();
    renderCart(); // Will show empty
    toggleCart(); // Close sidebar

    // Show Success Modal
    const modal = document.getElementById('order-modal');
    document.getElementById('modal-order-id').textContent = Math.floor(Math.random() * 10000);
    modal.classList.remove('hidden');
}


// === ADMIN DASHBOARD ===
function renderAdmin() {
    // Load fresh data
    const orders = JSON.parse(localStorage.getItem('joy_smoothie_orders') || '[]');
    state.orders = orders;

    // Metrics
    const revenue = orders.reduce((sum, order) => {
        let price = order.base.price;
        order.fruits.forEach(f => price += f.price);
        order.boosters.forEach(b => price += b.price);
        return sum + price;
    }, 0);

    document.getElementById('active-orders-count').textContent = orders.filter(o => o.status !== 'ready').length;
    document.getElementById('total-revenue').textContent = `₹${revenue}`;

    // Board
    ordersBoard.innerHTML = '';

    if (orders.length === 0) {
        ordersBoard.innerHTML = '<p class="empty-state">No orders yet.</p>';
        return;
    }

    orders.forEach(order => {
        const card = document.createElement('div');
        card.className = 'order-card';

        let price = order.base.price;
        order.fruits.forEach(f => price += f.price);
        order.boosters.forEach(b => price += b.price);

        card.innerHTML = `
            <div>
                <h4>Order #${order.id.toString().slice(-4)}</h4>
                <p>${order.base.name} + ${order.fruits.length} fruits</p>
                <small>${new Date(order.timestamp).toLocaleTimeString()}</small>
            </div>
            <div style="text-align:right;">
                <p><strong>₹${price}</strong></p>
                <div class="order-status status-${order.status}">${order.status.toUpperCase()}</div>
                ${order.status === 'pending' ? `<button onclick="window.updateStatus(${order.id}, 'blending')" style="margin-left:10px;cursor:pointer;">Start</button>` : ''}
                ${order.status === 'blending' ? `<button onclick="window.updateStatus(${order.id}, 'ready')" style="margin-left:10px;cursor:pointer;">Complete</button>` : ''}
            </div>
        `;
        ordersBoard.appendChild(card);
    });
}

// Expose updateStatus globally so inline onclick works
window.updateStatus = (id, newStatus) => {
    const orders = JSON.parse(localStorage.getItem('joy_smoothie_orders') || '[]');
    const index = orders.findIndex(o => o.id === id);
    if (index !== -1) {
        orders[index].status = newStatus;
        localStorage.setItem('joy_smoothie_orders', JSON.stringify(orders));
        renderAdmin(); // Refresh UI
    }
};


// === SCROLL HERO ENGINE (Legacy) ===
function setupScrollHero() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    const context = canvas.getContext('2d');
    const frameCount = 40;
    const currentFrame = index => `ezgif-frame-${index.toString().padStart(3, '0')}.jpg`;
    const frames = [];
    let framesLoaded = 0;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);

    // Preload
    for (let i = 1; i <= frameCount; i++) {
        const img = new Image();
        img.src = currentFrame(i);
        img.onload = () => {
            framesLoaded++;
            if (framesLoaded === frameCount) {
                document.getElementById('loader').classList.add('hidden');
                startAnimation();
            }
        };
        frames.push(img);
    }

    let scrollProgress = 0;
    let currentScrollY = 0;

    function render() {
        const frameIndex = Math.min(frameCount - 1, Math.floor(scrollProgress * frameCount));
        const frame = frames[frameIndex];
        if (frame) {
            // Draw Cover
            const w = canvas.width;
            const h = canvas.height;
            const ratio = Math.max(w / frame.width, h / frame.height);
            const newW = frame.width * ratio;
            const newH = frame.height * ratio;
            context.clearRect(0, 0, w, h);
            context.drawImage(frame, (w - newW) / 2, (h - newH) / 2, newW, newH);
        }
    }

    function update() {
        if (state.view !== 'hero') {
            requestAnimationFrame(update);
            return; // Pause rendering if not in view
        }

        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        currentScrollY += (window.scrollY - currentScrollY) * 0.1;
        scrollProgress = Math.max(0, Math.min(1, currentScrollY / maxScroll));

        // Text Animations
        const progressFrames = scrollProgress * frameCount;
        const t1 = document.getElementById('text-1');
        const t2 = document.getElementById('text-2');
        const cta = document.getElementById('cta');

        if (progressFrames <= 10) {
            t1.style.opacity = 1 - (progressFrames / 10);
            t1.style.transform = `scale(${1 + (progressFrames * 0.05)})`;
        } else { t1.style.opacity = 0; }

        if (progressFrames >= 25 && progressFrames <= 35) {
            t2.style.opacity = (progressFrames - 25) / 5;
        } else if (progressFrames > 35) { t2.style.opacity = 1; }
        else { t2.style.opacity = 0; }

        if (progressFrames >= 38) cta.classList.add('visible');
        else cta.classList.remove('visible');

        render();
        requestAnimationFrame(update);
    }

    function startAnimation() {
        resizeCanvas();
        update();
    }
}

// Start App
init();
