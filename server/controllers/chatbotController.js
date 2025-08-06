require('dotenv').config();
const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST ,
  database: process.env.DB_NAME ,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT 
});

// System Prompts with response formatting instructions
const SYSTEM_PROMPTS = {
  admin: `You are an expert AI assistant for a Drug Management System with ADMIN privileges. 
          Follow these guidelines for responses:
          
          1. ORGANIZE responses with clear Markdown formatting:
             - Use ## for main sections
             - Use ### for subsections
             - Use bullet points for lists
             
          2. HIGHLIGHT important information:
             - ⚠️ for warnings (low stock, expiring soon)
             - ✅ for positive statuses
             - ❌ for negative statuses
             
          3. FORMAT data clearly:
             - Dates: YYYY-MM-DD
             - Prices: ₹XXX.XX
             - IDs/Batches: in monospace
             
          4. PRIORITIZE data from the provided context.
          5. For drug queries, always include: name, ID, batch, stock, expiry, price.
          6. For orders, include: order number, status, date, items, total amount.
          7. If unsure, ask clarifying questions.`,

  institute: `You are a pharmaceutical institute management assistant. Format responses with:
              
              1. Clear hierarchy with headers
              2. Consistent structure for similar items
              3. Highlighted expiration dates
              4. Visual status indicators
              5. Organized by category when relevant
              
              Always include:
              - Drug details: name, batch, stock, expiry, category
              - Order details: number, date, status, items
              - Inventory status with visual indicators`,

  pharmacy: `You are a pharmacy operations specialist. Structure responses with:
             
             1. Clear section separation
             2. Highlighted low stock items
             3. Order tracking with status indicators
             4. Inventory grouped by category
             5. Batch number visibility
             
             Priority information:
             - Stock levels with warnings
             - Pending orders
             - Nearest expirations
             - Order status updates`
};

// Database schema information
const DB_SCHEMA_INFO = `
Tables and columns:
users(id, name, email, password, phone, street, city, state, postal_code, country, status, registration_date, license_number, role, created_by, created_at, updated_at)
drugs(id, name, batch_no, description, stock, mfg_date, exp_date, price, created_by, category, created_at, updated_at)
orders(id, order_no, user_id, recipient_id, transaction_type, notes, total_amount, created_at, updated_at)
order_items(id, order_id, drug_id, custom_name, manufacturer_name, quantity, unit_price, total_price, source_type, batch_no, seller_id, status, created_at, updated_at)
`;

// Helper function for status icons
function getStatusIcon(status) {
  const icons = {
    'pending': '🟡',
    'approved': '✅',
    'shipped': '🚚',
    'delivered': '📦',
    'rejected': '❌',
    'out_of_stock': '⚠️',
    'Active': '✅',
    'Pending': '🟡'
  };
  return icons[status] || '▪️';
}

// Dynamic SQL query generator
async function generateDynamicSQL(user, question) {
  try {
    const sqlPrompt = `
You are a PostgreSQL expert. Generate a SQL query to answer the user's question based on this schema:

${DB_SCHEMA_INFO}

User role: ${user.role}
Question: "${question}"

Rules:
1. Only return valid PostgreSQL SELECT query
2. For date ranges, use INTERVAL (e.g., "NOW() + INTERVAL '3 months'")
3. For pharmacy role, filter by recipient_id = ${user.id}
4. For institute role, filter by created_by = ${user.id}
5. Never use DELETE, UPDATE, or INSERT
6. Include relevant joins
7. Limit to 20 results
8. Format as plain SQL without markdown

SQL Query:`;

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:8080'
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-r1:free',
          messages: [{ role: 'user', content: sqlPrompt }],
          temperature: 0,
          max_tokens: 500
        })
      }
    );

    const result = await response.json();
    let sqlQuery = result.choices?.[0]?.message?.content;

    // Clean up the SQL query
    sqlQuery = sqlQuery.replace(/```sql|```/g, '').trim();
    if (!sqlQuery.toLowerCase().startsWith('select')) {
      throw new Error('Generated query is not a SELECT statement');
    }

    return sqlQuery;
  } catch (error) {
    console.error('SQL generation error:', error);
    throw error;
  }
}

