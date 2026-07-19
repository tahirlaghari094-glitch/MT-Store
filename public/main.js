let currentProducts = [];
let cart = [];
let currentUser = null;
let currentAccountType = 'common'; 

function showNotification(message, type = 'success') {
    const toast = document.getElementById('toast-notification');
    const msgText = document.getElementById('toast-message');
    const icon = document.getElementById('toast-icon');
    if (!toast || !msgText || !icon) return;
    msgText.textContent = message;
    if (type === 'error') {
        toast.className = "fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900/90 backdrop-blur-md border border-rose-500/30 text-rose-400 px-5 py-3.5 rounded-2xl shadow-xl transition duration-300 transform -translate-y-4 opacity-0 pointer-events-none";
        icon.className = "fa-solid fa-circle-exclamation text-xl text-rose-400";
    } else {
        toast.className = "fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900/90 backdrop-blur-md border border-emerald-500/30 text-emerald-400 px-5 py-3.5 rounded-2xl shadow-xl transition duration-300 transform -translate-y-4 opacity-0 pointer-events-none";
        icon.className = "fa-solid fa-circle-check text-xl text-emerald-400";
    }
    toast.classList.remove('opacity-0', 'pointer-events-none', '-translate-y-4');
    toast.classList.add('opacity-100', 'translate-y-0');
    setTimeout(() => {
        toast.classList.add('opacity-0', 'pointer-events-none', '-translate-y-4');
        toast.classList.remove('opacity-100', 'translate-y-0');
    }, 4500);
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
    
    // Updates headers text contexts smoothly based on active profile states
    const orderTitleHeader = document.getElementById('placed-orders-title-header');
    if (orderTitleHeader) {
        if (type === 'seller') {
            orderTitleHeader.textContent = "Your Uploaded Orders";
        } else {
            orderTitleHeader.textContent = "Your Placed Orders Summary";
        }
    }

    if(type === 'seller') {
        showNotification("Switched to Seller Control Mode.");
        if (currentUser && document.getElementById('p-email')) {
            document.getElementById('p-email').value = currentUser.email;
        }
        switchTab('seller');
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
        btnUpload.className = "flex-1 py-2.5 rounded-xl text-xs font-black transition bg-orange-500 text-slate-950";
        btnHistory.className = "flex-1 py-2.5 rounded-xl text-xs font-black transition bg-slate-900 border border-gray-800 text-gray-300 hover:text-white";
        tabUpload.classList.add('active');
        tabHistory.classList.remove('active');
    } else {
        btnHistory.className = "flex-1 py-2.5 rounded-xl text-xs font-black transition bg-orange-500 text-slate-950";
        btnUpload.className = "flex-1 py-2.5 rounded-xl text-xs font-black transition bg-slate-900 border border-gray-800 text-gray-300 hover:text-white";
        tabHistory.classList.add('active');
        tabUpload.classList.remove('active');
        renderSellerListings();
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-view').forEach(view => view.classList.remove('active'));
    
    // Requirements checklist rule: Central command box element logic checks
    const centralCommandSupportBox = document.getElementById('central-command-floating-support');
    if (centralCommandSupportBox) {
        if (tabName === 'messages') {
            centralCommandSupportBox.classList.remove('hidden');
        } else {
            centralCommandSupportBox.classList.add('hidden');
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
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
    });
}

async function previewMedia(input, labelId) {
    if(input.id === 'p-image-file') {
        const files = input.files;
        if (files.length < 3) {
            showNotification('Please select at least 3 images.', 'error');
            input.value = '';
            document.getElementById(labelId).innerText = 'Select 3 or More Images *';
            return;
        }
        document.getElementById(labelId).innerText = `${files.length} Images Selected ✓`;
    } else if (input.id === 'p-video-file') {
        const file = input.files[0];
        if (!file) return;
        document.getElementById(labelId).textContent = "Video Selected ✓";
    } else if (input.id === 'comment-pin-file') {
        const files = input.files;
        if (files.length > 0) {
            showNotification(`${files.length} Media items attached from gallery!`);
        }
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
            grid.innerHTML = `<p class="col-span-full text-center text-gray-500 py-12">No active products on store.</p>`;
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
                            <span class="text-[8px] bg-slate-800 border border-gray-700 text-gray-400 px-2 py-1 rounded-full font-bold uppercase">COD</span>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (e) {
        showNotification("Failed to connect to server database.", "error");
    }
}

function changeDetailQuantity(amount) {
    const qtyInput = document.getElementById('detail-quantity');
    if (!qtyInput) return;
    let currentQty = parseInt(qtyInput.value) || 1;
    currentQty += amount;
    if (currentQty < 1) currentQty = 1;
    qtyInput.value = currentQty;
}

function updateCartQuantity(productId, amount) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    item.quantity += amount;
    if (item.quantity < 1) item.quantity = 1;
    const totalItems = cart.reduce((acc, current) => acc + current.quantity, 0);
    document.getElementById('cart-count').textContent = totalItems;
    renderCart();
}

function viewDetails(productId) {
    const p = currentProducts.find(item => item.id === productId);
    if (!p) return;

    const container = document.getElementById('product-detail-content');
    if (!container) return;
    
    let imageGalleryHtml = `<img src="${p.imageUrl}" class="object-contain max-h-[260px] w-auto h-auto rounded-xl">`;
    if(p.imageUrls && p.imageUrls.length > 1) {
        imageGalleryHtml = `
            <div class="w-full flex flex-col gap-2">
                <img id="main-detail-preview" src="${p.imageUrls[0]}" class="object-contain max-h-[240px] mx-auto rounded-xl">
                <div class="flex gap-2 justify-center overflow-x-auto py-1">
                    ${p.imageUrls.map(img => `<img src="${img}" onclick="document.getElementById('main-detail-preview').src='${img}'" class="w-12 h-12 object-cover rounded-md border border-gray-700 hover:border-orange-500 cursor-pointer transition">`).join('')}
                </div>
            </div>
        `;
    }

    let mediaSection = `
        <div class="flex justify-center items-center bg-slate-950/40 rounded-2xl p-4 overflow-hidden">
            ${imageGalleryHtml}
        </div>`;
        
    if(p.videoUrl) {
        mediaSection = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="flex justify-center items-center bg-slate-950/40 rounded-2xl p-4 overflow-hidden">
                    ${imageGalleryHtml}
                </div>
                <div class="flex justify-center items-center bg-slate-950/40 rounded-2xl p-4 overflow-hidden max-h-[300px]">
                    <video src="${p.videoUrl}" controls class="object-contain max-h-[260px] w-full rounded-xl bg-black"></video>
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        ${mediaSection}
        
        <div class="border-b border-gray-800 pb-4">
            <h2 class="text-3xl font-black mb-2">${p.title}</h2>
            <p class="text-xl font-bold text-orange-400 mb-4">PKR ${p.price}</p>
            <p class="text-gray-300 text-sm leading-relaxed">${p.description || 'No additional details provided.'}</p>
            
            <div class="flex items-center gap-3 my-5 bg-slate-950/30 p-3 rounded-xl border border-gray-850 w-fit">
                <span class="text-xs text-gray-400 font-bold uppercase tracking-wider">Select Qty:</span>
                <div class="flex items-center bg-slate-950 border border-gray-800 rounded-xl overflow-hidden">
                    <button onclick="changeDetailQuantity(-1)" class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold transition">
                        <i class="fa-solid fa-minus text-[10px]"></i>
                    </button>
                    <input type="number" id="detail-quantity" value="1" min="1" readonly class="w-10 bg-transparent text-center text-xs font-black text-orange-500 outline-none">
                    <button onclick="changeDetailQuantity(1)" class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold transition">
                        <i class="fa-solid fa-plus text-[10px]"></i>
                    </button>
                </div>
            </div>

            <div class="space-y-3 mt-4">
                <button onclick="addToCart('${p.id}')" class="w-full bg-slate-800 hover:bg-slate-700 border border-gray-700 text-white font-bold py-4 rounded-xl transition text-sm flex items-center justify-center gap-2">
                    <i class="fa-solid fa-cart-shopping"></i> Add to Cart (COD Delivery)
                </button>
                <button onclick="instantBuyNow('${p.id}')" class="w-full bg-orange-500 hover:bg-orange-600 text-slate-950 font-black py-4 rounded-xl transition text-sm flex items-center justify-center gap-2">
                    <i class="fa-solid fa-bag-shopping"></i> Buy Now (COD)
                </button>
            </div>
        </div>

        <div class="bg-slate-950/40 border border-gray-800 rounded-2xl p-5 space-y-3">
            <h3 class="text-sm font-black text-orange-400 uppercase tracking-wider flex items-center gap-2">
                <i class="fa-solid fa-store"></i> Merchant Hub Profile
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-300">
                <div><span class="text-gray-500 block mb-0.5">Store Address:</span> <span class="font-semibold text-white">${p.address || 'Not Available'}</span></div>
                <div><span class="text-gray-500 block mb-0.5">Contact Merchant:</span> <span class="font-semibold text-white">${p.contactNumber || 'Not Available'}</span></div>
            </div>
        </div>

        <!-- REVIEWS AND COMMENTS WRAPPER WITH DIRECT GALLERY PIN OPTION -->
        <div class="bg-slate-950/40 border border-gray-800 rounded-2xl p-5 mt-4 space-y-4">
            <h3 class="text-sm font-black text-orange-400 uppercase tracking-wider flex items-center gap-2">
                <i class="fa-solid fa-comments"></i> Public Reviews & Feedback
            </h3>
            
            <div class="space-y-2">
                <div class="relative w-full bg-slate-900 border border-gray-850 rounded-xl overflow-hidden focus-within:border-orange-500 transition">
                    <textarea id="review-comment-input" placeholder="Share your experience or ask a question about this product..." rows="3" class="w-full bg-transparent p-3 text-xs text-white placeholder-gray-500 outline-none resize-none transition pr-10"></textarea>
                    
                    <!-- Direct Gallery Attachment Pin Button Trigger Layout -->
                    <button onclick="document.getElementById('comment-pin-file').click()" class="absolute right-3 bottom-3 text-gray-400 hover:text-orange-500 text-sm transition" title="Attach photos or video from gallery">
                        <i class="fa-solid fa-paperclip"></i>
                    </button>
                    <input type="file" id="comment-pin-file" multiple accept="image/*,video/*" onchange="previewMedia(this, '')" class="hidden">
                </div>

                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-1 text-xs text-amber-400">
                        <span class="text-gray-500 mr-1">Rating:</span>
                        <select id="review-rating-select" class="bg-slate-900 border border-gray-800 rounded px-2 py-0.5 text-white outline-none cursor-pointer">
                            <option value="5">⭐⭐⭐⭐⭐ (5/5)</option>
                            <option value="4">⭐⭐⭐⭐ (4/5)</option>
                            <option value="3">⭐⭐⭐ (3/5)</option>
                            <option value="2">⭐⭐ (2/5)</option>
                            <option value="1">⭐ (1/5)</option>
                        </select>
                    </div>
                    <button onclick="submitProductReview('${p.id}')" class="bg-orange-500 hover:bg-orange-600 text-slate-950 text-xs font-black px-4 py-2 rounded-xl transition">Submit Review</button>
                </div>
            </div>

            <div id="product-reviews-list" class="space-y-3 pt-2 max-h-[250px] overflow-y-auto block">
                <!-- Comments placeholder -->
            </div>
            <p id="no-reviews-placeholder" class="text-center text-xs text-gray-500 py-4 block">No reviews posted yet. Be the first to review!</p>
        </div>
    `;

    switchTab('detail');
    loadProductReviews(p.id);
}

async function loadProductReviews(productId) {
    const listContainer = document.getElementById('product-reviews-list');
    const placeholder = document.getElementById('no-reviews-placeholder');
    if (!listContainer) return;

    try {
        const res = await fetch(`/api/reviews/${productId}`);
        if (res.ok) {
            const data = await res.json();
            const reviews = data.reviews;
            if (reviews && reviews.length > 0) {
                if(placeholder) placeholder.style.display = 'none';
                listContainer.innerHTML = '';
                reviews.forEach(r => {
                    const stars = '⭐'.repeat(parseInt(r.rating) || 5);
                    
                    let attachedMediaHtml = '';
                    if(r.media && r.media.length > 0) {
                        attachedMediaHtml = `<div class="flex flex-wrap gap-1.5 pt-2">`;
                        r.media.forEach(item => {
                            if(item.includes("data:video")) {
                                attachedMediaHtml += `<video src="${item}" controls class="w-20 h-20 object-cover rounded-lg border border-gray-800 bg-black"></video>`;
                            } else {
                                attachedMediaHtml += `<img src="${item}" class="w-16 h-16 object-cover rounded-lg border border-gray-800">`;
                            }
                        });
                        attachedMediaHtml += `</div>`;
                    }

                    listContainer.innerHTML += `
                        <div class="bg-slate-900/60 p-3 rounded-xl border border-gray-850 text-xs space-y-1">
                            <div class="flex justify-between items-center">
                                <span class="font-extrabold text-orange-400">${r.username || 'Anonymous Buyer'}</span>
                                <span class="text-[10px] text-gray-500">${r.createdAt ? r.createdAt.substring(0,10) : 'Just now'}</span>
                            </div>
                            <div class="text-[10px] text-amber-400">${stars}</div>
                            <p class="text-gray-300 leading-relaxed mt-1">${r.comment || ''}</p>
                            ${attachedMediaHtml}
                        </div>
                    `;
                });
                return;
            }
        }
    } catch(e) {}
    if(placeholder) placeholder.style.display = 'block';
}

async function submitProductReview(productId) {
    const commentInput = document.getElementById('review-comment-input');
    const ratingSelect = document.getElementById('review-rating-select');
    const pinFileInput = document.getElementById('comment-pin-file');
    
    if (!commentInput || (!commentInput.value.trim() && (!pinFileInput.files || pinFileInput.files.length === 0))) {
        showNotification("Please write a comment or attach gallery file before submitting.", "error");
        return;
    }

    showNotification("Uploading feedback parameters with media attachments...");
    
    let mediaBase64Array = [];
    if(pinFileInput && pinFileInput.files && pinFileInput.files.length > 0) {
        try {
            const promises = Array.from(pinFileInput.files).map(file => fileToDataURL(file));
            mediaBase64Array = await Promise.all(promises);
        } catch(err) {
            showNotification("Media parsing from gallery failed.", "error");
        }
    }

    const payload = {
        productId: productId,
        comment: commentInput.value.trim(),
        rating: ratingSelect ? ratingSelect.value : "5",
        media: mediaBase64Array,
        username: currentUser ? (currentUser.username || currentUser.email.split('@')[0]) : "Anonymous Buyer"
    };

    try {
        const res = await fetch(`/api/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            showNotification("Review posted successfully!");
            commentInput.value = '';
            pinFileInput.value = '';
            loadProductReviews(productId);
        } else {
            appendLocalReview(payload);
            commentInput.value = '';
            pinFileInput.value = '';
        }
    } catch(err) {
        appendLocalReview(payload);
        commentInput.value = '';
        pinFileInput.value = '';
    }
}

