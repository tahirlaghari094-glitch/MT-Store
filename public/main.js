let currentProducts = [];
let cart = [];
let currentUser = null;
let currentAccountType = 'common'; 

let commentSelectedRating = 0;
let commentAttachedFiles = [];

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
    const dd = document.getElementById('accountDropdown');
    if (dd) dd.classList.toggle('hidden');
}

function previewMedia(input, elementId) {
    const label = document.getElementById(elementId);
    if (input.files && input.files.length > 0) {
        label.textContent = `${input.files.length} File(s) Selected`;
    }
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

    if(type === 'seller') {
        showNotification("Switched to Seller Dashboard Management.");
        switchTab('account');
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
        if(btnHistory) btnHistory.className = "flex-1 py-2.5 rounded-xl text-xs font-black transition bg-slate-900 text-gray-300";
        if(tabUpload) tabUpload.classList.add('active');
        if(tabHistory) tabHistory.classList.remove('active');
    } else {
        if(btnHistory) btnHistory.className = "flex-1 py-2.5 rounded-xl text-xs font-black transition bg-orange-500 text-slate-950";
        if(btnUpload) btnUpload.className = "flex-1 py-2.5 rounded-xl text-xs font-black transition bg-slate-900 text-gray-300";
        if(tabHistory) tabHistory.classList.add('active');
        if(tabUpload) tabUpload.classList.remove('active');
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-view').forEach(view => view.classList.remove('active'));
    
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
        loadMessages();
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
            grid.innerHTML = `<p class="col-span-full text-center text-gray-500 py-12">No active products live.</p>`;
            return;
        }
        currentProducts.forEach(product => {
            const mainImg = (product.images && product.images.length > 0) ? product.images[0] : (product.imageUrl || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400');
            const hasVideoBadge = product.videoUrl ? `<span class="absolute top-2 right-2 bg-orange-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow"><i class="fa-solid fa-play text-[7px]"></i> VIDEO</span>` : '';
            
            grid.innerHTML += `
                <div class="relative bg-slate-900/40 border border-gray-850 rounded-3xl overflow-hidden hover:border-orange-500/50 transition cursor-pointer flex flex-col justify-between" onclick="viewDetails('${product.id}')">
                    ${hasVideoBadge}
                    <img src="${mainImg}" alt="${product.title}" class="w-full h-36 object-cover">
                    <div class="p-3">
                        <h3 class="font-extrabold text-xs truncate text-white">${product.title}</h3>
                        <div class="flex items-center justify-between mt-2">
                            <span class="text-xs font-black text-orange-400">PKR ${product.price}</span>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (e) {}
}

function setMediaActive(type, src) {
    const mediaContainer = document.getElementById('main-product-media-container');
    if (!mediaContainer) return;
    if (type === 'video') {
        mediaContainer.innerHTML = `<video src="${src}" controls autoplay class="object-contain max-h-[220px] rounded-xl w-full max-w-full"></video>`;
    } else {
        mediaContainer.innerHTML = `<img src="${src}" class="object-contain max-h-[220px] rounded-xl w-full">`;
    }
}

function viewDetails(productId) {
    const p = currentProducts.find(item => item.id === productId);
    if (!p) return;
    const container = document.getElementById('product-detail-content');
    if (!container) return;

    commentSelectedRating = 0;
    commentAttachedFiles = [];

    let images = p.images && p.images.length > 0 ? p.images : [p.imageUrl || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400'];
    
    let mediaThumbnails = images.map((img) => `
        <img src="${img}" onclick="setMediaActive('image', '${img}')" class="w-12 h-12 rounded-lg object-cover border border-gray-800 cursor-pointer hover:border-orange-500 transition shrink-0">
    `).join('');

    if (p.videoUrl) {
        mediaThumbnails += `
            <div onclick="setMediaActive('video', '${p.videoUrl}')" class="w-12 h-12 rounded-lg bg-slate-950 border border-orange-500/50 flex flex-col items-center justify-center text-orange-400 cursor-pointer hover:bg-orange-500 hover:text-slate-950 transition shrink-0">
                <i class="fa-solid fa-circle-play text-sm"></i>
                <span class="text-[7px] font-black uppercase mt-0.5">Video</span>
            </div>
        `;
    }

    let galleryHTML = `
        <div class="space-y-2">
            <div id="main-product-media-container" class="flex justify-center items-center bg-slate-950/40 rounded-2xl p-4 overflow-hidden border border-gray-900 min-h-[220px]">
                <img src="${images[0]}" class="object-contain max-h-[220px] rounded-xl w-full">
            </div>
            <div class="flex gap-2 overflow-x-auto no-scrollbar py-1">
                ${mediaThumbnails}
            </div>
        </div>
    `;

    // Direct Dialer / Phone Link for Vendor Contact
    const sellerPhoneNum = p.sellerPhone || '03113841402';
    let sellerInfoHTML = `
        <div class="bg-slate-950 border border-gray-900 p-3.5 rounded-2xl flex items-center justify-between">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-slate-950 flex items-center justify-center font-black text-xs shrink-0">
                    <i class="fa-solid fa-store"></i>
                </div>
                <div class="min-w-0">
                    <h5 class="text-xs font-extrabold text-white truncate">${p.sellerEmail || 'Verified Merchant'}</h5>
                    <p class="text-[9px] text-emerald-400 font-semibold"><i class="fa-solid fa-phone text-[8px]"></i> ${sellerPhoneNum}</p>
                </div>
            </div>
            <a href="tel:${sellerPhoneNum}" class="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-3.5 py-2 rounded-xl text-[10px] font-black transition shrink-0 flex items-center gap-1.5 shadow">
                <i class="fa-solid fa-phone"></i> Contact
            </a>
        </div>
    `;

    container.innerHTML = `
        ${galleryHTML}
        <div class="space-y-3">
            <h2 class="text-xl font-black text-white">${p.title}</h2>
            <p class="text-lg font-extrabold text-orange-400">PKR ${p.price}</p>
            <p class="text-gray-300 text-xs leading-relaxed bg-slate-950/50 p-3 rounded-2xl border border-gray-900/60">${p.description || 'Verified Premium Product.'}</p>
            
            <div class="space-y-2 pt-1">
                <button onclick="addToCart('${p.id}')" class="w-full bg-slate-800 hover:bg-slate-750 border border-gray-700 text-white font-bold py-3.5 rounded-xl transition text-xs flex items-center justify-center gap-2">
                    <i class="fa-solid fa-cart-plus"></i> Add to Cart
                </button>
                <button onclick="buyNowDirect('${p.id}')" class="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black py-3.5 rounded-xl transition text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2">
                    <i class="fa-solid fa-bolt"></i> Buy Now
                </button>
            </div>

            ${sellerInfoHTML}
        </div>
    `;
    switchTab('detail');
}

// --- CART LOGIC ---

function addToCart(productId) {
    const p = currentProducts.find(item => item.id === productId);
    if (!p) return;
    
    cart.push({ 
        ...p, 
        cartItemId: Date.now() + Math.random(), 
        selected: true 
    });
    
    showNotification("Item added to basket.");
}

function buyNowDirect(productId) {
    const p = currentProducts.find(item => item.id === productId);
    if (!p) return;
    
    cart.push({ 
        ...p, 
        cartItemId: Date.now() + Math.random(), 
        selected: true 
    });
    
    switchTab('cart');
    showNotification("Proceeding directly to checkout.");
}

function toggleCartItemSelection(index) {
    if (cart[index] !== undefined) {
        cart[index].selected = !cart[index].selected;
        renderCart();
    }
}

function renderCart() {
    const list = document.getElementById('cart-items-list');
    const formBox = document.getElementById('checkout-form-container');
    const summaryCard = document.getElementById('cart-summary-card');
    if (!list) return;

    list.innerHTML = '';
    if (cart.length === 0) {
        list.innerHTML = `<p class="text-xs text-gray-500 text-center py-8">Your cart container is empty.</p>`;
        if (formBox) formBox.classList.add('hidden');
        if (summaryCard) summaryCard.classList.add('hidden');
        return;
    }

    if (formBox) formBox.classList.remove('hidden');
    if (summaryCard) summaryCard.classList.remove('hidden');

    let totalAmount = 0;
    let selectedCount = 0;

    cart.forEach((item, index) => {
        if (item.selected) {
            totalAmount += parseFloat(item.price || 0);
            selectedCount += 1;
        }

        const thumb = (item.images && item.images.length > 0) ? item.images[0] : (item.imageUrl || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=100');

        list.innerHTML += `
            <div class="bg-slate-950 p-3.5 rounded-2xl border ${item.selected ? 'border-orange-500/50 bg-orange-500/5' : 'border-gray-900'} flex items-center gap-3 transition">
                <input type="checkbox" ${item.selected ? 'checked' : ''} onchange="toggleCartItemSelection(${index})" class="accent-orange-500 w-4 h-4 cursor-pointer rounded">
                <img src="${thumb}" class="w-12 h-12 rounded-xl object-cover border border-gray-800 shrink-0">
                <div class="min-w-0 flex-1">
                    <h4 class="font-extrabold text-xs text-white truncate">${item.title}</h4>
                    <p class="text-[11px] text-orange-400 font-bold mt-0.5">PKR ${Number(item.price).toLocaleString()}</p>
                </div>
                <button onclick="cart.splice(${index}, 1); renderCart();" class="text-xs text-rose-400 hover:text-rose-300 p-2">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
    });

    const txtCount = document.getElementById('cart-selected-count');
    const txtTotal = document.getElementById('cart-total-price');
    if (txtCount) txtCount.textContent = `${selectedCount} Item(s)`;
    if (txtTotal) txtTotal.textContent = `PKR ${totalAmount.toLocaleString()}`;
}

async function processOrderCheckout() {
    const selectedItems = cart.filter(item => item.selected);
    if(selectedItems.length === 0) return showNotification("Please select at least one product to purchase.", "error");

    const name = document.getElementById('b-name').value;
    const email = document.getElementById('b-email').value;
    const phone = document.getElementById('b-phone').value;
    const address = document.getElementById('b-address').value;
    if(!name || !email || !phone || !address) return showNotification("Fill complete checkout credentials.", "error");

    try {
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: selectedItems, buyerName: name, buyerEmail: email, buyerPhone: phone, buyerAddress: address })
        });
        if (res.ok) {
            showNotification("Order Dispatched! Details sent via email.");
            cart = cart.filter(item => !item.selected);
            switchTab('account');
        }
    } catch(e) {}
}

