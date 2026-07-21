const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

const PORT = process.env.PORT || 5000;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'lagharitahir08@gmail.com';
const LIVE_DOMAIN = process.env.LIVE_DOMAIN || 'https://mt-store-sandy.vercel.app';

// MongoDB Connection
if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => console.log('MongoDB Connected'))
        .catch(err => console.error('MongoDB Connection Error:', err));
}

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    }
});

const sendHtmlEmail = async (to, subject, htmlContent, replyTo = null) => {
    if (!to) return;
    try {
        await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to,
            subject,
            html: htmlContent,
            replyTo: replyTo || undefined
        });
    } catch (e) {
        console.error("Email send error:", e);
    }
};

// Database Schemas
const CommentSchema = new mongoose.Schema({
    userEmail: String,
    userName: String,
    text: String,
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

const ChatMessageSchema = new mongoose.Schema({
    userEmail: { type: String, lowercase: true, required: true },
    sender: { type: String, required: true }, // 'user' or 'admin'
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', ChatMessageSchema);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes

// 1. Get Approved Products
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find({ status: 'approved' }).sort({ createdAt: -1 });
        res.json(products);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch products" });
    }
});

// 2. Create Product (Pipeline Pending)
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
            sellerPhone,
            status: 'pending'
        });
        await newProduct.save();

        const approveUrl = `${LIVE_DOMAIN}/api/products/approve/${productId}`;
        const emailHtml = `
            <h2>Product Review Pipeline Pending</h2>
            <p><strong>Title:</strong> ${title}</p>
            <p><strong>Price:</strong> PKR ${price}</p>
            <p><strong>Vendor Email:</strong> ${sellerEmail}</p>
            <p><strong>Vendor Phone:</strong> ${sellerPhone || 'N/A'}</p>
            <br>
            <a href="${approveUrl}" style="background: #f97316; color: #fff; padding: 10px 18px; border-radius: 6px; text-decoration: none;">Click to Live Verify & Approve Item</a>
        `;
        await sendHtmlEmail(ADMIN_EMAIL, `Approve Product: ${title}`, emailHtml);

        res.status(201).json({ message: "Dispatched pipeline successfully.", product: newProduct });
    } catch (error) { 
        res.status(500).json({ error: "Error submitting product" }); 
    }
});

// 3. Update Product
app.put('/api/products/update/:id', async (req, res) => {
    const { title, price, description, category, images, videoUrl, sellerEmail, sellerPhone } = req.body;
    try {
        const product = await Product.findOne({ id: req.params.id });
        if (!product) return res.status(404).json({ error: "Product not found" });

        if (title) product.title = title;
        if (price) product.price = parseFloat(price);
        if (description) product.description = description;
        if (category) product.category = category;
        if (sellerEmail) product.sellerEmail = sellerEmail;
        if (sellerPhone) product.sellerPhone = sellerPhone;
        if (images && images.length > 0) {
            product.images = images;
            product.imageUrl = images[0];
        }
        if (videoUrl !== undefined) product.videoUrl = videoUrl;

        await product.save();
        res.json({ success: true, product });
    } catch (e) { 
        res.status(500).json({ error: "Update failed" }); 
    }
});

// 4. Approve Product
app.get('/api/products/approve/:id', async (req, res) => {
    try {
        const product = await Product.findOne({ id: req.params.id });
        if (!product) return res.status(404).send("Product not found");
        
        product.status = 'approved';
        await product.save();
        res.send(`<h2>Product "${product.title}" has been approved and is now LIVE!</h2><a href="${LIVE_DOMAIN}">Go to Store</a>`);
    } catch (e) {
        res.status(500).send("Error approving product");
    }
});

// 5. Add Comment
app.post('/api/products/:id/comment', async (req, res) => {
    const { userEmail, userName, text } = req.body;
    try {
        const product = await Product.findOne({ id: req.params.id });
        if (!product) return res.status(404).json({ error: "Product not found" });

        product.comments.push({ userEmail, userName, text });
        await product.save();
        res.json({ success: true, comments: product.comments });
    } catch (e) {
        res.status(500).json({ error: "Failed to add comment" });
    }
});

// 6. Live Chat Messages
app.get('/api/chat/messages', async (req, res) => {
    const { userEmail } = req.query;
    if (!userEmail) return res.status(400).json({ error: "userEmail required" });
    try {
        const messages = await ChatMessage.find({ userEmail: userEmail.toLowerCase() }).sort({ timestamp: 1 });
        res.json(messages);
    } catch (e) {
        res.status(500).json({ error: "Error fetching messages" });
    }
});

// 7. Send Chat / Inquiry Message
app.post('/api/chat/send', async (req, res) => {
    const { userEmail, sender, message, userName, targetSellerEmail } = req.body;
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
                    <h2 style="color: #f97316;">💬 New Product Query / Support Message from ${userName || userEmail}</h2>
                    <blockquote style="background: #0f172a; padding: 12px; border-left: 4px solid #f97316; margin: 15px 0; color: #e2e8f0;">${message}</blockquote>
                    <a href="${replyUrl}" style="display: inline-block; background: #f97316; color: #000; padding: 12px 20px; border-radius: 8px; font-weight: bold; text-decoration: none; margin-top: 10px;">Type Answer / Reply Directly</a>
                </div>
            `;
            
            const recipientEmail = targetSellerEmail ? targetSellerEmail.toLowerCase() : ADMIN_EMAIL;
            await sendHtmlEmail(recipientEmail, `Product Inquiry from ${userName || userEmail}`, emailHtml, userEmail);
        }

        res.json({ success: true, chatMsg });
    } catch (e) { 
        res.status(500).json({ error: "Error sending chat message" }); 
    }
});

// Admin Reply Web Page
app.get('/api/chat/admin-reply-page', (req, res) => {
    const { userEmail } = req.query;
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Reply to User</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-slate-950 text-white min-h-screen flex items-center justify-center p-4">
            <div class="bg-slate-900 border border-gray-800 p-6 rounded-2xl max-w-md w-full">
                <h2 class="text-xl font-bold text-orange-500 mb-2">Reply to ${userEmail}</h2>
                <form action="/api/chat/admin-reply" method="POST" class="space-y-4">
                    <input type="hidden" name="userEmail" value="${userEmail}">
                    <textarea name="message" required rows="4" placeholder="Write reply message..." class="w-full bg-slate-950 border border-gray-800 rounded-xl p-3 text-sm text-white focus:border-orange-500 outline-none"></textarea>
                    <button type="submit" class="w-full bg-orange-500 text-slate-950 font-bold py-3 rounded-xl uppercase text-xs">Send Direct Reply</button>
                </form>
            </div>
        </body>
        </html>
    `);
});

app.post('/api/chat/admin-reply', async (req, res) => {
    const { userEmail, message } = req.body;
    try {
        const chatMsg = new ChatMessage({
            userEmail: userEmail.toLowerCase(),
            sender: 'admin',
            message
        });
        await chatMsg.save();
        res.send(`<h2>Reply Sent Successfully to ${userEmail}!</h2><p>You can close this tab.</p>`);
    } catch (e) {
        res.status(500).send("Failed to send reply.");
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