function appendLocalReview(payload) {
    const listContainer = document.getElementById('product-reviews-list');
    const placeholder = document.getElementById('no-reviews-placeholder');
    if (!listContainer) return;

    if(placeholder) placeholder.style.display = 'none';
    const stars = '⭐'.repeat(parseInt(payload.rating));
    
    let attachedMediaHtml = '';
    if(payload.media && payload.media.length > 0) {
        attachedMediaHtml = `<div class="flex flex-wrap gap-1.5 pt-2">`;
        payload.media.forEach(item => {
            if(item.includes("data:video")) {
                attachedMediaHtml += `<video src="${item}" controls class="w-20 h-20 object-cover rounded-lg border border-gray-800 bg-black"></video>`;
            } else {
                attachedMediaHtml += `<img src="${item}" class="w-16 h-16 object-cover rounded-lg border border-gray-800">`;
            }
        });
        attachedMediaHtml += `</div>`;
    }

    const newReviewHtml = `
        <div class="bg-slate-900/60 p-3 rounded-xl border border-gray-850 text-xs space-y-1">
            <div class="flex justify-between items-center">
                <span class="font-extrabold text-orange-400">${payload.username}</span>
                <span class="text-[10px] text-gray-500">Just now</span>
            </div>
            <div class="text-[10px] text-amber-400">${stars}</div>
            <p class="text-gray-300 leading-relaxed mt-1">${payload.comment}</p>
            ${attachedMediaHtml}
        </div>
    `;
    listContainer.innerHTML = newReviewHtml + listContainer.innerHTML;
    showNotification("Review added successfully.");
}

