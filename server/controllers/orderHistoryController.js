const listOrderHistory = async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.user.id;
  const { status, transaction_type, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  try {
    // Base query to get orders placed by this institute
    let query = `
      SELECT 
        o.id, o.order_no, o.transaction_type,
        o.total_amount, o.created_at, o.updated_at,
        u.name as recipient_name,
        COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN users u ON o.recipient_id = u.id
      WHERE o.user_id = $1
    `;

    const params = [userId];
    let paramCount = 2;

    // Add filters if provided
    if (status) {
      query += ` AND oi.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (transaction_type) {
      query += ` AND o.transaction_type = $${paramCount}`;
      params.push(transaction_type);
      paramCount++;
    }

    // Complete the query
    query += `
      GROUP BY o.id, u.name
      ORDER BY o.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    params.push(limit, offset);

    // Execute the query
    const result = await db.query(query, params);

    // For each order, get detailed items with their statuses
    const ordersWithItems = await Promise.all(
      result.rows.map(async (order) => {
        const itemsQuery = `
          SELECT 
            oi.id, 
            COALESCE(d.name, oi.custom_name) as drug_name,
            oi.manufacturer_name,
            oi.quantity, 
            oi.unit_price,
            oi.total_price,
            oi.status,
            oi.batch_no,
            u.name as seller_name
          FROM order_items oi
          LEFT JOIN drugs d ON oi.drug_id = d.id
          LEFT JOIN users u ON oi.seller_id = u.id
          WHERE oi.order_id = $1
          ORDER BY oi.created_at
        `;

        const itemsResult = await db.query(itemsQuery, [order.id]);
        return {
          ...order,
          items: itemsResult.rows
        };
      })
    );

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT o.id) 
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = $1
    `;
    const countParams = [userId];

    if (status) {
      countQuery += ' AND oi.status = $2';
      countParams.push(status);
    }

    if (transaction_type) {
      countQuery += status 
        ? ' AND o.transaction_type = $3' 
        : ' AND o.transaction_type = $2';
      countParams.push(transaction_type);
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      status: true,
      orders: ordersWithItems,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    console.error('Error in listOrderHistory:', err);
    res.status(500).json({
      status: false,
      message: 'Server error while fetching order history',
      error: err.message
    });
  }
};

const getOrderHistoryDetails = async (req, res) => {
  const db = req.app.locals.db;
  const { orderId } = req.params;
  const userId = req.user.id;

  try {
    // Verify the order belongs to this user
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
        message: 'Order not found or unauthorized'
      });
    }

    const order = orderResult.rows[0];

    // Get order items with their statuses
    const itemsQuery = `
      SELECT 
        oi.id, 
        COALESCE(d.name, oi.custom_name) as drug_name,
        oi.manufacturer_name,
        oi.quantity, 
        oi.unit_price,
        oi.total_price,
        oi.status,
        oi.batch_no,
        u.name as seller_name
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
        items: itemsResult.rows
      }
    });

  } catch (err) {
    console.error('Error in getOrderHistoryDetails:', err);
    res.status(500).json({
      status: false,
      message: 'Server error while fetching order details',
      error: err.message
    });
  }
};

module.exports = {
  listOrderHistory,
  getOrderHistoryDetails
};