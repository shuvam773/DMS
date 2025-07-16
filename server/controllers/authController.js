const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Register user
const register = async (req, res) => {
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
    license_number
  } = req.body;

  try {
    // Check if user already exists by email or license_number
    const existingUser = await db.query(
      'SELECT * FROM users WHERE email = $1 OR license_number = $2',
      [email, license_number]
    );
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: 'User with this email or license number already exists',
        status: false,
      });
    }

    // Validate password
    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters',
        status: false,
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user with default role ('pharmacy') and status ('Pending')
    const result = await db.query(
      `INSERT INTO users (
        name, email, password, phone,
        street, city, state, postal_code, country,
        license_number
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10
      ) RETURNING id, name, email, status, role`,
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
        license_number
      ]
    );

    const newUser = result.rows[0];

    res.status(201).json({
      message: 'Registration successful. Your account is pending approval.',
      status: true,
      user: newUser, // This will include the default role and status
    });
  } catch (err) {
    res.status(500).json({
      message: 'Server error during registration',
      status: false,
      error: err.message,
    });
  }
};

// Login user
const login = async (req, res) => {
  const db = req.app.locals.db;
  const { email, password } = req.body;

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [
      email,
    ]);
    const user = result.rows[0];

    if (!user) {
      return res
        .status(403)
        .json({ message: 'User does not exist', status: false });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: 'Invalid credentials', status: false });
    }

    const jwtToken = jwt.sign(
      {
        email: user.email,
        userId: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      message: 'Login Successful',
      status: true,
      jwtToken,
      id: user.id,
      name: user.name,
      role: user.role,
    });
  } catch (err) {
    return res.status(500).json({ msg: err.message });
  }
};

// Get logged-in user info
const getUser = async (req, res) => {
  const db = req.app.locals.db;

  try {
    const userId = req.user.id;
    
    if (!userId) {
      return res.status(400).json({ 
        status: false,
        message: 'User ID not found in token' 
      });
    }

    const result = await db.query(
      `SELECT 
        id, 
        name, 
        email, 
        phone,
        street,
        city,
        state,
        postal_code,
        country,
        status,
        role, 
        license_number,
        TO_CHAR(registration_date, 'YYYY-MM-DD HH24:MI:SS') as registration_date,
        TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
        TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI:SS') as updated_at
      FROM users 
      WHERE id = $1`,
      [userId]
    );
    
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ 
        status: false,
        message: 'User not found' 
      });
    }

    // For security, remove sensitive data if the requester isn't an admin
    if (req.user.role !== 'admin') {
      delete user.license_number;
      delete user.phone;
      delete user.street;
    }

    res.json({
      status: true,
      user: user
    });
  } catch (err) {
    return res.status(500).json({ 
      status: false,
      message: 'Server error while fetching user',
      error: err.message 
    });
  }
};

const getAllUsers = async (req, res) => {
  const db = req.app.locals.db;

  try {
    // Get query parameters for pagination/filtering
    const { page = 1, limit = 10, status, role } = req.query;
    const offset = (page - 1) * limit;

    // Build the base query
    let query = `
      SELECT 
        id, 
        name, 
        email, 
        phone,
        status,
        role,
        license_number,
        TO_CHAR(registration_date, 'YYYY-MM-DD HH24:MI:SS') as registration_date,
        TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
      FROM users
    `;

    // Add WHERE clauses based on filters
    const whereClauses = [];
    const queryParams = [];
    let paramCount = 1;

    if (status) {
      whereClauses.push(`status = $${paramCount}`);
      queryParams.push(status);
      paramCount++;
    }

    if (role) {
      whereClauses.push(`role = $${paramCount}`);
      queryParams.push(role);
      paramCount++;
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // Add sorting and pagination
    query += `
      ORDER BY created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    queryParams.push(limit, offset);

    // Execute the query
    const result = await db.query(query, queryParams);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM users';
    if (whereClauses.length > 0) {
      countQuery += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    const countResult = await db.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

    res.json({
      status: true,
      users: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Server error while fetching users',
      error: err.message
    });
  }
};

module.exports = {
  register,
  login,
  getUser,
  getAllUsers
};
