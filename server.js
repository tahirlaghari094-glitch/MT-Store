const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

const PORT = process.env.PORT || 5000;
const ADMIN_EMAIL = 'lagharitahir08@gmail.com';
const LIVE_DOMAIN = process.env.LIVE_DOMAIN || 'https://mt-store-sandy.vercel.app';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
});

const sendHtmlEmail = async (to, subject, htmlContent, replyTo = null) => {
    if (!to) return;
    try {
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: to.toLowerCase(),
            subject: subject,
            html: htmlContent,
            ...(replyTo && { replyTo: replyTo.toLowerCase() })
        };
        await transporter.sendMail(mailOptions);
        console.log("🚀 Email routed successfully to:", to);
    } catch (error) {
        console.log("❌ Email configuration error: ", error);
    }
};

const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log("🔌 MongoDB Connected Successfully!"))
        .catch(err => console.error("❌ MongoDB Engine Error: ", err));
}

// SCHEMAS DEFINITION
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    username: String,
    profileImage: String
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const CommentSchema = new mongoose.Schema({
    author: String,
    text: String,
    rating: { type: Number, default: 0 },
    media: [{ type: { type: String }, url: String }],
    isPinned: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const ProductSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    title: String,
    price: Number,
    description: String,
    category: String,
    imageUrl: String,
    images: [String],
    videoUrl: String,
    comments: [CommentSchema],
    sellerEmail: { type: String, lowercase: true },
    sellerPhone: String,
    status: { type: String, default: 'pending' },
    createdAt: { type: String, default: () => new Date().toISOString() }
});
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

const OrderSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    productId: String,
    title: String,
    price: Number,
    quantity: Number,
    buyerEmail: { type: String, lowercase: true },
    buyerName: String,
    buyerPhone: String,
    buyerAddress: String,
    status: { type: String, default: 'Processing' },
    createdAt: { type: String, default: () => new Date().toISOString() }
});
const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

const ChatMessageSchema = new mongoose.Schema({
    userEmail: { type: String, required: true, lowercase: true },
    sender: { type: String, required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', ChatMessageSchema);

// STATIC FILES ROUTER MIDDLEWARE
const rootPath = process.cwd();
app.use(express.static(rootPath));
app.use(express.static(path.join(rootPath, 'public')));

// API ENDPOINTS
app.post('/api/users/login', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });
    try {
        let user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            user = new User({ email: email.toLowerCase(), username: email.split('@')[0] });
            await user.save();
        }
        res.json({ success: true, user });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/api/users/update-profile', async (req, res) => {
    const { email, username, profileImage } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });
    try {
        let user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(404).json({ error: "User not found" });

        if (username) user.username = username;
        if (profileImage) user.profileImage = profileImage;
        await user.save();

        res.json({ success: true, user });
    } catch (e) { res.status(500).json({ error: "Profile update error" }); }
});

// LIVE CHAT ENDPOINTS
app.get('/api/chat/messages/:userEmail', async (req, res) => {
    try {
        const messages = await ChatMessage.find({ userEmail: req.params.userEmail.toLowerCase() }).sort({ createdAt: 1 });
        res.json(messages);
    } catch (e) { res.status(500).json({ error: "Error loading chat" }); }
});

