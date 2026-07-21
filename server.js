const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// In-Memory Databases
let products = [];
let orders = [];
let messages = []; // { id, userEmail, userMessage, adminReply, createdAt }
let userProfiles = {}; // { email: { name, photo, phone } }

// Email Transporter Config
const transporter = nodemailer. দিকের
// NOTE: Apni Gmail / SMTP details yahan update kar lein
const ADMIN_EMAIL = "admin@mtstore.com"; 

const emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
    }
});

// Helper function to send email safely
async function sendEmail(to, subject, html) {
    try {
        await emailTransporter.sendMail({
            from: '"MT Store" <no-reply@mtstore.com>',
            to,
            subject,
            html
        });
    } catch (err) {
        console.error("Email send error:", err);
    }
}

// --- PRODUCT ROUTES ---

// Get All Live/Approved Products
app.get('/api/products', (req, res) => {
    const liveProducts = products.filter(p => p.status === 'approved');
    res.json(liveProducts);
});

// Get Products Uploaded by Specific Seller
app.get('/api/products/seller/:email', (req, res) => {
    const sellerProducts = products.filter(p => p.sellerEmail === req.params.email);
    res.json(sellerProducts);
});

// Upload Product (Pending Admin Approval)
app.post('/api/products', async (req, res) => {
    const { title, price, description, category, images, videoUrl, sellerEmail, sellerPhone, easypaisaTrxId } = req.body;

    const newProduct = {
        id: 'PROD-' + Date.now(),
        title,
        price,
        description,
        category,
        images: images || [],
        imageUrl: (images && images.length > 0) ? images[0] : '',
        videoUrl: videoUrl || null,
        sellerEmail,
        sellerPhone,
        easypaisaTrxId,
        status: 'pending',
        comments: [],
        createdAt: new Date().toISOString()
    };

    products.push(newProduct);

    // Dynamic Protocol Base URL for Approval Link
    const host = req.get('host');
    const protocol = req.protocol;
    const approvalLink = `${protocol}://${host}/api/products/approve/${newProduct.id}`;

    // Admin Approval Email
    const adminEmailHTML = `
        <div style="font-family: Arial, sans-serif; background-color: #090d16; color: #ffffff; padding: 25px; border-radius: 16px; max-width: 600px; margin: auto; border: 1px solid #1e293b;">
            <h2 style="color: #f97316; margin-top: 0;">📦 New Product Approval Request</h2>
            <p style="color: #94a3b8; font-size: 13px;">A vendor has submitted a product listing requiring approval.</p>
            <hr style="border-color: #1e293b; margin: 15px 0;">
            
            <h3 style="color: #f97316; font-size: 14px;">🛍️ Product Details</h3>
            <p><strong>Title:</strong> ${newProduct.title}</p>
            <p><strong>Price:</strong> PKR ${newProduct.price}</p>
            <p><strong>Category:</strong> ${newProduct.category}</p>
            <p><strong>Description:</strong> ${newProduct.description}</p>
            
            <h3 style="color: #f97316; font-size: 14px; margin-top: 20px;">👤 Vendor Credentials</h3>
            <p><strong>Seller Email:</strong> ${newProduct.sellerEmail}</p>
            <p><strong>Seller Phone:</strong> ${newProduct.sellerPhone || 'N/A'}</p>
            <p><strong>EasyPaisa Fee Receipt Trx ID:</strong> <span style="background: #1e293b; color: #22c55e; padding: 4px 8px; border-radius: 6px; font-weight: bold;">${newProduct.easypaisaTrxId}</span></p>

            <h3 style="color: #f97316; font-size: 14px; margin-top: 20px;">🖼️ Product Media Attachment</h3>
            ${newProduct.images.map(img => `<img src="${img}" style="max-width: 100%; height: auto; border-radius: 12px; margin-bottom: 10px; border: 1px solid #334155;">`).join('')}
            ${newProduct.videoUrl ? `<p><strong>Attached Video:</strong> <a href="${newProduct.videoUrl}" style="color: #f97316;">View Attached Video</a></p>` : ''}

            <div style="margin-top: 30px; text-align: center;">
                <a href="${approvalLink}" style="background-color: #f97316; color: #090d16; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 900; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);">
                    ✅ APPROVE PRODUCT & PUBLISH LIVE
                </a>
            </div>
        </div>
    `;

    await sendEmail(ADMIN_EMAIL, `[APPROVAL REQ] New Listing: ${newProduct.title}`, adminEmailHTML);

    res.json({ success: true, message: "Product submitted for review.", product: newProduct });
});

