const bcrypt = require('bcrypt');

// Create a new institute
const createUser = async (req, res) => {
  const db = req.app.locals.db;

  const {
    name,
    email,
    password,
    phone,
    street,
    city,
    state,
    postal_code,
    country = 'India',
    license_number,
    role,
  } = req.body;

  try {
    // Check for existing email and license number separately
    const emailCheck = await db.query('SELECT * FROM users WHERE email = $1', [
      email,
    ]);

    const licenseCheck = await db.query(
      'SELECT * FROM users WHERE license_number = $1',
      [license_number]
    );

    if (emailCheck.rows.length > 0 && licenseCheck.rows.length > 0) {
      return res.status(409).json({
        status: false,
        message: 'Both email and license number already exist',
        conflicts: ['email', 'license_number'],
      });
    }
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({
        status: false,
        message: 'Email already exists',
        conflicts: ['email'],
      });
    }
    if (licenseCheck.rows.length > 0) {
      return res.status(409).json({
        status: false,
        message: 'License number already exists',
        conflicts: ['license_number'],
      });
    }

    // Hash password and create institute
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (
        name, email, password, phone,
        street, city, state, postal_code, country,
        license_number, role, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Active')
      RETURNING id, name, email, status, role, license_number`,
      [
        name,
        email,
        hashedPassword,
        phone,
        street,
        city,
        state,
        postal_code,
        country,
        license_number,
        role,
      ]
    );

    res.status(201).json({
      status: true,
      message: 'Institute created successfully',
      institute: result.rows[0],
    });
  } catch (err) {
    console.error('Create institute error:', err);
    res.status(500).json({
      status: false,
      message: 'Server error while creating institute',
      error: err.message,
      detail: err.detail,
    });
  }
};

// Get all institutes with optional filtering and searching
const getAllUsers = async (req, res) => {
  const db = req.app.locals.db;

  try {
    const {
      page = 1,
      limit = 10,
      status,
      role,
      showDeleted = false,
      search = '',
    } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        id, name, email, phone,
        street, city, state, postal_code, country,
        license_number, status, role,
        TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
      FROM users
      WHERE role IN ('institute', 'pharmacy', 'hospital') 
      ${!showDeleted ? "AND status != 'Deleted'" : ''}
    `;

    const queryParams = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount} OR license_number ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    if (status) {
      query += ` AND status = $${paramCount}`;
      queryParams.push(status);
      paramCount++;
    }

    if (role) {
      query += ` AND role = $${paramCount}`;
      queryParams.push(role);
      paramCount++;
    }

    query += `
      ORDER BY created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    queryParams.push(limit, offset);

    const result = await db.query(query, queryParams);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) 
      FROM users 
      WHERE role IN ('institute', 'pharmacy', 'hospital')
      ${!showDeleted ? "AND status != 'Deleted'" : ''}
    `;
    const countParams = [];
    let countParamCount = 1;

    if (search) {
      countQuery += ` AND (name ILIKE $${countParamCount} OR email ILIKE $${countParamCount} OR license_number ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
      countParamCount++;
    }

    if (status) {
      countQuery += ` AND status = $${countParamCount}`;
      countParams.push(status);
      countParamCount++;
    }

    if (role) {
      countQuery += ` AND role = $${countParamCount}`;
      countParams.push(role);
      countParamCount++;
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      status: true,
      institutes: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Error fetching institutes:', err);
    res.status(500).json({
      status: false,
      message: 'Server error while fetching institutes',
      error: err.message,
    });
  }
};

// Get single user by ID (updated version)
const getUserById = async (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;

  try {
    const result = await db.query(
      `SELECT 
        id, name, email, phone,
        street, city, state, postal_code, country,
        license_number, status, role,
        TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
        TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI:SS') as updated_at
      FROM users
      WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'User not found',
      });
    }

    res.json({
      status: true,
      user: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: 'Server error while fetching user',
      error: err.message,
    });
  }
};

// Update institute
const updateUser = async (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;

  console.log('Update request received for user ID:', id);
  console.log('Request body:', req.body);

  try {
    const {
      name,
      email,
      password,
      phone,
      street,
      city,
      state,
      postal_code,
      country,
      license_number,
      status,
      role,
    } = req.body;

    // Check if institute exists
    const existingInstitute = await db.query(
      'SELECT * FROM users WHERE id = $1 AND role IN ($2, $3, $4)',
      [id, 'institute', 'pharmacy', 'hospital']
    );

    console.log('Existing institute check:', existingInstitute.rows);

    if (existingInstitute.rows.length === 0) {
      console.log('Institute not found');
      return res.status(404).json({
        status: false,
        message: 'Institute not found',
      });
    }

    // Prepare update fields
    const updateFields = [
      name,
      email,
      phone,
      street,
      city,
      state,
      postal_code,
      country,
      license_number,
      status,
      role,
      id,
    ];

    let passwordUpdate = '';
    let queryParams = [...updateFields];

    // If password is provided, hash it and add to update
    if (password) {
      console.log('Password update requested');
      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        passwordUpdate = ', password = $13';
        queryParams.push(hashedPassword);
        console.log('Password hashed successfully');
      } catch (hashError) {
        console.error('Password hashing failed:', hashError);
        throw new Error('Password hashing failed');
      }
    }

    console.log('Final query params:', queryParams);

    // Update institute
    const result = await db.query(
      `UPDATE users SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone),
        street = COALESCE($4, street),
        city = COALESCE($5, city),
        state = COALESCE($6, state),
        postal_code = COALESCE($7, postal_code),
        country = COALESCE($8, country),
        license_number = COALESCE($9, license_number),
        status = COALESCE($10, status),
        role = COALESCE($11, role),
        updated_at = NOW()
        ${passwordUpdate}
      WHERE id = $12
      RETURNING id, name, email, status, role, license_number`,
      queryParams
    );

    console.log('Update successful, result:', result.rows);

    res.json({
      status: true,
      message:
        'Institute updated successfully' +
        (password ? ' (including password)' : ''),
      institute: result.rows[0],
    });
  } catch (err) {
    console.error('Full error in updateUser:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({
      status: false,
      message: 'Server error while updating institute',
      error: err.message,
      detail: err.detail,
    });
  }
};

const deleteUser = async (req, res) => {
  const db = req.app.locals.db; // Assuming db is attached to app.locals
  const { id } = req.params;

  try {
    const result = await db.query(
      'DELETE FROM users WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Institute not found' });
    }

    res.status(200).json({
      message: 'Institute deleted successfully',
      deletedInstitute: result.rows[0],
    });
  } catch (error) {
    console.error('Error deleting institute:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};
