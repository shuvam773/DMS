const bcrypt = require('bcrypt');

// Create a new pharmacy user by institute
const createPharmacyUser = async (req, res) => {
  const db = req.app.locals.db;
  const instituteId = req.user.id; // Assuming user info is attached to request after auth

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

    // Hash password and create pharmacy user
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (
        name, email, password, phone,
        street, city, state, postal_code, country,
        license_number, role, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pharmacy', 'Active', $11)
      RETURNING id, name, email, status, role, license_number, created_at`,
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
        instituteId,
      ]
    );

    res.status(201).json({
      status: true,
      message: 'Pharmacy user created successfully',
      user: result.rows[0],
    });
  } catch (err) {
    console.error('Create pharmacy user error:', err);
    res.status(500).json({
      status: false,
      message: 'Server error while creating pharmacy user',
      error: err.message,
      detail: err.detail,
    });
  }
};

// Get all pharmacy users created by the institute
const getPharmacyUsers = async (req, res) => {
  const db = req.app.locals.db;
  const instituteId = req.user.id;

  try {
    const {
      page = 1,
      limit = 10,
      status,
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
      WHERE role = 'pharmacy' AND created_by = $1
      ${!showDeleted ? "AND status != 'Deleted'" : ''}
    `;

    const queryParams = [instituteId];
    let paramCount = 2;

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
      WHERE role = 'pharmacy' AND created_by = $1
      ${!showDeleted ? "AND status != 'Deleted'" : ''}
    `;
    const countParams = [instituteId];
    let countParamCount = 2;

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

    const countResult = await db.query(countQuery, countParams);
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
    console.error('Error fetching pharmacy users:', err);
    res.status(500).json({
      status: false,
      message: 'Server error while fetching pharmacy users',
      error: err.message,
    });
  }
};

// Get single pharmacy user by ID (only if created by the institute)
const getPharmacyUserById = async (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;
  const instituteId = req.user.id;

  try {
    const result = await db.query(
      `SELECT 
        id, name, email, phone,
        street, city, state, postal_code, country,
        license_number, status, role,
        TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
        TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI:SS') as updated_at
      FROM users
      WHERE id = $1 AND role = 'pharmacy' AND created_by = $2`,
      [id, instituteId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'Pharmacy user not found or not authorized',
      });
    }

    res.json({
      status: true,
      user: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: 'Server error while fetching pharmacy user',
      error: err.message,
    });
  }
};

// Update pharmacy user (only if created by the institute)
const updatePharmacyUser = async (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;
  const instituteId = req.user.id;

  try {
    const {
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
    } = req.body;

    // Check if pharmacy user exists and was created by this institute
    const existingUser = await db.query(
      'SELECT * FROM users WHERE id = $1 AND role = $2 AND created_by = $3',
      [id, 'pharmacy', instituteId]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'Pharmacy user not found or not authorized',
      });
    }

    // Check for email/license conflicts with other users (excluding current user)
    if (email) {
      const emailCheck = await db.query(
        'SELECT * FROM users WHERE email = $1 AND id != $2',
        [email, id]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({
          status: false,
          message: 'Email already exists',
          conflicts: ['email'],
        });
      }
    }

    if (license_number) {
      const licenseCheck = await db.query(
        'SELECT * FROM users WHERE license_number = $1 AND id != $2',
        [license_number, id]
      );
      if (licenseCheck.rows.length > 0) {
        return res.status(409).json({
          status: false,
          message: 'License number already exists',
          conflicts: ['license_number'],
        });
      }
    }

    // Update pharmacy user
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
        updated_at = NOW()
      WHERE id = $11 AND role = 'pharmacy' AND created_by = $12
      RETURNING id, name, email, status, role, license_number`,
      [
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
        id,
        instituteId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        status: false,
        message: 'Not authorized to update this user',
      });
    }

    res.json({
      status: true,
      message: 'Pharmacy user updated successfully',
      user: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: 'Server error while updating pharmacy user',
      error: err.message,
    });
  }
};

// Delete pharmacy user (only if created by the institute)
const deletePharmacyUser = async (req, res) => {
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
  createPharmacyUser,
  getPharmacyUsers,
  getPharmacyUserById,
  updatePharmacyUser,
  deletePharmacyUser,
};
