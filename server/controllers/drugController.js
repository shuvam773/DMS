const addDrug = async (req, res) => {
  try {
    const { name, description, stock, mfg_date, exp_date, price, batch_no } =
      req.body;
    const created_by = req.user.id;

    // Validate required fields
    if (!name || !mfg_date || !exp_date || !price || !batch_no) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate manufacturing date is before expiration date
    if (new Date(mfg_date) >= new Date(exp_date)) {
      return res
        .status(400)
        .json({ error: 'Manufacturing date must be before expiration date' });
    }

    const query = `
            INSERT INTO drugs (name, description, stock, mfg_date, exp_date, price, created_by, batch_no)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`;

    const values = [
      name,
      description,
      stock || 0,
      mfg_date,
      exp_date,
      price,
      created_by,
      batch_no,
    ];

    const result = await req.app.locals.db.query(query, values);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding drug:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getDrugs = async (req, res) => {
  try {
    let query, values;
    
    if (req.user.role === 'institute' || req.user.role === 'pharmacy') {
      // Join with users table to get creator name
      query = `
        SELECT d.*, u.name as creator_name 
        FROM drugs d
        JOIN users u ON d.created_by = u.id
        WHERE d.created_by = $1 
        ORDER BY d.name`;
      values = [req.user.id];
    } else {
      // Admin can see all drugs with creator names
      query = `
        SELECT d.*, u.name as creator_name 
        FROM drugs d
        JOIN users u ON d.created_by = u.id
        ORDER BY d.name`;
      values = [];
    }
    
    const result = await req.app.locals.db.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching drugs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getDrugById = async (req, res) => {
  try {
    const { id } = req.params;
    let query, values;
    
    if (req.user.role === 'institute' || req.user.role === 'pharmacy') {
      query = `
        SELECT d.*, u.name as creator_name 
        FROM drugs d
        JOIN users u ON d.created_by = u.id
        WHERE d.id = $1 AND d.created_by = $2`;
      values = [id, req.user.id];
    } else {
      query = `
        SELECT d.*, u.name as creator_name 
        FROM drugs d
        JOIN users u ON d.created_by = u.id
        WHERE d.id = $1`;
      values = [id];
    }

    const result = await req.app.locals.db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Drug not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching drug:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateDrug = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, stock, price, batch_no } = req.body;

    // Validate required fields (removed date validation since we're not updating them)
    if (!name || !price || !batch_no) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let query, values;
    
    if (req.user.role === 'institute' || req.user.role === 'pharmacy') {
      // Institute and Pharmacy can only update drugs they created
      query = `
        UPDATE drugs 
        SET name = $1, 
            description = $2, 
            stock = $3, 
            price = $4,
            batch_no = $5,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $6 AND created_by = $7
        RETURNING *`;
      values = [name, description, stock || 0, price, batch_no, id, req.user.id];
    } else {
      // Admin can update any drug
      query = `
        UPDATE drugs 
        SET name = $1, 
            description = $2, 
            stock = $3, 
            price = $4,
            batch_no = $5,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *`;
      values = [name, description, stock || 0, price, batch_no, id];
    }

    const result = await req.app.locals.db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Drug not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating drug:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteDrug = async (req, res) => {
  try {
    const { id } = req.params;
    let query, values;
    
    if (req.user.role === 'institute' || req.user.role === 'pharmacy') {
      // Institute and Pharmacy can only delete drugs they created
      query = 'DELETE FROM drugs WHERE id = $1 AND created_by = $2 RETURNING *';
      values = [id, req.user.id];
    } else {
      // Admin can delete any drug
      query = 'DELETE FROM drugs WHERE id = $1 RETURNING *';
      values = [id];
    }

    const result = await req.app.locals.db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Drug not found' });
    }

    res.json({
      message: 'Drug deleted successfully',
      deletedDrug: result.rows[0],
    });
  } catch (error) {
    console.error('Error deleting drug:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getExpiringDrugs = async (req, res) => {
  const db = req.app.locals.db;

  try {
    // Validate inputs
    const daysThreshold = parseInt(req.query.days) || 30;
    if (isNaN(daysThreshold)) {
      return res.status(400).json({ status: false, message: 'Invalid days parameter' });
    }

    const limit = parseInt(req.query.limit) || 10;
    if (isNaN(limit) || limit <= 0) {
      return res.status(400).json({ status: false, message: 'Invalid limit parameter' });
    }

    const page = parseInt(req.query.page) || 1;
    if (isNaN(page) || page <= 0) {
      return res.status(400).json({ status: false, message: 'Invalid page parameter' });
    }

    const offset = (page - 1) * limit;

    let queryText = `
      SELECT id, name, description, stock, price, 
             mfg_date, exp_date, batch_no,
             (exp_date - CURRENT_DATE) AS days_until_expiry
      FROM drugs
      WHERE exp_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + ($1 || ' days')::interval)
      AND stock > 0
    `;

    let countText = `SELECT COUNT(*) FROM drugs 
                    WHERE exp_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + ($1 || ' days')::interval)
                    AND stock > 0`;

    let queryParams = [daysThreshold];
    let countParams = [daysThreshold];

    if (req.user.role !== 'admin') {
      queryText += ' AND created_by = $2';
      countText += ' AND created_by = $2';
      queryParams.push(req.user.id);
      countParams.push(req.user.id);
    }

    queryText += ` ORDER BY exp_date ASC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    const result = await db.query(queryText, queryParams);
    const countResult = await db.query(countText, countParams);

    res.json({
      status: true,
      drugs: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      daysThreshold
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ status: false, message: error.message });
  }
};

module.exports = {
  addDrug,
  getDrugs,
  getDrugById,
  updateDrug,
  deleteDrug,
  getExpiringDrugs,
};