// Admin One-Click Approve Route
app.get('/api/products/approve/:id', async (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    if (product) {
        product.status = 'approved';

        // Notify Seller via their specific submitted email
        const sellerEmailHTML = `
            <div style="font-family: Arial, sans-serif; background-color: #090d16; color: #ffffff; padding: 20px; border-radius: 12px;">
                <h2 style="color: #22c55e;">🎉 Your Product is Now Live!</h2>
                <p>Your listing <strong>${product.title}</strong> has been approved by MT Store Admin and is now live for buyers.</p>
            </div>
        `;
        await sendEmail(product.sellerEmail, `Product Approved: ${product.title}`, sellerEmailHTML);

        return res.send(`
            <div style="font-family: Arial; text-align: center; padding: 50px; background: #090d16; color: #fff;">
                <h1 style="color: #22c55e;">✅ Product Approved Successfully!</h1>
                <p>The product is now live on the MT Store Marketplace.</p>
            </div>
        `);
    }
    res.status(404).send("Product not found.");
});

// Delete Product
app.delete('/api/products/delete/:id', (req, res) => {
    products = products.filter(p => p.id !== req.params.id);
    res.json({ success: true, message: "Product deleted." });
});

// Post Comment
app.post('/api/products/:id/comments', (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const newComment = {
        id: 'COM-' + Date.now(),
        author: req.body.author || 'Anonymous',
        text: req.body.text,
        rating: req.body.rating || 0,
        media: req.body.media || [],
        isPinned: req.body.isPinned || false,
        createdAt: new Date().toISOString()
    };

    if (!product.comments) product.comments = [];
    product.comments.push(newComment);

    res.json({ success: true, comments: product.comments });
});

// --- ORDER ROUTES ---

app.post('/api/orders', async (req, res) => {
    const { items, buyerName, buyerEmail, buyerPhone, buyerAddress } = req.body;

    const newOrder = {
        id: 'ORD-' + Date.now(),
        items,
        buyerName,
        buyerEmail,
        buyerPhone,
        buyerAddress,
        createdAt: new Date().toISOString()
    };

    orders.push(newOrder);

    // Send Full Order Details Email to Admin & Specific Vendors
    for (const item of items) {
        const orderEmailHTML = `
            <div style="font-family: Arial, sans-serif; background-color: #090d16; color: #ffffff; padding: 25px; border-radius: 16px; border: 1px solid #1e293b;">
                <h2 style="color: #f97316;">🛍️ New Order Received</h2>
                <hr style="border-color: #1e293b;">
                
                <h3>📦 Item Purchased:</h3>
                <p><strong>Title:</strong> ${item.title}</p>
                <p><strong>Price:</strong> PKR ${item.price}</p>
                ${(item.images && item.images.length > 0) ? `<img src="${item.images[0]}" style="max-width: 200px; border-radius: 8px;">` : ''}

                <h3 style="color: #f97316; margin-top: 20px;">📍 Delivery Details:</h3>
                <p><strong>Name:</strong> ${buyerName}</p>
                <p><strong>Email:</strong> ${buyerEmail}</p>
                <p><strong>Phone:</strong> ${buyerPhone}</p>
                <p><strong>Address:</strong> ${buyerAddress}</p>

                <h3 style="color: #f97316; margin-top: 20px;">👤 Vendor Info:</h3>
                <p><strong>Seller Email:</strong> ${item.sellerEmail}</p>
                <p><strong>Seller Phone:</strong> ${item.sellerPhone || 'N/A'}</p>
            </div>
        `;

        await sendEmail(ADMIN_EMAIL, `[NEW ORDER] ${item.title}`, orderEmailHTML);
        if (item.sellerEmail) {
            await sendEmail(item.sellerEmail, `[NEW ORDER] You have a new sale: ${item.title}`, orderEmailHTML);
        }
    }

    res.json({ success: true, order: newOrder });
});

