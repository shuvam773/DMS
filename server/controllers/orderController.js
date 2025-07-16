
// Create a new order
const createOrder = async (req, res) => {
  const db = req.app.locals.db;
  const { drug, quantity, seller_name } = req.body;
  const userId = req.user.id;

  try {
    // Validate input
    if (!drug || !quantity || !seller_name) {
      return res.status(400).json({
        status: false,
        message: 'Drug, quantity and seller name are required'
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        status: false,
        message: 'Quantity must be greater than 0'
      });
    }

    // Generate a safe order number (using timestamp + random digits)
    const order_no = "IND"+ Math.floor(Math.random() * 1000);

    // Insert new order
    const result = await db.query(
      `INSERT INTO orders (
        drug, quantity, seller_name, order_no, user_id
      ) VALUES (
        $1, $2, $3, $4, $5
      ) RETURNING *`,
      [drug, quantity, seller_name, order_no, userId]
    );

    const newOrder = result.rows[0];

    res.status(201).json({
      status: true,
      message: 'Order created successfully',
      order: newOrder
    });

  } catch (err) {
    console.error("Order creation error:", err);
    res.status(500).json({
      status: false,
      message: 'Server error while creating order',
      error: err.message
    });
  }
};

// Get orders for the logged-in user (pharmacy/institute)
const getUserOrders = async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.user.id;

  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        o.id, o.drug, o.quantity, o.seller_name, 
        o.order_no, o.status,
        TO_CHAR(o.created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
        TO_CHAR(o.updated_at, 'YYYY-MM-DD HH24:MI:SS') as updated_at
      FROM orders o
      WHERE o.user_id = $1
    `;

    const queryParams = [userId];
    let paramCount = 2;

    if (status) {
      query += ` AND o.status = $${paramCount}`;
      queryParams.push(status);
      paramCount++;
    }

    query += `
      ORDER BY o.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    queryParams.push(limit, offset);

    const result = await db.query(query, queryParams);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM orders WHERE user_id = $1';
    if (status) {
      countQuery += ' AND status = $2';
    }
    const countResult = await db.query(countQuery, 
      status ? [userId, status] : [userId]);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      status: true,
      orders: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    res.status(500).json({
      status: false,
      message: 'Server error while fetching orders',
      error: err.message
    });
  }
};

// Get all orders (admin only)
const getAllOrders = async (req, res) => {
  const db = req.app.locals.db;

  try {
    const { page = 1, limit = 10, status, user_id } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        o.id, o.drug, o.quantity, o.seller_name, 
        o.order_no, o.status,
        u.name as user_name, u.email as user_email, u.role as user_role,
        TO_CHAR(o.created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
        TO_CHAR(o.updated_at, 'YYYY-MM-DD HH24:MI:SS') as updated_at
      FROM orders o
      JOIN users u ON o.user_id = u.id
    `;

    const whereClauses = [];
    const queryParams = [];
    let paramCount = 1;

    if (status) {
      whereClauses.push(`o.status = $${paramCount}`);
      queryParams.push(status);
      paramCount++;
    }

    if (user_id) {
      whereClauses.push(`o.user_id = $${paramCount}`);
      queryParams.push(user_id);
      paramCount++;
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += `
      ORDER BY o.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    queryParams.push(limit, offset);

    const result = await db.query(query, queryParams);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM orders o';
    if (whereClauses.length > 0) {
      countQuery += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    const countResult = await db.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

    res.json({
      status: true,
      orders: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    res.status(500).json({
      status: false,
      message: 'Server error while fetching orders',
      error: err.message
    });
  }
};

// Update order status (admin only)
const updateOrderStatus = async (req, res) => {
  const db = req.app.locals.db;
  const { orderId } = req.params;
  const { status } = req.body;

  try {
    if (!status || !['pending', 'approved'].includes(status)) {
      return res.status(400).json({
        status: false,
        message: 'Valid status is required (pending or approved)'
      });
    }

    const result = await db.query(
      `UPDATE orders 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'Order not found'
      });
    }

    res.json({
      status: true,
      message: 'Order status updated successfully',
      order: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({
      status: false,
      message: 'Server error while updating order',
      error: err.message
    });
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  getAllOrders,
  updateOrderStatus
};