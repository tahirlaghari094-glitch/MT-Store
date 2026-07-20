let currentProducts = [];
let cart = [];
let currentUser = null;
let currentAccountType = 'common'; 
let currentViewingProductId = null;

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
            const displayImg = Array.isArray(product.imageUrls) ? product.imageUrls[0] : product.imageUrl;
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

// REQUIREMENT: Render all seller uploaded images instead of just one + Buy now architecture
function viewDetails(productId) {
    const p = currentProducts.find(item => item.id === productId);
    if (!p) return;
    currentViewingProductId = productId;
    const container = document.getElementById('product-detail-content');
    if (!container) return;

    // Build dynamic array rendering system for images
    let imagesMarkup = '';
    if (Array.isArray(p.imageUrls) && p.imageUrls.length > 0) {
        imagesMarkup = `
            <div class="flex gap-2 overflow-x-auto no-scrollbar pb-1 snap-x">
                ${p.imageUrls.map(img => `<img src="${img}" class="object-contain max-h-[200px] rounded-xl snap-center shrink-0 min-w-full bg-slate-950/40 p-2">`).join('')}
            </div>
            <p class="text-[9px] text-gray-500 text-center tracking-wide">Swipe to see all product variant views &rarr;</p>
        `;
    } else {
        imagesMarkup = `
            <div class="flex justify-center items-center bg-slate-950/40 rounded-2xl p-4 overflow-hidden">
                <img src="${p.imageUrl}" class="object-contain max-h-[200px] rounded-xl">
            </div>
        `;
    }

    container.innerHTML = `
        ${imagesMarkup}
        <div class="space-y-4">
            <h2 class="text-xl font-black">${p.title}</h2>
            <p class="text-md font-bold text-orange-400">PKR ${p.price}</p>
            <p class="text-gray-300 text-xs leading-relaxed">${p.description || 'Verified Premium Product.'}</p>
            
            <!-- REQUIREMENT: Integrated Buy Now Direct Button beside Add To Cart -->
            <div class="grid grid-cols-2 gap-2 pt-2">
                <button onclick="addToCart('${p.id}')" class="w-full bg-slate-800 border border-gray-700 text-white font-bold py-3 rounded-xl transition text-xs">Add to Cart</button>
                <button onclick="directBuyItem('${p.id}')" class="w-full bg-gradient-to-r from-orange-400 to-amber-500 text-slate-950 font-black py-3 rounded-xl transition text-xs shadow-lg uppercase tracking-wider">Buy Now</button>
            </div>
        </div>
    `;
    switchTab('detail');
    loadProductComments(productId);
}

// REQUIREMENT: Immediate Checkout Routing Bypass
function directBuyItem(productId) {
    const p = currentProducts.find(item => item.id === productId);
    if(!p) return;
    
    // Clear cart or keep existing, we append this direct item and check it by default
    const existing = cart.find(item => item.id === productId);
    if(!existing) {
        cart.push({ ...p, quantity: 1, selected: true });
    } else {
        existing.selected = true; 
    }
    
    switchTab('cart');
    showNotification("Direct Purchase pipeline initialised.");
}

function addToCart(productId) {
    const p = currentProducts.find(item => item.id === productId);
    if(!p) return;
    cart.push({ ...p, quantity: 1, selected: true }); // Checked by default when added
    showNotification("Item added to basket checkout flow.");
}

