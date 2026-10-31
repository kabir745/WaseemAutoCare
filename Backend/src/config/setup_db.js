const { pool } = require('./db');
const bcrypt = require('bcryptjs');

const setupDatabase = async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('[Setup DB] Starting database migration & seeding for wac_db...');

    // 1. Roles table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        display_name VARCHAR(80) NOT NULL,
        description TEXT NULL,
        is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log(' - [OK] roles table ready');

    // 2. Permissions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        module VARCHAR(50) NOT NULL,
        description VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_permissions_module (module)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log(' - [OK] permissions table ready');

    // 3. Role Permissions junction table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INT NOT NULL,
        permission_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (role_id, permission_id),
        INDEX idx_rp_permission (permission_id),
        CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log(' - [OK] role_permissions table ready');

    // 4. Users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role_id INT NOT NULL,
        full_name VARCHAR(120) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        phone VARCHAR(25) NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_main_admin BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_users_role (role_id),
        INDEX idx_users_active (is_active),
        CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log(' - [OK] users table ready');

    // 5. Two-Factor Authentication & Verification OTPs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS otps (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        email VARCHAR(150) NOT NULL,
        otp_code VARCHAR(10) NOT NULL,
        purpose ENUM('LOGIN', 'SIGNUP', 'RESET_PASSWORD') NOT NULL,
        metadata JSON NULL,
        expires_at DATETIME NOT NULL,
        is_used BOOLEAN NOT NULL DEFAULT FALSE,
        used_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_otps_email_purpose (email, purpose),
        INDEX idx_otps_code (otp_code),
        INDEX idx_otps_used (is_used),
        CONSTRAINT fk_otps_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log(' - [OK] otps table ready');

    // 5. Seed Roles
    const initialRoles = [
      { name: 'main_admin', display_name: 'Main Administrator', description: 'Business owner with top-level system authority', is_system_role: true },
      { name: 'admin', display_name: 'Administrator', description: 'Delegated administrator with staff management access', is_system_role: true },
      { name: 'customer', display_name: 'Customer', description: 'Vehicle owner with customer-facing access', is_system_role: true },
      { name: 'staff', display_name: 'Operational Staff', description: 'Workshop service personnel', is_system_role: false },
    ];

    for (const r of initialRoles) {
      await connection.query(`
        INSERT INTO roles (name, display_name, description, is_system_role)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), description = VALUES(description), is_system_role = VALUES(is_system_role)
      `, [r.name, r.display_name, r.description, r.is_system_role]);
    }
    console.log(' - [OK] 4 initial roles seeded');

    // 6. Seed Permissions
    const initialPermissions = [
      { name: 'profile.manage', module: 'profile', description: 'View and edit own profile' },
      { name: 'users.view', module: 'users', description: 'View user and staff accounts' },
      { name: 'users.create_staff', module: 'users', description: 'Create operational staff accounts' },
      { name: 'users.create_admin', module: 'users', description: 'Create administrator accounts' },
      { name: 'users.status', module: 'users', description: 'Activate or deactivate accounts' },
      { name: 'roles.manage', module: 'roles', description: 'View and manage role-permission assignments' },
    ];

    for (const p of initialPermissions) {
      await connection.query(`
        INSERT INTO permissions (name, module, description)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE module = VALUES(module), description = VALUES(description)
      `, [p.name, p.module, p.description]);
    }
    console.log(' - [OK] 6 initial permissions seeded');

    // Fetch role & permission IDs
    const [rolesRows] = await connection.query('SELECT id, name FROM roles');
    const roleMap = {};
    rolesRows.forEach((r) => { roleMap[r.name] = r.id; });

    const [permRows] = await connection.query('SELECT id, name FROM permissions');
    const permMap = {};
    permRows.forEach((p) => { permMap[p.name] = p.id; });

    // 7. Seed Role Permissions
    const rolePermissionMappings = [
      // Main Admin gets all 6 permissions
      { role: 'main_admin', permissions: ['profile.manage', 'users.view', 'users.create_staff', 'users.create_admin', 'users.status', 'roles.manage'] },
      // Admin gets 3 permissions
      { role: 'admin', permissions: ['profile.manage', 'users.view', 'users.create_staff'] },
      // Customer gets profile.manage
      { role: 'customer', permissions: ['profile.manage'] },
      // Staff gets profile.manage
      { role: 'staff', permissions: ['profile.manage'] },
    ];

    for (const mapping of rolePermissionMappings) {
      const roleId = roleMap[mapping.role];
      if (!roleId) continue;

      for (const permName of mapping.permissions) {
        const permId = permMap[permName];
        if (!permId) continue;

        await connection.query(`
          INSERT IGNORE INTO role_permissions (role_id, permission_id)
          VALUES (?, ?)
        `, [roleId, permId]);
      }
    }
    console.log(' - [OK] role-permission mappings seeded');

    // 8. Seed Initial Main Admin Account (Non-destructive)
    const mainAdminEmail = process.env.MAIN_ADMIN_EMAIL || 'admin@waseemautocare.com';
    const mainAdminPassword = process.env.MAIN_ADMIN_PASSWORD || 'Admin@12345';
    const mainAdminName = process.env.MAIN_ADMIN_NAME || 'Waseem Akram (Main Admin)';
    const mainAdminPhone = process.env.MAIN_ADMIN_PHONE || '03211234567';

    const [existingAdmin] = await connection.query('SELECT id FROM users WHERE email = ?', [mainAdminEmail]);
    if (existingAdmin.length === 0) {
      const passwordHash = await bcrypt.hash(mainAdminPassword, 10);
      await connection.query(`
        INSERT INTO users (role_id, full_name, email, phone, password_hash, is_active, is_main_admin)
        VALUES (?, ?, ?, ?, ?, TRUE, TRUE)
      `, [roleMap['main_admin'], mainAdminName, mainAdminEmail, mainAdminPhone, passwordHash]);
      console.log(` - [OK] Main Admin account created: ${mainAdminEmail} / ${mainAdminPassword}`);
    } else {
      console.log(` - [INFO] Main Admin account (${mainAdminEmail}) already exists. Existing credentials preserved.`);
    }

    console.log('[Setup DB] Database setup & seeding completed successfully!');
  } catch (error) {
    console.error('[Setup DB Error]', error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

// Execute directly if run via node
if (require.main === module) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { setupDatabase };
