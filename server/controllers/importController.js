const csv = require('csv-parser');
const fs = require('fs');

const importDrugs = async (req, res) => {
  const db = req.app.locals.db;
  if (!req.file) {
    return res.status(400).json({ status: false, message: 'No file uploaded' });
  }

  const results = [];
  const errors = [];
  let successCount = 0;

  try {
    // Process CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    // Process each record
    for (const [index, row] of results.entries()) {
      try {
        // Validate required fields
        if (
          !row['Drug Type'] ||
          !row.Name ||
          !row['Batch No'] ||
          !row['Manufacturing Date'] ||
          !row['Expiration Date'] ||
          !row.Price
        ) {
          throw new Error('Missing required fields');
        }

        // Validate dates
        const mfgDate = new Date(row['Manufacturing Date']);
        const expDate = new Date(row['Expiration Date']);

        if (mfgDate >= expDate) {
          throw new Error('Manufacturing date must be before expiration date');
        }

        // Insert into database
        const query = `
          INSERT INTO drugs (
            drug_type, name, batch_no, description, stock,
            mfg_date, exp_date, price, created_by, category
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id`;

        const values = [
          row['Drug Type'],
          row.Name,
          row['Batch No'],
          row.Description || '',
          parseInt(row.Stock) || 0,
          row['Manufacturing Date'],
          row['Expiration Date'],
          parseFloat(row.Price),
          req.user.id,
          row.Category || null,
        ];

        await db.query(query, values);
        successCount++;
      } catch (error) {
        errors.push({
          row: index + 2, // +2 because CSV has header and rows start at 1
          error: error.message,
          data: row,
        });
      }
    }

    // Delete the temporary file
    fs.unlinkSync(req.file.path);

    res.status(200).json({
      status: true,
      message: `CSV import completed with ${successCount} successful records and ${errors.length} errors`,
      successCount,
      errors,
    });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error importing CSV:', error);
    res
      .status(500)
      .json({ status: false, message: 'Failed to process CSV file' });
  }
};

module.exports = {
  importDrugs,
};