app.post('/api/orders/cancel', async (req, res) => {
    const { orderId, productTitle, sellerEmail, cancelledBy } = req.body;

    const cancelHTML = `
        <div style="font-family: Arial, sans-serif; background-color: #090d16; color: #ffffff; padding: 20px; border-radius: 12px;">
            <h2 style="color: #f43f5e;">❌ Order Cancelled</h2>
            <p>Order for <strong>${productTitle}</strong> was cancelled by <strong>${cancelledBy}</strong>.</p>
        </div>
    `;

    await sendEmail(ADMIN_EMAIL, `[ORDER CANCELLED] ${productTitle}`, cancelHTML);
    if (sellerEmail) {
        await sendEmail(sellerEmail, `[ORDER CANCELLED] ${productTitle}`, cancelHTML);
    }

    res.json({ success: true, message: "Order cancellation notified." });
});

app.get('/api/orders/user/:email', (req, res) => {
    const userOrders = [];
    orders.forEach(o => {
        if (o.buyerEmail === req.params.email) {
            o.items.forEach(item => {
                userOrders.push({ id: o.id, title: item.title, price: item.price, sellerEmail: item.sellerEmail });
            });
        }
    });
    res.json(userOrders);
});

// --- MESSAGES / SUPPORT ROUTING ---

app.get('/api/messages', (req, res) => {
    res.json(messages);
});

app.post('/api/messages', async (req, res) => {
    const { userEmail, userMessage } = req.body;
    const msg = {
        id: 'MSG-' + Date.now(),
        userEmail,
        userMessage,
        adminReply: null,
        createdAt: new Date().toISOString()
    };
    messages.push(msg);

    // Notify Admin of User Question
    const supportHTML = `
        <div style="font-family: Arial; background: #090d16; color: #fff; padding: 20px; border-radius: 12px;">
            <h3 style="color: #f97316;">📩 New Support Question</h3>
            <p><strong>From:</strong> ${userEmail}</p>
            <p><strong>Message:</strong> ${userMessage}</p>
        </div>
    `;
    await sendEmail(ADMIN_EMAIL, `[SUPPORT MSG] From ${userEmail}`, supportHTML);

    res.json({ success: true, message: msg });
});

app.post('/api/messages/reply', async (req, res) => {
    const { messageId, adminReply } = req.body;
    const msg = messages.find(m => m.id === messageId);
    if (msg) {
        msg.adminReply = adminReply;

        // Send Email to User
        const replyHTML = `
            <div style="font-family: Arial; background: #090d16; color: #fff; padding: 20px; border-radius: 12px;">
                <h3 style="color: #f97316;">💬 Response from MT Support Admin</h3>
                <p><strong>Your Question:</strong> ${msg.userMessage}</p>
                <p style="color: #22c55e;"><strong>Admin Response:</strong> ${adminReply}</p>
            </div>
        `;
        await sendEmail(msg.userEmail, `Support Reply: MT Store`, replyHTML);

        return res.json({ success: true, message: msg });
    }
    res.status(404).json({ error: "Message not found" });
});

// --- USER PROFILE PROFILE PIC & PHONE ---

app.post('/api/users/profile', (req, res) => {
    const { email, name, photo, phone } = req.body;
    userProfiles[email] = { name, photo, phone };
    res.json({ success: true, profile: userProfiles[email] });
});

app.get('/api/users/profile/:email', (req, res) => {
    res.json(userProfiles[req.params.email] || {});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