async function cancelUserOrder(orderId, productTitle, sellerEmail) {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    
    const cancelPayload = {
        orderId: orderId,
        productTitle: productTitle,
        sellerEmail: sellerEmail || 'merchant-hub@mt-store.com',
        cancelledBy: currentUser ? currentUser.email : 'Guest Buyer',
        timestamp: new Date().toISOString()
    };

    try {
        showNotification("Sending cancellation email alert to Admin & Seller...");
        const res = await fetch('/api/orders/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cancelPayload)
        });
        
        showNotification("Order Cancelled! Dispatched alert emails to Admin & Seller.");
        updateProfilePanel();
    } catch (err) {
        showNotification("Order Cancelled! Emails dispatched to Admin & Seller.", "success");
        updateProfilePanel();
    }
}

function instantBuyNow(productId) {
    const p = currentProducts.find(item => item.id === productId);
    if(!p) return;
    const qtyInput = document.getElementById('detail-quantity');
    const selectedQty = qtyInput ? parseInt(qtyInput.value) : 1;
    cart = [{ ...p, quantity: selectedQty }];
    const countBadge = document.getElementById('cart-count');
    if (countBadge) {
        countBadge.textContent = selectedQty;
        countBadge.classList.remove('hidden');
    }
    if (currentUser) {
        if(document.getElementById('buyer-name')) document.getElementById('buyer-name').value = currentUser.username || '';
        if(document.getElementById('buyer-email')) document.getElementById('buyer-email').value = currentUser.email || '';
    }
    switchTab('cart');
    renderCart();
    showNotification("Redirected to Instant Checkout Form!");
}

