let currentProducts = [];
let cart = [];
let currentUser = localStorage.getItem('userEmail') || '';

document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    if (currentUser) {
        document.getElementById('userAuthText').innerText = currentUser.split('@')[0];
        document.getElementById('pSellerEmail').value = currentUser;
    }
});

// NAVIGATION SWITCHER
function switchTab(tabName) {
    ['home', 'seller', 'cart', 'account'].forEach(t => {
        document.getElementById(`sec-${t}`).classList.add('hidden');
    });
    document.getElementById(`sec-${tabName}`).classList.remove('hidden');

    if (tabName === 'cart') renderCart();
    if (tabName === 'account') fetchUserOrders();
}

// FETCH APPROVED PRODUCTS
async function fetchProducts() {
    try {
        const res = await fetch('/api/products');
        currentProducts = await res.json();
        renderProducts(currentProducts);
    } catch (e) {
        console.error("Error loading products:", e);
    }
}

function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    document.getElementById('productCount').innerText = `${products.length} Products Available`;

    if (products.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-10 text-slate-500 text-xs">No active listings available.</div>`;
        return;
    }

    grid.innerHTML = products.map(p => `
        <div class="bg-brand-card border border-slate-800/80 rounded-2xl overflow-hidden p-3 flex flex-col justify-between">
            <div>
                <img src="${p.imageUrl}" class="w-full h-36 object-cover rounded-xl mb-2 bg-slate-950" alt="${p.title}">
                <h3 class="text-xs font-bold text-white line-clamp-1">${p.title}</h3>
                <p class="text-[11px] text-brand-orange font-black mt-1">PKR ${p.price}</p>
            </div>
            <button onclick="addToCart('${p.id}')" class="mt-3 w-full bg-slate-800 hover:bg-brand-orange hover:text-black text-white text-[10px] font-bold py-2 rounded-lg border border-slate-700 transition">
                Add To Cart
            </button>
        </div>
    `).join('');
}

function filterProducts() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtered = currentProducts.filter(p => p.title.toLowerCase().includes(query));
    renderProducts(filtered);
}

// SUBMIT PRODUCT (APPROVAL REQUEST SENT TO ADMIN ONLY)
async function handleProductSubmit(e) {
    e.preventDefault();
    const subBtn = document.getElementById('subBtn');
    subBtn.disabled = true;
    subBtn.innerText = "Submitting Listing...";

    const payload = {
        title: document.getElementById('pTitle').value,
        price: document.getElementById('pPrice').value,
        category: document.getElementById('pCategory').value,
        description: document.getElementById('pDesc').value,
        sellerEmail: document.getElementById('pSellerEmail').value,
        sellerPhone: document.getElementById('pSellerPhone').value,
        imageUrl: document.getElementById('pImage').value,
        images: [document.getElementById('pImage').value]
    };

    try {
        const res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("✅ Product submitted! An approval request with complete details & Approve Button has been sent to Admin.");
            document.getElementById('productForm').reset();
            switchTab('home');
        } else {
            alert("❌ Failed to submit product.");
        }
    } catch (e) {
        alert("Error connecting to server.");
    } finally {
        subBtn.disabled = false;
        subBtn.innerText = "Submit Listing for Admin Approval";
    }
}

// CART MANAGEMENT
function addToCart(productId) {
    const p = currentProducts.find(item => item.id === productId);
    if (!p) return;

    const existing = cart.find(item => item.id === productId);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...p, quantity: 1 });
    }

    updateCartBadge();
    alert(`Added "${p.title}" to cart!`);
}

function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    const total = cart.reduce((sum, item) => sum + item.quantity, 0);
    badge.innerText = total;
    badge.classList.toggle('hidden', total === 0);
}

