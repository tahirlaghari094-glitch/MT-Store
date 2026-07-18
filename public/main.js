// ==========================================
// 🚀 MT-STORE CORE GLOBAL FRONTEND ARCHITECTURE
// ==========================================

// Application Reactive Global Application Memory Cache
const STATE = {
    user: null,
    cart: [],
    products: [],
    uploadedImagesBase64: [], // 🖼️ Multiple images storage array
    activeTab: 'home'
};

// ==========================================
// 🔐 SESSION SECURITY & USER SYNC PERSISTENCE
// ==========================================
function initSessionState() {
    const cachedUser = localStorage.getItem('mt_store_user');
    const cachedCart = localStorage.getItem('mt_store_cart');

    if (cachedUser) {
        try {
            STATE.user = JSON.parse(cachedUser);
            setupUserInterfaceForLoggedSession();
        } catch (e) {
            clearSessionCache();
        }
    }

    if (cachedCart) {
        try { STATE.cart = JSON.parse(cachedCart); } catch (e) { STATE.cart = []; }
    }

    // Bind Core System Actions
    bindEventInterceptors();
    fetchActiveApprovedProducts();
    switchClientInterfaceTab(STATE.activeTab);
    updateDynamicVisualCartCounter();
}

function clearSessionCache() {
    localStorage.removeItem('mt_store_user');
    STATE.user = null;
    window.location.reload();
}

function setupUserInterfaceForLoggedSession() {
    const authTrigger = document.getElementById('auth-action-trigger');
    const profileBadge = document.getElementById('user-profile-widget');
    const profileEmailText = document.getElementById('profile-display-email');
    const usernameField = document.getElementById('account-username-field');

    if (authTrigger) authTrigger.classList.add('hidden-element-state');
    if (profileBadge) profileBadge.classList.remove('hidden-element-state');
    if (profileEmailText) profileEmailText.textContent = STATE.user.email;
    if (usernameField) usernameField.value = STATE.user.username || '';

    // Synchronize account unique orders dashboard pipeline
    renderAccountOrdersPipelineDashboard();
    renderVendorEnrolledWorkspaceDashboard();
}

// ==========================================
// 🛠️ EVENT CONTROLLER INTERCEPTORS INTERACTION
// ==========================================
function bindEventInterceptors() {
    // Authentication Access Flow Interception
    const loginForm = document.getElementById('app-login-action-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('auth-submit-email-field').value.trim();
            if (!emailInput) return alert('Please enter a valid email address.');

            try {
                const response = await fetch('/api/users/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: emailInput })
                });
                const dynamicPayload = await response.json();
                if (dynamicPayload.success) {
                    STATE.user = dynamicPayload.user;
                    localStorage.setItem('mt_store_user', JSON.stringify(STATE.user));
                    setupUserInterfaceForLoggedSession();
                    alert(`Welcome back, ${STATE.user.username}!`);
                    switchClientInterfaceTab('home');
                }
            } catch (err) {
                alert('Authentication service rejected processing payload request.');
            }
        });
    }

    // Multiple Images Process Framework Stream
    const fileMultiInput = document.getElementById('vendor-item-multiple-images');
    if (fileMultiInput) {
        fileMultiInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            const previewContainer = document.getElementById('images-upload-preview-row');
            if (previewContainer) previewContainer.innerHTML = '';
            STATE.uploadedImagesBase64 = [];

            files.forEach(file => {
                const streamReader = new FileReader();
                streamReader.onloadend = () => {
                    STATE.uploadedImagesBase64.push(streamReader.result);
                    
                    // Render image block directly inside layout gallery array container
                    if (previewContainer) {
                        const imgNode = document.createElement('img');
                        imgNode.src = streamReader.result;
                        imgNode.className = "w-20 h-20 object-cover rounded-lg border border-slate-700 shadow-sm";
                        previewContainer.appendChild(imgNode);
                    }
                };
                streamReader.readAsDataURL(file);
            });
        });
    }

    // New Store Product Submission Workflow Pipeline
    const productListingForm = document.getElementById('vendor-publish-listing-form');
    if (productListingForm) {
        productListingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!STATE.user) return alert('Session authorization required to execute action. Please log in.');
            if (STATE.uploadedImagesBase64.length === 0) return alert('Please upload at least one image asset for production display.');

            const payloadFields = {
                title: document.getElementById('listing-title').value,
                price: parseFloat(document.getElementById('listing-price').value),
                description: document.getElementById('listing-desc').value,
                category: document.getElementById('listing-category').value,
                imageBase64Array: STATE.uploadedImagesBase64, // 🖼️ Array parameter injected safely
                paymentDetails: document.getElementById('listing-payment-info').value,
                transactionId: document.getElementById('listing-txid').value,
                address: document.getElementById('listing-address').value,
                contactNumber: document.getElementById('listing-phone').value,
                sellerEmail: STATE.user.email
            };

            try {
                const submissionResponse = await fetch('/api/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloadFields)
                });
                const trackingStatus = await submissionResponse.json();
                if (submissionResponse.ok) {
                    alert('Submission received successfully! Listing pending administrator operational approval.');
                    productListingForm.reset();
                    if (document.getElementById('images-upload-preview-row')) {
                        document.getElementById('images-upload-preview-row').innerHTML = '';
                    }
                    renderVendorEnrolledWorkspaceDashboard();
                    switchClientInterfaceTab('seller-workspace');
                } else {
                    alert(`Submission failed: ${trackingStatus.error}`);
                }
            } catch (err) {
                alert('Connection tracking submission server error.');
            }
        });
    }
}

