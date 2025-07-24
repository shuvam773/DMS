CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  phone TEXT NOT NULL,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT DEFAULT 'India',

  status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Active', 'Pending')),

  registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  license_number TEXT NOT NULL UNIQUE,

  role TEXT NOT NULL DEFAULT 'pharmacy'
    CHECK (role IN ('admin', 'institute', 'pharmacy')),

  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS drugs (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    batch_no TEXT,
    description TEXT,
    stock INTEGER DEFAULT 0,
    mfg_date DATE NOT NULL,
    exp_date DATE NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    manufacturer_name TEXT,
    category TEXT CHECK (category IN ('IPD', 'OPD', 'OUTREACH', NULL)),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table (main order container)
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_no TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  recipient_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('institute', 'manufacturer')),
  notes TEXT,
  total_amount DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items (individual drugs in the order)
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  drug_id INTEGER REFERENCES drugs(id) ON DELETE SET NULL,
  custom_name TEXT,
  manufacturer_name TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2),
  total_price DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  source_type TEXT CHECK (source_type IN ('institute', 'manufacturer')),
  batch_no TEXT,
  seller_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'out_of_stock', 'rejected', 'shipped')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);






