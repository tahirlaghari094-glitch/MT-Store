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
        if (currentUser && document.getElementById('p-email')) {
            document.getElementById('p-email').value = currentUser.email;
        }
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
            const mainImg = (product.images && product.images.length > 0) ? product.images[0] : (product.imageUrl || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400');
            grid.innerHTML += `
                <div class="bg-slate-900/40 border border-gray-850 rounded-3xl overflow-hidden hover:border-orange-500/50 transition cursor-pointer flex flex-col justify-between" onclick="viewDetails('${product.id}')">
                    <img src="${mainImg}" alt="${product.title}" class="w-full h-36 object-cover">
                    <div class="p-3">
                        <h3 class="font-extrabold text-xs truncate">${product.title}</h3>
                        <div class="flex items-center justify-between mt-2">
                            <span class="text-xs font-black text-orange-400">PKR ${product.price}</span>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (e) {}
}

function changeMainImage(src) {
    const mainImgEl = document.getElementById('main-product-img');
    if(mainImgEl) mainImgEl.src = src;
}

function viewDetails(productId) {
    const p = currentProducts.find(item => item.id === productId);
    if (!p) return;
    const container = document.getElementById('product-detail-content');
    if (!container) return;

    let images = p.images && p.images.length > 0 ? p.images : [p.imageUrl || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400'];
    
    let galleryHTML = `
        <div class="space-y-2">
            <div class="flex justify-center items-center bg-slate-950/40 rounded-2xl p-4 overflow-hidden border border-gray-900">
                <img id="main-product-img" src="${images[0]}" class="object-contain max-h-[220px] rounded-xl w-full">
            </div>
            ${images.length > 1 ? `
                <div class="flex gap-2 overflow-x-auto no-scrollbar py-1">
                    ${images.map((img, idx) => `
                        <img src="${img}" onclick="changeMainImage('${img}')" class="w-12 h-12 rounded-lg object-cover border border-gray-800 cursor-pointer hover:border-orange-500 transition shrink-0">
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;

    let sellerInfoHTML = `
        <div class="bg-slate-950 border border-gray-900 p-3.5 rounded-2xl flex items-center justify-between">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-slate-950 flex items-center justify-center font-black text-xs shrink-0">
                    <i class="fa-solid fa-store"></i>
                </div>
                <div class="min-w-0">
                    <h5 class="text-xs font-extrabold text-white truncate">${p.sellerEmail || 'Verified Merchant'}</h5>
                    <p class="text-[9px] text-emerald-400 font-semibold"><i class="fa-solid fa-circle-check text-[8px]"></i> Verified Store Vendor</p>
                </div>
            </div>
            <button onclick="switchTab('messages')" class="bg-slate-900 border border-gray-800 text-gray-300 hover:text-white px-3 py-1.5 rounded-xl text-[10px] font-bold transition shrink-0">Contact</button>
        </div>
    `;

    let commentsHTML = `
        <div class="space-y-3 border-t border-gray-900 pt-4">
            <h4 class="text-xs font-black uppercase text-gray-400 tracking-wider flex items-center gap-2">
                <i class="fa-solid fa-comments text-orange-400"></i> Customer Reviews & Q/A
            </h4>
            
            <div class="space-y-2">
                <textarea id="comment-input" rows="2" placeholder="Write a review or question..." class="w-full bg-slate-950 border border-gray-900 rounded-xl p-3 text-xs outline-none focus:border-orange-500 transition text-white"></textarea>
                <div class="flex justify-between items-center">
                    <label class="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
                        <input type="checkbox" id="comment-pin" class="accent-orange-500 rounded cursor-pointer">
                        <span class="text-[10px] font-bold"><i class="fa-solid fa-thumbtack text-orange-400"></i> Pin this Review</span>
                    </label>
                    <button onclick="submitComment('${p.id}')" class="bg-orange-500 text-slate-950 font-black px-4 py-2 rounded-xl text-xs transition">Post</button>
                </div>
            </div>

            <div id="comments-list-${p.id}" class="space-y-2 pt-2">
                ${renderCommentsList(p.comments || [])}
            </div>
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
            ${commentsHTML}
        </div>
    `;
    switchTab('detail');
}

function renderCommentsList(comments) {
    if (!comments || comments.length === 0) {
        return `<p class="text-[10px] text-gray-500 text-center py-3">No reviews or comments yet.</p>`;
    }
    
    // Pinned comments first
    const sorted = [...comments].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
    
    return sorted.map(c => `
        <div class="bg-slate-950 border ${c.isPinned ? 'border-orange-500/50 bg-orange-500/5' : 'border-gray-900'} p-3 rounded-xl space-y-1 relative">
            <div class="flex items-center justify-between">
                <span class="text-[10px] font-extrabold text-orange-400">${c.author}</span>
                <div class="flex items-center gap-2">
                    ${c.isPinned ? '<span class="text-[8px] bg-orange-500 text-slate-950 px-1.5 py-0.5 rounded font-black uppercase"><i class="fa-solid fa-thumbtack"></i> Pinned</span>' : ''}
                    <span class="text-[8px] text-gray-500">${new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
            <p class="text-xs text-gray-300">${c.text}</p>
        </div>
    `).join('');
}

async function submitComment(productId) {
    const input = document.getElementById('comment-input');
    const pinCheckbox = document.getElementById('comment-pin');
    if (!input || !input.value.trim()) return showNotification("Please write a comment first.", "error");

    const author = currentUser ? currentUser.email : "Anonymous Buyer";
    const commentData = {
        author,
        text: input.value.trim(),
        isPinned: pinCheckbox ? pinCheckbox.checked : false
    };

    try {
        const res = await fetch(`/api/products/${productId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(commentData)
        });
        
        if (res.ok) {
            const data = await res.json();
            showNotification("Comment posted successfully!");
            const targetProd = currentProducts.find(p => p.id === productId);
            if (targetProd) {
                targetProd.comments = data.comments;
            }
            const commentsContainer = document.getElementById(`comments-list-${productId}`);
            if (commentsContainer) {
                commentsContainer.innerHTML = renderCommentsList(data.comments);
            }
            input.value = '';
            if (pinCheckbox) pinCheckbox.checked = false;
        }
    } catch(e) {
        showNotification("Failed to post comment.", "error");
    }
}

function addToCart(productId) {
    const p = currentProducts.find(item => item.id === productId);
    if(!p) return;
    cart.push({ ...p, quantity: 1 });
    showNotification("Item added to basket checkout flow.");
}

function buyNowDirect(productId) {
    const p = currentProducts.find(item => item.id === productId);
    if(!p) return;
    cart = [{ ...p, quantity: 1 }];
    switchTab('cart');
    showNotification("Proceeding directly to checkout.");
}

function renderCart() {
    const list = document.getElementById('cart-items-list');
    const formBox = document.getElementById('checkout-form-container');
    if (!list) return;
    list.innerHTML = '';
    if (cart.length === 0) {
        list.innerHTML = `<p class="text-xs text-gray-500 text-center py-8">Your cart container is empty.</p>`;
        if(formBox) formBox.classList.add('hidden');
        return;
    }
    if(formBox) formBox.classList.remove('hidden');
    cart.forEach((item, index) => {
        list.innerHTML += `
            <div class="bg-slate-950 p-4 rounded-2xl border border-gray-900 flex justify-between items-center">
                <div>
                    <h4 class="font-extrabold text-xs text-white">${item.title}</h4>
                    <p class="text-[10px] text-orange-400 font-bold">PKR ${item.price}</p>
                </div>
                <button onclick="cart.splice(${index},1); renderCart();" class="text-xs text-rose-400"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `;
    });
}

async function processOrderCheckout() {
    const name = document.getElementById('b-name').value;
    const email = document.getElementById('b-email').value;
    const phone = document.getElementById('b-phone').value;
    const address = document.getElementById('b-address').value;
    if(!name || !email || !phone || !address) return showNotification("Fill complete credentials.", "error");

    try {
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: cart, buyerName: name, buyerEmail: email, buyerPhone: phone, buyerAddress: address })
        });
        if (res.ok) {
            showNotification("Order pipeline secured! Dispatched confirmation email updates.");
            cart = [];
            switchTab('account');
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
    
    document.getElementById('panel-email').textContent = currentUser.email;
    document.getElementById('panel-role').textContent = `${currentAccountType} mode`;
    document.getElementById('panel-username').textContent = currentUser.username || currentUser.email.split('@')[0];
    
    const headingTitle = document.getElementById('profile-orders-heading');
    const orderContainer = document.getElementById('orders-summary-container');
    if (!orderContainer) return;
    orderContainer.innerHTML = '';

    if (currentAccountType === 'seller') {
        if (headingTitle) {
            headingTitle.innerHTML = `
                <div class="flex justify-between items-center w-full border-b border-gray-900 pb-2">
                    <span class="font-extrabold text-xs text-white">
                        <i class="fa-solid fa-cloud-arrow-up text-orange-400 mr-1"></i> Your Uploaded Products
                    </span>
                    <button onclick="openProductUploadForm()" class="bg-orange-500 hover:bg-orange-600 text-slate-950 font-black text-[10px] px-3 py-1.5 rounded-xl transition shadow-lg flex items-center gap-1">
                        <i class="fa-solid fa-plus text-[8px]"></i> Add New Product
                    </button>
                </div>
            `;
        }
        
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
        if (headingTitle) headingTitle.innerHTML = `<span class="font-extrabold text-xs text-white"><i class="fa-solid fa-basket-shopping text-orange-400 mr-1"></i> Your Placed Orders Summary</span>`;
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
                            <h5 class="font-extrabold text-xs truncate">${o.title}</h5>
                            <p class="text-[10px] text-gray-400">PKR ${o.price}</p>
                        </div>
                        <button onclick="cancelUserOrder('${o.id}', '${o.title.replace(/'/g, "\\'")}', '${o.sellerEmail || ''}')" class="bg-rose-500/10 hover:bg-rose-500 text-rose-400 border border-rose-500/30 text-[10px] px-3 py-1.5 rounded-xl transition font-bold">Cancel</button>
                    </div>
                `;
            });
        } catch (e) {}
    }
}