// ==========================================
// 🛒 DYNAMIC PRODUCTS & VIEW DETAILS INJECTION
// ==========================================
async function fetchActiveApprovedProducts() {
    try {
        const payload = await fetch('/api/products');
        STATE.products = await payload.json();
        renderProductsCatalogDisplayGrid();
    } catch (e) {
        console.error("Catalog retrieval stream offline.", e);
    }
}

function renderProductsCatalogDisplayGrid() {
    const structuralContainer = document.getElementById('catalog-products-dynamic-view');
    if (!structuralContainer) return;

    if (STATE.products.length === 0) {
        structuralContainer.innerHTML = `<div class="col-span-full py-12 text-center text-slate-400">No products live inside store catalog at this time.</div>`;
        return;
    }

    structuralContainer.innerHTML = STATE.products.map(prod => `
        <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-transform hover:scale-[1.02] flex flex-col justify-between">
            <img src="${prod.imageUrls && prod.imageUrls[0] ? prod.imageUrls[0] : (prod.imageUrl || '')}" class="w-full h-48 object-cover bg-slate-950" alt="${prod.title}"/>
            <div class="p-5 flex-1 flex flex-col justify-between">
                <div>
                    <span class="text-xs font-semibold text-amber-500 uppercase tracking-wider">${prod.category}</span>
                    <h3 class="text-lg font-bold text-white mt-1 line-clamp-1">${prod.title}</h3>
                    <p class="text-sm text-slate-400 mt-2 line-clamp-2">${prod.description || 'No descriptive context provided.'}</p>
                </div>
                <div class="mt-4">
                    <div class="text-xl font-black text-emerald-400">PKR ${prod.price}</div>
                    <button onclick="injectProductDeepDetailsSheetModal('${prod.id}')" class="w-full mt-3 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 rounded-xl transition-colors">
                        View Complete Details
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Labeled Multi-Image Media Carousel Modal View Matrix
window.injectProductDeepDetailsSheetModal = function(productId) {
    const targetItem = STATE.products.find(p => p.id === productId.toString());
    if (!targetItem) return;

    const overlayModalNode = document.createElement('div');
    overlayModalNode.id = "global-dynamic-details-modal";
    overlayModalNode.className = "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto";
    
    // Compile asset collections safely
    const collectionImages = targetItem.imageUrls && targetItem.imageUrls.length > 0 ? targetItem.imageUrls : [targetItem.imageUrl];
    
    const carouselThumbnailsHtml = collectionImages.map((src, index) => `
        <img src="${src}" onclick="document.getElementById('primary-modal-hero-viewer').src='${src}'" 
             class="w-16 h-16 object-cover rounded-lg border border-slate-700 cursor-pointer hover:border-amber-500 transition-all bg-slate-900" alt="Thumb-${index}" />
    `).join('');

    overlayModalNode.innerHTML = `
        <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in text-slate-100">
            <div class="sticky top-0 bg-slate-900 p-4 border-b border-slate-800 flex justify-between items-center">
                <h2 class="text-xl font-extrabold text-white truncate">${targetItem.title}</h2>
                <button onclick="document.getElementById('global-dynamic-details-modal').remove()" class="text-slate-400 hover:text-white text-2xl font-bold p-1">&times;</button>
            </div>
            <div class="p-6 space-y-6">
                <!-- 🖼️ Multi-Image Display System Context Framework Block -->
                <div class="space-y-3">
                    <img id="primary-modal-hero-viewer" src="${collectionImages[0]}" class="w-full h-80 object-contain bg-slate-950 rounded-xl border border-slate-800 shadow-inner" />
                    <div class="flex items-center gap-2 overflow-x-auto pb-2">${carouselThumbnailsHtml}</div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-4">
                        <div>
                            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400">Description</h4>
                            <p class="text-sm text-slate-300 mt-1 whitespace-pre-line">${targetItem.description || 'No description asset details mapped.'}</p>
                        </div>
                        <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                            <h4 class="text-sm font-bold text-amber-500">💼 Seller Contact Information</h4>
                            <div class="text-xs space-y-1 text-slate-400">
                                <div><strong class="text-slate-200">Email Reference:</strong> ${targetItem.sellerEmail}</div>
                                <div><strong class="text-slate-200">Mobile Hotlink:</strong> ${targetItem.contactNumber || 'N/A'}</div>
                                <div><strong class="text-slate-200">Operational Hub:</strong> ${targetItem.address || 'N/A'}</div>
                            </div>
                        </div>
                    </div>

                    <div class="bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
                        <div>
                            <div class="text-xs font-bold uppercase tracking-wider text-slate-400">Purchase Assessment Value</div>
                            <div class="text-3xl font-black text-emerald-400 mt-1">PKR ${targetItem.price}</div>
                            <div class="mt-4 p-3 bg-slate-900 rounded-lg text-xs text-slate-400 border border-slate-800">
                                🔒 Secured processing via platform escrow guarantees.
                            </div>
                        </div>
                        <button onclick="addItemToOperationalCart('${targetItem.id}'); document.getElementById('global-dynamic-details-modal').remove();" 
                                class="w-full mt-6 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3 rounded-xl shadow-lg transition-colors">
                            Add Item To Shopping Cart
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlayModalNode);
};

