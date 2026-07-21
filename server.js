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

// LIVE CHAT MESSAGE SCHEMA
const ChatMessageSchema = new mongoose.Schema({
    userEmail: { type: String, required: true, lowercase: true },
    sellerEmail: { type: String, lowercase: true },
    sender: { type: String, required: true }, // 'user', 'admin', or 'seller'
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
    const { userEmail, sellerEmail, sender, message, userName, productTitle } = req.body;
    if (!message || !userEmail) return res.status(400).json({ error: "Missing data" });

    try {
        // Target email calculation: Seller email tab lagaygi jab message Product Page se ho
        const targetEmail = (sellerEmail && sellerEmail.trim() !== '') ? sellerEmail.trim() : ADMIN_EMAIL;

        const chatMsg = new ChatMessage({
            userEmail: userEmail.toLowerCase(),
            sellerEmail: (targetEmail !== ADMIN_EMAIL) ? targetEmail.toLowerCase() : null,
            sender: sender || 'user',
            message
        });
        await chatMsg.save();

        if (sender !== 'admin' && sender !== 'seller') {
            const isSellerQuery = targetEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase();
            const replyUrl = `${LIVE_DOMAIN}/api/chat/admin-reply-page?userEmail=${encodeURIComponent(userEmail)}&sellerEmail=${encodeURIComponent(targetEmail)}`;
            
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; padding: 20px; background: #070a13; color: #fff; border-radius: 12px; border: 1px solid #f97316; max-width: 600px; margin: auto;">
                    <h2 style="color: #f97316; margin-top: 0;">💬 ${isSellerQuery ? 'New Product Customer Inquiry' : 'New Central Support Message'}</h2>
                    <p style="color: #cbd5e1; font-size: 13px;"><strong>From User:</strong> ${userName || userEmail}</p>
                    ${productTitle ? `<p style="color: #38bdf8; font-size: 13px;"><strong>Product Inquired:</strong> ${productTitle}</p>` : ''}
                    <blockquote style="background: #0f172a; padding: 12px; border-left: 4px solid #f97316; margin: 15px 0; color: #e2e8f0; border-radius: 4px;">${message}</blockquote>
                    <div style="text-align: center; margin-top: 15px;">
                        <a href="${replyUrl}" style="display: inline-block; background: #f97316; color: #000; padding: 12px 20px; border-radius: 8px; font-weight: bold; text-decoration: none;">Type Answer / Reply Directly</a>
                    </div>
                </div>
            `;

            const subject = isSellerQuery 
                ? `[Product Inquiry] New question about "${productTitle || 'your item'}"` 
                : `[Support Query] Message from ${userName || userEmail}`;

            await sendHtmlEmail(targetEmail, subject, emailHtml, userEmail);
        }

        res.json({ success: true, chatMsg });
    } catch (e) { res.status(500).json({ error: "Error sending chat message" }); }
});

// QUICK REPLY PAGE FOR ADMIN & SELLERS
app.get('/api/chat/admin-reply-page', (req, res) => {
    const userEmail = req.query.userEmail;
    const sellerEmail = req.query.sellerEmail || '';
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reply to Customer</title>
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-slate-950 text-white min-h-screen p-4 flex items-center justify-center font-sans">
            <div class="bg-slate-900 border border-orange-500/30 p-6 rounded-2xl w-full max-w-md space-y-4">
                <h2 class="text-orange-400 font-bold text-lg">Reply to Customer Query</h2>
                <p class="text-xs text-gray-400">Target User: <span class="text-white font-mono">${userEmail}</span></p>
                <form action="/api/chat/admin-reply-submit" method="POST" class="space-y-3">
                    <input type="hidden" name="userEmail" value="${userEmail}">
                    <input type="hidden" name="sellerEmail" value="${sellerEmail}">
                    <textarea name="message" rows="4" placeholder="Type your answer here..." required class="w-full bg-slate-950 border border-gray-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-orange-500"></textarea>
                    <button type="submit" class="w-full bg-orange-500 text-slate-950 font-black py-3 rounded-xl text-xs uppercase">Send Answer to User Chat</button>
                </form>
            </div>
        </body>
        </html>
    `);
});

app.post('/api/chat/admin-reply-submit', async (req, res) => {
    const { userEmail, sellerEmail, message } = req.body;
    try {
        const isSeller = sellerEmail && sellerEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase();
        const chatMsg = new ChatMessage({
            userEmail: userEmail.toLowerCase(),
            sellerEmail: sellerEmail ? sellerEmail.toLowerCase() : null,
            sender: isSeller ? 'seller' : 'admin',
            message
        });
        await chatMsg.save();
        res.send(`
            <body style="background:#070a13; color:#10b981; font-family:sans-serif; text-align:center; padding-top:50px;">
                <h2>✅ Reply Sent Successfully to Chat Box!</h2>
                <p style="color:#94a3b8; font-size:14px;">The customer will now see your answer directly in the store chat window.</p>
            </body>
        `);
    } catch(e) { res.status(500).send("Error saving reply"); }
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

// UPDATE / EDIT PRODUCT ENDPOINT
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

app.post('/api/products/:id/comments', async (req, res) => {
    const { author, text, rating, media, isPinned } = req.body;
    try {
        const product = await Product.findOne({ id: req.params.id });
        if (!product) return res.status(404).json({ error: "Product not found" });

        product.comments.push({ 
            author, 
            text, 
            rating: rating || 0,
            media: media || [],
            isPinned: !!isPinned 
        });
        await product.save();
        res.json({ success: true, comments: product.comments });
    } catch (e) { res.status(500).json({ error: "Error posting comment" }); }
});

app.get('/api/orders/user/:email', async (req, res) => {
    try {
        const userOrders = await Order.find({ buyerEmail: req.params.email.toLowerCase() });
        const records = [];
        for (let o of userOrders) {
            const p = await Product.findOne({ id: o.productId });
            records.push({ ...o._doc, sellerEmail: p ? p.sellerEmail : '' });
        }
        res.json(records);
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

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
            sellerEmail,
            sellerPhone
        });
        await newProduct.save();

        const approveUrl = `${LIVE_DOMAIN}/api/products/approve/${productId}`;
        const mainImg = imgList[0] || 'https://via.placeholder.com/150';
        
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #070a13; color: #f3f4f6; border-radius: 12px; border: 1px solid #f97316; max-width: 600px; margin: auto;">
                <h2 style="color: #f97316; margin-top: 0;">📦 New Product Approval Request</h2>
                <div style="background-color: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <img src="${mainImg}" alt="${title}" style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 10px; display: block;" />
                    <h3 style="color: #fff; margin: 5px 0;">${title}</h3>
                    <p style="color: #38bdf8; font-weight: bold; margin: 5px 0;">Price: PKR ${price}</p>
                    <p style="color: #94a3b8; font-size: 13px; margin: 5px 0;"><strong>Category:</strong> ${category || 'electronics'}</p>
                    <p style="color: #cbd5e1; font-size: 13px; margin: 10px 0;"><strong>Description:</strong> ${description || 'N/A'}</p>
                </div>
                
                <div style="background-color: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h4 style="color: #f97316; margin-top: 0; margin-bottom: 8px;">👤 Seller Details</h4>
                    <p style="margin: 4px 0; font-size: 13px;"><strong>Seller Email:</strong> ${sellerEmail}</p>
                    <p style="margin: 4px 0; font-size: 13px;"><strong>Seller Phone:</strong> ${sellerPhone || 'N/A'}</p>
                </div>

                <div style="text-align: center; margin-top: 20px;">
                    <a href="${approveUrl}" style="background-color: #22c55e; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 14px;">Approve & Make Product Live</a>
                </div>
            </div>
        `;
        await sendHtmlEmail(ADMIN_EMAIL, `Approve Product: ${title}`, emailHtml);

        res.status(201).json({ message: "Dispatched pipeline." });
    } catch (error) { res.status(500).json({ error: "Error" }); }
});

app.get('/api/products/approve/:id', async (req, res) => {
    try {
        const product = await Product.findOne({ id: req.params.id });
        if (!product) return res.send("Not Found");
        product.status = 'approved';
        await product.save();
        await sendHtmlEmail(product.sellerEmail, `🚀 Item Live Alert!`, `<h2>Your product "${product.title}" is now approved and live on the store!</h2>`);
        res.send("<h1>Approved Live!</h1>");
    } catch (e) { res.send("Error"); }
});

app.post('/api/orders/cancel', async (req, res) => {
    const { orderId, productTitle, sellerEmail, cancelledBy } = req.body;
    try {
        await Order.deleteOne({ id: orderId });
        
        const cancellationHtml = `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #070a13; color: #f3f4f6; border-radius: 12px; border: 1px solid #ef4444; max-width: 600px; margin: auto;">
                <h3 style="color: #ef4444; margin-top: 0;">❌ Order Cancellation Notice</h3>
                <div style="background-color: #0f172a; padding: 15px; border-radius: 8px;">
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Order ID:</strong> ${orderId}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Product Title:</strong> ${productTitle}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Cancelled By:</strong> ${cancelledBy}</p>
                </div>
            </div>
        `;

        await sendHtmlEmail(ADMIN_EMAIL, `Order Cancelled: ${orderId}`, cancellationHtml);
        
        if (sellerEmail && sellerEmail.trim() !== '') {
            await sendHtmlEmail(sellerEmail.trim(), `Cancellation Notice: Order ${orderId}`, cancellationHtml);
        }

        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Pipeline failure" }); }
});

app.post('/api/orders', async (req, res) => {
    const { items, buyerName, buyerEmail, buyerPhone, buyerAddress } = req.body;
    try {
        for (const item of items) {
            const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
            const newOrder = new Order({ id: orderId, productId: item.id, title: item.title, price: item.price, quantity: item.quantity, buyerEmail, buyerName, buyerPhone, buyerAddress });
            await newOrder.save();

            // Product lookup for seller email
            const dbProduct = await Product.findOne({ id: item.id });
            const sellerEmail = (dbProduct && dbProduct.sellerEmail) ? dbProduct.sellerEmail : item.sellerEmail;

            const orderHtml = `
                <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #070a13; color: #f3f4f6; border-radius: 12px; border: 1px solid #f97316; max-width: 600px; margin: auto;">
                    <h2 style="color: #f97316; margin-top: 0;">🛒 Order Notification</h2>
                    <p style="font-size: 14px; color: #cbd5e1;">Order <strong>${orderId}</strong> has been created successfully.</p>
                    
                    <div style="background-color: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                        <h4 style="color: #38bdf8; margin-top: 0; margin-bottom: 8px;">📦 Item Details</h4>
                        <p style="margin: 4px 0; font-size: 13px;"><strong>Product:</strong> ${item.title}</p>
                        <p style="margin: 4px 0; font-size: 13px;"><strong>Price:</strong> PKR ${item.price}</p>
                    </div>

                    <div style="background-color: #0f172a; padding: 15px; border-radius: 8px;">
                        <h4 style="color: #f97316; margin-top: 0; margin-bottom: 8px;">👤 Buyer Details</h4>
                        <p style="margin: 4px 0; font-size: 13px;"><strong>Name:</strong> ${buyerName}</p>
                        <p style="margin: 4px 0; font-size: 13px;"><strong>Email:</strong> ${buyerEmail}</p>
                        <p style="margin: 4px 0; font-size: 13px;"><strong>Phone:</strong> ${buyerPhone}</p>
                        <p style="margin: 4px 0; font-size: 13px;"><strong>Delivery Address:</strong> ${buyerAddress}</p>
                    </div>
                </div>
            `;

            // Send Email to Buyer
            await sendHtmlEmail(buyerEmail, `Order Placed Successfully: ${orderId}`, orderHtml);
            
            // Send Email to Admin
            await sendHtmlEmail(ADMIN_EMAIL, `New Platform Order Request: ${orderId}`, orderHtml);

            // Send Email to Seller (if available)
            if (sellerEmail && sellerEmail.trim() !== '') {
                await sendHtmlEmail(sellerEmail.trim(), `New Order Received for Your Product: ${orderId}`, orderHtml);
            }
        }
        res.json({ message: "Dispatched order pipelines." });
    } catch (error) { res.status(500).json({ error: "Error" }); }
});

app.get(/^\/(?!api).*/, (req, res) => { res.sendFile(path.join(rootPath, 'index.html')); });

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server executing safely on port ${PORT}`));
}
module.exports = app;