// --- MESSAGES / HELP & SUPPORT SYSTEM ---

async function loadMessages() {
    const container = document.getElementById('messages-thread-container');
    if (!container) return;
    
    try {
        const res = await fetch('/api/messages');
        const msgs = await res.json();
        container.innerHTML = '';

        if (msgs.length === 0) {
            container.innerHTML = `<p class="text-xs text-gray-500 text-center py-6">No support messages posted yet.</p>`;
            return;
        }

        const isAdmin = currentUser && currentUser.email === "admin@mtstore.com";

        msgs.forEach(m => {
            let adminReplyBox = '';
            if (m.adminReply) {
                adminReplyBox = `
                    <div class="mt-2 bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-xl">
                        <span class="text-[9px] font-black text-emerald-400 uppercase"><i class="fa-solid fa-headset"></i> Admin Response:</span>
                        <p class="text-xs text-white mt-1">${m.adminReply}</p>
                    </div>
                `;
            } else if (isAdmin) {
                adminReplyBox = `
                    <div class="mt-2 flex gap-2">
                        <input type="text" id="reply-input-${m.id}" placeholder="Type admin answer..." class="flex-1 bg-slate-900 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white">
                        <button onclick="sendAdminReply('${m.id}')" class="bg-orange-500 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl">Reply</button>
                    </div>
                `;
            }

            container.innerHTML += `
                <div class="bg-slate-950 p-3.5 rounded-2xl border border-gray-900 space-y-1">
                    <div class="flex justify-between items-center text-[10px] text-gray-500">
                        <span class="font-extrabold text-orange-400">${m.userEmail}</span>
                        <span>${new Date(m.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p class="text-xs text-gray-200">${m.userMessage}</p>
                    ${adminReplyBox}
                </div>
            `;
        });
    } catch(e) {}
}

