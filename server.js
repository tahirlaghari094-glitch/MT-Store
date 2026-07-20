const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path'); // Static path serve karne ke liye naya required package
require('dotenv').config();

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// 1. DATABASE CONNECTION
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mt-store', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected Successfully'))
.catch(err => console.error('MongoDB Connection Error:', err));

// 2. PRODUCT SCHEMA
const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  sellerName: { type: String, required: true },
  sellerEmail: { type: String, required: true }, 
  sellerPhone: { type: String, required: true },
  shopAddress: { type: String, required: true },
  easypaisaReceipt: { type: String, required: true },
  status: { type: String, default: 'pending' }, 
  createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

// 3. ORDER SCHEMA
const orderSchema = new mongoose.Schema({
  items: { type: Array, required: true },
  buyerDetails: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

// 4. NODEMAILER TRANSPORTER SETUP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.ADMIN_EMAIL,       
    pass: process.env.EMAIL_PASSWORD     
  }
});

// 5. API: GET APPROVED PRODUCTS
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({ status: 'approved' }).sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. API: ADD NEW PRODUCT
app.post('/api/products/add', async (req, res) => {
  try {
    const { title, price, image, category, description, sellerName, sellerEmail, sellerPhone, shopAddress, easypaisaReceipt } = req.body;
    
    const newProduct = new Product({
      title, price, image, category, description, sellerName, sellerEmail, sellerPhone, shopAddress, easypaisaReceipt, status: 'pending'
    });
    
    await newProduct.save();

    const approvalLink = `${req.protocol}://${req.get('host')}/api/products/approve/${newProduct._id}`;
    
    const adminMailOptions = {
      from: process.env.ADMIN_EMAIL,
      to: process.env.ADMIN_EMAIL,
      subject: `🚨 New Product Approval Required: ${title}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; max-width: 600px; margin: auto; border-radius: 8px; background-color: #ffffff; color: #333333;">
          <h2 style="color: #f97316; text-align: center; border-bottom: 2px solid #f97316; padding-bottom: 10px;">New Product Pending Approval</h2>
          <h3 style="color: #1e293b; margin-top: 20px;">🛒 Product Details:</h3>
          <p><strong>Title:</strong> ${title}</p>
          <p><strong>Price:</strong> PKR ${price}</p>
          <p><strong>Category:</strong> ${category}</p>
          <p><strong>Description:</strong> ${description}</p>
          <p style="background-color: #fef3c7; padding: 12px; border-radius: 6px; border-left: 5px solid #f59e0b; font-weight: bold;">
            ⚠️ Easypaisa Receipt ID: ${easypaisaReceipt}
          </p>
          <h3 style="color: #1e293b; margin-top: 20px;">👤 Vendor Details:</h3>
          <p><strong>Shop/Seller Name:</strong> ${sellerName}</p>
          <p><strong>Email Address:</strong> ${sellerEmail}</p>
          <p><strong>Phone:</strong> ${sellerPhone}</p>
          <p><strong>Physical Address:</strong> ${shopAddress}</p>
          <div style="text-align: center; margin: 35px 0;">
            <a href="${approvalLink}" style="background-color: #22c55e; color: white; padding: 14px 35px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">✓ APPROVE PRODUCT NOW</a>
          </div>
        </div>
      `
    };

    await transporter.sendMail(adminMailOptions);
    res.status(201).json({ success: true, message: 'Product application created.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. API: VERIFY & APPROVE ENDPOINT
app.get('/api/products/approve/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
    if (!product) return res.status(404).send('Product not found.');
    
    res.send(`
      <div style="text-align:center; font-family: sans-serif; padding:60px; background-color: #0f172a; color: #ffffff; height: 100vh; display: flex; align-items: center; justify-content: center;">
        <div style="max-width: 550px; background: #1e293b; padding: 40px; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); border: 1px solid #334155;">
          <h1 style="color:#22c55e; margin-bottom: 12px; font-size: 28px;">Product Activation Complete</h1>
          <p style="color: #cbd5e1; font-size: 16px;">The item listing <strong>"${product.title}"</strong> is now live.</p>
        </div>
      </div>
    `);
  } catch (error) {
    res.status(500).send('Error during activation.');
  }
});

// 8. API: DYNAMIC ORDER CHECKOUT
app.post('/api/orders/checkout', async (req, res) => {
  try {
    const { items, buyerDetails } = req.body;
    const newOrder = new Order({ items, buyerDetails });
    await newOrder.save();

    for (let item of items) {
      const productInfo = await Product.findById(item.id || item._id);
      const targetSellerEmail = productInfo && productInfo.sellerEmail ? productInfo.sellerEmail : process.env.ADMIN_EMAIL;

      const orderEmailTemplate = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; max-width: 600px; margin: auto; border-radius: 8px;">
          <h2>📦 New Order Processing Request</h2>
          <p><strong>Product Name:</strong> ${item.title}</p>
          <p><strong>Unit Price Total:</strong> PKR ${item.price}</p>
          <h3>📍 Customer Delivery Profile:</h3>
          <p><strong>Recipient Name:</strong> ${buyerDetails.name}</p>
          <p><strong>Contact Phone Line:</strong> ${buyerDetails.phone}</p>
          <p><strong>Destination Drop Address:</strong> ${buyerDetails.address}</p>
        </div>
      `;

      await transporter.sendMail({
        from: process.env.ADMIN_EMAIL,
        to: targetSellerEmail,
        subject: `🎯 New Order Dispatched: "${item.title}"`,
        html: orderEmailTemplate
      });

      if (targetSellerEmail !== process.env.ADMIN_EMAIL) {
        await transporter.sendMail({
          from: process.env.ADMIN_EMAIL,
          to: process.env.ADMIN_EMAIL,
          subject: `🔔 Admin System Log: Order recorded`,
          html: orderEmailTemplate
        });
      }
    }

    res.status(200).json({ success: true, message: 'Order workflows executed.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// === STATIC FILE SERVING FOR FRONTEND (Cannot GET / FIX) ===
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Failure" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server operational on port ${PORT}`));
