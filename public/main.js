// Initialization lifecycle event bindings
document.addEventListener("DOMContentLoaded", () => {
    checkAuthenticationStatus();
    setupAttachmentLogic();
    setupModalInterface();
});

// Permanent Session Checking System (Website band hone par ya refresh hone par login save rakhega)
function checkAuthenticationStatus() {
    const savedToken = localStorage.getItem("mt_auth_token");
    const mainApp = document.getElementById("mainAppStructure");
    const authBox = document.getElementById("authContainer");
    const navBar = document.getElementById("appBottomNavbar");

    if (savedToken) {
        // Automatically retain active system access
        mainApp.style.display = "block";
        navBar.style.display = "flex";
        authBox.style.display = "none";
        fetchRealProducts(); // Load real data items immediately
    } else {
        // Enforce secure credentials lock panel
        mainApp.style.display = "none";
        navBar.style.display = "none";
        authBox.style.display = "block";
    }
}

// Login Process Execution Handler
document.getElementById("authSubmitBtn").addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const result = await response.json();

        if (response.ok && result.token) {
            // Save token inside local storage memory permanently until manual logout action
            localStorage.setItem("mt_auth_token", result.token);
            checkAuthenticationStatus();
        } else {
            alert("Authentication failed: " + result.message);
        }
    } catch (err) {
        alert("Server communication runtime error.");
    }
});

// Explicit Manual Logout Sequence Handler
function executeAppLogout() {
    localStorage.removeItem("mt_auth_token");
    checkAuthenticationStatus();
}

// Real Fetch Stream Layer to fetch items securely without data duplication
async function fetchRealProducts() {
    const container = document.getElementById("realProductsDynamicContainer");
    if (!container) return;

    try {
        const response = await fetch('/api/products/uploaded', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem("mt_auth_token")}` }
        });
        const products = await response.json();

        // FIX: Clear layout container area buffer to avoid showing duplicate multiple orders listing
        container.innerHTML = "";

        if (products.length === 0) {
            container.innerHTML = `<p style="color:#9ca3af; text-align:center; font-size:14px; padding:20px;">No products uploaded yet.</p>`;
            return;
        }

        // Loop array values directly ensuring only exact counts map visually onto dashboard
        products.forEach(item => {
            const card = document.createElement("div");
            card.className = "order-item";
            card.innerHTML = `
                <div>
                    <strong style="display:block; font-size:15px; color:#ffffff;">${item.name}</strong>
                    <span style="color:#9ca3af; font-size:13px;">PKR ${item.price}</span><br>
                    <span style="color:#6b7280; font-size:11px;">Ref: ${item.storeRef || 'Seller Asset'}</span>
                </div>
                <button class="cancel-btn" onclick="deleteUploadedProduct('${item._id || item.id}')">Cancel</button>
            `;
            container.appendChild(card);
        });

    } catch (err) {
        container.innerHTML = `<p style="color:#ef4444; text-align:center; font-size:13px;">Error synchronizing server resources.</p>`;
    }
}

// Modal Toggle Controllers Setup
function setupModalInterface() {
    const modal = document.getElementById("productUploadModal");
    
    document.getElementById("openUploadModalBtn").addEventListener("click", () => modal.style.display = "flex");
    document.getElementById("closeUploadModalBtn").addEventListener("click", () => modal.style.display = "none");

    document.getElementById("saveProductBtn").addEventListener("click", async () => {
        const name = document.getElementById("newProdName").value;
        const price = document.getElementById("newProdPrice").value;

        if (!name || !price) return alert("Please complete both input fields.");

        try {
            const response = await fetch('/api/products/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem("mt_auth_token")}`
                },
                body: JSON.stringify({ name, price })
            });

            if (response.ok) {
                modal.style.display = "none";
                document.getElementById("newProdName").value = "";
                document.getElementById("newProdPrice").value = "";
                fetchRealProducts(); // Dynamic structural reload
            } else {
                alert("Upload process rejected by database.");
            }
        } catch (err) {
            alert("Communication failed during save execution.");
        }
    });
}

// Delete Handler (Triggers operational dynamic server cancellation and fires structured node mail updates)
async function deleteUploadedProduct(productId) {
    if (!confirm("Confirm complete cancellation and removal of this product asset item?")) return;

    try {
        const response = await fetch(`/api/products/delete/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem("mt_auth_token")}` }
        });
        const result = await response.json();

        if (response.ok && result.success) {
            alert("Product asset dropped and tracking validation alert notification email sent safely.");
            fetchRealProducts();
        } else {
            alert("Failed to delete product element asset: " + result.message);
        }
    } catch (err) {
        alert("Server cancellation sync validation failed.");
    }
}

// Controller routing handlers managing layout visibility
function switchTab(targetTab) {
    const supportBlock = document.getElementById("centralSupportSection");
    const sellerBlock = document.getElementById("sellerViewContainer");

    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
    document.getElementById(`${targetTab}Tab`).classList.add("active");

    if (targetTab === 'message') {
        if(sellerBlock) sellerBlock.style.display = "none";
        if(supportBlock) supportBlock.style.display = "block";
    } else if (targetTab === 'account') {
        if(supportBlock) supportBlock.style.display = "none";
        if(sellerBlock) sellerBlock.style.display = "block";
        fetchRealProducts();
    } else {
        if(supportBlock) supportBlock.style.display = "none";
        if(sellerBlock) sellerBlock.style.display = "none";
    }
}

// Media file browser access integration mapping through pin icon interactions
function setupAttachmentLogic() {
    const triggerBtn = document.getElementById("pinAttachmentBtn");
    const fileSelector = document.getElementById("hiddenFileInput");

    if (triggerBtn && fileSelector) {
        triggerBtn.addEventListener("click", () => fileSelector.click());
        fileSelector.addEventListener("change", (e) => {
            if (e.target.files.length > 0) {
                alert(`${e.target.files.length} media elements attached to comment buffer successfully.`);
            }
        });
    }
}