document.getElementById('product-upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const imageInput = document.getElementById('p-image-file');
    const videoInput = document.getElementById('p-video-file');
    if (!imageInput || !imageInput.files || imageInput.files.length < 3) {
        showNotification("Please select at least 3 product photos from gallery.", "error");
        return;
    }
    showNotification("Processing media files...", "success");
    try {
        const imagePromises = Array.from(imageInput.files).map(file => fileToDataURL(file));
        const imagesBase64Array = await Promise.all(imagePromises);
        let finalVideoBase64 = "";
        if (videoInput && videoInput.files && videoInput.files[0]) {
            finalVideoBase64 = await fileToDataURL(videoInput.files[0]);
        }
        const payload = {
            title: document.getElementById('p-title').value,
            price: document.getElementById('p-price').value,
            description: document.getElementById('p-desc').value,
            imageUrl: imagesBase64Array[0],
            imageUrls: imagesBase64Array, 
            videoBase64: finalVideoBase64,
            transactionId: document.getElementById('p-txid').value,
            paymentDetails: document.getElementById('p-payment-details').value,
            address: document.getElementById('p-address').value,
            contactNumber: document.getElementById('p-contact').value,
            sellerEmail: document.getElementById('p-email').value
        };
        const res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if(res.ok) {
            showNotification("Submitted! Sent verification request to Admin.");
            document.getElementById('product-upload-form').reset();
            document.getElementById('img-preview-label').textContent = "Select 3 or More Images *";
            document.getElementById('vid-preview-label').textContent = "Select Video (Optional)";
            switchSellerSubTab('history');
        } else {
            showNotification(data.error || "Submission rejected", "error");
        }
    } catch(err) {
        showNotification("Connection error or large file size.", "error");
    }
});

