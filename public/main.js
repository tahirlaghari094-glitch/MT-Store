let currentProducts = [];
let cart = [];
let currentUser = null;
let currentAccountType = 'common'; 

// Local Client State Containers For 2, 6, 10
let activeProductUploadedImages = [];
let productCommentsMap = JSON.parse(localStorage.getItem('mt_store_comments')) || {};
let activeSelectedDetailQuantity = 1;

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
            // Decode potential multi-image structure
            let displayImg = product.imageUrl;
            if (displayImg && displayImg.startsWith('[')) {
                try { displayImg = JSON.parse(displayImg)[0]; } catch(e) {}
            }
            grid.innerHTML += `
                <div class="bg-slate-900/40 border border-gray-850 rounded-3xl overflow-hidden hover:border-orange-500/50 transition cursor-pointer flex flex-col justify-between" onclick="viewDetails('${product.id}')">
                    <img src="${displayImg}" alt="${product.title}" class="w-full h-36 object-cover">
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

// 10. Multi-media preview implementation 
async function previewMedia(input, labelId) {
    if (input.id === 'p-image-file') {
        activeProductUploadedImages = [];
        const container = document.getElementById('product-images-preview-row');
        if (container) container.innerHTML = '';
        
        for (let file of input.files) {
            const reader = new FileReader();
            const b64 = await new Promise(res => {
                reader.onload = e => res(e.target.result);
                reader.readAsDataURL(file);
            });
            activeProductUploadedImages.push(b64);
            if (container) {
                container.innerHTML += `<img src="${b64}" class="w-12 h-12 object-cover rounded-xl border border-gray-800 shrink-0">`;
            }
        }
        document.getElementById(labelId).textContent = `${input.files.length} Images Attached`;
    }
}

// 6. Name Edit Functionality
function triggerNameModification() {
    if (!currentUser) return;
    const currentName = currentUser.username || currentUser.email.split('@')[0];
    const newName = prompt("Enter your new profile name handle:", currentName);
    if (newName && newName.trim() !== "") {
        fetch('/api/users/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentUser.email, username: newName.trim() })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                currentUser = data.user;
                localStorage.setItem('mt_logged_user', JSON.stringify(currentUser));
                updateProfilePanel();
                showNotification("Profile display name handle modified.");
            }
        });
    }
}

// 6. Avatar Base64 Update Handler
async function triggerProfileImageUpload(input) {
    if (!input.files || input.files.length === 0) return;
    const reader = new FileReader();
    const base64 = await new Promise(res => {
        reader.onload = e => res(e.target.result);
        reader.readAsDataURL(input.files[0]);
    });
    
    fetch('/api/users/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email, profileImage: base64 })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('mt_logged_user', JSON.stringify(currentUser));
            updateProfilePanel();
            showNotification("Avatar image refreshed.");
        }
    });
}

// 5. Quantity counter adjustments
function adjustDetailsQuantity(delta) {
    activeSelectedDetailQuantity = Math.max(1, activeSelectedDetailQuantity + delta);
    const qtyText = document.getElementById('detail-qty-counter');
    if (qtyText) qtyText.textContent = activeSelectedDetailQuantity;
}

// 1. Direct secure buy route
function processDirectPurchase(productId) {
    const p = currentProducts.find(item => item.id === productId);
    if (!p) return;
    // Clear cart or prepend item checked explicitly
    cart = [{ ...p, quantity: activeSelectedDetailQuantity, checked: true }];
    switchTab('cart');
    showNotification("Direct pipeline activated. Complete order layout.");
}

function addToCart(productId) {
    const p = currentProducts.find(item => item.id === productId);
    if(!p) return;
    const existingIndex = cart.findIndex(item => item.id === productId);
    if (existingIndex > -1) {
        cart[existingIndex].quantity += activeSelectedDetailQuantity;
    } else {
        cart.push({ ...p, quantity: activeSelectedDetailQuantity, checked: true });
    }
    showNotification("Item added to basket checkout flow.");
}

// 2. Pins / Comments Engine Controls
function handleAddComment(productId) {
    const input = document.getElementById('comment-input-field');
    if (!input || !input.value.trim()) return;
    
    if (!productCommentsMap[productId]) productCommentsMap[productId] = [];
    
    const newComment = {
        id: 'COM-' + Date.now(),
        text: input.value.trim(),
        author: currentUser ? (currentUser.username || currentUser.email.split('@')[0]) : 'Anonymous Guest',
        pinned: false,
        timestamp: new Date().toLocaleDateString()
    };
    
    productCommentsMap[productId].push(newComment);
    localStorage.setItem('mt_store_comments', JSON.stringify(productCommentsMap));
    input.value = '';
    renderCommentsSection(productId);
}

function togglePinComment(productId, commentId) {
    if (!productCommentsMap[productId]) return;
    productCommentsMap[productId] = productCommentsMap[productId].map(c => {
        if (c.id === commentId) c.pinned = !c.pinned;
        return c;
    });
    localStorage.setItem('mt_store_comments', JSON.stringify(productCommentsMap));
    renderCommentsSection(productId);
    showNotification("Comment status pinned state adjusted.");
}

function renderCommentsSection(productId) {
    const container = document.getElementById('comments-render-box');
    if (!container) return;
    container.innerHTML = '';
    
    let comments = productCommentsMap[productId] || [];
    // Sort pinned elements to topmost rows
    comments.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    
    if (comments.length === 0) {
        container.innerHTML = `<p class="text-[11px] text-gray-500 py-2">No reviews placed yet.</p>`;
        return;
    }
    
    comments.forEach(c => {
        container.innerHTML += `
            <div class="bg-slate-950 p-2.5 border ${c.pinned ? 'border-orange-500/40' : 'border-gray-950'} rounded-xl space-y-1">
                <div class="flex items-center justify-between text-[10px]">
                    <span class="font-extrabold text-orange-400">${c.author} ${c.pinned ? '📌' : ''}</span>
                    <div class="flex items-center gap-2">
                        <span class="text-gray-500 text-[8px]">${c.timestamp}</span>
                        <button onclick="togglePinComment('${productId}', '${c.id}')" class="text-gray-400 hover:text-orange-400 text-[8px]"><i class="fa-solid fa-thumbtack"></i></button>
                    </div>
                </div>
                <p class="text-xs text-gray-300 font-medium">${c.text}</p>
            </div>
        `;
    });
}

// 1, 2, 3, 5, 10. Refactoring View Product Details Content Injector
function viewDetails(productId) {
    const p = currentProducts.find(item => item.id === productId);
    if (!p) return;
    activeSelectedDetailQuantity = 1; 

    // Handle multiple images rendering loops
    let imagesArr = [p.imageUrl];
    if (p.imageUrl && p.imageUrl.startsWith('[')) {
        try { imagesArr = JSON.parse(p.imageUrl); } catch(e) {}
    }
    
    let imagesCarouselHtml = `<img src="${imagesArr[0]}" class="object-contain max-h-[200px] rounded-xl w-full">`;
    if (imagesArr.length > 1) {
        imagesCarouselHtml = `
            <div class="w-full space-y-2">
                <img id="main-detail-preview-frame" src="${imagesArr[0]}" class="object-contain max-h-[200px] rounded-xl w-full">
                <div class="flex gap-2 overflow-x-auto no-scrollbar py-1 justify-center">
                    ${imagesArr.map((img, idx) => `<img src="${img}" onclick="document.getElementById('main-detail-preview-frame').src='${img}'" class="w-10 h-10 object-cover rounded-md border border-gray-800 cursor-pointer shrink-0">`).join('')}
                </div>
            </div>
        `;
    }

    const container = document.getElementById('product-detail-content');
    if (!container) return;

    container.innerHTML = `
        <div class="flex justify-center items-center bg-slate-950/40 rounded-2xl p-4 overflow-hidden">
            ${imagesCarouselHtml}
        </div>
        <div class="space-y-4">
            <h2 class="text-xl font-black">${p.title}</h2>
            <p class="text-md font-bold text-orange-400">PKR ${p.price}</p>
            <p class="text-gray-300 text-xs leading-relaxed">${p.description || 'Verified Premium Product.'}</p>
            
            <!-- 5. Quantity Control row mapping elements -->
            <div class="flex items-center gap-3 bg-slate-950 p-3 border border-gray-900 rounded-xl justify-between">
                <span class="text-xs font-bold text-gray-400">Select Purchase Order Quantity</span>
                <div class="flex items-center gap-3">
                    <button onclick="adjustDetailsQuantity(-1)" class="w-7 h-7 bg-slate-900 border border-gray-800 rounded-lg flex items-center justify-center text-xs font-black">-</button>
                    <span id="detail-qty-counter" class="text-xs font-extrabold text-white">1</span>
                    <button onclick="adjustDetailsQuantity(1)" class="w-7 h-7 bg-slate-900 border border-gray-800 rounded-lg flex items-center justify-center text-xs font-black">+</button>
                </div>
            </div>

            <!-- 1. Actions Buttons Row Layout Grid Setup -->
            <div class="grid grid-cols-2 gap-2 pt-2">
                <button onclick="addToCart('${p.id}')" class="bg-slate-800 border border-gray-700 text-white font-bold py-3.5 rounded-xl transition text-xs uppercase">Add to Cart</button>
                <button onclick="processDirectPurchase('${p.id}')" class="bg-orange-500 text-slate-950 font-black py-3.5 rounded-xl transition text-xs uppercase shadow-lg">Buy Now</button>
            </div>

            <!-- 3. Seller Profile Card Box -->
            <div class="bg-slate-950 p-4 border border-gray-900 rounded-2xl space-y-1.5">
                <h4 class="text-[10px] font-black uppercase tracking-widest text-orange-400">Vendor Profile Identity</h4>
                <div class="text-xs space-y-1">
                    <p class="text-gray-300"><span class="text-gray-500 font-bold">Email:</span> ${p.sellerEmail || 'System Distribution Platform'}</p>
                    <p class="text-gray-300"><span class="text-gray-500 font-bold">Phone Connection:</span> ${p.sellerPhone || 'N/A'}</p>
                </div>
            </div>

            <!-- 2. Reviews System Architecture Node Section Layout -->
            <div class="bg-slate-900/40 border border-gray-900 rounded-2xl p-3.5 space-y-3">
                <h4 class="text-[10px] font-black uppercase tracking-widest text-gray-400">Live Item Reviews Pipeline</h4>
                <div class="flex gap-2">
                    <input type="text" id="comment-input-field" placeholder="Share item verification feedback..." class="flex-1 bg-slate-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-orange-500 transition">
                    <button onclick="handleAddComment('${p.id}')" class="bg-orange-500 text-slate-950 font-black px-4 rounded-xl text-xs">Post</button>
                </div>
                <div id="comments-render-box" class="space-y-2 max-h-[160px] overflow-y-auto no-scrollbar pt-1">
                    <!-- Target comments loop maps inside -->
                </div>
            </div>
        </div>
    `;
    switchTab('detail');
    renderCommentsSection(p.id);
}

// 4. Cart filtration toggling setup
function toggleCartItemSelection(index) {
    cart[index].checked = !cart[index].checked;
    renderCart();
}

function adjustCartItemQuantity(index, delta) {
    cart[index].quantity = Math.max(1, cart[index].quantity + delta);
    renderCart();
}

// 4, 5. Redefining cart item entries with checkbox frame wrappers
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
            <div class="bg-slate-950 p-4 rounded-2xl border border-gray-900 flex justify-between items-center gap-3">
                <div class="flex items-center gap-3 min-w-0 flex-1">
                    <!-- 4. Target checkbox logic inclusion -->
                    <input type="checkbox" ${item.checked ? 'checked' : ''} onclick="toggleCartItemSelection(${index})" class="w-4 h-4 rounded border-gray-800 text-orange-500 bg-slate-900 accent-orange-500 cursor-pointer shrink-0">
                    <div class="min-w-0 flex-1">
                        <h4 class="font-extrabold text-xs text-white truncate">${item.title}</h4>
                        <p class="text-[10px] text-orange-400 font-bold">PKR ${item.price}</p>
                    </div>
                </div>
                
                <!-- 5. Quantity adjust configuration inside cart grid -->
                <div class="flex items-center gap-2 shrink-0">
                    <button onclick="adjustCartItemQuantity(${index}, -1)" class="w-5 h-5 bg-slate-900 border border-gray-850 text-[10px] rounded flex items-center justify-center font-bold text-gray-400">-</button>
                    <span class="text-xs text-white font-extrabold w-4 text-center">${item.quantity}</span>
                    <button onclick="adjustCartItemQuantity(${index}, 1)" class="w-5 h-5 bg-slate-900 border border-gray-850 text-[10px] rounded flex items-center justify-center font-bold text-gray-400">+</button>
                </div>

                <button onclick="cart.splice(${index},1); renderCart();" class="text-xs text-rose-400 p-1 shrink-0"><i class="fa-solid fa-trash-can"></i></button>
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

    // 4. Filter only items that are checked/selected
    const itemsToCheckout = cart.filter(item => item.checked);
    if (itemsToCheckout.length === 0) return showNotification("Please select at least one item to proceed.", "error");

    try {
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: itemsToCheckout, buyerName: name, buyerEmail: email, buyerPhone: phone, buyerAddress: address })
        });
        if (res.ok) {
            showNotification("Order pipeline secured! Dispatched confirmation email updates.");
            // Filter remaining non-checked elements back into user storage state mapping loop
            cart = cart.filter(item => !item.checked);
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
    
    // 6. Avatar Update Injection logic loop check
    const avatarSpan = document.getElementById('panel-avatar');
    if (avatarSpan) {
        if (currentUser.profileImage && currentUser.profileImage.trim() !== '') {
            document.getElementById('panel-avatar-container').innerHTML = `<img src="${currentUser.profileImage}" class="w-full h-full object-cover rounded-2xl">`;
        } else {
            const shortHandle = (currentUser.username || currentUser.email).substring(0,2).toUpperCase();
            document.getElementById('panel-avatar-container').innerHTML = `<span id="panel-avatar">${shortHandle}</span>`;
        }
    }

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
                let displayImg = p.imageUrl;
                if (displayImg && displayImg.startsWith('[')) {
                    try { displayImg = JSON.parse(displayImg)[0]; } catch(e) {}
                }
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
                            <h5 class="font-extrabold text-xs truncate">${o.title} (x${o.quantity || 1})</h5>
                            <p class="text-[10px] text-gray-400">PKR ${o.price * (o.quantity || 1)}</p>
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
    // Ensure email and clear multi-images arrays inside form elements setup
    if(currentUser && document.getElementById('p-email')) {
        document.getElementById('p-email').value = currentUser.email;
    }
    activeProductUploadedImages = [];
    const container = document.getElementById('product-images-preview-row');
    if (container) container.innerHTML = '';
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
    const title = document.getElementById('p-title').value;
    const price = document.getElementById('p-price').value;
    const description = document.getElementById('p-description').value;
    const category = document.getElementById('p-category').value;
    
    // 8 & 9. Read dynamic fields explicitly from form
    const inputEmail = document.getElementById('p-email').value;
    const inputPhone = document.getElementById('p-phone').value;
    const easypaisaTxnId = document.getElementById('p-easypaisa-txnid').value;

    // 10. Multi-image array conversion logic string mapping
    let stringifiedImages = "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400";
    if (activeProductUploadedImages.length > 0) {
        stringifiedImages = JSON.stringify(activeProductUploadedImages);
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
                imageBase64: stringifiedImages, 
                sellerEmail: inputEmail,
                sellerPhone: inputPhone,
                easypaisaTxnId
            })
        });
        if(res.ok) {
            showNotification("Product listing uploaded for admin review pipeline processing.");
            document.getElementById('product-upload-form').reset();
            activeProductUploadedImages = [];
            const container = document.getElementById('product-images-preview-row');
            if(container) container.innerHTML = '';
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
