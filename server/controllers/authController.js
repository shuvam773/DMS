const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { RateLimiterPostgres } = require('rate-limiter-flexible');

const getIp = (req) => {
  let ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if (ip && ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  
  if (ip && ip.includes('::ffff:')) {
    ip = ip.split(':').pop();
  }
  return ip || 'unknown';
};

const logLoginAttempt = async (
  db,
  userId,
  email,
  ipAddress,
  userAgent,
  status,
  failureReason
) => {
  try {
    await db.query(
      `INSERT INTO login_logs (user_id, email, ip_address, user_agent, status, failure_reason)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, email, ipAddress, userAgent, status, failureReason]
    );
  } catch (err) {
    console.error('Failed to log login attempt:', err);
  }
};

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
    license_number,
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
        license_number,
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



let rateLimiter; // Initialize once globally

const initRateLimiter = (db) => {
  if (!rateLimiter) {
    rateLimiter = new RateLimiterPostgres({
      storeClient: db,
      tableName: 'rate_limiter',
      keyPrefix: 'login_fail',
      points: 5,
      duration: 60 * 10, // 10 min window
      blockDuration: 60 * 10, // block for 10 minutes
    });
  }
  return rateLimiter;
};

const getRemainingAttempts = async (key) => {
  try {
    const res = await rateLimiter.get(key);
    return res !== null ? res.remainingPoints : 5;
  } catch (err) {
    console.error('Error getting remaining attempts:', err);
    return 5;
  }
};

// Login user
const login = async (req, res) => {
  const db = req.app.locals.db;
  const { email, password } = req.body;
  const ipAddress = getIp(req);
  const userAgent = req.get('User-Agent') || 'unknown';

  // Ensure rate limiter initialized
  initRateLimiter(db);
  const key = `login_${email}`;

  try {
    // 1) Check if blocked
    try {
      const rateRes = await rateLimiter.get(key);
      if (rateRes && rateRes.remainingPoints <= 0) {
        const retrySecs = Math.ceil((rateRes.msBeforeNext || 0) / 1000);
        await logLoginAttempt(db, null, email, ipAddress, userAgent, 'blocked', 'rate_limit_exceeded');

        return res.status(429).json({
          status: false,
          errorType: 'rate_limit_exceeded',
          message: `Too many login attempts. Try again in ${Math.ceil(retrySecs / 60)} minutes.`,
          retryAfter: retrySecs,
          attemptsRemaining: 0,
        });
      }
    } catch (rlErr) {
      // If rate limiter table has problems, log and continue (but no blocking)
      console.error('Rate limiter get error:', rlErr);
      // If Postgres date/time error or table missing previously, this should be resolved by migration above.
    }

    // 2) Find user
    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    if (!user) {
      // consume a point for failed attempt
      try { await rateLimiter.consume(key); } catch (consumeErr) { /* swallow */ }
      await logLoginAttempt(db, null, email, ipAddress, userAgent, 'failed', 'user_not_found');
      return res.status(403).json({
        status: false,
        errorType: 'user_not_found',
        message: 'No account found with this email',
        attemptsRemaining: await getRemainingAttempts(key),
      });
    }

    // 3) Check status
    if (user.status !== 'Active') {
      try { await rateLimiter.consume(key); } catch (consumeErr) { /* swallow */ }
      await logLoginAttempt(db, user.id, email, ipAddress, userAgent, 'failed', 'account_inactive');
      return res.status(403).json({
        status: false,
        errorType: 'account_inactive',
        message: 'Account not active. Please contact support.',
        attemptsRemaining: await getRemainingAttempts(key),
      });
    }

    // 4) Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      try { await rateLimiter.consume(key); } catch (consumeErr) { /* swallow */ }
      await logLoginAttempt(db, user.id, email, ipAddress, userAgent, 'failed', 'incorrect_password');
      return res.status(403).json({
        status: false,
        errorType: 'incorrect_password',
        message: 'Incorrect password.',
        attemptsRemaining: await getRemainingAttempts(key),
      });
    }

    // 5) Success - reset limiter for this key
    try { await rateLimiter.delete(key); } catch (delErr) { /* swallow */ }
    await logLoginAttempt(db, user.id, email, ipAddress, userAgent, 'success', null);

    // create token
    const jwtToken = jwt.sign({
      email: user.email,
      userId: user.id,
      role: user.role,
      createdBy: user.created_by,
      name: user.name,
    }, process.env.JWT_SECRET, { expiresIn: '1d' });

    return res.status(200).json({
      status: true,
      message: 'Login Successful',
      jwtToken,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        created_by: user.created_by,
        email: user.email,
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    await logLoginAttempt(db, null, email, ipAddress, userAgent, 'failed', 'server_error');
    return res.status(500).json({
      status: false,
      errorType: 'server_error',
      message: 'Internal server error during login',
      // avoid sending err.message in production
    });
  }
};


//user Login history
const getLoginHistory = async (req, res) => {
  const db = req.app.locals.db;
  const { id: userId, role } = req.user; // From JWT
  const { limit = 50, status } = req.query;

  try {
    let query;
    const queryParams = [];
    let paramCount = 1;

    if (role === 'admin') {
      query = `
        SELECT 
          l.id,
          l.email,
          u.id as user_id,
          u.name,
          u.role,
          l.ip_address,
          l.user_agent,
          l.status,
          l.failure_reason,
          TO_CHAR(l.attempt_time, 'YYYY-MM-DD HH24:MI:SS') as attempt_time
        FROM login_logs l
        LEFT JOIN users u ON l.user_id = u.id
      `;
      
      if (status) {
        query += ` WHERE l.status = $${paramCount}`;
        queryParams.push(status);
        paramCount++;
      }
      
    } else {
      query = `
        SELECT 
          id,
          ip_address,
          user_agent,
          status,
          failure_reason,
          TO_CHAR(attempt_time, 'YYYY-MM-DD HH24:MI:SS') as attempt_time
        FROM login_logs
        WHERE user_id = $${paramCount}`;
      queryParams.push(userId);
      paramCount++;

      if (status) {
        query += ` AND status = $${paramCount}`;
        queryParams.push(status);
        paramCount++;
      }
    }

    query += `
      ORDER BY attempt_time DESC
      LIMIT $${paramCount}`;
    queryParams.push(limit);

    const result = await db.query(query, queryParams);

    res.json({
      status: true,
      loginHistory: result.rows,
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: 'Failed to fetch login history',
      error: err.message,
    });
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
        message: 'User ID not found in token',
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
        message: 'User not found',
      });
    }

    // For security, remove sensitive data if the requester isn't an admin
    if (req.user.role !== 'admin') {
      delete user.license_number;
      delete user.phone;
    }

    res.json({
      status: true,
      user: user,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Server error while fetching user',
      error: err.message,
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
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Server error while fetching users',
      error: err.message,
    });
  }
};

module.exports = {
  register,
  login,
  getUser,
  getAllUsers,
  getLoginHistory,
};
