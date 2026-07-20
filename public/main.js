let currentProducts = [];
let cart = [];
let currentUser = null;
let currentAccountType = 'common'; 

function showNotification(message, type = 'success') {
    const toast = document.getElementById('toast-notification');
    const msgText = document.getElementById('toast-message');
    if (!toast || !msgText) return;
    msgText.textContent = message;
    if (type === 'error') {
        toast.className = "fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 border border-rose-500/30 text-rose-400 px-5 py-3 rounded-2xl shadow-xl transition opacity-100 translate-y-0";
    } else {
        toast.className = "fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 border border-emerald-500/30 text-emerald-400 px-5 py-3 rounded-2xl shadow-xl transition opacity-100 translate-y-0";
    }
    setTimeout(() => {
        toast.className = "fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 border border-transparent text-transparent px-5 py-3 rounded-2xl transition opacity-0 -translate-y-4 pointer-events-none";
    }, 4000);
}

function toggleDropdown() {
    document.getElementById('accountDropdown').classList.toggle('hidden');
}

// 🛠️ FIXED: Become a Seller par click karne pe direct profile settings tab khulega
function setAccountType(type) {
    currentAccountType = type;
    toggleDropdown();
    const badge = document.getElementById('user-status-badge');
    if (badge) {
        badge.textContent = `${type} profile`;
        badge.classList.remove('hidden');
    }
    
    // UI Local Store Sync Update
    localStorage.setItem('mt_account_type', type);

    if(type === 'seller') {
        showNotification("Switched to Seller Dashboard Management.");
        if (currentUser && document.getElementById('p-email')) {
            document.getElementById('p-email').value = currentUser.email;
        }
        switchTab('account'); // Direct Redirected into Account hub structure
    } else {
        showNotification("Switched to Common Buyer Account.");
        switchTab('home');
    }
    updateProfilePanel();
}

function switchSellerSubTab(subTab) {
    const btnUpload = document.getElementById('btn-sub-upload');
    const btnHistory = document.getElementById('btn-sub-history');
    const tabUpload = document.getElementById('seller-upload-tab');
    const tabHistory = document.getElementById('seller-history-tab');
    
    if (subTab === 'upload') {
        if(btnUpload) btnUpload.className = "flex-1 py-2.5 rounded-xl text-xs font-black transition bg-orange-500 text-slate-950";
        if(btnHistory) btnHistory.className = "flex-1 py-2.5 rounded-xl text-xs font-black transition bg-slate-900 border border-gray-880 text-gray-300";
        if(tabUpload) tabUpload.classList.add('active');
        if(tabHistory) tabHistory.classList.remove('active');
    } else {
        if(btnHistory) btnHistory.className = "flex-1 py-2.5 rounded-xl text-xs font-black transition bg-orange-500 text-slate-950";
        if(btnUpload) btnUpload.className = "flex-1 py-2.5 rounded-xl text-xs font-black transition bg-slate-900 border border-gray-880 text-gray-300";
        if(tabHistory) tabHistory.classList.add('active');
        if(tabUpload) tabUpload.classList.remove('active');
        renderSellerListings();
    }
}

// 🛠️ FIXED: Central command support elements dynamically isolated ONLY to messages tab view
function switchTab(tabName) {
    document.querySelectorAll('.tab-view').forEach(view => view.classList.remove('active'));
    
    // Central command isolation tracking
    const supportBox = document.getElementById('central-command-box');
    if (supportBox) {
        if (tabName === 'messages') {
            supportBox.style.display = 'block';
            supportBox.style.boxShadow = 'none'; // Clean look without shadow
            supportBox.style.border = 'none';
        } else {
            supportBox.style.display = 'none';
        }
    }

    if (tabName === 'home') {
        document.getElementById('home-view').classList.add('active');
        loadProducts();
    }
    else if (tabName === 'detail') document.getElementById('detail-view').classList.add('active');
    else if (tabName === 'seller') {
        document.getElementById('seller-view').classList.add('active');
        switchSellerSubTab('upload');
    }
    else if (tabName === 'cart') {
        document.getElementById('cart-view').classList.add('active');
        renderCart();
    }
    else if (tabName === 'account') {
        document.getElementById('account-view').classList.add('active');
        updateProfilePanel();
    }
    else if (tabName === 'messages') {
        document.getElementById('messages-view').classList.add('active');
    }
}

function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}

async function previewMedia(input, labelId) {
    if(input.id === 'p-image-file') {
        if (input.files.length < 3) {
            showNotification('Select at least 3 images.', 'error');
            input.value = '';
            return;
        }
        document.getElementById(labelId).innerText = `${input.files.length} Selected ✓`;
    } else if (input.id === 'p-video-file') {
        document.getElementById(labelId).textContent = "Video Linked ✓";
    }
}