// ==========================================
// 📦 TRANSACTION ORDER MANAGEMENT TRACKING SYSTEM
// ==========================================
async function renderAccountOrdersPipelineDashboard() {
    const structuralContainer = document.getElementById('account-orders-tracking-pipeline');
    if (!structuralContainer || !STATE.user) return;

    try {
        const networkResponse = await fetch(`/api/orders/user/${STATE.user.email}`);
        const userOrders = await networkResponse.json();

        if (userOrders.length === 0) {
            structuralContainer.innerHTML = `<div class="text-center py-6 text-slate-500 text-sm">You have not initiated placement orders yet.</div>`;
            return;
        }

        structuralContainer.innerHTML = userOrders.map(ord => {
            // Processing status display with cancellation interface button control
            const displayCancellationAction = ord.status === 'Processing' 
                ? `<button onclick="triggerOrderCancellationTransactionPipeline('${ord.id}')" 
                           class="px-4 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 text-xs font-semibold rounded-lg transition-all shadow-sm">
                       Cancel Order
                   </button>` 
                : '';

            const statusDesignColor = ord.status === 'Cancelled' ? 'text-rose-500 bg-rose-500/10 border-rose-500/20' : 
                                      ord.status === 'Processing' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20 animate-pulse' : 
                                      'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';

            return `
                <div class="bg-slate-950 border border-slate-800 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div class="flex items-center gap-3">
                        <img src="${ord.productImage || ''}" class="w-12 h-12 object-cover rounded-lg bg-slate-900 border border-slate-800 flex-shrink-0" onerror="this.src='https://placehold.co/100'" />
                        <div>
                            <div class="text-xs font-mono text-slate-500">${ord.id}</div>
                            <div class="text-sm font-bold text-white line-clamp-1">${ord.title}</div>
                            <div class="text-xs text-slate-400 mt-0.5">Quantity: ${ord.quantity} &bull; Total: <span class="text-emerald-400 font-medium">PKR ${ord.price * ord.quantity}</span></div>
                        </div>
                    </div>
                    <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <span class="px-2.5 py-1 text-xs font-bold rounded-md border ${statusDesignColor}">
                            ${ord.status}
                        </span>
                        ${displayCancellationAction}
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        structuralContainer.innerHTML = `<div class="text-center py-4 text-rose-400 text-xs">Failed to connect order query synchronization engine.</div>`;
    }
}

window.triggerOrderCancellationTransactionPipeline = async function(orderId) {
    if (!confirm(`Are you certain you wish to cancel Order reference protection sequence: ${orderId}?`)) return;

    try {
        const triggerExecutionResponse = await fetch(`/api/orders/cancel/${orderId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const statePayload = await triggerExecutionResponse.json();

        if (triggerExecutionResponse.ok && statePayload.success) {
            alert('Order cancelled successfully. Cancellation alert notifications transmitted.');
            renderAccountOrdersPipelineDashboard();
        } else {
            alert(`Cancellation error response state: ${statePayload.error}`);
        }
    } catch (err) {
        alert('Network handling infrastructure failure processing cancellation transmission pipeline.');
    }
};

// ==========================================
// 💼 VENDOR MANAGEMENT ENROLLMENT FLOW WORKSPACE
// ==========================================
async function renderVendorEnrolledWorkspaceDashboard() {
    const structuralContainer = document.getElementById('vendor-products-portfolio-grid');
    if (!structuralContainer || !STATE.user) return;

    try {
        const response = await fetch(`/api/products/seller/${STATE.user.email}`);
        const sellerProducts = await response.json();

        if (sellerProducts.length === 0) {
            structuralContainer.innerHTML = `
                <div class="col-span-full text-center py-8 text-slate-500 text-sm">
                    No active assets published under this specific email entity profile context yet.
                </div>`;
            return;
        }

        structuralContainer.innerHTML = sellerProducts.map(prod => `
            <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                    <img src="${prod.imageUrls && prod.imageUrls[0] ? prod.imageUrls[0] : (prod.imageUrl || '')}" class="w-12 h-12 object-cover rounded-md bg-slate-900 border border-slate-800" />
                    <div>
                        <h4 class="text-sm font-bold text-white line-clamp-1">${prod.title}</h4>
                        <div class="text-xs text-slate-400">PKR ${prod.price}</div>
                    </div>
                </div>
                <span class="px-2 py-0.5 text-xs font-semibold rounded ${prod.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}">
                    ${prod.status}
                </span>
            </div>
        `).join('');
    } catch (e) {
        console.error("Seller dashboard fetch error.", e);
    }
}

// ==========================================
// 🛒 CORE CART LOGIC ENGINE
// ==========================================
window.addItemToOperationalCart = function(productId) {
    const matchingProduct = STATE.products.find(p => p.id === productId.toString());
    if (!matchingProduct) return;

    const existingCartEntry = STATE.cart.find(item => item.id === productId.toString());
    if (existingCartEntry) {
        existingCartEntry.quantity += 1;
    } else {
        STATE.cart.push({
            id: matchingProduct.id,
            title: matchingProduct.title,
            price: matchingProduct.price,
            quantity: 1
        });
    }

    localStorage.setItem('mt_store_cart', JSON.stringify(STATE.cart));
    updateDynamicVisualCartCounter();
    alert(`"${matchingProduct.title}" added to your shopping cart.`);
};

function updateDynamicVisualCartCounter() {
    const totalsBadge = document.getElementById('cart-badge-counter-value');
    if (!totalsBadge) return;
    const totalCount = STATE.cart.reduce((sum, item) => sum + item.quantity, 0);
    totalsBadge.textContent = totalCount;
}

// ==========================================
// 📑 CLIENT ENGINE UI TABS NAVIGATION MATRIX
// ==========================================
window.switchClientInterfaceTab = function(targetTabId) {
    STATE.activeTab = targetTabId;
    
    // Toggle active tab sections across layout layers views
    document.querySelectorAll('.app-navigation-panel-layer').forEach(layer => {
        layer.classList.add('hidden-element-state');
    });

    const activeTargetLayoutLayer = document.getElementById(`view-pane-layer-${targetTabId}`);
    if (activeTargetLayoutLayer) {
        activeTargetLayoutLayer.classList.remove('hidden-element-state');
    }

    // Refresh metrics context frames dynamically when target screens focus
    if (targetTabId === 'profile') {
        renderAccountOrdersPipelineDashboard();
    } else if (targetTabId === 'seller-workspace') {
        renderVendorEnrolledWorkspaceDashboard();
    }
};

// Initialize Application Lifecycle Flow Hooks
document.addEventListener('DOMContentLoaded', initSessionState);