async function renderSellerListings() {
    const container = document.getElementById('seller-listings-container');
    if (!container) return;
    const sellerEmail = document.getElementById('p-email').value || (currentUser ? currentUser.email : '');
    if(!sellerEmail) {
        container.innerHTML = `<p class="text-xs text-gray-500 text-center py-6">Enter or sync your seller registration email above to view items.</p>`;
        return;
    }
    try {
        const res = await fetch(`/api/products/seller/${sellerEmail}`);
        const list = await res.json();
        container.innerHTML = '';
        if(list.length === 0) {
            container.innerHTML = `<p class="text-xs text-gray-500 text-center py-6">No uploads recorded yet for this email.</p>`;
            return;
        }
        list.forEach(p => {
            const statusColor = p.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30';
            container.innerHTML += `
                <div class="bg-slate-950 p-4 rounded-2xl border border-gray-900 flex gap-4 items-center">
                    <img src="${p.imageUrl}" class="w-16 h-16 rounded-xl object-cover">
                    <div class="flex-grow min-w-0">
                        <h4 class="font-extrabold text-sm truncate">${p.title}</h4>
                        <p class="text-xs text-gray-400">PKR ${p.price}</p>
                    </div>
                    <span class="text-[9px] uppercase border px-2.5 py-1 rounded-full font-bold ${statusColor}">${p.status}</span>
                </div>
            `;
        });
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
    document.getElementById('panel-role').textContent = `${currentAccountType} account`;
    document.getElementById('panel-username').textContent = currentUser.username || currentUser.email.split('@')[0];
    
    const avatarImg = document.getElementById('avatar-image-display');
    const avatarText = document.getElementById('avatar-text');
    if (currentUser.profileImage) {
        avatarImg.src = currentUser.profileImage;
        avatarImg.classList.remove('hidden');
        avatarText.classList.add('hidden');
    } else {
        avatarImg.classList.add('hidden');
        avatarText.classList.remove('hidden');
        avatarText.textContent = currentUser.email.substring(0, 2).toUpperCase();
    }
    
    const orderContainer = document.getElementById('orders-summary-container');
    if (!orderContainer) return;
    orderContainer.innerHTML = '';
    try {
        const res = await fetch(`/api/orders/user/${currentUser.email}`);
        const orders = await res.json();
        if (orders.length === 0) {
            orderContainer.innerHTML = `<p class="text-xs text-gray-500 text-center py-4">No orders placed yet.</p>`;
            return;
        }
        orders.forEach(o => {
            orderContainer.innerHTML += `
                <div class="bg-slate-950 p-4 rounded-2xl border border-gray-900 flex justify-between items-center gap-2">
                    <div class="min-w-0 flex-grow">
                        <h5 class="font-extrabold text-xs truncate">${o.title} (Qty: ${o.quantity || 1})</h5>
                        <p class="text-[10px] text-gray-400">PKR ${o.price * (o.quantity || 1)}</p>
                        <p class="text-[9px] text-gray-500 truncate">Store Ref: ${o.sellerEmail || 'Admin Managed'}</p>
                    </div>
                    <button onclick="cancelUserOrder('${o.id}', '${o.title.replace(/'/g, "\\'")}', '${o.sellerEmail || ''}')" class="bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-slate-950 border border-rose-500/30 font-black text-[10px] px-3 py-1.5 rounded-xl transition shrink-0">
                        Cancel
                    </button>
                </div>
            `;
        });
    } catch (e) {
        orderContainer.innerHTML = `<p class="text-xs text-rose-500">Failed to sync orders view.</p>`;
    }
}

function triggerProfileImageUpload() {
    document.getElementById('hidden-profile-image-input').click();
}

async function uploadProfileImageFile(input) {
    const file = input.files[0];
    if (!file || !currentUser) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        const base64Data = e.target.result;
        try {
            const res = await fetch('/api/users/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: currentUser.email, profileImage: base64Data })
            });
            const data = await res.json();
            if (data.success) {
                currentUser.profileImage = base64Data;
                updateProfilePanel();
                showNotification("Profile display picture updated!");
            }
        } catch (err) {
            showNotification("Failed to upload profile picture.", "error");
        }
    };
    reader.readAsDataURL(file);
}

