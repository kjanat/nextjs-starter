-- Migration: Add insulin inventory and enhanced injection tracking
-- Version: 002
-- Description: Adds tables for insulin inventory management and enhanced injection tracking with multi-dose support

-- Create insulin inventory table
CREATE TABLE IF NOT EXISTS insulin_inventory (
  id TEXT PRIMARY KEY,
  user_name TEXT NOT NULL,
  
  -- Insulin details
  insulin_type TEXT NOT NULL,
  brand TEXT,
  concentration TEXT,
  
  -- Quantity tracking
  quantity INTEGER NOT NULL DEFAULT 1,
  volume_ml REAL,
  units_per_ml INTEGER DEFAULT 100,
  
  -- Dates
  purchase_date INTEGER,
  expiration_date INTEGER NOT NULL,
  opened_date INTEGER,
  started_using INTEGER,
  finished_using INTEGER,
  current_units_remaining REAL,
  
  -- Storage conditions
  storage_location TEXT,
  temperature_exposures TEXT, -- JSON array
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  
  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Create indexes for insulin inventory
CREATE INDEX IF NOT EXISTS idx_inventory_user_name ON insulin_inventory(user_name);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON insulin_inventory(status);
CREATE INDEX IF NOT EXISTS idx_inventory_expiration ON insulin_inventory(expiration_date);
CREATE INDEX IF NOT EXISTS idx_inventory_insulin_type ON insulin_inventory(insulin_type);

-- Create temperature exposures table
CREATE TABLE IF NOT EXISTS temperature_exposures (
  id TEXT PRIMARY KEY,
  inventory_id TEXT NOT NULL,
  exposure_type TEXT NOT NULL,
  temperature REAL,
  duration INTEGER,
  exposure_date INTEGER NOT NULL,
  severity TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (inventory_id) REFERENCES insulin_inventory(id) ON DELETE CASCADE
);

-- Create indexes for temperature exposures
CREATE INDEX IF NOT EXISTS idx_exposure_inventory ON temperature_exposures(inventory_id);
CREATE INDEX IF NOT EXISTS idx_exposure_date ON temperature_exposures(exposure_date);

-- Create enhanced injections table
CREATE TABLE IF NOT EXISTS injections_enhanced (
  id TEXT PRIMARY KEY,
  user_name TEXT NOT NULL,
  
  -- Time and type
  injection_time INTEGER NOT NULL,
  injection_type TEXT NOT NULL,
  
  -- Insulin details
  insulin_type TEXT,
  insulin_brand TEXT,
  dosage_units REAL,
  
  -- Related measurements
  blood_glucose_before REAL,
  blood_glucose_after REAL,
  blood_glucose_unit TEXT DEFAULT 'mg/dL',
  
  -- Meal context
  meal_type TEXT,
  carbs_grams REAL,
  
  -- Site rotation
  injection_site TEXT,
  
  -- Additional context
  notes TEXT,
  tags TEXT, -- JSON array
  
  -- Link to inventory
  inventory_id TEXT,
  
  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Create indexes for enhanced injections
CREATE INDEX IF NOT EXISTS idx_injections_enh_user_name ON injections_enhanced(user_name);
CREATE INDEX IF NOT EXISTS idx_injections_enh_injection_time ON injections_enhanced(injection_time);
CREATE INDEX IF NOT EXISTS idx_injections_enh_injection_type ON injections_enhanced(injection_type);
CREATE INDEX IF NOT EXISTS idx_injections_enh_insulin_type ON injections_enhanced(insulin_type);
CREATE INDEX IF NOT EXISTS idx_injections_enh_meal_type ON injections_enhanced(meal_type);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_insulin_inventory_updated_at
AFTER UPDATE ON insulin_inventory
FOR EACH ROW
BEGIN
  UPDATE insulin_inventory SET updated_at = unixepoch() WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_injections_enhanced_updated_at
AFTER UPDATE ON injections_enhanced
FOR EACH ROW
BEGIN
  UPDATE injections_enhanced SET updated_at = unixepoch() WHERE id = NEW.id;
END;