async function sendUserSupportMessage() {
    const input = document.getElementById('user-support-input');
    if (!input || !input.value.trim()) return showNotification("Please type a message first.", "error");

    const email = currentUser ? currentUser.email : "guest@mtstore.com";

    try {
        const res = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userEmail: email, userMessage: input.value.trim() })
        });
        if (res.ok) {
            input.value = '';
            showNotification("Question sent to Admin!");
            loadMessages();
        }
    } catch(e) {}
}

async function sendAdminReply(messageId) {
    const input = document.getElementById(`reply-input-${messageId}`);
    if (!input || !input.value.trim()) return;

    try {
        const res = await fetch('/api/messages/reply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageId, adminReply: input.value.trim() })
        });
        if (res.ok) {
            showNotification("Response published directly to user.");
            loadMessages();
        }
    } catch(e) {}
}

// --- PROFILE EDIT (GALLERY IMAGE & NAME CHANGE) ---

function triggerGalleryPicker() {
    const fileInput = document.getElementById('user-photo-picker');
    if (fileInput) fileInput.click();
}

async function handleProfilePhotoSelected(input) {
    if (!input.files || input.files.length === 0 || !currentUser) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
        const photoB64 = e.target.result;
        await saveUserProfile({ photo: photoB64 });
    };
    reader.readAsDataURL(file);
}