// REQUIREMENT: Cart item select/deselect option framework configuration updates
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
                <div class="flex items-center gap-3 flex-1 min-w-0">
                    <!-- REQUIREMENT: Checkbox selection architecture toggler -->
                    <input type="checkbox" ${item.selected ? 'checked' : ''} onchange="toggleCartItemSelection(${index})" class="w-4 h-4 rounded text-orange-500 bg-slate-900 border-gray-800 focus:ring-orange-500 focus:ring-opacity-25 focus:ring-2 accent-orange-500 cursor-pointer">
                    <div class="min-w-0 flex-1">
                        <h4 class="font-extrabold text-xs text-white truncate">${item.title}</h4>
                        <p class="text-[10px] text-orange-400 font-bold">PKR ${item.price}</p>
                    </div>
                </div>
                <button onclick="cart.splice(${index},1); renderCart();" class="text-xs text-rose-400 p-1 shrink-0"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `;
    });
}

function toggleCartItemSelection(index) {
    cart[index].selected = !cart[index].selected;
}

async function processOrderCheckout() {
    const name = document.getElementById('b-name').value;
    const email = document.getElementById('b-email').value;
    const phone = document.getElementById('b-phone').value;
    const address = document.getElementById('b-address').value;
    if(!name || !email || !phone || !address) return showNotification("Fill complete credentials.", "error");

    // Filter only selected checked items for backend handling pipeline processing
    const selectedItems = cart.filter(item => item.selected);
    if (selectedItems.length === 0) return showNotification("Please select at least one item to checkout.", "error");

    try {
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: selectedItems, buyerName: name, buyerEmail: email, buyerPhone: phone, buyerAddress: address })
        });
        if (res.ok) {
            showNotification("Order pipeline secured! Dispatched confirmation email updates.");
            // Remove processed items from cart structure, leave unselected items
            cart = cart.filter(item => !item.selected);
            switchTab('account');
        }
    } catch(e) {}
}

// REQUIREMENT: Comment Attachment Previews System Logic Mapping
let commentAttachedBase64 = null;

function previewCommentImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            commentAttachedBase64 = e.target.result;
            document.getElementById('comment-preview-src').src = e.target.result;
            document.getElementById('comment-img-preview').classList.remove('hidden');
        }
        reader.readAsDataURL(input.files[0]);
    }
}

function clearCommentImage() {
    commentAttachedBase64 = null;
    document.getElementById('c-image-file').value = "";
    document.getElementById('comment-img-preview').classList.add('hidden');
}

async function loadProductComments(productId) {
    const container = document.getElementById('comments-container');
    if (!container) return;
    container.innerHTML = `<p class="text-[10px] text-gray-500 text-center py-2">Syncing live feedback loops...</p>`;
    try {
        const res = await fetch(`/api/products/${productId}/comments`);
        const comments = await res.json();
        container.innerHTML = '';
        if(comments.length === 0) {
            container.innerHTML = `<p class="text-[10px] text-gray-500 text-center py-4">No reviews posted yet for this product item setup.</p>`;
            return;
        }
        comments.forEach(c => {
            let imgBlock = c.commentImage ? `<img src="${c.commentImage}" class="w-full max-h-40 object-cover rounded-xl mt-2 border border-gray-900 bg-slate-950">` : '';
            container.innerHTML += `
                <div class="bg-slate-950/70 border border-gray-900/60 rounded-xl p-3 space-y-1">
                    <div class="flex justify-between items-center">
                        <span class="text-[10px] font-black text-orange-400">${c.userHandle}</span>
                        <span class="text-[8px] text-gray-500">${new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p class="text-xs text-gray-200 leading-normal">${c.text}</p>
                    ${imgBlock}
                </div>
            `;
        });
    } catch(err) {
        container.innerHTML = `<p class="text-[10px] text-rose-400 text-center py-2">Failed to sync reviews pipeline architecture.</p>`;
    }
}

async function submitProductComment() {
    const text = document.getElementById('c-text').value;
    if(!text && !commentAttachedBase64) return showNotification("Comment body field logic empty.", "error");
    const userHandle = currentUser ? currentUser.email : "Anonymous Buyer";

    try {
        const res = await fetch(`/api/products/${currentViewingProductId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userHandle, text, commentImage: commentAttachedBase64 })
        });
        if(res.ok) {
            showNotification("Review logs updated successfully.");
            document.getElementById('c-text').value = '';
            clearCommentImage();
            loadProductComments(currentViewingProductId);
        }
    } catch(e) { showNotification("Failed to post statement to live servers.", "error"); }
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
                const displayImg = Array.isArray(p.imageUrls) ? p.imageUrls[0] : p.imageUrl;
                orderContainer.innerHTML += `
                    <div class="bg-slate-950 p-4 rounded-2xl border border-gray-900 flex justify-between items-center gap-2 mt-2">
                        <div class="min-w-0 flex-grow flex items-center gap-3">
                            <img src="${displayImg || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=100'}" class="w-10 h-10 rounded-xl object-cover border border-gray-800">
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

// REQUIREMENT: Upgraded to convert all selected image files into a base64 Array layout framework
async function handleProductUpload(event) {
    event.preventDefault();
    const title = document.getElementById('p-title').value;
    const price = document.getElementById('p-price').value;
    const description = document.getElementById('p-description').value;
    const category = document.getElementById('p-category').value;
    const imgInput = document.getElementById('p-image-file');

    let base64ImagesArray = [];
    if (imgInput.files.length > 0) {
        for (let file of imgInput.files) {
            const reader = new FileReader();
            let b64 = await new Promise((res) => {
                reader.onload = (e) => res(e.target.result);
                reader.readAsDataURL(file);
            });
            base64ImagesArray.push(b64);
        }
    } else {
        base64ImagesArray.push("https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400");
    }

    try {
        const res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, price, description, category, imageUrls: base64ImagesArray, sellerEmail: currentUser.email })
        });
        if(res.ok) {
            showNotification("Product listing uploaded for admin review pipeline processing.");
            document.getElementById('product-upload-form').reset();
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

function previewMedia(input, labelId) {
    const lbl = document.getElementById(labelId);
    if(lbl && input.files.length > 0) {
        lbl.textContent = `${input.files.length} Item(s) Selected Sequence ready.`;
        lbl.className = "text-xs text-emerald-400 block font-bold";
    }
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
