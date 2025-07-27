-- Add new tables for insulin inventory and enhanced injections
CREATE TABLE IF NOT EXISTS `injections_enhanced` (
	`id` text PRIMARY KEY NOT NULL,
	`user_name` text NOT NULL,
	`injection_time` integer NOT NULL,
	`injection_type` text NOT NULL,
	`insulin_type` text,
	`insulin_brand` text,
	`dosage_units` real,
	`blood_glucose_before` real,
	`blood_glucose_after` real,
	`blood_glucose_unit` text DEFAULT 'mg/dL',
	`meal_type` text,
	`carbs_grams` real,
	`injection_site` text,
	`notes` text,
	`tags` text,
	`inventory_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_injections_enh_user_name` ON `injections_enhanced` (`user_name`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_injections_enh_injection_time` ON `injections_enhanced` (`injection_time`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_injections_enh_injection_type` ON `injections_enhanced` (`injection_type`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_injections_enh_insulin_type` ON `injections_enhanced` (`insulin_type`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_injections_enh_meal_type` ON `injections_enhanced` (`meal_type`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `insulin_inventory` (
	`id` text PRIMARY KEY NOT NULL,
	`user_name` text NOT NULL,
	`insulin_type` text NOT NULL,
	`brand` text,
	`concentration` text,
	`quantity` integer DEFAULT 1 NOT NULL,
	`volume_ml` real,
	`units_per_ml` integer DEFAULT 100,
	`purchase_date` integer,
	`expiration_date` integer NOT NULL,
	`opened_date` integer,
	`started_using` integer,
	`finished_using` integer,
	`current_units_remaining` real,
	`storage_location` text,
	`temperature_exposures` text,
	`status` text DEFAULT 'active' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_inventory_user_name` ON `insulin_inventory` (`user_name`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_inventory_status` ON `insulin_inventory` (`status`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_inventory_expiration` ON `insulin_inventory` (`expiration_date`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_inventory_insulin_type` ON `insulin_inventory` (`insulin_type`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `temperature_exposures` (
	`id` text PRIMARY KEY NOT NULL,
	`inventory_id` text NOT NULL,
	`exposure_type` text NOT NULL,
	`temperature` real,
	`duration` integer,
	`exposure_date` integer NOT NULL,
	`severity` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`inventory_id`) REFERENCES `insulin_inventory`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_exposure_inventory` ON `temperature_exposures` (`inventory_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_exposure_date` ON `temperature_exposures` (`exposure_date`);