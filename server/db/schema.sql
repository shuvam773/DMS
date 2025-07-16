CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  drug TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  seller_name TEXT NOT NULL,
  order_no INTEGER NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved')),
  
  -- Reference to the user who created the order
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  
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

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


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