async function updateUserName() {
    const newName = prompt("Enter your new display name:");
    if (newName && currentUser) {
        await saveUserProfile({ name: newName });
    }
}

async function saveUserProfile(data) {
    const email = currentUser.email;
    try {
        const res = await fetch('/api/users/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, ...data })
        });
        if (res.ok) {
            showNotification("Profile updated successfully!");
            updateProfilePanel();
        }
    } catch(e) {}
}

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
    
    // Fetch Updated User Profile
    let prof = {};
    try {
        const res = await fetch(`/api/users/profile/${currentUser.email}`);
        prof = await res.json();
    } catch(e) {}

    const imgEl = document.getElementById('panel-user-photo');
    if (imgEl) imgEl.src = prof.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';

    const nameEl = document.getElementById('panel-username');
    if (nameEl) nameEl.textContent = prof.name || currentUser.username || currentUser.email.split('@')[0];

    document.getElementById('panel-email').textContent = currentUser.email;
    document.getElementById('panel-role').textContent = `${currentAccountType} mode`;
    
    const orderContainer = document.getElementById('orders-summary-container');
    if (!orderContainer) return;
    orderContainer.innerHTML = '';

    if (currentAccountType === 'seller') {
        try {
            const res = await fetch(`/api/products/seller/${currentUser.email}`);
            const items = await res.json();
            if (items.length === 0) {
                orderContainer.innerHTML = `<p class="text-xs text-gray-500 text-center py-6">You haven't uploaded any products yet.</p>`;
                return;
            }
            items.forEach(p => {
                const displayImg = (p.images && p.images.length > 0) ? p.images[0] : (p.imageUrl || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=100');
                orderContainer.innerHTML += `
                    <div class="bg-slate-950 p-4 rounded-2xl border border-gray-900 flex justify-between items-center gap-2 mt-2">
                        <div class="min-w-0 flex-grow flex items-center gap-3">
                            <img src="${displayImg}" class="w-10 h-10 rounded-xl object-cover border border-gray-800">
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
        try {
            const res = await fetch(`/api/orders/user/${currentUser.email}`);
            const orders = await res.json();
            if (orders.length === 0) {
                orderContainer.innerHTML = `<p class="text-xs text-gray-500 text-center py-6">No orders placed yet.</p>`;
                return;
            }
            orders.forEach(o => {
                orderContainer.innerHTML += `
                    <div class="bg-slate-950 p-4 rounded-2xl border border-gray-900 flex justify-between items-center gap-2 mt-2">
                        <div class="min-w-0 flex-grow">
                            <h5 class="font-extrabold text-xs truncate text-white">${o.title}</h5>
                            <p class="text-[10px] text-gray-400">PKR ${o.price}</p>
                        </div>
                        <button onclick="cancelUserOrder('${o.id}', '${o.title.replace(/'/g, "\\'")}', '${o.sellerEmail || ''}')" class="bg-rose-500/10 hover:bg-rose-500 text-rose-400 border border-rose-500/30 text-[10px] px-3 py-1.5 rounded-xl transition font-bold">Cancel</button>
                    </div>
                `;
            });
        } catch (e) {}
    }
}

// --- PRODUCT UPLOAD WITH EASYPAISA POLICY & CUSTOM EMAIL/PHONE ---

async function handleProductUpload(event) {
    event.preventDefault();

    const title = document.getElementById('p-title').value;
    const price = document.getElementById('p-price').value;
    const description = document.getElementById('p-description').value;
    const category = document.getElementById('p-category').value;
    const sellerEmail = document.getElementById('p-seller-email').value;
    const sellerPhone = document.getElementById('p-seller-phone').value;
    const easypaisaTrxId = document.getElementById('p-easypaisa-trx').value;

    if (!sellerEmail || !sellerPhone || !easypaisaTrxId) {
        return showNotification("Please provide Email, Phone and EasyPaisa Receipt ID.", "error");
    }

    const imgInput = document.getElementById('p-image-file');
    const vidInput = document.getElementById('p-video-file');

    let imagesBase64 = [];
    if (imgInput.files.length > 0) {
        for (let i = 0; i < imgInput.files.length; i++) {
            const file = imgInput.files[i];
            const reader = new FileReader();
            const b64 = await new Promise((res) => {
                reader.onload = (e) => res(e.target.result);
                reader.readAsDataURL(file);
            });
            imagesBase64.push(b64);
        }
    }

    let videoBase64 = null;
    if (vidInput.files.length > 0) {
        const file = vidInput.files[0];
        const reader = new FileReader();
        videoBase64 = await new Promise((res) => {
            reader.onload = (e) => res(e.target.result);
            reader.readAsDataURL(file);
        });
    }

    try {
        const res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                title, 
                price, 
                description, 
                category, 
                images: imagesBase64, 
                videoUrl: videoBase64,
                sellerEmail, 
                sellerPhone,
                easypaisaTrxId
            })
        });
        if(res.ok) {
            showNotification("Product listing uploaded with receipt ID. Sent for Admin Approval!");
            document.getElementById('product-upload-form').reset();
            switchTab('account');
        }
    } catch(e) {}
}

async function deleteProductItem(productId) {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
        const res = await fetch(`/api/products/delete/${productId}`, { method: 'DELETE' });
        if (res.ok) {
            showNotification("Product deleted successfully.");
            updateProfilePanel(); 
        }
    } catch(e) {}
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
            showNotification(`Authenticated session logged: ${currentUser.email}`);
            updateProfilePanel();
        }
    } catch (e) {}
}

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
    switchTab('home');
};
