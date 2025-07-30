const { v4: uuidv4 } = require('uuid');

// Create a new order from pharmacy to institute
const createPharmacyOrder = async (req, res) => {
  const db = req.app.locals.db;
  const { items, recipient_id, notes } = req.body;
  const userId = req.user.id;

  console.log('Incoming pharmacy order request:', {
    userId,
    itemsCount: items?.length,
    recipient_id,
    notes,
  });

  // Validate request
  if (!items || !Array.isArray(items) || items.length === 0) {
    console.error('Validation failed: Invalid items array');
    return res.status(400).json({
      status: false,
      message: 'Items must be a non-empty array',
    });
  }

  if (!recipient_id) {
    console.error('Validation failed: Recipient ID required');
    return res.status(400).json({
      status: false,
      message: 'Recipient institute ID is required',
    });
  }

  try {
    await db.query('BEGIN');
    console.log('Transaction started');

    // Verify recipient is an institute
    const recipientCheck = await db.query(
      'SELECT id, role FROM users WHERE id = $1 AND role = $2',
      [recipient_id, 'institute']
    );

    if (recipientCheck.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(400).json({
        status: false,
        message: 'Recipient must be a valid institute',
      });
    }

    const orderNo = `PHARM-ORD-${uuidv4().substring(0, 8).toUpperCase()}`;
    console.log('Generated order number:', orderNo);

    // Create the main order record
    const orderResult = await db.query(
      `INSERT INTO orders (order_no, user_id, recipient_id, transaction_type, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [orderNo, userId, recipient_id, 'institute', notes || null]
    );

    const orderId = orderResult.rows[0].id;
    console.log('Created order with ID:', orderId);

    let totalAmount = 0;

    // Process items
    for (const [index, item] of items.entries()) {
      console.log(`Processing item ${index + 1}:`, item);

      if (!item.drug_id || !item.quantity) {
        console.error('Missing drug_id or quantity for item:', item);
        await db.query('ROLLBACK');
        return res.status(400).json({
          status: false,
          message: 'Drug ID and quantity are required for all items',
        });
      }

      // Check drug availability at the institute
      const drugResult = await db.query(
        `SELECT id, name, stock, price FROM drugs 
         WHERE id = $1 AND created_by = $2`,
        [item.drug_id, recipient_id]
      );

      if (drugResult.rows.length === 0) {
        console.error('Drug not found at institute:', item.drug_id);
        await db.query('ROLLBACK');
        return res.status(404).json({
          status: false,
          message: `Drug with ID ${item.drug_id} not available at this institute`,
        });
      }

      const drug = drugResult.rows[0];
      const unit_price = drug.price;

      if (drug.stock < item.quantity) {
        console.error('Insufficient stock:', {
          drugId: item.drug_id,
          requested: item.quantity,
          available: drug.stock,
        });
        await db.query('ROLLBACK');
        return res.status(400).json({
          status: false,
          message: `Insufficient stock for drug ${drug.name} (Available: ${drug.stock})`,
        });
      }

      // Create order item (status will be pending by default)
      await db.query(
        `INSERT INTO order_items 
         (order_id, drug_id, quantity, unit_price, seller_id, source_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          orderId,
          item.drug_id,
          item.quantity,
          unit_price,
          recipient_id,
          'institute',
        ]
      );

      totalAmount += unit_price * item.quantity;
    }

    // Update the order total
    await db.query(`UPDATE orders SET total_amount = $1 WHERE id = $2`, [
      totalAmount,
      orderId,
    ]);

    await db.query('COMMIT');
    console.log('Transaction committed successfully');

    res.status(201).json({
      status: true,
      message: 'Order created successfully',
      order: {
        id: orderId,
        order_no: orderNo,
        total_amount: totalAmount,
      },
    });
  } catch (err) {
    console.error('Database error:', err);
    await db.query('ROLLBACK');
    res.status(500).json({
      status: false,
      message: 'Server error while creating order',
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
};

const listPharmacyOrderHistory = async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.user.id;
  const { status, page = 1, limit = 10, search } = req.query;
  const offset = (page - 1) * limit;

  try {
    // Main orders query
    const ordersQuery = `
      SELECT 
        o.id,
        o.order_no,
        o.total_amount,
        o.created_at,
        o.updated_at,
        u.name as recipient_name,
        (
          SELECT COUNT(*) 
          FROM order_items oi 
          WHERE oi.order_id = o.id
        ) as item_count,
        (
          SELECT MIN(status)
          FROM order_items oi
          WHERE oi.order_id = o.id
        ) as overall_status
      FROM orders o
      JOIN users u ON o.recipient_id = u.id
      WHERE o.user_id = $1 AND o.transaction_type = 'institute'
      GROUP BY o.id, u.name
      ORDER BY o.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Count query
    const countQuery = `
      SELECT COUNT(DISTINCT o.id) as total
      FROM orders o
      WHERE o.user_id = $1 AND o.transaction_type = 'institute'
    `;

    const [ordersResult, countResult] = await Promise.all([
      db.query(ordersQuery, [userId]),
      db.query(countQuery, [userId])
    ]);

    // Get items for each order with simplified query
    const ordersWithItems = await Promise.all(
      ordersResult.rows.map(async (order) => {
        const items = await db.query(`
          SELECT 
            oi.id,
            oi.drug_id,
            d.name as drug_name,
            oi.quantity,
            oi.unit_price,
            oi.status,
            oi.batch_no,
            oi.manufacturer_name,
            u.name as seller_name
          FROM order_items oi
          JOIN drugs d ON oi.drug_id = d.id
          JOIN users u ON oi.seller_id = u.id
          WHERE oi.order_id = $1
        `, [order.id]);
        
        return {
          ...order,
          items: items.rows
        };
      })
    );

    res.json({
      status: true,
      orders: ordersWithItems,
      total: parseInt(countResult.rows[0]?.total || 0),
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (err) {
    console.error('Database error:', {
      message: err.message,
      stack: err.stack,
      query: err.query,
      parameters: err.parameters
    });
    res.status(500).json({
      status: false,
      message: 'Server error while fetching order history'
    });
  }
};

const getPharmacyOrderHistoryDetails = async (req, res) => {
  const db = req.app.locals.db;
  const { orderId } = req.params;
  const userId = req.user.id;

  try {
    // Verify the order belongs to this pharmacy
    const orderResult = await db.query(
      `SELECT o.*, u.name as recipient_name
       FROM orders o
       LEFT JOIN users u ON o.recipient_id = u.id
       WHERE o.id = $1 AND o.user_id = $2`,
      [orderId, userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'Order not found or unauthorized',
      });
    }

    const order = orderResult.rows[0];

    // Get order items with their statuses
    const itemsQuery = `
  SELECT 
    oi.id, 
    d.name as drug_name,
    oi.batch_no,  // Changed from d.batch_no to oi.batch_no
    oi.quantity, 
    oi.unit_price,
    oi.total_price,
    oi.status,
    u.name as seller_name,
    oi.manufacturer_name  // Changed from d.manufacturer_name to oi.manufacturer_name
  FROM order_items oi
  LEFT JOIN drugs d ON oi.drug_id = d.id
  LEFT JOIN users u ON oi.seller_id = u.id
  WHERE oi.order_id = $1
  ORDER BY oi.created_at
`;

    const itemsResult = await db.query(itemsQuery, [orderId]);

    res.json({
      status: true,
      order: {
        ...order,
        items: itemsResult.rows,
      },
    });
  } catch (err) {
    console.error('Error in getPharmacyOrderHistoryDetails:', err);
    res.status(500).json({
      status: false,
      message: 'Server error while fetching order details',
      error: err.message,
    });
  }
};

module.exports = {
  createPharmacyOrder,
  listPharmacyOrderHistory,
  getPharmacyOrderHistoryDetails,
};
