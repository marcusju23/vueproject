import express from 'express';
import axios from 'axios';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import { ObjectId } from 'mongodb';

const app = express();
app.use(cors());
app.use(express.json());

const EXTERNAL_API_BASE_URL = 'https://fakestoreapi.com';
const mongoUrl = process.env.MONGO_URL || 'mongodb://vueproject-group7-mongo-1:27017/mydb';
let db;

const connectWithRetry = async () => {
    for (let i = 0; i < 10; i++) {
        try {
            const client = new MongoClient(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
            await client.connect();
            console.log("Connected to MongoDB!");
            return client.db();
        } catch (err) {
            console.error("MongoDB connection unsuccessful, retrying in 5 seconds...", err);
            await new Promise(res => setTimeout(res, 5000));
        }
    }
    throw new Error("Could not connect to MongoDB after several attempts");
};

app.get('/api/products', async (req, res) => {
    try {
        const response = await axios.get(`${EXTERNAL_API_BASE_URL}/products`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

app.get('/api/products/:id', async (req, res) => {
    const productId = req.params.id;
    try {
        const response = await axios.get(`${EXTERNAL_API_BASE_URL}/products/${productId}`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

connectWithRetry()
    .then((database) => {
        db = database;

        app.get('/api/orders', async (req, res) => {
            try {
                const orders = await db.collection('orders').find().toArray();
                res.json(orders);
            } catch (error) {
                console.error('Error fetching orders:', error);
                res.status(500).json({ error: 'Failed to fetch orders' });
            }
        });

        app.get('/api/orders/:id', async (req, res) => {
            const orderId = req.params.id;
            const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId) });
            res.json(order);
        });

        app.post('/api/orders', async (req, res) => {
            const newOrder = req.body;
            try {
                const result = await db.collection('orders').insertOne(newOrder);
                res.status(201).json({ id: result.insertedId, ...newOrder });
            } catch (error) {
                console.error('Error creating order:', error);
                res.status(500).json({ error: 'Failed to create order' });
            }
        });        

        app.put('/api/orders/:id', async (req, res) => {
            const orderId = req.params.id;
            const updatedOrder = req.body;
        
            try {
                console.log('PUT request received for order ID:', orderId, 'with body:', updatedOrder);
        
                const result = await db.collection('orders').updateOne(
                    { _id: new ObjectId(orderId) },
                    { $set: updatedOrder }
                );
        
                if (result.modifiedCount === 0) {
                    return res.status(404).json({ error: 'Order not found or no changes made' });
                }
                res.json(updatedOrder);
            } catch (error) {
                console.error('Error updating order:', error);
                res.status(500).json({ error: 'Failed to update order', details: error.message });
            }
        });
        

        app.delete('/api/orders/:id', async (req, res) => {
            const orderId = req.params.id;
            
            try {
                const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId) });
                
                if (!order) {
                    return res.status(404).json({ error: 'Order not found' });
                }
        
                const result = await db.collection('orders').deleteOne({ _id: new ObjectId(orderId) });
        
                if (result.deletedCount === 0) {
                    return res.status(404).json({ error: 'Order not found' });
                }
        
                res.status(204).send();
            } catch (error) {
                console.error('Error deleting order:', error);
                res.status(500).json({ error: 'Failed to delete order' });
            }
        });
               

        const PORT = process.env.PORT || 4000;
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Error starting server:', error);
    });
