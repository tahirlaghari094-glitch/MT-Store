let currentProducts = [];
let cart = [];
let currentUser = null;
let currentAccountType = 'common'; 
let uploadedImagesBase64 = []; 

function showNotification(message, type = 'success') {
    const toast = document.getElementById('toast-notification');
    const msgText = document.getElementById('toast-message');
    if (!toast || !msgText) return;
    msgText.textContent = message;
    toast.className = `fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 border ${type === 'error' ? 'border-rose-500/30 text-rose-400' : 'border-emerald-500/30 text-emerald-400'} px-5 py-3 rounded-2xl shadow-xl transition opacity-100 translate-y-0`;
    setTimeout(() => {
        toast.className = "fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 border border-transparent text-transparent px-5 py-3 rounded-2xl transition opacity-0 -translate-y-4 pointer-events-none";
    }, 4000);
}

function toggleDropdown() {
    document.getElementById('accountDropdown').classList.toggle('hidden');
}

function setAccountType(type) {
    currentAccountType = type;
    toggleDropdown();
    const badge = document.getElementById('user-status-badge');
    if (badge) {
        badge.textContent = `${type} profile`;
        badge.classList.remove('hidden');
    }
    localStorage.setItem('mt_account_type', type);
    switchTab(type === 'seller' ? 'account' : 'home');
    updateProfilePanel();
}

