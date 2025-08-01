const { v4: uuidv4 } = require('uuid');

// Create a new order with transaction type handling
const createOrder = async (req, res) => {
  const db = req.app.locals.db;
  const { items, recipient_id, transaction_type, notes } = req.body;
  const userId = req.user.id;

  console.log('Incoming order request:', { 
    userId, 
    transaction_type,
    itemsCount: items?.length,
    recipient_id,
    notes
  });

  // Validate request
  if (!items || !Array.isArray(items) || items.length === 0) {
    console.error('Validation failed: Invalid items array');
    return res.status(400).json({
      status: false,
      message: 'Items must be a non-empty array',
    });
  }

  if (!['institute', 'manufacturer'].includes(transaction_type)) {
    console.error('Validation failed: Invalid transaction type', transaction_type);
    return res.status(400).json({
      status: false,
      message: 'Invalid transaction type',
    });
  }

  try {
    await db.query('BEGIN');
    console.log('Transaction started');

    const orderNo = `ORD-${uuidv4().substring(0, 8).toUpperCase()}`;
    console.log('Generated order number:', orderNo);

    // Create the main order record (without status)
    const orderResult = await db.query(
      `INSERT INTO orders (order_no, user_id, recipient_id, transaction_type, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        orderNo, 
        userId, 
        transaction_type === 'institute' ? recipient_id : null,
        transaction_type, 
        notes || null
      ]
    );

    const orderId = orderResult.rows[0].id;
    console.log('Created order with ID:', orderId);

    let totalAmount = 0;

    // Process items
    for (const [index, item] of items.entries()) {
      console.log(`Processing item ${index + 1}:`, item);

      if (transaction_type === 'institute') {
        // Institute-to-institute transaction
        if (!item.drug_id) {
          console.error('Missing drug_id for institute order item:', item);
          await db.query('ROLLBACK');
          return res.status(400).json({
            status: false,
            message: 'Drug ID is required for institute transactions'
          });
        }

        const drugResult = await db.query(
          `SELECT stock, price, batch_no, created_by as seller_id FROM drugs WHERE id = $1`,
          [item.drug_id]
        );

        if (drugResult.rows.length === 0) {
          console.error('Drug not found:', item.drug_id);
          await db.query('ROLLBACK');
          return res.status(404).json({
            status: false,
            message: `Drug with ID ${item.drug_id} not found`
          });
        }

        const drug = drugResult.rows[0];
        const unit_price = drug.price;

        // Set status based on stock availability
        const itemStatus = drug.stock >= item.quantity ? 'pending' : 'out_of_stock';

        await db.query(
          `INSERT INTO order_items 
           (order_id, drug_id, quantity, unit_price, seller_id, source_type, status, batch_no)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            orderId,
            item.drug_id,
            item.quantity,
            unit_price,
            drug.seller_id,
            'institute',
            itemStatus,
            drug.batch_no
          ]
        );

        if (itemStatus === 'pending') {
          totalAmount += unit_price * item.quantity;
        }
      } else {
        // Manufacturer transaction - auto-approve these items
        if (!item.custom_name || !item.manufacturer_name || !item.unit_price) {
          console.error('Missing fields for manufacturer item:', item);
          await db.query('ROLLBACK');
          return res.status(400).json({
            status: false,
            message: 'Manufacturer items require custom_name, manufacturer_name, and unit_price'
          });
        }

        const itemTotal = item.quantity * item.unit_price;
        totalAmount += itemTotal;

        await db.query(
          `INSERT INTO order_items 
           (order_id, custom_name, manufacturer_name, quantity, unit_price, source_type, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            orderId,
            item.custom_name,
            item.manufacturer_name,
            item.quantity,
            item.unit_price,
            'manufacturer',
            'approved' // Auto-approved status for manufacturer items
          ]
        );
      }
    }

    // Update the order total (only including approved/pending items)
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

// Get order details with enhanced transaction type handling
const getOrder = async (req, res) => {
  const db = req.app.locals.db;
  const { orderId } = req.params;
  const userId = req.user.id;

  try {
    // Get order header
    const orderResult = await db.query(
      `SELECT o.*, u.name as user_name, r.name as recipient_name
       FROM orders o
       JOIN users u ON o.user_id = u.id
       LEFT JOIN users r ON o.recipient_id = r.id
       WHERE o.id = $1 AND (o.user_id = $2 OR o.recipient_id = $2 OR $3 = 'admin')`,
      [orderId, userId, req.user.role]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'Order not found or unauthorized',
      });
    }

    const order = orderResult.rows[0];

    // Get order items with appropriate fields based on transaction type
    let itemsQuery = `
      SELECT 
        oi.id, 
        oi.drug_id, 
        COALESCE(d.name, oi.custom_name) as drug_name,
        oi.manufacturer_name,
        oi.quantity, 
        oi.unit_price,
        oi.total_price,
        oi.status,
        oi.source_type,
        oi.batch_no,
        u.name as seller_name
      FROM order_items oi
      LEFT JOIN drugs d ON oi.drug_id = d.id
      LEFT JOIN users u ON oi.seller_id = u.id
      WHERE oi.order_id = $1
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
    res.status(500).json({
      status: false,
      message: 'Server error while fetching order',
      error: err.message,
    });
  }
};

// Enhanced listOrders with transaction type filtering
// Updated listOrders function
const listOrders = async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.user.id;
  const { transaction_type, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let query = `
      SELECT 
        o.id, o.order_no, o.transaction_type,
        o.total_amount, o.created_at, 
        u.name as recipient_name,
        COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN users u ON o.recipient_id = u.id
      WHERE (o.user_id = $1 OR o.recipient_id = $1)
    `;

    const params = [userId];
    let paramCount = 2;

    if (transaction_type) {
      query += ` AND o.transaction_type = $${paramCount}`;
      params.push(transaction_type);
      paramCount++;
    }

    query += `
      GROUP BY o.id, u.name
      ORDER BY o.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) 
      FROM orders 
      WHERE (user_id = $1 OR recipient_id = $1)
    `;
    const countParams = [userId];

    if (transaction_type) {
      countQuery += ' AND transaction_type = $2';
      countParams.push(transaction_type);
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      status: true,
      orders: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: 'Server error while fetching orders',
      error: err.message,
    });
  }
};



module.exports = {
  createOrder,
  getOrder,
  listOrders,
};
