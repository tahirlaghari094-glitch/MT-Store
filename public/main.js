// State Variables
let products = [];
let currentUser = JSON.parse(localStorage.getItem('mt_user')) || null;
let currentTargetSellerEmail = null;

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
    fetchProducts();
    updateUserUI();
});

// Switch Tab Navigation
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(`tab-${tabId}`);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-orange-500');
        btn.classList.add('text-gray-500');
    });
    const navBtn = document.getElementById(`nav-${tabId}`);
    if (navBtn) {
        navBtn.classList.remove('text-gray-500');
        navBtn.classList.add('text-orange-500');
    }

    if (tabId === 'messages' && currentUser) {
        loadChatMessages();
    }
}

// Show Toast Notification
function showNotification(msg, type = 'info') {
    const toast = document.getElementById('notification-toast');
    const msgEl = document.getElementById('toast-msg');
    if (!toast || !msgEl) return;

    msgEl.innerText = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3500);
}

// Fetch Approved Products
async function fetchProducts() {
    try {
        const res = await fetch('/api/products');
        if (res.ok) {
            products = await res.json();
            renderProducts(products);
        }
    } catch (e) {
        console.error("Error fetching products:", e);
    }
}

// Render Products Grid
function renderProducts(items) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    if (items.length === 0) {
        grid.innerHTML = `<div class="col-span-2 text-center text-xs text-gray-500 py-10">No items available.</div>`;
        return;
    }

    grid.innerHTML = items.map(p => `
        <div onclick="viewDetails('${p.id}')" class="bg-slate-900 border border-gray-800 rounded-2xl overflow-hidden cursor-pointer hover:border-orange-500/50 transition flex flex-col">
            <div class="h-36 bg-slate-950 overflow-hidden relative">
                <img src="${p.imageUrl || (p.images && p.images[0]) || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400'}" class="w-full h-full object-cover">
                ${p.videoUrl ? `<span class="absolute top-2 right-2 bg-slate-950/80 text-orange-500 text-[9px] px-2 py-0.5 rounded-full font-bold"><i class="fa-solid fa-video"></i> Video</span>` : ''}
            </div>
            <div class="p-3 flex-1 flex flex-col justify-between space-y-2">
                <div>
                    <h4 class="text-xs font-bold text-white line-clamp-1">${p.title}</h4>
                    <p class="text-[10px] text-gray-400 line-clamp-1 mt-0.5">${p.description || ''}</p>
                </div>
                <div class="flex items-center justify-between pt-2 border-t border-gray-800/60">
                    <span class="text-xs font-black text-orange-500">PKR ${p.price}</span>
                    <span class="text-[9px] text-gray-500 uppercase font-semibold">${p.category || 'General'}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Filter Products
function filterProducts() {
    const q = document.getElementById('search-input').value.toLowerCase();
    const cat = document.getElementById('category-filter').value;

    const filtered = products.filter(p => {
        const matchesQuery = p.title.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q));
        const matchesCat = cat === 'all' || p.category === cat;
        return matchesQuery && matchesCat;
    });

    renderProducts(filtered);
}

// View Product Details
function viewDetails(productId) {
    const p = products.find(item => item.id === productId);
    if (!p) return;

    const detailContainer = document.getElementById('detail-container');
    
    let mediaGalleryHTML = `
        <div class="h-64 bg-slate-950 rounded-2xl overflow-hidden relative border border-gray-800 mb-3">
            <img id="main-detail-img" src="${p.imageUrl || (p.images && p.images[0]) || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400'}" class="w-full h-full object-cover">
        </div>
    `;

    if (p.images && p.images.length > 1) {
        mediaGalleryHTML += `
            <div class="flex gap-2 overflow-x-auto pb-2 mb-3">
                ${p.images.map(img => `<img src="${img}" onclick="document.getElementById('main-detail-img').src='${img}'" class="w-14 h-14 rounded-xl object-cover cursor-pointer border border-gray-800 hover:border-orange-500 shrink-0">`).join('')}
            </div>
        `;
    }

    if (p.videoUrl) {
        mediaGalleryHTML += `
            <div class="rounded-2xl overflow-hidden border border-gray-800 mb-3 bg-slate-950">
                <video src="${p.videoUrl}" controls class="w-full max-h-56 object-cover"></video>
            </div>
        `;
    }

    let sellerInfoHTML = `
        <div class="bg-slate-950 border border-gray-900 p-3.5 rounded-2xl flex items-center justify-between">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-slate-950 flex items-center justify-center font-black text-xs shrink-0">
                    <i class="fa-solid fa-store"></i>
                </div>
                <div class="min-w-0">
                    <h5 class="text-xs font-extrabold text-white truncate">${p.sellerEmail || 'Verified Merchant'}</h5>
                    <p class="text-[9px] text-emerald-400 font-semibold"><i class="fa-solid fa-circle-check text-[8px]"></i> Phone: ${p.sellerPhone || 'N/A'}</p>
                </div>
            </div>
            <button onclick="contactSeller('${p.sellerEmail}', '${p.title.replace(/'/g, "\\'")}')" class="bg-slate-900 border border-gray-800 text-gray-300 hover:text-white px-3 py-1.5 rounded-xl text-[10px] font-bold transition shrink-0">Contact</button>
        </div>
    `;

    detailContainer.innerHTML = `
        <div class="space-y-4">
            ${mediaGalleryHTML}
            <div>
                <div class="flex items-center justify-between">
                    <h2 class="text-lg font-black text-white">${p.title}</h2>
                    <span class="text-base font-black text-orange-500">PKR ${p.price}</span>
                </div>
                <p class="text-xs text-gray-400 mt-2 leading-relaxed">${p.description || 'No description available.'}</p>
            </div>
            ${sellerInfoHTML}
            
            <!-- Comment Section -->
            <div class="bg-slate-900 border border-gray-800 rounded-2xl p-4 space-y-3">
                <h4 class="text-xs font-bold text-white uppercase tracking-wider">Product Inquiries / Comments</h4>
                <div id="comments-list" class="space-y-2 max-h-40 overflow-y-auto">
                    ${(p.comments && p.comments.length > 0) ? p.comments.map(c => `
                        <div class="bg-slate-950 p-2.5 rounded-xl border border-gray-800/80">
                            <div class="flex justify-between items-center text-[10px] text-gray-400 mb-1">
                                <span class="font-bold text-orange-400">${c.userName || c.userEmail}</span>
                                <span>${new Date(c.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p class="text-xs text-gray-200">${c.text}</p>
                        </div>
                    `).join('') : '<p class="text-xs text-gray-500">No comments yet.</p>'}
                </div>
                <form onsubmit="addComment(event, '${p.id}')" class="flex gap-2 pt-2">
                    <input type="text" id="comment-text" required placeholder="Write a comment..." class="flex-1 bg-slate-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-orange-500">
                    <button type="submit" class="bg-orange-500 text-slate-950 font-bold px-3 py-2 rounded-xl text-xs uppercase">Post</button>
                </form>
            </div>
        </div>
    `;

    switchTab('details');
}

// Contact Seller Function
function contactSeller(sellerEmail, productTitle) {
    if (!currentUser) return showNotification("Please authenticate session first.", "error");
    currentTargetSellerEmail = sellerEmail;
    switchTab('messages');
    
    const input = document.getElementById('support-msg-input');
    if (input) {
        input.value = `Hello! I am interested in your item "${productTitle}". `;
        input.focus();
    }
    showNotification(`Chat session connected with Seller (${sellerEmail})`);
}

// Add Comment
async function addComment(event, productId) {
    event.preventDefault();
    if (!currentUser) return showNotification("Please authenticate session first.", "error");

    const input = document.getElementById('comment-text');
    const text = input.value.trim();
    if (!text) return;

    try {
        const res = await fetch(`/api/products/${productId}/comment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userEmail: currentUser.email,
                userName: currentUser.username || currentUser.email.split('@')[0],
                text
            })
        });

        if (res.ok) {
            input.value = '';
            fetchProducts();
            showNotification("Comment added successfully!");
        }
    } catch (e) {
        showNotification("Failed to add comment", "error");
    }
}