// Enhanced response formatter
function formatResponse(data, userRole, question) {
  // If we have raw query results, format them nicely
  if (Array.isArray(data)) {
    if (data.length === 0) return "No matching records found.";
    
    let response = `## Query Results for: "${question}"\n\n`;
    
    // For drugs
    if (data[0].name && data[0].batch_no) {
      response += "### 🏥 Drug Inventory\n\n";
      response += "| Name | Batch | Stock | Expiry | Price |\n";
      response += "|------|-------|-------|--------|-------|\n";
      
      data.forEach(item => {
        const daysLeft = item.exp_date ? 
          Math.floor((new Date(item.exp_date) - new Date()) / (1000 * 60 * 60 * 24)) : 'N/A';
        
        response += `| ${item.name} | ${item.batch_no || 'N/A'} | ${item.stock || 0} | `;
        response += `${item.exp_date ? new Date(item.exp_date).toISOString().split('T')[0] : 'N/A'} `;
        if (daysLeft < 30 && daysLeft !== 'N/A') response += `⚠️(${daysLeft}d) | `;
        else response += `(${daysLeft}d) | `;
        response += `₹${item.price?.toFixed(2) || 'N/A'} |\n`;
      });
    } 
    // For orders
    else if (data[0].order_no) {
      response += "### 📦 Orders\n\n";
      response += "| Order # | Date | Status | Amount | Items |\n";
      response += "|---------|------|--------|--------|-------|\n";
      
      data.forEach(item => {
        response += `| ${item.order_no} | `;
        response += `${new Date(item.created_at).toISOString().split('T')[0]} | `;
        response += `${getStatusIcon(item.status)} ${item.status} | `;
        response += `₹${item.total_amount?.toFixed(2) || '0.00'} | `;
        response += `${item.item_count || 0} |\n`;
      });
    }
    // For generic results
    else {
      response += "### Results\n\n";
      const columns = Object.keys(data[0]);
      response += `| ${columns.join(' | ')} |\n`;
      response += `| ${columns.map(() => '---').join(' | ')} |\n`;
      
      data.slice(0, 10).forEach(item => {
        response += `| ${columns.map(col => item[col] || 'N/A').join(' | ')} |\n`;
      });
      
      if (data.length > 10) {
        response += `\n*Showing 10 of ${data.length} results*\n`;
      }
    }
    
    return response;
  }
  
  // Original formatted response for predefined queries
  let response = "";

  // DRUG INVENTORY SECTION
  if (data.drugs?.length > 0) {
    response += "## 🏥 Drug Inventory\n\n";
    data.drugs.forEach(drug => {
      response += `### ${drug.name}\n`;
      response += `- **ID**: \`${drug.id}\` | **Batch**: \`${drug.batch_no || 'N/A'}\`\n`;
      response += `- **Stock**: ${drug.stock} units `;
      
      // Stock level indicators
      if (drug.stock < 5) response += "🔴 (Critical Stock)";
      else if (drug.stock < 15) response += "🟠 (Low Stock)";
      else if (drug.stock > 500) response += "🟢 (High Inventory)";
      
      // Expiry information
      const expDate = new Date(drug.exp_date);
      const today = new Date();
      const daysToExpiry = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));
      
      response += `\n- **Expiry**: ${expDate.toISOString().split('T')[0]} `;
      if (daysToExpiry < 30) response += `⚠️ (${daysToExpiry} days remaining)`;
      else response += `(${daysToExpiry} days remaining)`;
      
      // Additional drug details
      if (drug.mfg_date) {
        response += `\n- **Manufactured**: ${new Date(drug.mfg_date).toISOString().split('T')[0]}`;
      }
      if (drug.price) {
        response += `\n- **Price**: ₹${drug.price.toFixed(2)}`;
      }
      if (drug.category) {
        response += `\n- **Category**: ${drug.category}`;
      }
      if (drug.description) {
        response += `\n- **Description**: ${drug.description.substring(0, 100)}${drug.description.length > 100 ? '...' : ''}`;
      }
      if (drug.created_by_name) {
        response += `\n- **Added By**: ${drug.created_by_name}`;
      }
      
      response += "\n\n";
    });
  }

  // EXPIRING SOON SECTION
  if (data.expiring_soon?.length > 0) {
    response += "## ⏳ Expiring Soon\n\n";
    response += "| Drug | Batch | Stock | Expiry | Days Left |\n";
    response += "|------|-------|-------|--------|-----------|\n";
    
    data.expiring_soon.forEach(drug => {
      const expDate = new Date(drug.exp_date);
      const today = new Date();
      const daysToExpiry = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));
      
      response += `| ${drug.name} | ${drug.batch_no || 'N/A'} | ${drug.stock} | `;
      response += `${expDate.toISOString().split('T')[0]} | ${daysToExpiry} |\n`;
    });
    
    response += "\n";
  }

  // ORDERS SECTION
  if (data.orders?.length > 0) {
    response += `## 📦 ${userRole === 'pharmacy' ? 'Incoming' : 'Outgoing'} Orders\n\n`;
    
    data.orders.forEach(order => {
      response += `### Order #${order.order_no}\n`;
      response += `- **Status**: ${getStatusIcon(order.status)} ${order.status}\n`;
      response += `- **Date**: ${new Date(order.created_at).toLocaleString()}\n`;
      
      if (order.total_amount) {
        response += `- **Amount**: ₹${order.total_amount.toFixed(2)}\n`;
      }
      
      if (order.recipient_name || order.seller_name) {
        response += `- ${userRole === 'pharmacy' ? 'Supplier' : 'Recipient'}: `;
        response += `${order.recipient_name || order.seller_name}\n`;
      }
      
      if (order.item_count) {
        response += `- **Items**: ${order.item_count}\n`;
      }
      
      if (order.notes) {
        response += `- **Notes**: ${order.notes.substring(0, 50)}${order.notes.length > 50 ? '...' : ''}\n`;
      }
      
      response += "\n";
    });
  }

  // ORDER ITEMS SECTION
  if (data.order_items?.length > 0) {
    response += "## 📋 Order Items\n\n";
    response += "| Item | Order # | Qty | Price | Total | Status |\n";
    response += "|------|---------|-----|-------|-------|--------|\n";
    
    data.order_items.forEach(item => {
      response += `| ${item.drug_name || item.custom_name || 'Custom'} `;
      response += `| #${item.order_no} `;
      response += `| ${item.quantity} `;
      response += `| ₹${item.unit_price?.toFixed(2) || 'N/A'} `;
      response += `| ₹${(item.quantity * (item.unit_price || 0)).toFixed(2)} `;
      response += `| ${getStatusIcon(item.status)} ${item.status} |\n`;
    });
    
    response += "\n";
  }

  // Add summary section if there's any data
  if (response) {
    response += "## 📝 Summary\n";
    
    if (data.drugs) {
      const totalStock = data.drugs.reduce((sum, drug) => sum + (drug.stock || 0), 0);
      response += `- **Total Drugs Listed**: ${data.drugs.length} (${totalStock} total units)\n`;
    }
    
    if (data.orders) {
      response += `- **Total Orders**: ${data.orders.length}\n`;
    }
    
    if (data.expiring_soon) {
      response += `- **Drugs Expiring Soon**: ${data.expiring_soon.length}\n`;
    }
    
    if (data.critical_stock) {
      response += `- **Critical Stock Items**: ${data.critical_stock.length}\n`;
    }
    
    if (data.pending_orders) {
      response += `- **Pending Orders**: ${data.pending_orders.length}\n`;
    }
  }

  return response || "No relevant data found for your query.";
}

