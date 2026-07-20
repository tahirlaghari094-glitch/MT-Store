const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// 1. DATABASE CONNECTION
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mt-store')
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// 2. PRODUCT SCHEMA (With New Fields)
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
    user: process.env.ADMIN_EMAIL,       // Aapki Admin Email (Environment Variable)
    pass: process.env.EMAIL_PASSWORD     // Gmail App Password
  }
});

// 5. API: ADD NEW PRODUCT & SEND APPROVAL EMAIL TO ADMIN
app.post('/api/products/add', async (req, res) => {
  try {
    const { title, price, image, category, description, sellerName, sellerEmail, sellerPhone, shopAddress, easypaisaReceipt } = req.body;
    
    const newProduct = new Product({
      title, price, image, category, description, sellerName, sellerEmail, sellerPhone, shopAddress, easypaisaReceipt, status: 'pending'
    });
    
    await newProduct.save();

    // Admin ke liye direct verification & approval button link
    const approvalLink = `${req.protocol}://${req.get('host')}/api/products/approve/${newProduct._id}`;
    
    const adminMailOptions = {
      from: process.env.ADMIN_EMAIL,
      to: process.env.ADMIN_EMAIL,
      subject: `🚨 New Product Approval Required: ${title}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; max-width: 600px; margin: auto; border-radius: 8px;">
          <h2 style="color: #f97316; text-align: center;">New Product Pending Approval</h2>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          
          <h3 style="color: #1e293b;">🛒 Product Details:</h3>
          <p><strong>Title:</strong> ${title}</p>
          <p><strong>Price:</strong> PKR ${price}</p>
          <p><strong>Category:</strong> ${category}</p>
          <p><strong>Description:</strong> ${description}</p>
          <p style="background-color: #fef3c7; padding: 10px; border-radius: 4px; border-left: 4px solid #f59e0b;">
            <strong>Easypaisa Receipt ID:</strong> ${easypaisaReceipt}
          </p>
          
          <h3 style="color: #1e293b; margin-top: 20px;">👤 Seller Details:</h3>
          <p><strong>Name:</strong> ${sellerName}</p>
          <p><strong>Email:</strong> ${sellerEmail}</p>
          <p><strong>Phone:</strong> ${sellerPhone}</p>
          <p><strong>Shop Address:</strong> ${shopAddress}</p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${approvalLink}" style="background-color: #22c55e; color: white; padding: 14px 30px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">✓ APPROVE PRODUCT NOW</a>
          </div>
        </div>
      `
    };

    await transporter.sendMail(adminMailOptions);
    res.status(201).json({ success: true, message: 'Product submitted successfully. Pending Admin Approval.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. API: APPROVE PRODUCT VIA LINK CLICK
app.get('/api/products/approve/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
    if (!product) return res.status(404).send('Product not found.');
    
    res.send(`
      <div style="text-align:center; font-family:Arial, sans-serif; padding:50px; background-color: #f8fafc; height: 100vh;">
        <div style="max-width: 500px; margin: auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <h1 style="color:#22c55e; margin-bottom: 10px;">✓ Approved Successfully!</h1>
          <p style="color: #475569; font-size: 16px;">Product <strong>"${product.title}"</strong> is now live on MT Store.</p>
        </div>
      </div>
    `);
  } catch (error) {
    res.status(500).send('Error approving product.');
  }
});

// 7. API: GET APPROVED PRODUCTS ONLY
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({ status: 'approved' });
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. API: ORDER CHECKOUT & SELLER/ADMIN NOTIFICATIONS
app.post('/api/orders/checkout', async (req, res) => {
  try {
    const { items, buyerDetails } = req.body;
    const newOrder = new Order({ items, buyerDetails });
    await newOrder.save();

    for (let item of items) {
      const productInfo = await Product.findById(item.id || item._id);
      
      // Dynamic Email Router: Agar product ka specific seller email hai toh wahan notification bhejein
      const targetSellerEmail = productInfo && productInfo.sellerEmail ? productInfo.sellerEmail : process.env.ADMIN_EMAIL;

      const orderEmailTemplate = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; max-width: 600px; margin: auto; border-radius: 8px;">
          <h2 style="color: #f97316; text-align: center;">📦 New Order Notification!</h2>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          
          <h3 style="color: #1e293b;">🛒 Ordered Item:</h3>
          <p><strong>Item Name:</strong> ${item.title}</p>
          <p><strong>Price:</strong> PKR ${item.price}</p>
          <p><strong>Quantity:</strong> ${item.quantity || 1}</p>
          
          <h3 style="color: #1e293b; margin-top: 20px;">📍 Buyer Delivery Info:</h3>
          <p><strong>Name:</strong> ${buyerDetails.name}</p>
          <p><strong>Phone:</strong> ${buyerDetails.phone}</p>
          <p><strong>Shipping Address:</strong> ${buyerDetails.address}</p>
          
          <h3 style="color: #1e293b; margin-top: 20px;">🏪 Seller Details:</h3>
          <p><strong>Shop/Seller Name:</strong> ${productInfo ? productInfo.sellerName : 'N/A'}</p>
          <p><strong>Contact:</strong> ${productInfo ? productInfo.sellerPhone : 'N/A'}</p>
          <p><strong>Shop Location:</strong> ${productInfo ? productInfo.shopAddress : 'N/A'}</p>
        </div>
      `;

      // 1. Notification Send to Seller (Jo product upload karte waqt usne apni email lagayi thi)
      await transporter.sendMail({
        from: process.env.ADMIN_EMAIL,
        to: targetSellerEmail,
        subject: `🛒 New Order Received for "${item.title}"`,
        html: orderEmailTemplate
      });

      // 2. Alert Send to Admin (Taake admin ke paas bhi track record rahe)
      if (targetSellerEmail !== process.env.ADMIN_EMAIL) {
        await transporter.sendMail({
          from: process.env.ADMIN_EMAIL,
          to: process.env.ADMIN_EMAIL,
          subject: `🔔 Admin Alert: Order Logged for ${item.title}`,
          html: orderEmailTemplate
        });
      }
    }

    res.status(200).json({ success: true, message: 'Order placed and notifications routed successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running smoothly on port ${PORT}`));