app.post('/api/chat/send', async (req, res) => {
    const { userEmail, sender, message, userName } = req.body;
    if (!message || !userEmail) return res.status(400).json({ error: "Missing data" });

    try {
        const chatMsg = new ChatMessage({
            userEmail: userEmail.toLowerCase(),
            sender: sender || 'user',
            message
        });
        await chatMsg.save();

        if (sender !== 'admin') {
            const replyUrl = `${LIVE_DOMAIN}/api/chat/admin-reply-page?userEmail=${encodeURIComponent(userEmail)}`;
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; padding: 20px; background: #070a13; color: #fff; border-radius: 12px; border: 1px solid #f97316;">
                    <h2 style="color: #f97316;">💬 New Live Chat Message from ${userName || userEmail}</h2>
                    <blockquote style="background: #0f172a; padding: 12px; border-left: 4px solid #f97316; margin: 15px 0; color: #e2e8f0;">${message}</blockquote>
                    <a href="${replyUrl}" style="display: inline-block; background: #f97316; color: #000; padding: 12px 20px; border-radius: 8px; font-weight: bold; text-decoration: none; margin-top: 10px;">Type Answer / Reply Directly</a>
                </div>
            `;
            await sendHtmlEmail(ADMIN_EMAIL, `Support Query from ${userName || userEmail}`, emailHtml, userEmail);
        }

        res.json({ success: true, chatMsg });
    } catch (e) { res.status(500).json({ error: "Error sending chat message" }); }
});

// VENDOR INQUIRY ROUTER
app.post('/api/products/contact-seller', async (req, res) => {
    const { productId, buyerEmail, buyerName, message } = req.body;
    if (!productId || !message || !buyerEmail) return res.status(400).json({ error: "Missing required details" });

    try {
        const product = await Product.findOne({ id: productId });
        if (!product || !product.sellerEmail) {
            return res.status(404).json({ error: "Seller details not found for this product" });
        }

        const emailHtml = `
            <div style="font-family: Arial, sans-serif; padding: 20px; background: #070a13; color: #fff; border-radius: 12px; border: 1px solid #f97316;">
                <h2 style="color: #f97316;">📦 Product Inquiry for: ${product.title}</h2>
                <p><strong>From Buyer:</strong> ${buyerName || 'Customer'} (${buyerEmail})</p>
                <blockquote style="background: #0f172a; padding: 12px; border-left: 4px solid #f97316; margin: 15px 0; color: #e2e8f0;">${message}</blockquote>
                <p style="font-size: 12px; color: #94a3b8;">You can reply directly to this email to respond to the buyer.</p>
            </div>
        `;

        await sendHtmlEmail(product.sellerEmail, `Product Question: ${product.title}`, emailHtml, buyerEmail);
        res.json({ success: true, message: "Inquiry sent directly to seller email!" });
    } catch (e) {
        res.status(500).json({ error: "Failed to dispatch question to seller" });
    }
});

app.get('/api/products', async (req, res) => {
    try {
        const approvedProducts = await Product.find({ status: 'approved' });
        res.json(approvedProducts);
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.get('/api/products/seller/:email', async (req, res) => {
    try {
        const sellerProducts = await Product.find({ sellerEmail: req.params.email.toLowerCase() });
        res.json(sellerProducts);
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

// UPDATE PRODUCT ENDPOINT
app.put('/api/products/update/:id', async (req, res) => {
    const { title, price, description, category, images, videoUrl, sellerEmail, sellerPhone } = req.body;
    try {
        const product = await Product.findOne({ id: req.params.id });
        if (!product) return res.status(404).json({ error: "Product not found" });

        if (title) product.title = title;
        if (price) product.price = parseFloat(price);
        if (description) product.description = description;
        if (category) product.category = category;
        if (sellerEmail) product.sellerEmail = sellerEmail.toLowerCase();
        if (sellerPhone) product.sellerPhone = sellerPhone;
        if (images && images.length > 0) {
            product.images = images;
            product.imageUrl = images[0];
        }
        if (videoUrl !== undefined) product.videoUrl = videoUrl;

        await product.save();
        res.json({ success: true, product });
    } catch (e) { res.status(500).json({ error: "Update failed" }); }
});

app.delete('/api/products/delete/:id', async (req, res) => {
    try {
        await Product.deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

// 1. ADD NEW PRODUCT (APPROVAL REQUEST TO ADMIN ONLY WITH APPROVE BUTTON & SELLER INFO)
app.post('/api/products', async (req, res) => {
    const { title, price, description, category, images, imageUrl, videoUrl, sellerEmail, sellerPhone } = req.body;
    try {
        const productId = Date.now().toString();
        const imgList = (images && images.length > 0) ? images : [imageUrl];
        
        const newProduct = new Product({ 
            id: productId, 
            title, 
            price: parseFloat(price), 
            description, 
            category: category || 'electronics', 
            imageUrl: imgList[0],
            images: imgList, 
            videoUrl: videoUrl || null,
            sellerEmail: sellerEmail.toLowerCase(),
            sellerPhone: sellerPhone || 'N/A' 
        });
        await newProduct.save();

        const approveUrl = `${LIVE_DOMAIN}/api/products/approve/${productId}`;
        
        // HTML Template for Admin Verification with Approve Button & Full Details
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; padding: 20px; background: #070a13; color: #ffffff; border-radius: 12px; border: 1px solid #f97316; max-width: 600px;">
                <h2 style="color: #f97316; margin-top: 0;">🛡️ New Product Approval Pending</h2>
                
                <div style="background: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <h3 style="color: #38bdf8; margin-top: 0;">👤 Seller Information</h3>
                    <p style="margin: 5px 0;"><strong>Seller Email:</strong> ${sellerEmail}</p>
                    <p style="margin: 5px 0;"><strong>Seller Phone:</strong> ${sellerPhone || 'N/A'}</p>
                </div>

                <div style="background: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="color: #38bdf8; margin-top: 0;">📦 Product Details</h3>
                    <p style="margin: 5px 0;"><strong>Title:</strong> ${title}</p>
                    <p style="margin: 5px 0;"><strong>Price:</strong> PKR ${price}</p>
                    <p style="margin: 5px 0;"><strong>Category:</strong> ${category}</p>
                    <p style="margin: 5px 0;"><strong>Description:</strong> ${description || 'N/A'}</p>
                    ${imgList[0] ? `<img src="${imgList[0]}" alt="${title}" style="max-width: 200px; border-radius: 8px; margin-top: 10px; border: 1px solid #334155;" />` : ''}
                </div>

                <div style="text-align: center; margin-top: 25px;">
                    <a href="${approveUrl}" style="background-color: #10b981; color: #ffffff; padding: 14px 28px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 16px;">
                        ✅ Approve & Publish Product Live
                    </a>
                </div>
            </div>
        `;

        // Notification only sent to ADMIN_EMAIL
        await sendHtmlEmail(ADMIN_EMAIL, `Review Request: ${title}`, emailHtml);

        res.status(201).json({ message: "Product submitted for admin review." });
    } catch (error) { res.status(500).json({ error: "Error submitting product" }); }
});

app.get('/api/products/approve/:id', async (req, res) => {
    try {
        const product = await Product.findOne({ id: req.params.id });
        if (!product) return res.send("Not Found");
        product.status = 'approved';
        await product.save();
        
        // Notify Seller after approval
        await sendHtmlEmail(product.sellerEmail, `🚀 Your Product is Live!`, `
            <div style="font-family: Arial, sans-serif; padding: 20px; background: #070a13; color: #fff; border-radius: 12px; border: 1px solid #10b981;">
                <h2 style="color: #10b981;">🎉 Product Approved!</h2>
                <p>Your product <strong>"${product.title}"</strong> has been approved and is now live on the store!</p>
            </div>
        `);
        res.send("<h1 style='font-family:sans-serif; color:#10b981; text-align:center; padding-top:50px;'>✅ Product Approved & Live!</h1>");
    } catch (e) { res.send("Error approving product"); }
});

// 2. NEW ORDERS (NOTIFICATION TO BUYER, SELLER & ADMIN)
app.post('/api/orders', async (req, res) => {
    const { items, buyerName, buyerEmail, buyerPhone, buyerAddress } = req.body;
    try {
        for (const item of items) {
            const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
            const newOrder = new Order({ 
                id: orderId, 
                productId: item.id, 
                title: item.title, 
                price: item.price, 
                quantity: item.quantity, 
                buyerEmail, 
                buyerName, 
                buyerPhone, 
                buyerAddress 
            });
            await newOrder.save();

            // Fetch Seller Email from DB for this specific product
            const dbProduct = await Product.findOne({ id: item.id });
            const sellerEmail = dbProduct ? dbProduct.sellerEmail : null;

            const orderHtml = `
                <div style="font-family: Arial, sans-serif; padding: 20px; background: #070a13; color: #ffffff; border-radius: 12px; border: 1px solid #f97316; max-width: 600px;">
                    <h2 style="color: #f97316; margin-top: 0;">🛒 Order Confirmation [${orderId}]</h2>
                    
                    <div style="background: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                        <h3 style="color: #38bdf8; margin-top: 0;">👤 Buyer Information</h3>
                        <p style="margin: 5px 0;"><strong>Name:</strong> ${buyerName}</p>
                        <p style="margin: 5px 0;"><strong>Email:</strong> ${buyerEmail}</p>
                        <p style="margin: 5px 0;"><strong>Phone:</strong> ${buyerPhone}</p>
                        <p style="margin: 5px 0;"><strong>Address:</strong> ${buyerAddress}</p>
                    </div>

                    <div style="background: #0f172a; padding: 15px; border-radius: 8px;">
                        <h3 style="color: #38bdf8; margin-top: 0;">📦 Product Ordered</h3>
                        <p style="margin: 5px 0;"><strong>Product Title:</strong> ${item.title}</p>
                        <p style="margin: 5px 0;"><strong>Quantity:</strong> ${item.quantity}</p>
                        <p style="margin: 5px 0;"><strong>Price per Unit:</strong> PKR ${item.price}</p>
                        <p style="margin: 5px 0;"><strong>Total Amount:</strong> PKR ${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                </div>
            `;

            // 1. Send to Buyer
            await sendHtmlEmail(buyerEmail, `Order Placed Successfully: ${orderId}`, orderHtml);
            // 2. Send to Admin
            await sendHtmlEmail(ADMIN_EMAIL, `New Store Order [${orderId}]`, orderHtml);
            // 3. Send to Seller (if available)
            if (sellerEmail) {
                await sendHtmlEmail(sellerEmail, `New Order Received for ${item.title} [${orderId}]`, orderHtml);
            }
        }
        res.json({ message: "Dispatched order pipelines." });
    } catch (error) { res.status(500).json({ error: "Error processing orders" }); }
});

// 3. ORDER CANCELLATION (NOTIFICATION TO SELLER & ADMIN WITH COMPLETE DETAILS)
app.post('/api/orders/cancel', async (req, res) => {
    const { orderId, productTitle, sellerEmail, cancelledBy } = req.body;
    try {
        const orderDetails = await Order.findOne({ id: orderId });
        await Order.deleteOne({ id: orderId });

        const buyerInfo = orderDetails ? `
            <p style="margin: 5px 0;"><strong>Buyer Name:</strong> ${orderDetails.buyerName}</p>
            <p style="margin: 5px 0;"><strong>Buyer Email:</strong> ${orderDetails.buyerEmail}</p>
            <p style="margin: 5px 0;"><strong>Buyer Phone:</strong> ${orderDetails.buyerPhone}</p>
        ` : `<p style="margin: 5px 0;">Order history cleared.</p>`;

        const cancellationHtml = `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #070a13; color: #f3f4f6; border-radius: 12px; border: 1px solid #ef4444; max-width: 600px;">
                <h3 style="color: #ef4444; margin-top: 0;">❌ Order Cancellation Notice</h3>
                
                <div style="background: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <p style="margin: 5px 0;"><strong>Order ID:</strong> ${orderId}</p>
                    <p style="margin: 5px 0;"><strong>Product Title:</strong> ${productTitle}</p>
                    <p style="margin: 5px 0;"><strong>Cancelled By:</strong> ${cancelledBy || 'User'}</p>
                </div>

                <div style="background: #0f172a; padding: 15px; border-radius: 8px;">
                    <h4 style="color: #38bdf8; margin-top: 0;">Buyer Details</h4>
                    ${buyerInfo}
                </div>
            </div>
        `;

        // 1. Send to Admin
        await sendHtmlEmail(ADMIN_EMAIL, `Order Cancelled: ${orderId}`, cancellationHtml);
        
        // 2. Send to Seller
        if (sellerEmail && sellerEmail.trim() !== '') {
            await sendHtmlEmail(sellerEmail.trim(), `Order Cancelled Notice: ${orderId}`, cancellationHtml);
        }

        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Pipeline failure" }); }
});

app.get(/^\/(?!api).*/, (req, res) => { res.sendFile(path.join(rootPath, 'index.html')); });

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server executing safely on port ${PORT}`));
}
module.exports = app;
