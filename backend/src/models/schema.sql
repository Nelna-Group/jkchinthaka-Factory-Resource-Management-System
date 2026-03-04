-- FUPMS Database Schema (SQL Server / T-SQL)
-- Factory Utility & Production Management System

-- Roles table
IF OBJECT_ID('dbo.roles', 'U') IS NULL
CREATE TABLE roles (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(50) NOT NULL UNIQUE,
  description NVARCHAR(255),
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE()
);

-- Users table
IF OBJECT_ID('dbo.users', 'U') IS NULL
CREATE TABLE users (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(100) NOT NULL,
  email NVARCHAR(150) NOT NULL UNIQUE,
  password_hash NVARCHAR(255) NOT NULL,
  role_id INT NOT NULL DEFAULT 3,
  is_active BIT DEFAULT 1,
  last_login DATETIME2 NULL,
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE NO ACTION
);

-- Assets table
IF OBJECT_ID('dbo.assets', 'U') IS NULL
CREATE TABLE assets (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(100) NOT NULL,
  type NVARCHAR(50) NOT NULL,
  location NVARCHAR(150),
  description NVARCHAR(MAX),
  is_active BIT DEFAULT 1,
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE()
);

-- Electricity data
IF OBJECT_ID('dbo.electricity_data', 'U') IS NULL
CREATE TABLE electricity_data (
  id INT IDENTITY(1,1) PRIMARY KEY,
  date DATE NOT NULL,
  energy_kWh DECIMAL(12,2) NOT NULL,
  cost DECIMAL(12,2) NOT NULL,
  peak_kW DECIMAL(10,2),
  off_peak_kWh DECIMAL(12,2),
  asset_id INT NOT NULL,
  notes NVARCHAR(MAX),
  created_by INT,
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE NO ACTION,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Water meter data
IF OBJECT_ID('dbo.water_meter_data', 'U') IS NULL
CREATE TABLE water_meter_data (
  id INT IDENTITY(1,1) PRIMARY KEY,
  date DATE NOT NULL,
  intake DECIMAL(12,2) NOT NULL,
  ppu_reading DECIMAL(12,2),
  fpu_reading DECIMAL(12,2),
  chiller DECIMAL(12,2),
  cooling_tower DECIMAL(12,2),
  column_data NVARCHAR(MAX),
  cost DECIMAL(12,2),
  notes NVARCHAR(MAX),
  created_by INT,
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Work schedule
IF OBJECT_ID('dbo.work_schedule', 'U') IS NULL
CREATE TABLE work_schedule (
  id INT IDENTITY(1,1) PRIMARY KEY,
  day DATE NOT NULL,
  is_holiday BIT DEFAULT 0,
  holiday_name NVARCHAR(100),
  ppu_planned INT DEFAULT 0,
  ppu_actual INT DEFAULT 0,
  fpu_planned INT DEFAULT 0,
  fpu_actual INT DEFAULT 0,
  fmu_planned INT DEFAULT 0,
  fmu_actual INT DEFAULT 0,
  notes NVARCHAR(MAX),
  created_by INT,
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Production target
IF OBJECT_ID('dbo.production_target_new', 'U') IS NULL
CREATE TABLE production_target_new (
  id INT IDENTITY(1,1) PRIMARY KEY,
  line_id NVARCHAR(50) NOT NULL,
  product_group NVARCHAR(100) NOT NULL,
  production_unit NVARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  target DECIMAL(12,2) NOT NULL,
  actual DECIMAL(12,2) DEFAULT 0,
  efficiency AS (CASE WHEN target > 0 THEN (actual / target) * 100 ELSE 0 END),
  notes NVARCHAR(MAX),
  created_by INT,
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Audit log
IF OBJECT_ID('dbo.audit_log', 'U') IS NULL
CREATE TABLE audit_log (
  id INT IDENTITY(1,1) PRIMARY KEY,
  user_id INT,
  action NVARCHAR(50) NOT NULL,
  entity NVARCHAR(50) NOT NULL,
  entity_id INT,
  old_values NVARCHAR(MAX),
  new_values NVARCHAR(MAX),
  ip_address NVARCHAR(45),
  created_at DATETIME2 DEFAULT GETDATE(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Alert thresholds
IF OBJECT_ID('dbo.alert_thresholds', 'U') IS NULL
CREATE TABLE alert_thresholds (
  id INT IDENTITY(1,1) PRIMARY KEY,
  metric NVARCHAR(50) NOT NULL UNIQUE,
  warning_threshold DECIMAL(12,2),
  critical_threshold DECIMAL(12,2),
  is_active BIT DEFAULT 1,
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE()
);

-- Indexes (created separately for T-SQL)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_electricity_date')
  CREATE INDEX idx_electricity_date ON electricity_data(date);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_electricity_asset')
  CREATE INDEX idx_electricity_asset ON electricity_data(asset_id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_water_date')
  CREATE INDEX idx_water_date ON water_meter_data(date);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_schedule_day')
  CREATE INDEX idx_schedule_day ON work_schedule(day);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_production_date')
  CREATE INDEX idx_production_date ON production_target_new(date);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_production_line')
  CREATE INDEX idx_production_line ON production_target_new(line_id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_audit_user')
  CREATE INDEX idx_audit_user ON audit_log(user_id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_audit_entity')
  CREATE INDEX idx_audit_entity ON audit_log(entity, entity_id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_audit_created')
  CREATE INDEX idx_audit_created ON audit_log(created_at);

-- Seed roles
MERGE INTO roles AS target
USING (VALUES
  ('Admin', 'Full system access'),
  ('Manager', 'View and manage data'),
  ('Data Entry', 'Enter and edit data only')
) AS source (name, description)
ON target.name = source.name
WHEN MATCHED THEN UPDATE SET description = source.description
WHEN NOT MATCHED THEN INSERT (name, description) VALUES (source.name, source.description);

-- Seed default admin user (password: Admin@123)
IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@fupms.com')
  INSERT INTO users (name, email, password_hash, role_id)
  VALUES ('System Admin', 'admin@fupms.com', '$2a$10$XQxBj1NAqYbqVmWmhM7KOeKYjYME3MjGLCMGkSbOHGc8MQ8KdKawi', 1);

-- Seed alert thresholds
MERGE INTO alert_thresholds AS target
USING (VALUES
  ('electricity_daily_kWh', 10000, 15000),
  ('water_daily_intake', 500, 800),
  ('production_efficiency', 80, 60)
) AS source (metric, warning_threshold, critical_threshold)
ON target.metric = source.metric
WHEN MATCHED THEN UPDATE SET warning_threshold = source.warning_threshold, critical_threshold = source.critical_threshold
WHEN NOT MATCHED THEN INSERT (metric, warning_threshold, critical_threshold) VALUES (source.metric, source.warning_threshold, source.critical_threshold);