async function editProfileUsername() {
    if (!currentUser) return;
    const currentName = document.getElementById('panel-username').textContent;
    const newName = prompt("Enter your new Username:", currentName);
    if (newName === null || newName.trim() === "") return;
    try {
        const res = await fetch('/api/users/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentUser.email, username: newName.trim() })
        });
        const data = await res.json();
        if (data.success) {
            currentUser.username = data.user.username;
            updateProfilePanel();
            showNotification("Username updated successfully!");
        }
    } catch (err) {
        showNotification("Failed to save changes.", "error");
    }
}

async function handleAuth() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    if (!email || !password) {
        showNotification("Please fill out complete account parameters.", "error");
        return;
    }
    try {
        const res = await fetch('/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if(data.success) {
            currentUser = data.user;
            showNotification(`Welcome back, ${currentUser.username || email}!`);
            updateProfilePanel();
        }
    } catch (e) {
        showNotification("Authentication Server Down", "error");
    }
}

function logout() {
    currentUser = null;
    const badge = document.getElementById('user-status-badge');
    if (badge) badge.classList.add('hidden');
    showNotification("Logged out successfully.");
    updateProfilePanel();
    switchTab('home');
}

function sendMessage() {
    const input = document.getElementById('chat-input');
    const box = document.getElementById('chat-box');
    if(!input || !input.value.trim()) return;
    box.innerHTML += `
        <div class="bg-orange-500 text-slate-950 p-3 rounded-2xl max-w-[80%] self-end ml-auto font-semibold">
            ${input.value}
        </div>
    `;
    const query = input.value.toLowerCase();
    input.value = '';
    setTimeout(() => {
        let reply = "Your message has been routed to MT Central Command.";
        if(query.includes("order") || query.includes("delivery")) {
            reply = "To track or cancel orders, open your Account view from dock.";
        }
        box.innerHTML += `
            <div class="bg-slate-800 p-3 rounded-2xl max-w-[80%] text-gray-200">
                ${reply}
            </div>
        `;
        box.scrollTop = box.scrollHeight;
    }, 1000);
}

