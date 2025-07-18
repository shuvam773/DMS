// List orders for a seller (institute) with detailed items
const listSellerOrders = async (req, res) => {
  const db = req.app.locals.db;
  const sellerId = req.user.id;
  const { status, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  try {
    // First, get the orders where this seller has items or is the recipient
    let orderQuery = `
      SELECT DISTINCT
        o.id as order_id, o.order_no, o.status as order_status,
        o.created_at as order_date, o.total_amount,
        u.name as buyer_name, o.transaction_type,
        COUNT(oi.id) as item_count,
        SUM(CASE WHEN oi.status = 'pending' THEN 1 ELSE 0 END) as pending_items,
        SUM(CASE WHEN oi.status = 'approved' THEN 1 ELSE 0 END) as approved_items,
        SUM(CASE WHEN oi.status = 'rejected' THEN 1 ELSE 0 END) as rejected_items,
        SUM(CASE WHEN oi.status = 'shipped' THEN 1 ELSE 0 END) as shipped_items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN users u ON o.user_id = u.id
      WHERE (oi.seller_id = $1 OR o.recipient_id = $1) AND o.transaction_type = 'institute'
    `;
    
    const params = [sellerId];
    let paramCount = 2;

    if (status) {
      orderQuery += ` AND oi.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    orderQuery += `
      GROUP BY o.id, u.name, o.transaction_type
      ORDER BY o.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    params.push(limit, offset);

    const ordersResult = await db.query(orderQuery, params);

    // For each order, get the detailed items
    const ordersWithItems = await Promise.all(
      ordersResult.rows.map(async (order) => {
        // Modified query to include items where current user is either seller or recipient
        const itemsQuery = `
          SELECT 
            oi.id, oi.drug_id, d.name as drug_name, d.batch_no,
            oi.quantity, oi.unit_price, oi.status,
            (oi.quantity * oi.unit_price) as total_price,
            u.name as seller_name
          FROM order_items oi
          JOIN drugs d ON oi.drug_id = d.id
          JOIN users u ON oi.seller_id = u.id
          WHERE oi.order_id = $1 AND (oi.seller_id = $2 OR $3 = (SELECT recipient_id FROM orders WHERE id = $1))
          ORDER BY oi.created_at
        `;
        
        const itemsResult = await db.query(itemsQuery, [order.order_id, sellerId, sellerId]);
        
        return {
          ...order,
          items: itemsResult.rows
        };
      })
    );

    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT o.id) 
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE (oi.seller_id = $1 OR o.recipient_id = $1) AND o.transaction_type = 'institute'
    `;
    const countParams = [sellerId];
    
    if (status) {
      countQuery += ' AND oi.status = $2';
      countParams.push(status);
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
    console.error('Database error in listSellerOrders:', err);
    res.status(500).json({
      status: false,
      message: 'Server error while fetching seller orders',
      error: err.message
    });
  }
};

// Update order item status (seller)
const updateOrderItemStatus = async (req, res) => {
  const db = req.app.locals.db;
  const { orderItemId } = req.params;
  const { status } = req.body;
  const sellerId = req.user.id;

  if (!status || !['pending', 'approved', 'rejected', 'shipped'].includes(status)) {
    return res.status(400).json({
      status: false,
      message: 'Valid status is required (pending, approved, rejected, shipped)'
    });
  }

  try {
    // Verify the order item belongs to this seller and is an institute transaction
    const itemResult = await db.query(
      `SELECT oi.id, oi.status as current_status, o.transaction_type, 
              oi.drug_id, oi.quantity, d.stock
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       LEFT JOIN drugs d ON oi.drug_id = d.id
       WHERE oi.id = $1 AND oi.seller_id = $2 AND o.transaction_type = 'institute'`,
      [orderItemId, sellerId]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'Order item not found or unauthorized'
      });
    }

    const item = itemResult.rows[0];

    // Check status transition validity
    if (item.current_status === 'rejected' && status !== 'rejected') {
      return res.status(400).json({
        status: false,
        message: 'Cannot change status of rejected item'
      });
    }

    if (status === 'shipped' && item.current_status !== 'approved') {
      return res.status(400).json({
        status: false,
        message: 'Can only ship approved items'
      });
    }

    await db.query('BEGIN');

    // Update status
    await db.query(
      `UPDATE order_items SET status = $1, updated_at = NOW() 
       WHERE id = $2`,
      [status, orderItemId]
    );

    // Handle stock updates based on status changes
    if (item.drug_id) {
      if (status === 'approved' && item.current_status === 'pending') {
        // Deduct stock when approving
        await db.query(
          `UPDATE drugs SET stock = stock - $1 WHERE id = $2`,
          [item.quantity, item.drug_id]
        );
      } else if (status === 'rejected' && item.current_status === 'approved') {
        // Restore stock when rejecting previously approved item
        await db.query(
          `UPDATE drugs SET stock = stock + $1 WHERE id = $2`,
          [item.quantity, item.drug_id]
        );
      }
    }

    await db.query('COMMIT');

    res.json({
      status: true,
      message: 'Order item status updated successfully'
    });

  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Database error in updateOrderItemStatus:', err);
    res.status(500).json({
      status: false,
      message: 'Server error while updating order item status',
      error: err.message
    });
  }
};

module.exports = {
  listSellerOrders,
  updateOrderItemStatus
};