async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        currentProducts = await response.json();
        const grid = document.getElementById('product-grid');
        if (!grid) return;
        grid.innerHTML = '';
        if(currentProducts.length === 0) {
            grid.innerHTML = `<p class="col-span-full text-center text-gray-500 py-12">No active items live.</p>`;
            return;
        }
        currentProducts.forEach(product => {
            grid.innerHTML += `
                <div class="bg-slate-900/40 border border-gray-850 rounded-3xl overflow-hidden hover:border-orange-500/50 transition cursor-pointer flex flex-col justify-between" onclick="viewDetails('${product.id}')">
                    <img src="${product.imageUrl}" alt="${product.title}" class="w-full h-44 object-cover">
                    <div class="p-4">
                        <h3 class="font-extrabold text-sm truncate">${product.title}</h3>
                        <p class="text-xs text-gray-400 mt-1 truncate">${product.description || 'Verified Quality'}</p>
                        <div class="flex items-center justify-between mt-3">
                            <span class="text-sm font-black text-orange-400">PKR ${product.price}</span>
                            <span class="text-[8px] bg-slate-800 border border-gray-700 text-gray-400 px-2 py-1 rounded-full font-bold">COD</span>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (e) {}
}

function viewDetails(productId) {
    const p = currentProducts.find(item => item.id === productId);
    if (!p) return;
    const container = document.getElementById('product-detail-content');
    if (!container) return;

    container.innerHTML = `
        <div class="flex justify-center items-center bg-slate-950/40 rounded-2xl p-4 overflow-hidden">
            <img src="${p.imageUrl}" class="object-contain max-h-[240px] rounded-xl">
        </div>
        <div class="border-b border-gray-800 pb-4">
            <h2 class="text-3xl font-black mb-2">${p.title}</h2>
            <p class="text-xl font-bold text-orange-400 mb-4">PKR ${p.price}</p>
            <p class="text-gray-300 text-sm">${p.description || 'Verified Premium Product.'}</p>
            <div class="space-y-3 mt-6">
                <button onclick="addToCart('${p.id}')" class="w-full bg-slate-800 border border-gray-700 text-white font-bold py-4 rounded-xl transition text-sm">Add to Cart</button>
                <button onclick="instantBuyNow('${p.id}')" class="w-full bg-orange-500 text-slate-950 font-black py-4 rounded-xl transition text-sm">Buy Now (COD)</button>
            </div>
        </div>
    `;
    switchTab('detail');
}

async function cancelUserOrder(orderId, productTitle, sellerEmail) {
    if (!confirm("Confirm order cancellation request?")) return;
    try {
        const res = await fetch('/api/orders/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, productTitle, sellerEmail, cancelledBy: currentUser.email })
        });
        if (res.ok) {
            showNotification("Order Cancelled! Alerts dispatched via Mail pipeline.");
            updateProfilePanel();
        }
    } catch (err) {}
}

// 🛠️ NEW: DELETE PRODUCT FROM SELLER REPO
async function deleteProductItem(productId) {
    if (!confirm("Are you sure you want to completely delete this item from the store?")) return;
    try {
        const res = await fetch(`/api/products/delete/${productId}`, { method: 'DELETE' });
        if (res.ok) {
            showNotification("Product deleted successfully.");
            updateProfilePanel(); // Instant live view sync
        } else {
            showNotification("Failed to clean up product.", "error");
        }
    } catch(e) {
        showNotification("Execution error.", "error");
    }
}

// 🛠️ FIXED: UI content structure changes conditionally when switching profiles
async function updateProfilePanel() {
    const authBox = document.getElementById('auth-box');
    const profilePanel = document.getElementById('profile-panel');
    if (!currentUser) {
        if(authBox) authBox.classList.remove('hidden');
        if(profilePanel) profilePanel.classList.add('hidden');
        return;
    }
    if(authBox) authBox.classList.add('hidden');
    if(profilePanel) profilePanel.classList.remove('hidden');
    
    document.getElementById('panel-email').textContent = currentUser.email;
    document.getElementById('panel-role').textContent = `${currentAccountType} mode`;
    document.getElementById('panel-username').textContent = currentUser.username || currentUser.email.split('@')[0];
    
    const headingTitle = document.getElementById('profile-orders-heading');
    const orderContainer = document.getElementById('orders-summary-container');
    if (!orderContainer) return;
    orderContainer.innerHTML = '';

    // If account type is seller, hide purchases and show real-time dynamic uploads with delete buttons
    if (currentAccountType === 'seller') {
        if (headingTitle) headingTitle.innerHTML = `<i class="fa-solid fa-cloud-arrow-up text-orange-400 mr-1"></i> Your Uploaded Items`;
        
        try {
            const res = await fetch(`/api/products/seller/${currentUser.email}`);
            const items = await res.json();
            if (items.length === 0) {
                orderContainer.innerHTML = `<p class="text-xs text-gray-500 text-center py-4">No uploaded items found.</p>`;
                return;
            }
            items.forEach(p => {
                orderContainer.innerHTML += `
                    <div class="bg-slate-950 p-4 rounded-2xl border border-gray-900 flex justify-between items-center gap-2">
                        <div class="min-w-0 flex-grow flex items-center gap-3">
                            <img src="${p.imageUrl}" class="w-10 h-10 rounded-xl object-cover border border-gray-800">
                            <div class="min-w-0 flex-1">
                                <h5 class="font-extrabold text-xs truncate text-white">${p.title}</h5>
                                <p class="text-[10px] text-orange-400 font-bold">PKR ${p.price}</p>
                                <span class="text-[8px] px-2 py-0.5 rounded bg-slate-900 border border-gray-800 text-gray-400 uppercase font-bold">${p.status}</span>
                            </div>
                        </div>
                        <button onclick="deleteProductItem('${p.id}')" class="bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-slate-950 border border-rose-500/20 font-black p-2 rounded-xl transition shrink-0">
                            <i class="fa-solid fa-trash-can text-xs"></i>
                        </button>
                    </div>
                `;
            });
        } catch(e) {}
    } else {
        // Common account view: Show classic purchases tracking
        if (headingTitle) headingTitle.innerHTML = `<i class="fa-solid fa-basket-shopping text-orange-400 mr-1"></i> Your Placed Orders`;
        try {
            const res = await fetch(`/api/orders/user/${currentUser.email}`);
            const orders = await res.json();
            if (orders.length === 0) {
                orderContainer.innerHTML = `<p class="text-xs text-gray-500 text-center py-4">No standard purchases tracked.</p>`;
                return;
            }
            orders.forEach(o => {
                orderContainer.innerHTML += `
                    <div class="bg-slate-950 p-4 rounded-2xl border border-gray-900 flex justify-between items-center gap-2">
                        <div class="min-w-0 flex-grow">
                            <h5 class="font-extrabold text-xs truncate">${o.title} (Qty: ${o.quantity || 1})</h5>
                            <p class="text-[10px] text-gray-400">PKR ${o.price * (o.quantity || 1)}</p>
                        </div>
                        <button onclick="cancelUserOrder('${o.id}', '${o.title.replace(/'/g, "\\'")}', '${o.sellerEmail || ''}')" class="bg-rose-500/10 hover:bg-rose-500 text-rose-400 border border-rose-500/30 text-[10px] px-3 py-1.5 rounded-xl transition font-bold">Cancel</button>
                    </div>
                `;
            });
        } catch (e) {}
    }
}

async function handleAuth() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    if (!email || !password) return;
    try {
        const res = await fetch('/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if(data.success) {
            currentUser = data.user;
            
            // 🛠️ PERSISTENT STORAGE: Saving credentials locally to lock user session forever
            localStorage.setItem('mt_logged_user', JSON.stringify(currentUser));
            
            showNotification(`Welcome back, ${currentUser.username || email}!`);
            updateProfilePanel();
        }
    } catch (e) {}
}

// Clear storage ONLY when user explicitly commands logout action
function logout() {
    localStorage.removeItem('mt_logged_user');
    localStorage.removeItem('mt_account_type');
    currentUser = null;
    currentAccountType = 'common';
    const badge = document.getElementById('user-status-badge');
    if (badge) badge.classList.add('hidden');
    showNotification("Session cleared. Account logged out.");
    updateProfilePanel();
    switchTab('home');
}

function addToCart(productId) {
    const p = currentProducts.find(item => item.id === productId);
    if(!p) return;
    cart.push({ ...p, quantity: 1 });
    showNotification("Item added to basket checkout flow.");
}

// 🛠️ DYNAMIC HOOK: Locking memory profiles instantly upon script boot execution
window.onload = () => {
    const retainedUser = localStorage.getItem('mt_logged_user');
    const retainedType = localStorage.getItem('mt_account_type');
    
    if (retainedUser) {
        currentUser = JSON.parse(retainedUser);
        if (retainedType) currentAccountType = retainedType;
        
        const badge = document.getElementById('user-status-badge');
        if (badge) {
            badge.textContent = `${currentAccountType} profile`;
            badge.classList.remove('hidden');
        }
    }
    
    // Initial triggers
    switchTab('home');
};
