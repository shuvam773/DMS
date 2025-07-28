const bcrypt = require('bcrypt');

// Update profile information (name, email, phone, etc.)
const updateProfile = async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.user.id;

  const {
    name,
    email,
    phone,
  } = req.body;

  try {
    // Check if email is being updated and if it already exists
    if (email) {
      const emailCheck = await db.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, userId]
      );

      if (emailCheck.rows.length > 0) {
        return res.status(409).json({
          status: false,
          message: 'Email already exists',
        });
      }
    }

    // Update user profile
    const result = await db.query(
      `UPDATE users SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone),
        updated_at = NOW()
      WHERE id = $4
      RETURNING id, name, email, phone`,
      [
        name,
        email,
        phone,
        userId
      ]
    );

    res.json({
      status: true,
      message: 'Profile updated successfully',
      user: result.rows[0],
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({
      status: false,
      message: 'Server error while updating profile',
      error: err.message,
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.user.id; // Assuming user ID is available from auth middleware

  const { currentPassword, newPassword } = req.body;

  try {
    // Get current password hash from DB
    const userResult = await db.query(
      'SELECT password FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'User not found',
      });
    }

    const currentHashedPassword = userResult.rows[0].password;

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      currentHashedPassword
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        status: false,
        message: 'Current password is incorrect',
      });
    }

    // Hash new password and update
    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [newHashedPassword, userId]
    );

    res.json({
      status: true,
      message: 'Password changed successfully',
    });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({
      status: false,
      message: 'Server error while changing password',
      error: err.message,
    });
  }
};

module.exports = {
  updateProfile,
  changePassword,
};