// Database query function
const getRelevantData = async (db, user, question) => {
  try {
    // Set query timeout
    await db.query('SET statement_timeout TO 15000');

    // Enhanced question analysis
    const questionAnalysis = {
      mentionsDrugs: /drug|medicine|inventory|stock|batch|tablet|syrup|capsule/i.test(question),
      mentionsOrders: /order|purchase|delivery|shipment|transaction/i.test(question),
      mentionsExpiration: /expir|expiry|exp date|mfg|manufactur|shelf life/i.test(question),
      mentionsCategory: /IPD|OPD|OUTREACH|category|type/i.test(question),
      mentionsUsers: /user|admin|institute|pharmacy|created by/i.test(question),
      isCounting: /count|how many|number of/i.test(question),
      isAskingStatus: /status|state|progress/i.test(question),
      isAskingDetails: /detail|info|information|about/i.test(question),
      timePeriod: (() => {
        const monthMatch = question.match(/(\d+)\s*month/i);
        if (monthMatch) return parseInt(monthMatch[1]);
        const dayMatch = question.match(/(\d+)\s*day/i);
        if (dayMatch) return Math.ceil(parseInt(dayMatch[1]) / 30);
        return null;
      })()
    };

    const params = {
      userId: user.id,
      expiryThreshold: questionAnalysis.timePeriod ? 
                      `${questionAnalysis.timePeriod} months` : '3 months',
      lowStockThreshold: 15,
      criticalStockThreshold: 5,
      limit: 25
    };

    // ADMIN QUERIES
    if (user.role === 'admin') {
      const queries = {
        drugs: questionAnalysis.mentionsDrugs && db.query(
          `SELECT d.*, u.name as created_by_name
           FROM drugs d
           LEFT JOIN users u ON d.created_by = u.id
           ${questionAnalysis.mentionsCategory ? "WHERE d.category IS NOT NULL" : ""}
           ORDER BY 
             CASE WHEN d.stock < $1 THEN 0 ELSE 1 END,
             d.exp_date ASC
           LIMIT $2`, 
          [params.lowStockThreshold, params.limit]
        ),
        
        institutes: db.query(
          `SELECT id, name, email, status, license_number, registration_date, 
                  city, state, country
           FROM users 
           WHERE role = 'institute'
           ${questionAnalysis.isAskingStatus ? "ORDER BY status" : "ORDER BY name"}
           LIMIT $1`, 
          [params.limit]
        ),
        
        orders: questionAnalysis.mentionsOrders && db.query(
          `SELECT o.*, 
                  u1.name as buyer_name, 
                  u2.name as recipient_name,
                  COUNT(oi.id) as item_count,
                  SUM(oi.total_price) as calculated_total
           FROM orders o
           JOIN users u1 ON o.user_id = u1.id
           LEFT JOIN users u2 ON o.recipient_id = u2.id
           LEFT JOIN order_items oi ON o.id = oi.order_id
           GROUP BY o.id, u1.name, u2.name
           ORDER BY o.created_at DESC
           LIMIT $1`, 
          [params.limit]
        ),
        
        expiringSoon: questionAnalysis.mentionsExpiration && db.query(
          `SELECT id, name, batch_no, exp_date, stock, category, price
           FROM drugs 
           WHERE exp_date BETWEEN NOW() AND NOW() + INTERVAL '${params.expiryThreshold}'
           ORDER BY exp_date ASC
           LIMIT $1`, 
          [params.limit]
        ),
        
        criticalStock: db.query(
          `SELECT id, name, batch_no, stock, category, price
           FROM drugs 
           WHERE stock < $1
           ORDER BY stock ASC
           LIMIT $2`, 
          [params.criticalStockThreshold, params.limit]
        ),
        
        allUsers: questionAnalysis.mentionsUsers && db.query(
          `SELECT id, name, email, role, status, registration_date
           FROM users
           ORDER BY role, name
           LIMIT $1`,
          [params.limit]
        ),
        
        pendingOrders: questionAnalysis.isAskingStatus && db.query(
          `SELECT o.id, o.order_no, COUNT(oi.id) as pending_items
           FROM orders o
           JOIN order_items oi ON o.id = oi.order_id
           WHERE oi.status = 'pending'
           GROUP BY o.id
           ORDER BY o.created_at ASC
           LIMIT $1`,
          [params.limit]
        )
      };

      // Execute all relevant queries in parallel
      const results = await Promise.all(
        Object.values(queries).filter(q => q).map(q => q.catch(e => {
          console.error('Query error:', e.message);
          return { rows: [] };
        }))
      );

      return {
        drugs: results[0]?.rows,
        institutes: results[1]?.rows,
        orders: results[2]?.rows,
        expiring_soon: results[3]?.rows,
        critical_stock: results[4]?.rows,
        users: results[5]?.rows,
        pending_orders: results[6]?.rows,
        question_analysis: questionAnalysis,
        params: params
      };
    }

    // INSTITUTE QUERIES
    if (user.role === 'institute') {
      const queries = {
        drugs: questionAnalysis.mentionsDrugs && db.query(
          `SELECT d.*
           FROM drugs d
           WHERE d.created_by = $1
           ${questionAnalysis.mentionsCategory ? "AND d.category IS NOT NULL" : ""}
           ORDER BY 
             CASE WHEN d.stock < $2 THEN 0 ELSE 1 END,
             d.exp_date ASC
           LIMIT $3`, 
          [params.userId, params.lowStockThreshold, params.limit]
        ),
        
        orders: questionAnalysis.mentionsOrders && db.query(
          `SELECT o.*, u.name as recipient_name,
                  COUNT(oi.id) as item_count
           FROM orders o
           JOIN users u ON o.recipient_id = u.id
           WHERE o.user_id = $1
           GROUP BY o.id, u.name
           ORDER BY o.created_at DESC
           LIMIT $2`, 
          [params.userId, params.limit]
        ),
        
        orderItems: db.query(
          `SELECT oi.*, d.name as drug_name, o.order_no, d.category,
                  u.name as seller_name
           FROM order_items oi
           LEFT JOIN drugs d ON oi.drug_id = d.id
           JOIN orders o ON oi.order_id = o.id
           LEFT JOIN users u ON oi.seller_id = u.id
           WHERE o.user_id = $1
           ORDER BY oi.created_at DESC
           LIMIT $2`, 
          [params.userId, params.limit]
        ),
        
        expiringSoon: questionAnalysis.mentionsExpiration && db.query(
          `SELECT id, name, batch_no, exp_date, stock, category, price
           FROM drugs 
           WHERE created_by = $1 AND exp_date BETWEEN NOW() AND NOW() + INTERVAL '${params.expiryThreshold}'
           ORDER BY exp_date ASC
           LIMIT $2`, 
          [params.userId, params.limit]
        ),
        
        pendingApprovals: questionAnalysis.isAskingStatus && db.query(
          `SELECT oi.id, oi.drug_id, oi.quantity, oi.status,
                  d.name as drug_name, o.order_no
           FROM order_items oi
           JOIN drugs d ON oi.drug_id = d.id
           JOIN orders o ON oi.order_id = o.id
           WHERE oi.seller_id = $1 AND oi.status = 'pending'
           ORDER BY oi.created_at ASC
           LIMIT $2`,
          [params.userId, params.limit]
        )
      };

      const results = await Promise.all(
        Object.values(queries).filter(q => q).map(q => q.catch(e => {
          console.error('Query error:', e.message);
          return { rows: [] };
        }))
      );

      return {
        drugs: results[0]?.rows,
        orders: results[1]?.rows,
        order_items: results[2]?.rows,
        expiring_soon: results[3]?.rows,
        pending_approvals: results[4]?.rows,
        question_analysis: questionAnalysis,
        params: params
      };
    }

    // PHARMACY QUERIES
    if (user.role === 'pharmacy') {
      const queries = {
        orders: questionAnalysis.mentionsOrders && db.query(
          `SELECT o.*, u.name as seller_name,
                  COUNT(oi.id) as item_count
           FROM orders o
           JOIN users u ON o.user_id = u.id
           WHERE o.recipient_id = $1
           GROUP BY o.id, u.name
           ORDER BY o.created_at DESC
           LIMIT $2`, 
          [params.userId, params.limit]
        ),
        
        orderItems: db.query(
          `SELECT oi.*, d.name as drug_name, d.category, o.order_no, 
                  u.name as seller_name, d.batch_no as drug_batch
           FROM order_items oi
           LEFT JOIN drugs d ON oi.drug_id = d.id
           JOIN orders o ON oi.order_id = o.id
           LEFT JOIN users u ON oi.seller_id = u.id
           WHERE o.recipient_id = $1
           ORDER BY oi.created_at DESC
           LIMIT $2`, 
          [params.userId, params.limit]
        ),
        
        inventory: questionAnalysis.mentionsDrugs && db.query(
          `SELECT id, name, batch_no, stock, category, price, exp_date
           FROM drugs 
           WHERE created_by = $1
           ${questionAnalysis.mentionsCategory ? "AND category IS NOT NULL" : ""}
           ORDER BY 
             CASE WHEN stock < $2 THEN 0 ELSE 1 END,
             exp_date ASC
           LIMIT $3`, 
          [params.userId, params.lowStockThreshold, params.limit]
        ),
        
        pendingOrders: db.query(
          `SELECT o.id, o.order_no, COUNT(oi.id) as pending_items
           FROM orders o
           JOIN order_items oi ON o.id = oi.order_id
           WHERE o.recipient_id = $1 AND oi.status = 'pending'
           GROUP BY o.id
           ORDER BY o.created_at ASC
           LIMIT $2`, 
          [params.userId, params.limit]
        ),
        
        expiringSoon: questionAnalysis.mentionsExpiration && db.query(
          `SELECT id, name, batch_no, exp_date, stock, category, price
           FROM drugs 
           WHERE created_by = $1 AND exp_date BETWEEN NOW() AND NOW() + INTERVAL '${params.expiryThreshold}'
           ORDER BY exp_date ASC
           LIMIT $2`, 
          [params.userId, params.limit]
        )
      };

      const results = await Promise.all(
        Object.values(queries).filter(q => q).map(q => q.catch(e => {
          console.error('Query error:', e.message);
          return { rows: [] };
        }))
      );

      return {
        orders: results[0]?.rows,
        order_items: results[1]?.rows,
        inventory: results[2]?.rows,
        pending_orders: results[3]?.rows,
        expiring_soon: results[4]?.rows,
        question_analysis: questionAnalysis,
        params: params
      };
    }

    return { error: 'Unsupported user role' };
  } catch (error) {
    console.error('Database error:', error.message);
    return { 
      error: 'Database operation failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
  } finally {
    await db.query('RESET statement_timeout').catch(() => {});
  }
};

// Main chatbot handler
const handleChatbotQuery = async (req, res) => {
  const { query, conversation_history = [] } = req.body;
  const user = req.user;

  try {
    if (!user?.id) return res.status(401).json({ error: 'Authentication required' });
    if (!query?.trim()) return res.status(400).json({ error: 'Query is required' });

    const db = req.app.locals.db;
    let data;

    // First try dynamic SQL approach
    try {
      const sqlQuery = await generateDynamicSQL(user, query);
      console.log('Generated SQL:', sqlQuery);
      
      const result = await db.query(sqlQuery);
      data = result.rows;
    } catch (sqlError) {
      console.log('Dynamic SQL failed, falling back to predefined queries:', sqlError.message);
      // Fall back to your predefined queries
      data = await getRelevantData(db, user, query.trim());
    }

    // Prepare context for AI
    const messages = [
      {
        role: 'system',
        content: SYSTEM_PROMPTS[user.role] || SYSTEM_PROMPTS.institute
      },
      ...conversation_history,
      {
        role: 'user',
        content: `Question: ${query}\n\nData Context:\n${
          Array.isArray(data) 
            ? JSON.stringify(data.slice(0, 5), null, 2)
            : JSON.stringify({
                drugs: data.drugs?.slice(0, 5),
                orders: data.orders?.slice(0, 3),
                expiring_soon: data.expiring_soon?.slice(0, 5)
              }, null, 2)
        }`
      }
    ];

    // Call AI service
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:8080'
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-r1:free',
          messages,
          temperature: 0.5,
          max_tokens: 1000
        })
      }
    );

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(`AI API error: ${errorBody.error?.message || response.status}`);
    }

    const result = await response.json();
    let aiReply = result.choices?.[0]?.message?.content;

    // If AI gives no reply, use our formatter
    if (!aiReply || aiReply.includes("sorry") || aiReply.includes("couldn't find")) {
      aiReply = formatResponse(data, user.role, query);
    }

    return res.json({
      reply: aiReply,
      conversation_id: Date.now(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chatbot error:', error.message);
    return res.status(500).json({
      reply: "I'm having trouble answering that. Please try rephrasing your question.",
      error: error.message,
      suggestion: "Try asking about drugs, orders, or inventory status."
    });
  }
};

module.exports = {
  handleChatbotQuery
};