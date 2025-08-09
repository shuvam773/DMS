const getOrderDetails = async (req, res) => {
  const db = req.app.locals.db;
  const { orderId } = req.params;

  try {
    // Get order details
    const orderResult = await db.query(
      `SELECT 
        o.*, 
        u1.name as sender_name,
        u1.role as sender_role,
        CASE 
          WHEN o.transaction_type = 'manufacturer' THEN (
            SELECT oi.manufacturer_name 
            FROM order_items oi 
            WHERE oi.order_id = o.id 
            LIMIT 1
          )
          ELSE u2.name
        END as recipient_name,
        CASE 
          WHEN o.transaction_type = 'manufacturer' THEN 'manufacturer'
          ELSE u2.role
        END as recipient_role
       FROM orders o
       JOIN users u1 ON o.user_id = u1.id
       LEFT JOIN users u2 ON o.recipient_id = u2.id
       WHERE o.id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'Order not found',
      });
    }

    const order = orderResult.rows[0];

    // Get order items - simplified to use only order_items.batch_no
    const itemsQuery = `
      SELECT 
        oi.id, 
        COALESCE(d.name, oi.custom_name) as drug_name,
        oi.manufacturer_name,
        oi.quantity, 
        oi.unit_price,
        (oi.quantity * oi.unit_price) as total_price,
        oi.status,
        oi.batch_no,
        d.id as drug_id
      FROM order_items oi
      LEFT JOIN drugs d ON oi.drug_id = d.id
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
    console.error('Error in getOrderDetails:', err);
    res.status(500).json({
      status: false,
      message: 'Server error while fetching order details',
      error: err.message,
    });
  }
};

const listAllOrders = async (req, res) => {
  const db = req.app.locals.db;
  const { status, transaction_type, page = 1, limit = 10, search } = req.query;
  const offset = (page - 1) * limit;

  try {
    // Base query parameters
    let params = [];
    let whereClauses = [];
    let paramCount = 1;

    // Add filters if provided
    if (status && status !== 'all') {
      whereClauses.push(`oi.status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    if (transaction_type && transaction_type !== 'all') {
      whereClauses.push(`o.transaction_type = $${paramCount}`);
      params.push(transaction_type);
      paramCount++;
    }

    // Add search if provided
    if (search) {
      whereClauses.push(`
        (o.order_no ILIKE $${paramCount} OR
        u1.name ILIKE $${paramCount} OR
        u2.name ILIKE $${paramCount} OR
        oi.manufacturer_name ILIKE $${paramCount} OR
        oi.custom_name ILIKE $${paramCount} OR
        oi.batch_no ILIKE $${paramCount} OR
        EXISTS (
          SELECT 1 FROM order_items oi2
          LEFT JOIN drugs d ON oi2.drug_id = d.id
          WHERE oi2.order_id = o.id AND 
          (d.name ILIKE $${paramCount} OR oi2.custom_name ILIKE $${paramCount})
        ))
      `);
      params.push(`%${search}%`);
      paramCount++;
    }

    // Build the where clause
    const whereClause =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Main orders query
    const ordersQuery = `
SELECT
  o.id,
  o.order_no,
  o.transaction_type,
  o.total_amount,
  o.created_at,
  o.updated_at,
  o.notes,
  u1.name as sender_name,
  u1.role as sender_role,
  CASE
    WHEN o.transaction_type = 'manufacturer' THEN (
      SELECT oi.manufacturer_name
      FROM order_items oi
      WHERE oi.order_id = o.id
      LIMIT 1
    )
    ELSE u2.name
  END as recipient_name,
  CASE
    WHEN o.transaction_type = 'manufacturer' THEN 'manufacturer'
    ELSE u2.role
  END as recipient_role,
  COUNT(oi.id) as item_count,
  MIN(oi.status) as overall_status
FROM orders o
JOIN users u1 ON o.user_id = u1.id
LEFT JOIN users u2 ON o.recipient_id = u2.id
JOIN order_items oi ON o.id = oi.order_id
${whereClause}
GROUP BY o.id, u1.id, u2.id
ORDER BY o.created_at DESC
LIMIT $${paramCount} OFFSET $${paramCount + 1}
`;

    // Count query for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT o.id) as total
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      ${whereClause}
    `;

    const ordersParams = [...params, limit, offset];
    const ordersResult = await db.query(ordersQuery, ordersParams);
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0]?.total || 0);

    // Get items for each order
    const ordersWithItems = await Promise.all(
      ordersResult.rows.map(async (order) => {
        const itemsResult = await db.query(
          `SELECT 
            oi.id, 
            COALESCE(d.name, oi.custom_name) as drug_name,
            oi.manufacturer_name,
            oi.quantity, 
            oi.unit_price,
            (oi.quantity * oi.unit_price) as total_price,
            oi.status,
            oi.batch_no,
            d.id as drug_id
           FROM order_items oi
           LEFT JOIN drugs d ON oi.drug_id = d.id
           WHERE oi.order_id = $1
           ORDER BY oi.created_at`,
          [order.id]
        );
        return {
          ...order,
          items: itemsResult.rows,
        };
      })
    );

    res.json({
      status: true,
      orders: ordersWithItems,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('Error in listAllOrders:', err);
    res.status(500).json({
      status: false,
      message: 'Server error while fetching order history',
      error: err.message,
    });
  }
};

module.exports = {
  listAllOrders,
  getOrderDetails,
};
