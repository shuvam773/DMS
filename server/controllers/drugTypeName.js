const getAllDrugTypes = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const result = await db.query(
      'SELECT * FROM drug_types ORDER BY type_name'
    );
    res.json({ status: true, drugTypes: result.rows });
  } catch (error) {
    console.error('Error fetching drug types:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to fetch drug types',
      error: error.message,
    });
  }
};

const getDrugNamesByType = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const { typeId } = req.params;

    if (isNaN(typeId)) {
      return res.status(400).json({
        status: false,
        message: 'Invalid type ID',
      });
    }

    const result = await db.query(
      'SELECT * FROM drug_names WHERE type_id = $1 ORDER BY name',
      [typeId]
    );

    res.json({
      status: true,
      drugNames: result.rows,
    });
  } catch (error) {
    console.error('Error fetching drug names:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to fetch drug names',
      error: error.message,
    });
  }
};

const addDrugType = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const { type_name } = req.body;
    
    if (!type_name) {
      return res.status(400).json({
        status: false,
        message: 'Type name is required',
      });
    }

    const result = await db.query(
      'INSERT INTO drug_types (type_name) VALUES ($1) RETURNING *',
      [type_name]
    );

    res.status(201).json({
      status: true,
      message: 'Drug type added successfully',
      drugType: result.rows[0],
    });
  } catch (error) {
    console.error('Error adding drug type:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to add drug type',
      error: error.message,
    });
  }
};

const addDrugName = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const { type_id, name } = req.body;
    
    if (!type_id || !name) {
      return res.status(400).json({
        status: false,
        message: 'Type ID and name are required',
      });
    }

    const typeCheck = await db.query(
      'SELECT 1 FROM drug_types WHERE id = $1',
      [type_id]
    );
    
    if (typeCheck.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'Drug type not found',
      });
    }

    const result = await db.query(
      'INSERT INTO drug_names (type_id, name) VALUES ($1, $2) RETURNING *',
      [type_id, name]
    );

    res.status(201).json({
      status: true,
      message: 'Drug name added successfully',
      drugName: result.rows[0],
    });
  } catch (error) {
    console.error('Error adding drug name:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to add drug name',
      error: error.message,
    });
  }
};

const deleteDrugType = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const { typeId } = req.params;

    if (isNaN(typeId)) {
      return res.status(400).json({
        status: false,
        message: 'Invalid type ID',
      });
    }

    // First check if there are any drugs associated with this type
    const drugsCheck = await db.query(
      'SELECT 1 FROM drug_names WHERE type_id = $1 LIMIT 1',
      [typeId]
    );

    if (drugsCheck.rows.length > 0) {
      return res.status(400).json({
        status: false,
        message: 'Cannot delete drug type that has associated drugs',
      });
    }

    const result = await db.query(
      'DELETE FROM drug_types WHERE id = $1 RETURNING *',
      [typeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'Drug type not found',
      });
    }

    res.json({
      status: true,
      message: 'Drug type deleted successfully',
      deletedType: result.rows[0],
    });
  } catch (error) {
    console.error('Error deleting drug type:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to delete drug type',
      error: error.message,
    });
  }
};

const deleteDrugName = async (req, res) => {
  const db = req.app.locals.db;
  try {
    const { drugId } = req.params;

    if (isNaN(drugId)) {
      return res.status(400).json({
        status: false,
        message: 'Invalid drug ID',
      });
    }

    const result = await db.query(
      'DELETE FROM drug_names WHERE id = $1 RETURNING *',
      [drugId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'Drug name not found',
      });
    }

    res.json({
      status: true,
      message: 'Drug name deleted successfully',
      deletedDrug: result.rows[0],
    });
  } catch (error) {
    console.error('Error deleting drug name:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to delete drug name',
      error: error.message,
    });
  }
};

module.exports = {
  getAllDrugTypes,
  getDrugNamesByType,
  addDrugType,
  addDrugName,
  deleteDrugType,
  deleteDrugName
};