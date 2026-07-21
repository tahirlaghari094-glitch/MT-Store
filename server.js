
<!-- 3. SELLER DASHBOARD VIEW (Upload + Edit Form) -->
<div id="seller-view" class="tab-view space-y-6">
    <div class="flex bg-slate-950 p-1.5 rounded-2xl border border-gray-900">
        <button id="btn-sub-upload" onclick="switchSellerSubTab('upload')" class="flex-1 py-2.5 rounded-xl text-xs font-black transition bg-orange-500 text-slate-950">Add / Edit Listing</button>
        <button id="btn-sub-history" onclick="switchSellerSubTab('history')" class="flex-1 py-2.5 rounded-xl text-xs font-black transition bg-slate-900 text-gray-300">Active Pipeline</button>
    </div>

    <div id="seller-upload-tab" class="tab-view active space-y-3">
        <div id="edit-mode-banner" class="hidden bg-orange-500/10 border border-orange-500/30 p-3 rounded-2xl flex justify-between items-center text-xs">
            <span class="text-orange-400 font-bold"><i class="fa-solid fa-pen-to-square"></i> Editing Existing Item</span>
            <button onclick="cancelProductEditMode()" class="text-rose-400 font-black hover:underline text-[10px] uppercase">Cancel Edit</button>
        </div>

        <form id="product-upload-form" onsubmit="handleProductUpload(event)" class="space-y-4">
            <input type="hidden" id="editing-product-id" value="">
            <div>
                <label class="block text-[11px] font-bold text-gray-400 uppercase mb-1.5">Product Title</label>
                <input type="text" id="p-title" required class="w-full bg-slate-950 border border-gray-900 rounded-xl px-4 py-3 text-sm focus:border-orange-500 outline-none transition">
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-[11px] font-bold text-gray-400 uppercase mb-1.5">Price (PKR)</label>
                    <input type="number" id="p-price" required class="w-full bg-slate-950 border border-gray-900 rounded-xl px-4 py-3 text-sm focus:border-orange-500 outline-none transition">
                </div>
                <div>
                    <label class="block text-[11px] font-bold text-gray-400 uppercase mb-1.5">Category</label>
                    <select id="p-category" class="w-full bg-slate-950 border border-gray-900 rounded-xl px-4 py-3 text-sm focus:border-orange-500 outline-none transition">
                        <option value="electronics">Electronics</option>
                        <option value="fashion">Fashion</option>
                        <option value="services">Services</option>
                    </select>
                </div>
            </div>
            <div>
                <label class="block text-[11px] font-bold text-gray-400 uppercase mb-1.5">Description</label>
                <textarea id="p-description" rows="3" class="w-full bg-slate-950 border border-gray-900 rounded-xl px-4 py-3 text-sm focus:border-orange-500 outline-none transition"></textarea>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <label class="bg-slate-950 border border-dashed border-gray-800 rounded-xl p-4 text-center cursor-pointer hover:border-orange-500/40 transition">
                    <span id="lbl-images" class="text-xs text-gray-400 block">Select Product Images</span>
                    <input type="file" id="p-image-file" multiple accept="image/*" class="hidden" onchange="previewMedia(this, 'lbl-images')">
                </label>
                <label class="bg-slate-950 border border-dashed border-gray-800 rounded-xl p-4 text-center cursor-pointer hover:border-orange-500/40 transition">
                    <span id="lbl-video" class="text-xs text-gray-400 block">Attach Item Video</span>
                    <input type="file" id="p-video-file" accept="video/*" class="hidden" onchange="previewMedia(this, 'lbl-video')">
                </label>
            </div>

            <!-- 👈 Updated Editable Seller Email & Phone Number Fields -->
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-[11px] font-bold text-gray-400 uppercase mb-1.5">Seller Email Address</label>
                    <input type="email" id="p-email" placeholder="vendor@example.com" required class="w-full bg-slate-950 border border-gray-900 rounded-xl px-4 py-3 text-sm focus:border-orange-500 outline-none transition text-white">
                </div>
                <div>
                    <label class="block text-[11px] font-bold text-gray-400 uppercase mb-1.5">Seller Phone Number</label>
                    <input type="tel" id="p-phone" placeholder="03001234567" required class="w-full bg-slate-950 border border-gray-900 rounded-xl px-4 py-3 text-sm focus:border-orange-500 outline-none transition text-white">
                </div>
            </div>

            <button type="submit" id="btn-submit-listing" class="w-full bg-orange-500 text-slate-950 font-black py-4 rounded-xl text-xs uppercase tracking-wider transition shadow-lg">Submit Store Verification Pipeline</button>
        </form>
    </div>
    
    <div id="seller-history-tab" class="tab-view">
        <p class="text-xs text-gray-500 text-center py-6">Check your live items under Account profile management view.</p>
    </div>
</div>
