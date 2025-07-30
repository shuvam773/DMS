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
      
      // Add category-specific drug counts
      const categoryCounts = await db.query(`
        SELECT 
          SUM(CASE WHEN category = 'IPD' THEN 1 ELSE 0 END) as ipd,
          SUM(CASE WHEN category = 'OPD' THEN 1 ELSE 0 END) as opd,
          SUM(CASE WHEN category = 'OUTREACH' THEN 1 ELSE 0 END) as outreach
        FROM drugs
      `);

      stats = {
        totalUsers: parseInt(usersCount.rows[0].count),
        totalInstitutes: parseInt(institutesCount.rows[0].count),
        totalPharmacies: parseInt(pharmaciesCount.rows[0].count),
        totalDrugs: parseInt(drugsCount.rows[0].count),
        ipdDrugs: parseInt(categoryCounts.rows[0].ipd || 0),
        opdDrugs: parseInt(categoryCounts.rows[0].opd || 0),
        outreachDrugs: parseInt(categoryCounts.rows[0].outreach || 0),
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
      
      // Add category-specific drug counts for institute
      const categoryCounts = await db.query(`
        SELECT 
          SUM(CASE WHEN category = 'IPD' THEN 1 ELSE 0 END) as ipd,
          SUM(CASE WHEN category = 'OPD' THEN 1 ELSE 0 END) as opd,
          SUM(CASE WHEN category = 'OUTREACH' THEN 1 ELSE 0 END) as outreach
        FROM drugs
        WHERE created_by = $1
      `, [userId]);

      stats = {
        totalPharmacies: parseInt(pharmaciesCount.rows[0].count),
        totalDrugs: parseInt(drugsCount.rows[0].count),
        ipdDrugs: parseInt(categoryCounts.rows[0].ipd || 0),
        opdDrugs: parseInt(categoryCounts.rows[0].opd || 0),
        outreachDrugs: parseInt(categoryCounts.rows[0].outreach || 0),
      };
    } else if (userRole === 'pharmacy') {
      // Pharmacy can only see their own drugs count
      const drugsCount = await db.query(
        'SELECT COUNT(*) FROM drugs WHERE created_by = $1',
        [userId]
      );
      
      // Add category-specific drug counts for pharmacy
      const categoryCounts = await db.query(`
        SELECT 
          SUM(CASE WHEN category = 'IPD' THEN 1 ELSE 0 END) as ipd,
          SUM(CASE WHEN category = 'OPD' THEN 1 ELSE 0 END) as opd,
          SUM(CASE WHEN category = 'OUTREACH' THEN 1 ELSE 0 END) as outreach
        FROM drugs
        WHERE created_by = $1
      `, [userId]);

      stats = {
        totalDrugs: parseInt(drugsCount.rows[0].count),
        ipdDrugs: parseInt(categoryCounts.rows[0].ipd || 0),
        opdDrugs: parseInt(categoryCounts.rows[0].opd || 0),
        outreachDrugs: parseInt(categoryCounts.rows[0].outreach || 0),
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

const getChartsData = async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    let chartsData = {};

    if (userRole === 'admin') {
      // Admin can see all statistics
      // User roles distribution
      const userRolesResult = await db.query(`
        SELECT 
          SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin,
          SUM(CASE WHEN role = 'institute' THEN 1 ELSE 0 END) as institute,
          SUM(CASE WHEN role = 'pharmacy' THEN 1 ELSE 0 END) as pharmacy
        FROM users
        WHERE status = 'Active'
      `);

      // Drug types distribution
      const drugTypesResult = await db.query(`
        SELECT drug_type as type, COUNT(*) as count 
        FROM drugs 
        GROUP BY drug_type 
        ORDER BY count DESC
        LIMIT 10
      `);

      // Stock levels
      const stockLevelsResult = await db.query(`
        SELECT 
          SUM(CASE WHEN stock < 10 THEN 1 ELSE 0 END) as low,
          SUM(CASE WHEN stock >= 10 AND stock <= 50 THEN 1 ELSE 0 END) as medium,
          SUM(CASE WHEN stock > 50 THEN 1 ELSE 0 END) as high
        FROM drugs
      `);

      // Order statuses
      const orderStatusesResult = await db.query(`
        SELECT 
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as shipped,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
          SUM(CASE WHEN status = 'out_of_stock' THEN 1 ELSE 0 END) as out_of_stock
        FROM order_items
      `);

      // Revenue trends (last 6 months)
      const revenueTrendsResult = await db.query(`
        SELECT 
          TO_CHAR(DATE_TRUNC('month', o.created_at), 'Mon YYYY') as month,
          SUM(o.total_amount) as revenue
        FROM orders o
        WHERE o.created_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', o.created_at)
        ORDER BY DATE_TRUNC('month', o.created_at)
      `);

      // Category distribution (OPD/IPD/OUTREACH)
      const categoryDistributionResult = await db.query(`
        SELECT 
          SUM(CASE WHEN category = 'IPD' THEN 1 ELSE 0 END) as ipd,
          SUM(CASE WHEN category = 'OPD' THEN 1 ELSE 0 END) as opd,
          SUM(CASE WHEN category = 'OUTREACH' THEN 1 ELSE 0 END) as outreach,
          SUM(CASE WHEN category IS NULL THEN 1 ELSE 0 END) as uncategorized
        FROM drugs
      `);

      // Top drugs by category
      const topDrugsByCategoryResult = await db.query(`
        SELECT 
          d.category,
          d.name,
          d.stock,
          COUNT(oi.id) as order_count
        FROM drugs d
        LEFT JOIN order_items oi ON d.id = oi.drug_id
        WHERE d.category IN ('IPD', 'OPD', 'OUTREACH')
        GROUP BY d.category, d.name, d.stock
        ORDER BY d.category, order_count DESC
        LIMIT 5
      `);

      chartsData = {
        userRoles: userRolesResult.rows[0],
        drugTypes: drugTypesResult.rows,
        stockLevels: stockLevelsResult.rows[0],
        orderStatuses: orderStatusesResult.rows[0],
        revenueTrends: {
          months: revenueTrendsResult.rows.map(row => row.month),
          revenue: revenueTrendsResult.rows.map(row => parseFloat(row.revenue || 0)),
        },
        categoryDistribution: categoryDistributionResult.rows[0],
        topDrugsByCategory: topDrugsByCategoryResult.rows,
      };
    } else if (userRole === 'institute') {
      // Institute can see data related to their pharmacies and drugs
      // Drug types distribution
      const drugTypesResult = await db.query(`
        SELECT drug_type as type, COUNT(*) as count 
        FROM drugs 
        WHERE created_by = $1
        GROUP BY drug_type 
        ORDER BY count DESC
        LIMIT 10
      `, [userId]);

      // Stock levels
      const stockLevelsResult = await db.query(`
        SELECT 
          SUM(CASE WHEN stock < 10 THEN 1 ELSE 0 END) as low,
          SUM(CASE WHEN stock >= 10 AND stock <= 50 THEN 1 ELSE 0 END) as medium,
          SUM(CASE WHEN stock > 50 THEN 1 ELSE 0 END) as high
        FROM drugs
        WHERE created_by = $1
      `, [userId]);

      // Order statuses
      const orderStatusesResult = await db.query(`
        SELECT 
          SUM(CASE WHEN oi.status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN oi.status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN oi.status = 'shipped' THEN 1 ELSE 0 END) as shipped,
          SUM(CASE WHEN oi.status = 'rejected' THEN 1 ELSE 0 END) as rejected,
          SUM(CASE WHEN oi.status = 'out_of_stock' THEN 1 ELSE 0 END) as out_of_stock
        FROM order_items oi
        JOIN drugs d ON oi.drug_id = d.id
        WHERE d.created_by = $1
      `, [userId]);

      // Revenue trends (last 6 months)
      const revenueTrendsResult = await db.query(`
        SELECT 
          TO_CHAR(DATE_TRUNC('month', o.created_at), 'Mon YYYY') as month,
          SUM(o.total_amount) as revenue
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN drugs d ON oi.drug_id = d.id
        WHERE o.created_at >= NOW() - INTERVAL '6 months'
        AND d.created_by = $1
        GROUP BY DATE_TRUNC('month', o.created_at)
        ORDER BY DATE_TRUNC('month', o.created_at)
      `, [userId]);

      // Category distribution (OPD/IPD/OUTREACH)
      const categoryDistributionResult = await db.query(`
        SELECT 
          SUM(CASE WHEN category = 'IPD' THEN 1 ELSE 0 END) as ipd,
          SUM(CASE WHEN category = 'OPD' THEN 1 ELSE 0 END) as opd,
          SUM(CASE WHEN category = 'OUTREACH' THEN 1 ELSE 0 END) as outreach,
          SUM(CASE WHEN category IS NULL THEN 1 ELSE 0 END) as uncategorized
        FROM drugs
        WHERE created_by = $1
      `, [userId]);

      // Top drugs by category
      const topDrugsByCategoryResult = await db.query(`
        SELECT 
          d.category,
          d.name,
          d.stock,
          COUNT(oi.id) as order_count
        FROM drugs d
        LEFT JOIN order_items oi ON d.id = oi.drug_id
        WHERE d.category IN ('IPD', 'OPD', 'OUTREACH')
        AND d.created_by = $1
        GROUP BY d.category, d.name, d.stock
        ORDER BY d.category, order_count DESC
        LIMIT 5
      `, [userId]);

      chartsData = {
        drugTypes: drugTypesResult.rows,
        stockLevels: stockLevelsResult.rows[0],
        orderStatuses: orderStatusesResult.rows[0],
        revenueTrends: {
          months: revenueTrendsResult.rows.map(row => row.month),
          revenue: revenueTrendsResult.rows.map(row => parseFloat(row.revenue || 0)),
        },
        categoryDistribution: categoryDistributionResult.rows[0],
        topDrugsByCategory: topDrugsByCategoryResult.rows,
      };
    } else if (userRole === 'pharmacy') {
      // Pharmacy can only see their own drugs data
      // Drug types distribution
      const drugTypesResult = await db.query(`
        SELECT drug_type as type, COUNT(*) as count 
        FROM drugs 
        WHERE created_by = $1
        GROUP BY drug_type 
        ORDER BY count DESC
        LIMIT 10
      `, [userId]);

      // Stock levels
      const stockLevelsResult = await db.query(`
        SELECT 
          SUM(CASE WHEN stock < 10 THEN 1 ELSE 0 END) as low,
          SUM(CASE WHEN stock >= 10 AND stock <= 50 THEN 1 ELSE 0 END) as medium,
          SUM(CASE WHEN stock > 50 THEN 1 ELSE 0 END) as high
        FROM drugs
        WHERE created_by = $1
      `, [userId]);

      // Order statuses
      const orderStatusesResult = await db.query(`
        SELECT 
          SUM(CASE WHEN oi.status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN oi.status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN oi.status = 'shipped' THEN 1 ELSE 0 END) as shipped,
          SUM(CASE WHEN oi.status = 'rejected' THEN 1 ELSE 0 END) as rejected,
          SUM(CASE WHEN oi.status = 'out_of_stock' THEN 1 ELSE 0 END) as out_of_stock
        FROM order_items oi
        JOIN drugs d ON oi.drug_id = d.id
        WHERE d.created_by = $1
      `, [userId]);

      // Revenue trends (last 6 months)
      const revenueTrendsResult = await db.query(`
        SELECT 
          TO_CHAR(DATE_TRUNC('month', o.created_at), 'Mon YYYY') as month,
          SUM(o.total_amount) as revenue
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN drugs d ON oi.drug_id = d.id
        WHERE o.created_at >= NOW() - INTERVAL '6 months'
        AND d.created_by = $1
        GROUP BY DATE_TRUNC('month', o.created_at)
        ORDER BY DATE_TRUNC('month', o.created_at)
      `, [userId]);

      // Category distribution (OPD/IPD/OUTREACH)
      const categoryDistributionResult = await db.query(`
        SELECT 
          SUM(CASE WHEN category = 'IPD' THEN 1 ELSE 0 END) as ipd,
          SUM(CASE WHEN category = 'OPD' THEN 1 ELSE 0 END) as opd,
          SUM(CASE WHEN category = 'OUTREACH' THEN 1 ELSE 0 END) as outreach,
          SUM(CASE WHEN category IS NULL THEN 1 ELSE 0 END) as uncategorized
        FROM drugs
        WHERE created_by = $1
      `, [userId]);

      chartsData = {
        drugTypes: drugTypesResult.rows,
        stockLevels: stockLevelsResult.rows[0],
        orderStatuses: orderStatusesResult.rows[0],
        revenueTrends: {
          months: revenueTrendsResult.rows.map(row => row.month),
          revenue: revenueTrendsResult.rows.map(row => parseFloat(row.revenue || 0)),
        },
        categoryDistribution: categoryDistributionResult.rows[0],
      };
    } else {
      return res.status(403).json({
        status: false,
        message: 'Unauthorized access',
      });
    }

    res.json({
      status: true,
      charts: chartsData,
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: 'Server error while fetching charts data',
      error: err.message,
    });
  }
};

module.exports = {
  getDashboardStats,
  getChartsData
};