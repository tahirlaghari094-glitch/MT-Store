// 1. Image array upload listener ko adjust karein (Form submission se pehle)
const fileMultiInput = document.getElementById('vendor-item-multiple-images');
if (fileMultiInput) {
    fileMultiInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        const previewContainer = document.getElementById('images-upload-preview-row');
        if (previewContainer) previewContainer.innerHTML = '';
        STATE.uploadedImagesBase64 = []; // Apne state array ko reset karein

        files.forEach(file => {
            const streamReader = new FileReader();
            streamReader.onloadend = () => {
                STATE.uploadedImagesBase64.push(streamReader.result);
                if (previewContainer) {
                    const imgNode = document.createElement('img');
                    imgNode.src = streamReader.result;
                    imgNode.className = "w-20 h-20 object-cover rounded-lg border";
                    previewContainer.appendChild(imgNode);
                }
            };
            streamReader.readAsDataURL(file);
        });
    });
}

// 2. Product Detail Modal (Jahan ab saari uploaded images thumbnails ke sath dikhengi)
window.injectProductDeepDetailsSheetModal = function(productId) {
    const targetItem = STATE.products.find(p => p.id === productId.toString());
    if (!targetItem) return;

    // Multi-image collection parsing
    const collectionImages = targetItem.imageUrls && targetItem.imageUrls.length > 0 ? targetItem.imageUrls : [targetItem.imageUrl];
    
    const carouselThumbnailsHtml = collectionImages.map((src, index) => `
        <img src="${src}" onclick="document.getElementById('primary-modal-hero-viewer').src='${src}'" 
             class="w-16 h-16 object-cover rounded border cursor-pointer hover:border-amber-500" alt="Thumb-${index}" />
    `).join('');

    // Modal view injection (Baki content aapka pehle jaisa hi rahega)
    const overlayModalNode = document.createElement('div');
    overlayModalNode.id = "global-dynamic-details-modal";
    overlayModalNode.className = "fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4";
    overlayModalNode.innerHTML = `
        <div class="bg-slate-900 border rounded-2xl max-w-3xl w-full p-6 text-white max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center pb-4 border-b">
                <h2 class="text-xl font-bold">${targetItem.title}</h2>
                <button onclick="document.getElementById('global-dynamic-details-modal').remove()" class="text-2xl font-bold">&times;</button>
            </div>
            <div class="space-y-4 mt-4">
                <!-- Main Image aur dynamic thumbnails viewer -->
                <img id="primary-modal-hero-viewer" src="${collectionImages[0]}" class="w-full h-64 object-contain bg-black rounded" />
                <div class="flex gap-2 overflow-x-auto">${carouselThumbnailsHtml}</div>
                
                <p class="text-sm text-slate-300">${targetItem.description}</p>
                <div class="text-2xl font-black text-emerald-400">PKR ${targetItem.price}</div>
                
                <button onclick="addItemToOperationalCart('${targetItem.id}'); document.getElementById('global-dynamic-details-modal').remove();" class="w-full bg-emerald-500 text-black py-2.5 rounded-xl font-bold">Add to Cart</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlayModalNode);
};

// 3. User Purchases / Orders Pipeline me Cancel Button ki insertion
async function renderAccountOrdersPipelineDashboard() {
    const structuralContainer = document.getElementById('account-orders-tracking-pipeline');
    if (!structuralContainer || !STATE.user) return;

    try {
        const networkResponse = await fetch(`/api/orders/user/${STATE.user.email}`);
        const userOrders = await networkResponse.json();

        structuralContainer.innerHTML = userOrders.map(ord => {
            // Sirf 'Processing' status wale orders par Cancel ka button dikhega
            const displayCancellationAction = ord.status === 'Processing' 
                ? `<button onclick="triggerOrderCancellationTransactionPipeline('${ord.id}')" class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded">Cancel Order</button>` 
                : '';

            return `
                <div class="border p-4 rounded flex justify-between items-center bg-slate-950">
                    <div>
                        <div class="text-sm font-bold">${ord.title}</div>
                        <div class="text-xs text-slate-400">Status: ${ord.status}</div>
                    </div>
                    <div>${displayCancellationAction}</div>
                </div>
            `;
        }).join('');
    } catch (e) { console.error(e); }
}

// Order cancellation trigger sequence
window.triggerOrderCancellationTransactionPipeline = async function(orderId) {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    try {
        const response = await fetch(`/api/orders/cancel/${orderId}`, { method: 'POST' });
        const resData = await response.json();
        if (response.ok && resData.success) {
            alert('Order cancelled successfully.');
            renderAccountOrdersPipelineDashboard(); // List reload karein
        } else { alert(resData.error || 'Cancellation failed.'); }
    } catch (err) { alert('Server connection error.'); }
};