function switchSellerSubTab(subTab) {
    const btnUpload = document.getElementById('btn-sub-upload');
    const btnHistory = document.getElementById('btn-sub-history');
    const tabUpload = document.getElementById('seller-upload-tab');
    const tabHistory = document.getElementById('seller-history-tab');
    
    if (subTab === 'upload') {
        if(btnUpload) btnUpload.className = "flex-1 py-2.5 rounded-xl text-xs font-black transition bg-orange-500 text-slate-950";
        if(btnHistory) btnHistory.className = "flex-1 py-2.5 rounded-xl text-xs font-black transition bg-slate-900 border border-gray-800 text-gray-300";
        if(tabUpload) tabUpload.classList.add('active');
        if(tabHistory) tabHistory.classList.remove('active');
    } else {
        if(btnHistory) btnHistory.className = "flex-1 py-2.5 rounded-xl text-xs font-black transition bg-orange-500 text-slate-950";
        if(btnUpload) btnUpload.className = "flex-1 py-2.5 rounded-xl text-xs font-black transition bg-slate-900 border border-gray-800 text-gray-300";
        if(tabHistory) tabHistory.classList.add('active');
        if(tabUpload) tabUpload.classList.remove('active');
        renderSellerListings();
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-view').forEach(view => view.classList.remove('active'));
    if (tabName === 'home') { document.getElementById('home-view').classList.add('active'); loadProducts(); }
    else if (tabName === 'detail') document.getElementById('detail-view').classList.add('active');
    else if (tabName === 'seller') document.getElementById('seller-view').classList.add('active');
    else if (tabName === 'account') { document.getElementById('account-view').classList.add('active'); updateProfilePanel(); }
    else if (tabName === 'messages') document.getElementById('messages-view').classList.add('active');
    else if (tabName === 'cart') { document.getElementById('cart-view').classList.add('active'); renderCartView(); }
}

function logout() {
    localStorage.removeItem('mt_logged_user');
    localStorage.removeItem('mt_account_type');
    currentUser = null;
    currentAccountType = 'common';
    showNotification("Logged out successfully.", "error");
    window.location.reload();
}

async function previewImagesLocal(input) {
    uploadedImagesBase64 = [];
    if (!input.files.length) return;
    
    for (let file of input.files) {
        const base64Str = await new Promise((resolve) => {
            const r = new FileReader();
            r.onload = (e) => resolve(e.target.result);
            r.readAsDataURL(file);
        });
        uploadedImagesBase64.push(base64Str);
    }
    document.getElementById('img-count-log').textContent = `${uploadedImagesBase64.length} Images Loaded ✓`;
}

async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        currentProducts = await response.json();
        const grid = document.getElementById('product-grid');
        if (!grid) return;
        grid.innerHTML = '';
        currentProducts.forEach(p => {
            const fallbackImg = p.imageUrls && p.imageUrls.length ? p.imageUrls[0] : (p.imageUrl || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff');
            grid.innerHTML += `
                <div class="bg-slate-900/40 border border-gray-850 rounded-3xl overflow-hidden hover:border-orange-500/50 transition cursor-pointer flex flex-col justify-between" onclick="viewDetails('${p.id}')">
                    <img src="${fallbackImg}" class="w-full h-44 object-cover">
                    <div class="p-4">
                        <h3 class="font-extrabold text-sm truncate">${p.title}</h3>
                        <div class="flex items-center justify-between mt-3">
                            <span class="text-sm font-black text-orange-400">PKR ${p.price}</span>
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

    let imageGalleryHtml = '';
    const imagesToRender = p.imageUrls && p.imageUrls.length ? p.imageUrls : [p.imageUrl];
    imagesToRender.forEach(img => {
        if(img) {
            imageGalleryHtml += `<img src="${img}" onclick="document.getElementById('main-product-preview-frame').src='${img}'" class="w-20 h-20 object-cover rounded-xl border border-gray-800 shrink-0 inline-block cursor-pointer hover:border-orange-500 transition">`;
        }
    });

    container.innerHTML = `
        <div class="bg-slate-950/40 rounded-2xl p-4 flex flex-col gap-3">
            <img id="main-product-preview-frame" src="${imagesToRender[0]}" class="object-contain max-h-[240px] w-full rounded-xl mx-auto">
            <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                ${imageGalleryHtml}
            </div>
        </div>
        
        <div class="border-b border-gray-900 pb-4 space-y-3">
            <div>
                <h2 class="text-2xl font-black mb-1">${p.title}</h2>
                <p class="text-xl font-bold text-orange-400">PKR ${p.price}</p>
            </div>
            
            <button onclick="addToCart('${p.id}')" class="w-full bg-orange-500 hover:bg-orange-600 text-slate-950 font-black py-3.5 rounded-xl text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2">
                <i class="fa-solid fa-cart-plus text-sm"></i> Add Item to Basket
            </button>
            
            <p class="text-gray-300 text-xs mt-2 leading-relaxed">${p.description || 'Verified Premium Quality.'}</p>
        </div>

        <div class="bg-slate-900/60 border border-gray-850 rounded-2xl p-4 space-y-2">
            <h4 class="text-xs font-black text-orange-500 uppercase tracking-wider"><i class="fa-solid fa-id-badge"></i> Verified Merchant Profile</h4>
            <div class="text-[11px] space-y-1.5 text-gray-300">
                <p><span class="text-gray-500 font-bold">Store Mail:</span> ${p.sellerEmail || 'Not declared'}</p>
                <p><span class="text-gray-500 font-bold">Store Phone:</span> ${p.contactNumber || 'Not declared'}</p>
                <p><span class="text-gray-500 font-bold">Pickup Warehouse:</span> ${p.address || 'Central Command Depot'}</p>
            </div>
        </div>

        <div class="space-y-3">
            <h4 class="text-xs font-black text-gray-400 uppercase tracking-wider">Community Feedback / Reviews</h4>
            <div id="comments-container-list" class="space-y-2"></div>

            <div class="bg-slate-950 p-3 rounded-xl border border-gray-900 space-y-2">
                <input type="text" id="reviewer-title" placeholder="Your Profile Name (Anonymous)" class="w-full bg-slate-900 border border-gray-850 rounded-lg p-2 text-xs outline-none text-white">
                <textarea id="reviewer-comment" placeholder="Write helpful reviews or request pinned info metrics..." rows="2" class="w-full bg-slate-900 border border-gray-850 rounded-lg p-2 text-xs outline-none resize-none text-white"></textarea>
                <button onclick="submitProductComment('${p.id}')" class="w-full bg-slate-800 border border-gray-700 hover:bg-orange-500 text-white hover:text-slate-950 font-black py-2 rounded-lg text-[10px] transition uppercase">Post Product Feedback</button>
            </div>
        </div>
    `;
    switchTab('detail');
    loadCommentsFromPipeline(p.id);
}

function addToCart(productId) {
    const product = currentProducts.find(p => p.id === productId);
    if (!product) return;

    const existingIndex = cart.findIndex(item => item.id === productId);
    if (existingIndex > -1) {
        showNotification("Item is already inside your shopping cart.");
    } else {
        cart.push({ ...product, selected: true });
        showNotification("Product added to Checkout Basket! ✓");
    }

    updateCartBadgeCount();
    saveCartStateToStorage();
}

function renderCartView() {
    const cartContainer = document.getElementById('cart-items');
    const summaryBlock = document.getElementById('cart-summary-block');
    if (!cartContainer) return;

    cartContainer.innerHTML = '';

    if (cart.length === 0) {
        cartContainer.innerHTML = `
            <div class="text-center py-12 space-y-2">
                <i class="fa-solid fa-basket-shopping text-4xl text-gray-700"></i>
                <p class="text-xs text-gray-500 font-bold">Your cart container basket is completely empty.</p>
            </div>
        `;
        if (summaryBlock) summaryBlock.classList.add('hidden');
        return;
    }

    if (summaryBlock) summaryBlock.classList.remove('hidden');

    cart.forEach((item, index) => {
        const fallbackImg = item.imageUrls && item.imageUrls.length ? item.imageUrls[0] : (item.imageUrl || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff');
        
        cartContainer.innerHTML += `
            <div class="bg-slate-900/40 border border-gray-850 p-4 rounded-3xl flex items-center justify-between gap-3 hover:border-gray-800 transition">
                <div class="flex items-center shrink-0">
                    <input type="checkbox" ${item.selected ? 'checked' : ''} 
                        onchange="toggleCartItemSelection(${index}, this.checked)"
                        class="w-4 h-4 text-orange-500 bg-slate-950 border-gray-800 rounded focus:ring-orange-500 focus:ring-2 accent-orange-500 cursor-pointer">
                </div>

                <div class="flex items-center gap-3 flex-grow min-w-0">
                    <img src="${fallbackImg}" class="w-12 h-12 rounded-xl object-cover border border-gray-800 shrink-0">
                    <div class="min-w-0 flex-1">
                        <h4 class="font-extrabold text-xs text-white truncate">${item.title}</h4>
                        <span class="text-xs font-black text-orange-400 block mt-0.5">PKR ${item.price}</span>
                    </div>
                </div>

                <button onclick="removeFromCart(${index})" class="text-gray-500 hover:text-rose-400 p-1 shrink-0 transition">
                    <i class="fa-solid fa-trash-can text-sm"></i>
                </button>
            </div>
        `;
    });

    calculateCartSummaryTotals();
}

function toggleCartItemSelection(index, isChecked) {
    if (cart[index]) {
        cart[index].selected = isChecked;
        saveCartStateToStorage();
        calculateCartSummaryTotals();
    }
}

function toggleSelectAllCart() {
    const allChecked = cart.every(item => item.selected);
    cart.forEach(item => item.selected = !allChecked);
    saveCartStateToStorage();
    renderCartView();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    showNotification("Item removed from basket.", "error");
    updateCartBadgeCount();
    saveCartStateToStorage();
    renderCartView();
}

function calculateCartSummaryTotals() {
    let selectedCount = 0;
    let totalPrice = 0;

    cart.forEach(item => {
        if (item.selected) {
            selectedCount++;
            totalPrice += parseFloat(item.price || 0);
        }
    });

    document.getElementById('cart-selected-count').textContent = selectedCount;
    document.getElementById('cart-total-price').textContent = `PKR ${totalPrice}`;
    document.getElementById('btn-checkout-count').textContent = selectedCount;
}

function updateCartBadgeCount() {
    const badge = document.getElementById('cart-count');
    if (!badge) return;
    if (cart.length > 0) {
        badge.textContent = cart.length;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function saveCartStateToStorage() {
    localStorage.setItem('mt_basket_state', JSON.stringify(cart));
}

async function loadCommentsFromPipeline(productId) {
    const list = document.getElementById('comments-container-list');
    if (!list) return;
    try {
        const res = await fetch(`/api/products/${productId}/reviews`);
        const reviews = await res.json();
        list.innerHTML = '';
        if(!reviews.length) {
            list.innerHTML = `<p class="text-[10px] text-gray-600 text-center py-2">No verification feedback posted yet.</p>`;
            return;
        }
        reviews.forEach(r => {
            const isPinned = r.isPinned;
            list.innerHTML += `
                <div class="p-3 rounded-xl border ${isPinned ? 'bg-amber-500/10 border-amber-500/40' : 'bg-slate-900/40 border-gray-900'} relative text-xs flex flex-col gap-1">
                    ${isPinned ? '<span class="text-[8px] bg-amber-500 text-slate-950 font-black uppercase px-1.5 py-0.5 rounded self-start tracking-wider mb-1"><i class="fa-solid fa-thumbtack"></i> Pinned Response</span>' : ''}
                    <div class="flex justify-between items-center text-[10px] text-gray-400">
                        <span class="font-extrabold text-gray-200">${r.username}</span>
                        <span>${r.date || 'Today'}</span>
                    </div>
                    <p class="text-gray-300 text-[11px] leading-relaxed mt-0.5">${r.comment}</p>
                    
                    <button onclick="togglePinComment('${r._id}', '${productId}')" class="absolute top-2 right-2 text-gray-500 hover:text-amber-400 transition text-[10px]">
                        <i class="fa-solid fa-thumbtack"></i>
                    </button>
                </div>
            `;
        });
    } catch(err){}
}

async function submitProductComment(productId) {
    const commentBox = document.getElementById('reviewer-comment');
    const nameBox = document.getElementById('reviewer-title');
    if(!commentBox || !commentBox.value.trim()) return;

    try {
        const res = await fetch(`/api/products/${productId}/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment: commentBox.value.trim(), username: nameBox.value.trim() || 'Anonymous' })
        });
        if(res.ok) {
            commentBox.value = '';
            showNotification("Feedback recorded successfully.");
            loadCommentsFromPipeline(productId);
        }
    } catch(e){}
}