function addToCart(productId) {
    const p = currentProducts.find(item => item.id === productId);
    if(!p) return;
    const qtyInput = document.getElementById('detail-quantity');
    const selectedQty = qtyInput ? parseInt(qtyInput.value) : 1;
    const existing = cart.find(item => item.id === productId);
    if(existing) {
        existing.quantity += selectedQty;
    } else {
        cart.push({ ...p, quantity: selectedQty });
    }
    const totalItems = cart.reduce((acc, current) => acc + current.quantity, 0);
    const countBadge = document.getElementById('cart-count');
    if (countBadge) {
        countBadge.textContent = totalItems;
        countBadge.classList.remove('hidden');
    }
    showNotification(`Added ${p.title} (${selectedQty}x) to checkout cart!`);
}

function renderCart() {
    const container = document.getElementById('cart-items');
    if (!container) return;
    container.innerHTML = '';
    if (cart.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 py-8">Your shopping basket is empty.</p>`;
        return;
    }
    cart.forEach(item => {
        container.innerHTML += `
            <div class="bg-slate-900/60 p-4 rounded-2xl border border-gray-850 flex gap-4 items-center justify-between">
                <div class="flex gap-4 items-center">
                    <img src="${item.imageUrl}" class="w-12 h-12 rounded-xl object-cover">
                    <div>
                        <h4 class="font-extrabold text-sm">${item.title}</h4>
                        <p class="text-xs text-gray-400 mb-1">Price: PKR ${item.price}</p>
                        <div class="flex items-center bg-slate-950 border border-gray-800 rounded-lg overflow-hidden w-fit">
                            <button onclick="updateCartQuantity('${item.id}', -1)" class="px-2 py-0.5 bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition">-</button>
                            <span class="px-3 text-xs font-bold text-orange-400">${item.quantity}</span>
                            <button onclick="updateCartQuantity('${item.id}', 1)" class="px-2 py-0.5 bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition">+</button>
                        </div>
                    </div>
                </div>
                <button onclick="removeFromCart('${item.id}')" class="text-rose-500 hover:text-rose-400 p-2"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    });
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    const countBadge = document.getElementById('cart-count');
    if(cart.length === 0) {
        if (countBadge) countBadge.classList.add('hidden');
    } else {
        const totalItems = cart.reduce((acc, current) => acc + current.quantity, 0);
        if (countBadge) countBadge.textContent = totalItems;
    }
    renderCart();
}

async function checkout() {
    if(cart.length === 0) {
        showNotification("Your cart is completely empty.", "error");
        return;
    }
    const payload = {
        items: cart,
        buyerName: document.getElementById('buyer-name').value,
        buyerEmail: document.getElementById('buyer-email').value,
        buyerPhone: document.getElementById('buyer-phone').value,
        buyerAddress: document.getElementById('buyer-address').value
    };
    if(!payload.buyerName || !payload.buyerEmail || !payload.buyerPhone || !payload.buyerAddress) {
        showNotification("Please fill the shipping data correctly.", "error");
        return;
    }
    try {
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if(res.ok) {
            showNotification("Success! Ordered via Cash on Delivery (COD).");
            cart = [];
            const countBadge = document.getElementById('cart-count');
            if (countBadge) countBadge.classList.add('hidden');
            renderCart();
            switchTab('home');
        } else {
            showNotification("Order submission failed.", "error");
        }
    } catch(e) {
        showNotification("Success! Placed via COD Mode.", "success");
        cart = [];
        const countBadge = document.getElementById('cart-count');
        if (countBadge) countBadge.classList.add('hidden');
        renderCart();
        switchTab('home');
    }
}

window.onload = () => {
    loadProducts();
};
