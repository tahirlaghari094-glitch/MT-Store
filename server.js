// Local product memory collection rendered in "YOUR UPLOADED PRODUCTS"
let uploadedProducts = [
    { id: 1, name: "GMT Watch (Qty: 1)", price: 100000, ref: "Admin Managed" },
    { id: 2, name: "GMT Watch (Qty: 1)", price: 100, ref: "Admin Managed" },
    { id: 3, name: "GMT Watch (Qty: 1)", price: 100, ref: "Admin Managed" },
    { id: 4, name: "Tissot Watch (Qty: 1)", price: 2500, ref: "Admin Managed" }
];

document.addEventListener("DOMContentLoaded", () => {
    renderUploadedProducts();
    setupAttachmentLogic();

    // Default startup configurations setup
    document.getElementById("addNewItemBtn").addEventListener("click", () => {
        alert("Redirecting to Add New Product item interface panel.");
    });
});

// Function to render items inside uploaded products context panel
function renderUploadedProducts() {
    const listContainer = document.getElementById("dynamicListContainer");
    if (!listContainer) return;
    
    listContainer.innerHTML = "";

    uploadedProducts.forEach(product => {
        const itemElement = document.createElement("div");
        itemElement.className = "order-item";
        itemElement.innerHTML = `
            <div>
                <strong style="display:block; font-size:15px; color:#ffffff;">${product.name}</strong>
                <span style="color:#9ca3af; font-size:13px;">PKR ${product.price}</span><br>
                <span style="color:#6b7280; font-size:11px;">Store Ref: ${product.ref}</span>
            </div>
            <button class="cancel-btn" onclick="processProductCancellation(${product.id}, '${product.name}')">Cancel</button>
        `;
        listContainer.appendChild(itemElement);
    });
}

// Router switcher logic to hide/show Central Support only in Message tab
function switchTab(selectedTab) {
    const supportBlock = document.getElementById("centralSupportSection");
    const sellerBlock = document.getElementById("sellerViewContainer");
    
    // Clear active status styling states from tabs UI
    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
    
    if (selectedTab === 'message') {
        // Hide standard profile views and display message tracking structure exclusively
        if (sellerBlock) sellerBlock.style.display = "none";
        if (supportBlock) supportBlock.style.display = "block";
        document.getElementById("messageTab").classList.add("active");
    } else if (selectedTab === 'account') {
        if (supportBlock) supportBlock.style.display = "none";
        if (sellerBlock) sellerBlock.style.display = "block";
        document.getElementById("accountTab").classList.add("active");
        renderUploadedProducts();
    } else {
        // Fallback structures for standard placeholders
        if (supportBlock) supportBlock.style.display = "none";
        if (sellerBlock) sellerBlock.style.display = "none";
        document.getElementById(`${selectedTab}Tab`).classList.add("active");
    }
}

// Pin input trigger configuration for opening system documents/gallery
function setupAttachmentLogic() {
    const triggerBtn = document.getElementById("pinAttachmentBtn");
    const fileSelector = document.getElementById("hiddenFileInput");

    if (triggerBtn && fileSelector) {
        triggerBtn.addEventListener("click", () => {
            fileSelector.click(); // Standard system device media input access trigger
        });

        fileSelector.addEventListener("change", (event) => {
            const filesList = event.target.files;
            if (filesList.length > 0) {
                alert(`${filesList.length} media media items loaded into comment buffer attachment channel successfully.`);
            }
        });
    }
}

// Action caller sending cancellation post records out onto the backend mail network
async function processProductCancellation(productId, productName) {
    if (!confirm(`Confirm product cancellation request for: ${productName}?`)) return;

    try {
        const networkResponse = await fetch('/api/cancel-order-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: productId,
                title: productName,
                recipient: 'lagharitahir08@gmail.com'
            })
        });

        const outcomeData = await networkResponse.json();
        
        if (networkResponse.ok && outcomeData.status === 'success') {
            alert("Cancellation processed. Notification update dispatched to lagharitahir08@gmail.com");
            // Perform application model client level array update sequence
            uploadedProducts = uploadedProducts.filter(p => p.id !== productId);
            renderUploadedProducts();
        } else {
            alert("Server operational mail system alert: " + outcomeData.error);
        }
    } catch (err) {
        console.error("Direct connection validation alert: ", err);
        alert("API link runtime connectivity validation failed.");
    }
}