async function togglePinComment(reviewId, productId) {
    try {
        const res = await fetch(`/api/reviews/pin/${reviewId}`, { method: 'POST' });
        if(res.ok) {
            showNotification("Comment Pin status modified.");
            loadCommentsFromPipeline(productId);
        }
    } catch(e){}
}

async function handleProductUpload(e) {
    e.preventDefault();
    const title = document.getElementById('p-title').value;
    const price = document.getElementById('p-price').value;
    const description = document.getElementById('p-desc').value;
    const paymentDetails = document.getElementById('p-payment-details').value;
    const address = document.getElementById('p-address').value;
    const contactNumber = document.getElementById('p-contact').value;
    const sellerEmail = document.getElementById('p-email').value;
    const transactionId = document.getElementById('p-txid').value;

    try {
        const res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, price, description, paymentDetails, address, contactNumber, sellerEmail, transactionId, imageUrls: uploadedImagesBase64 })
        });
        if (res.ok) {
            showNotification("Application recorded! Waiting for Admin review.");
            document.getElementById('product-upload-form').reset();
            uploadedImagesBase64 = [];
            document.getElementById('img-count-log').textContent = "0 Images Loaded";
            switchSellerSubTab('history');
        }
    } catch(err) {}
}

async function renderSellerListings() {
    const container = document.getElementById('seller-history-tab');
    if (!container) return;
    container.innerHTML = `<h4 class="text-xs font-black text-gray-400 uppercase tracking-wider px-1">Your Live Store Inventory</h4>`;
    if (!currentUser) return;
    try {
        const res = await fetch(`/api/products/seller/${currentUser.email}`);
        const items = await res.json();
        items.forEach(p => {
            const fallbackImg = p.imageUrls && p.imageUrls.length ? p.imageUrls[0] : p.imageUrl;
            container.innerHTML += `
                <div class="bg-slate-900/40 border border-gray-850 p-4 rounded-2xl flex justify-between items-center gap-2">
                    <div class="min-w-0 flex-grow flex items-center gap-3">
                        <img src="${fallbackImg}" class="w-10 h-10 rounded-xl object-cover border border-gray-800">
                        <div class="min-w-0 flex-1">
                            <h5 class="font-extrabold text-xs truncate text-white">${p.title}</h5>
                            <span class="text-[8px] px-2 py-0.5 rounded bg-slate-950 border border-gray-800 text-gray-400 uppercase font-bold">${p.status}</span>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch(e) {}
}

async function updateProfilePanel() {
    const authBox = document.getElementById('auth-box');
    const profilePanel = document.getElementById('profile-panel');
    const quickAction = document.getElementById('seller-quick-action');
    if (!currentUser) return;
    
    if(authBox) authBox.classList.add('hidden');
    if(profilePanel) profilePanel.classList.remove('hidden');
    
    document.getElementById('panel-email').textContent = currentUser.email;
    document.getElementById('panel-role').textContent = `${currentAccountType} mode`;
    document.getElementById('panel-username').textContent = currentUser.email.split('@')[0];
    
    const headingTitle = document.getElementById('profile-orders-heading');
    const orderContainer = document.getElementById('orders-summary-container');
    if (!orderContainer) return;
    orderContainer.innerHTML = '';

    if (currentAccountType === 'seller') {
        if (quickAction) quickAction.classList.remove('hidden');
        if (headingTitle) headingTitle.innerHTML = `<i class="fa-solid fa-cloud-arrow-up text-orange-400 mr-1"></i> Your Uploaded Products`;
        try {
            const res = await fetch(`/api/products/seller/${currentUser.email}`);
            const items = await res.json();
            items.forEach(p => {
                orderContainer.innerHTML += `
                    <div class="bg-slate-900/60 p-4 rounded-2xl border border-gray-900 flex justify-between items-center">
                        <h5 class="font-extrabold text-xs text-white">${p.title}</h5>
                        <span class="text-[8px] px-2 py-0.5 rounded bg-slate-950 text-gray-400">${p.status}</span>
                    </div>
                `;
            });
        } catch(e) {}
    } else {
        if (quickAction) quickAction.classList.add('hidden');
        if (headingTitle) headingTitle.innerHTML = `<i class="fa-solid fa-basket-shopping text-orange-400 mr-1"></i> Your Placed Orders`;
    }
}

async function handleAuth() {
    const email = document.getElementById('auth-email').value;
    if (!email) return;
    try {
        const res = await fetch('/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if(data.success) {
            currentUser = data.user;
            localStorage.setItem('mt_logged_user', JSON.stringify(currentUser));
            updateProfilePanel();
            showNotification(`Welcome back, ${currentUser.email}`);
        }
    } catch (e) {}
}

async function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const chatBox = document.getElementById('chat-box');
    if (!chatInput || !chatInput.value.trim()) return;
    chatBox.innerHTML += `<div class="bg-orange-500 text-slate-950 p-3 rounded-2xl max-w-[85%] self-end ml-auto">${chatInput.value}</div>`;
    chatInput.value = '';
}

function processCheckout() {
    const selectedItems = cart.filter(item => item.selected);
    if(selectedItems.length === 0) {
        showNotification("Please select at least one item to proceed.", "error");
        return;
    }
    showNotification("Order processing... Redirecting to Cash on Delivery pipeline.");
}

window.addEventListener('DOMContentLoaded', () => {
    const retainedUser = localStorage.getItem('mt_logged_user');
    const retainedType = localStorage.getItem('mt_account_type');
    const retainedCart = localStorage.getItem('mt_basket_state');
    
    if (retainedUser) {
        currentUser = JSON.parse(retainedUser);
        if (retainedType) currentAccountType = retainedType;
    }
    if (retainedCart) {
        cart = JSON.parse(retainedCart);
        updateCartBadgeCount();
    }
    switchTab('home');
});
