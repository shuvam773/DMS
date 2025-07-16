const getDashboardStats = async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    let stats = {};

    if (userRole === 'admin') {
      // Admin can see all statistics
      const usersCount = await db.query(
        "SELECT COUNT(*) FROM users WHERE role IN ('institute', 'pharmacy', 'admin')"
      );

      const institutesCount = await db.query(
        "SELECT COUNT(*) FROM users WHERE role = 'institute'"
      );

      const pharmaciesCount = await db.query(
        "SELECT COUNT(*) FROM users WHERE role = 'pharmacy'"
      );

      const drugsCount = await db.query('SELECT COUNT(*) FROM drugs');

      stats = {
        totalUsers: parseInt(usersCount.rows[0].count),
        totalInstitutes: parseInt(institutesCount.rows[0].count),
        totalPharmacies: parseInt(pharmaciesCount.rows[0].count),
        totalDrugs: parseInt(drugsCount.rows[0].count),
      };
    } else if (userRole === 'institute') {
      // Institute can see pharmacy count and their own drugs
      const pharmaciesCount = await db.query(
        "SELECT COUNT(*) FROM users WHERE created_by = $1 AND role = 'pharmacy'",
        [userId]
      );

      const drugsCount = await db.query(
        'SELECT COUNT(*) FROM drugs WHERE created_by = $1',
        [userId]
      );

      stats = {
        totalPharmacies: parseInt(pharmaciesCount.rows[0].count),
        totalDrugs: parseInt(drugsCount.rows[0].count),
      };
    } else if (userRole === 'pharmacy') {
      // Pharmacy can only see their own drugs count
      const drugsCount = await db.query(
        'SELECT COUNT(*) FROM drugs WHERE created_by = $1',
        [userId]
      );

      stats = {
        totalDrugs: parseInt(drugsCount.rows[0].count),
      };
    } else {
      return res.status(403).json({
        status: false,
        message: 'Unauthorized access',
      });
    }

    res.json({
      status: true,
      stats,
    });
  } catch (err) {
    console.error('Error in getDashboardStats:', err);
    res.status(500).json({
      status: false,
      message: 'Server error while fetching dashboard stats',
      error: err.message,
    });
  }
};

module.exports = {
  getDashboardStats,
};