function renderCart() {
    const cartContainer = document.getElementById('cartItems');
    const checkoutBox = document.getElementById('checkoutBox');

    if (cart.length === 0) {
        cartContainer.innerHTML = `<div class="text-slate-500 text-xs py-6">Your cart is empty.</div>`;
        checkoutBox.classList.add('hidden');
        return;
    }

    cartContainer.innerHTML = cart.map(item => `
        <div class="bg-brand-card border border-slate-800 p-3 rounded-xl flex items-center justify-between">
            <div>
                <h4 class="text-xs font-bold text-white">${item.title}</h4>
                <p class="text-[10px] text-slate-400">PKR ${item.price} x ${item.quantity}</p>
            </div>
            <div class="text-xs font-bold text-brand-orange">PKR ${item.price * item.quantity}</div>
        </div>
    `).join('');

    checkoutBox.classList.remove('hidden');
    if (currentUser) document.getElementById('bEmail').value = currentUser;
}

// PLACE ORDER (EMAILS SENT TO BUYER, SELLER & ADMIN)
async function placeOrder() {
    const buyerName = document.getElementById('bName').value;
    const buyerEmail = document.getElementById('bEmail').value;
    const buyerPhone = document.getElementById('bPhone').value;
    const buyerAddress = document.getElementById('bAddress').value;

    if (!buyerName || !buyerEmail || !buyerPhone || !buyerAddress) {
        alert("Please fill in all shipping details.");
        return;
    }

    try {
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: cart,
                buyerName,
                buyerEmail,
                buyerPhone,
                buyerAddress
            })
        });

        if (res.ok) {
            alert("🎉 Order placed successfully! Confirmation emails sent to Buyer, Seller & Admin.");
            cart = [];
            updateCartBadge();
            switchTab('account');
        } else {
            alert("❌ Failed to place order.");
        }
    } catch (e) {
        alert("Error placing order.");
    }
}

// USER ORDERS & CANCELLATION
async function fetchUserOrders() {
    if (!currentUser) {
        document.getElementById('myOrdersList').innerHTML = `<div class="text-xs text-slate-500">Please login to view your orders.</div>`;
        return;
    }

    try {
        const res = await fetch(`/api/orders/user/${encodeURIComponent(currentUser)}`);
        const orders = await res.json();
        const container = document.getElementById('myOrdersList');

        if (orders.length === 0) {
            container.innerHTML = `<div class="text-xs text-slate-500">No active orders found.</div>`;
            return;
        }

        container.innerHTML = orders.map(o => `
            <div class="bg-brand-card border border-slate-800 p-4 rounded-xl space-y-2">
                <div class="flex justify-between items-center text-xs">
                    <span class="font-bold text-brand-orange">${o.id}</span>
                    <span class="text-slate-400">${new Date(o.createdAt).toLocaleDateString()}</span>
                </div>
                <h4 class="text-xs font-bold text-white">${o.title} (Qty: ${o.quantity})</h4>
                <p class="text-xs text-slate-300">Total: PKR ${o.price * o.quantity}</p>
                <button onclick="cancelOrder('${o.id}', '${o.title}', '${o.sellerEmail}')" class="bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/40 text-[10px] font-bold py-1.5 px-3 rounded-lg transition">
                    Cancel Order
                </button>
            </div>
        `).join('');
    } catch (e) {
        console.error("Error fetching orders:", e);
    }
}

// CANCEL ORDER (EMAILS SENT TO SELLER & ADMIN WITH COMPLETE DETAILS)
async function cancelOrder(orderId, productTitle, sellerEmail) {
    if (!confirm("Are you sure you want to cancel this order?")) return;

    try {
        const res = await fetch('/api/orders/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId,
                productTitle,
                sellerEmail,
                cancelledBy: currentUser || 'Buyer'
            })
        });

        if (res.ok) {
            alert("Order cancelled. Alert notification sent to Seller and Admin.");
            fetchUserOrders();
        } else {
            alert("Failed to cancel order.");
        }
    } catch (e) {
        alert("Error cancelling order.");
    }
}

// USER LOGIN SIMULATION
function toggleUserModal() {
    const email = prompt("Enter your email address:", currentUser);
    if (email) {
        currentUser = email.toLowerCase();
        localStorage.setItem('userEmail', currentUser);
        document.getElementById('userAuthText').innerText = currentUser.split('@')[0];
        document.getElementById('pSellerEmail').value = currentUser;
        alert(`Logged in as: ${currentUser}`);
    }
}