function openProductUploadForm() {
    switchTab('seller');
    switchSellerSubTab('upload');
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
            showNotification("Order Cancelled. Updates sent to Admin & Seller via system routing.");
            updateProfilePanel();
        }
    } catch (err) {}
}

async function deleteProductItem(productId) {
    if (!confirm("Are you sure you want to completely delete this item from the store?")) return;
    try {
        const res = await fetch(`/api/products/delete/${productId}`, { method: 'DELETE' });
        if (res.ok) {
            showNotification("Product deleted successfully.");
            updateProfilePanel(); 
        }
    } catch(e) {}
}

async function handleProductUpload(event) {
    event.preventDefault();
    if (!currentUser) return showNotification("Please authenticate session first.", "error");

    const title = document.getElementById('p-title').value;
    const price = document.getElementById('p-price').value;
    const description = document.getElementById('p-description').value;
    const category = document.getElementById('p-category').value;
    const imgInput = document.getElementById('p-image-file');

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
    } else {
        imagesBase64.push("https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400");
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
                imageUrl: imagesBase64[0],
                sellerEmail: currentUser.email 
            })
        });
        if(res.ok) {
            showNotification("Product listing uploaded for admin review pipeline processing.");
            document.getElementById('product-upload-form').reset();
            document.getElementById('lbl-images').textContent = "Select Product Images (Multiple)";
            switchTab('account');
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