// Auth Session Handler
function handleAuth(event) {
    event.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const username = document.getElementById('auth-name').value.trim() || email.split('@')[0];

    if (!email) return;

    currentUser = { email, username };
    localStorage.setItem('mt_user', JSON.stringify(currentUser));
    updateUserUI();
    showNotification(`Welcome back, ${username}!`);
}

function logout() {
    currentUser = null;
    localStorage.removeItem('mt_user');
    updateUserUI();
    showNotification("Logged out successfully.");
}

function updateUserUI() {
    const authSec = document.getElementById('auth-section');
    const sellerDash = document.getElementById('seller-dashboard');
    const userEmailDisplay = document.getElementById('user-display-email');
    const pEmailInput = document.getElementById('p-email');

    if (currentUser) {
        if (authSec) authSec.classList.add('hidden');
        if (sellerDash) sellerDash.classList.remove('hidden');
        if (userEmailDisplay) userEmailDisplay.innerText = currentUser.email;
        if (pEmailInput && !pEmailInput.value) pEmailInput.value = currentUser.email;
    } else {
        if (authSec) authSec.classList.remove('hidden');
        if (sellerDash) sellerDash.classList.add('hidden');
    }
}

// Handle Product Upload / Update
async function handleProductUpload(event) {
    event.preventDefault();
    if (!currentUser) return showNotification("Please authenticate session first.", "error");

    const editingId = document.getElementById('editing-product-id').value;
    const title = document.getElementById('p-title').value;
    const price = document.getElementById('p-price').value;
    const description = document.getElementById('p-description').value;
    const category = document.getElementById('p-category').value;
    const sellerEmail = document.getElementById('p-email').value;
    const sellerPhone = document.getElementById('p-phone').value;
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
        if (editingId) {
            const payload = {
                title,
                price,
                description,
                category,
                sellerEmail,
                sellerPhone
            };
            if (imagesBase64.length > 0) payload.images = imagesBase64;
            if (videoBase64) payload.videoUrl = videoBase64;

            const res = await fetch(`/api/products/update/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showNotification("Product listing updated successfully!");
                cancelProductEditMode();
                fetchProducts();
                switchTab('home');
            } else {
                showNotification("Failed to update product.", "error");
            }
        } else {
            if (imagesBase64.length === 0) {
                imagesBase64.push("https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400");
            }

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
                    videoUrl: videoBase64,
                    sellerEmail,
                    sellerPhone
                })
            });
            if(res.ok) {
                showNotification("Product uploaded for admin review pipeline processing.");
                cancelProductEditMode();
                switchTab('home');
            }
        }
    } catch(e) {
        showNotification("Product submit error", "error");
    }
}

function cancelProductEditMode() {
    document.getElementById('editing-product-id').value = '';
    document.getElementById('product-upload-form').reset();
    document.getElementById('form-heading').innerText = 'Create New Listing Pipeline';
    document.getElementById('btn-submit-listing').innerText = 'Submit Store Verification Pipeline';
    document.getElementById('btn-cancel-edit').classList.add('hidden');
    document.getElementById('lbl-images').innerText = 'Select Product Images';
    document.getElementById('lbl-video').innerText = 'Attach Item Video';
    if (currentUser) {
        document.getElementById('p-email').value = currentUser.email;
    }
}

function previewMedia(input, labelId) {
    const lbl = document.getElementById(labelId);
    if (lbl && input.files.length > 0) {
        lbl.innerText = `${input.files.length} file(s) selected`;
    }
}

// Live Chat / Support Messages
async function loadChatMessages() {
    if (!currentUser) return;

    try {
        const res = await fetch(`/api/chat/messages?userEmail=${encodeURIComponent(currentUser.email)}`);
        if (res.ok) {
            const msgs = await res.json();
            const chatBox = document.getElementById('chat-box');
            if (!chatBox) return;

            if (msgs.length === 0) {
                chatBox.innerHTML = `<div class="text-center text-xs text-gray-500 my-auto">No chat history found. Send a message to get started!</div>`;
                return;
            }

            chatBox.innerHTML = msgs.map(m => `
                <div class="flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}">
                    <div class="max-w-[80%] rounded-2xl px-3.5 py-2 text-xs ${m.sender === 'user' ? 'bg-orange-500 text-slate-950 font-semibold' : 'bg-slate-800 text-white border border-gray-700'}">
                        ${m.message}
                    </div>
                    <span class="text-[9px] text-gray-500 mt-1 px-1">${new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
            `).join('');

            chatBox.scrollTop = chatBox.scrollHeight;
        }
    } catch (e) {
        console.error("Error loading chat:", e);
    }
}

async function sendSupportMessage(event) {
    event.preventDefault();
    if (!currentUser) return showNotification("Please authenticate session first.", "error");

    const input = document.getElementById('support-msg-input');
    const msg = input.value.trim();
    if (!msg) return;

    try {
        const res = await fetch('/api/chat/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userEmail: currentUser.email,
                userName: currentUser.username || currentUser.email.split('@')[0],
                sender: 'user',
                message: msg,
                targetSellerEmail: currentTargetSellerEmail
            })
        });

        if (res.ok) {
            input.value = '';
            loadChatMessages();
            showNotification(currentTargetSellerEmail ? `Message sent directly to Seller (${currentTargetSellerEmail})` : "Message sent successfully.");
            currentTargetSellerEmail = null;
        } else {
            showNotification("Failed to send message.", "error");
        }
    } catch (e) {
        showNotification("Error sending support message.", "error");
    }
}
