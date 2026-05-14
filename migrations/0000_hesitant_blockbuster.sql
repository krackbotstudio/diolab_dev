
-- Dumping structure for table public.accounts
CREATE TABLE IF NOT EXISTS "accounts" (
	"userId" UUID NOT NULL,
	"type" VARCHAR NOT NULL,
	"provider" VARCHAR NOT NULL,
	"providerAccountId" VARCHAR NOT NULL,
	"refresh_token" TEXT NULL DEFAULT NULL,
	"access_token" TEXT NULL DEFAULT NULL,
	"expires_at" INTEGER NULL DEFAULT NULL,
	"token_type" VARCHAR NULL DEFAULT NULL,
	"scope" VARCHAR NULL DEFAULT NULL,
	"id_token" TEXT NULL DEFAULT NULL,
	"session_state" VARCHAR NULL DEFAULT NULL,
	PRIMARY KEY ("provider", "providerAccountId"),
	CONSTRAINT "accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "auth"."users" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table public.admissions
CREATE TABLE IF NOT EXISTS "admissions" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"admission_number" TEXT NOT NULL,
	"organization_id" VARCHAR NOT NULL,
	"patient_id" VARCHAR NOT NULL,
	"bed_id" VARCHAR NULL DEFAULT NULL,
	"ward_id" VARCHAR NULL DEFAULT NULL,
	"doctor_id" VARCHAR NULL DEFAULT NULL,
	"admission_type" TEXT NOT NULL DEFAULT 'regular',
	"status" TEXT NOT NULL DEFAULT 'admitted',
	"admission_date" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	"discharge_date" TIMESTAMP NULL DEFAULT NULL,
	"diagnosis" TEXT NULL DEFAULT NULL,
	"chief_complaint" TEXT NULL DEFAULT NULL,
	"treatment_plan" TEXT NULL DEFAULT NULL,
	"surgery_required" BOOLEAN NULL DEFAULT false,
	"surgery_notes" TEXT NULL DEFAULT NULL,
	"insurance_provider" TEXT NULL DEFAULT NULL,
	"insurance_policy_number" TEXT NULL DEFAULT NULL,
	"emergency_contact_name" TEXT NULL DEFAULT NULL,
	"emergency_contact_phone" TEXT NULL DEFAULT NULL,
	"discharge_summary" TEXT NULL DEFAULT NULL,
	"discharge_notes" TEXT NULL DEFAULT NULL,
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table public.auth_sessions
CREATE TABLE IF NOT EXISTS "auth_sessions" (
	"sessionToken" VARCHAR NOT NULL,
	"userId" UUID NOT NULL,
	"expires" TIMESTAMP NOT NULL,
	PRIMARY KEY ("sessionToken"),
	CONSTRAINT "auth_sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "auth"."users" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);

-- Data exporting was unselected.

-- Dumping structure for table public.beds
CREATE TABLE IF NOT EXISTS "beds" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"organization_id" VARCHAR NOT NULL,
	"ward_id" VARCHAR NOT NULL,
	"bed_number" TEXT NOT NULL,
	"type" TEXT NULL DEFAULT 'standard',
	"status" TEXT NOT NULL DEFAULT 'available',
	"current_patient_id" VARCHAR NULL DEFAULT NULL,
	"current_admission_id" VARCHAR NULL DEFAULT NULL,
	"daily_rate" NUMERIC(10,2) NULL DEFAULT NULL::numeric,
	"features" TEXT NULL DEFAULT NULL,
	"notes" TEXT NULL DEFAULT NULL,
	"is_active" BOOLEAN NULL DEFAULT true,
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table public.bills
CREATE TABLE IF NOT EXISTS "bills" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"bill_number" TEXT NOT NULL,
	"organization_id" VARCHAR NOT NULL,
	"branch_id" VARCHAR NOT NULL,
	"patient_id" VARCHAR NOT NULL,
	"created_by" VARCHAR NOT NULL,
	"items" JSONB NOT NULL,
	"subtotal" NUMERIC(10,2) NOT NULL,
	"discount_amount" NUMERIC(10,2) NULL DEFAULT '0',
	"tax_amount" NUMERIC(10,2) NULL DEFAULT '0',
	"total_amount" NUMERIC(10,2) NOT NULL,
	"paid_amount" NUMERIC(10,2) NULL DEFAULT '0',
	"due_amount" NUMERIC(10,2) NULL DEFAULT NULL::numeric,
	"payment_method" TEXT NULL DEFAULT NULL,
	"payment_status" TEXT NULL DEFAULT 'pending',
	"notes" TEXT NULL DEFAULT NULL,
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY ("id"),
	UNIQUE ("bill_number")
);

-- Data exporting was unselected.

-- Dumping structure for table public.bookings
CREATE TABLE IF NOT EXISTS "bookings" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"booking_number" TEXT NOT NULL,
	"organization_id" VARCHAR NOT NULL,
	"branch_id" VARCHAR NULL DEFAULT NULL,
	"patient_name" TEXT NOT NULL,
	"patient_age" INTEGER NULL DEFAULT NULL,
	"patient_gender" TEXT NULL DEFAULT NULL,
	"patient_phone" TEXT NOT NULL,
	"patient_email" TEXT NULL DEFAULT NULL,
	"patient_id" VARCHAR NULL DEFAULT NULL,
	"selected_tests" JSONB NULL DEFAULT NULL,
	"selected_packages" JSONB NULL DEFAULT NULL,
	"symptoms" TEXT NULL DEFAULT NULL,
	"service_type" TEXT NOT NULL DEFAULT 'lab_visit',
	"preferred_date" TEXT NOT NULL,
	"preferred_time_slot" TEXT NULL DEFAULT NULL,
	"collection_address" TEXT NULL DEFAULT NULL,
	"collection_address_line2" TEXT NULL DEFAULT NULL,
	"collection_city" TEXT NULL DEFAULT NULL,
	"collection_pincode" TEXT NULL DEFAULT NULL,
	"collection_notes" TEXT NULL DEFAULT NULL,
	"collection_agent_id" VARCHAR NULL DEFAULT NULL,
	"estimated_amount" NUMERIC(10,2) NULL DEFAULT NULL::numeric,
	"home_collection_charge" NUMERIC(10,2) NULL DEFAULT '0',
	"status" TEXT NULL DEFAULT 'pending',
	"status_notes" TEXT NULL DEFAULT NULL,
	"bill_id" VARCHAR NULL DEFAULT NULL,
	"source" TEXT NULL DEFAULT 'online',
	"ip_address" TEXT NULL DEFAULT NULL,
	"user_agent" TEXT NULL DEFAULT NULL,
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY ("id"),
	UNIQUE ("booking_number")
);

-- Data exporting was unselected.

-- Dumping structure for table public.booking_patients
CREATE TABLE IF NOT EXISTS "booking_patients" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"organization_id" VARCHAR NOT NULL,
	"name" TEXT NOT NULL,
	"phone" TEXT NOT NULL,
	"email" TEXT NULL DEFAULT NULL,
	"age" INTEGER NULL DEFAULT NULL,
	"gender" TEXT NULL DEFAULT NULL,
	"address" TEXT NULL DEFAULT NULL,
	"address_line2" TEXT NULL DEFAULT NULL,
	"city" TEXT NULL DEFAULT NULL,
	"pincode" TEXT NULL DEFAULT NULL,
	"patient_id" VARCHAR NULL DEFAULT NULL,
	"total_bookings" INTEGER NULL DEFAULT 1,
	"last_booking_date" TIMESTAMP NULL DEFAULT NULL,
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table public.branches
CREATE TABLE IF NOT EXISTS "branches" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"organization_id" VARCHAR NOT NULL,
	"name" TEXT NOT NULL,
	"address" TEXT NULL DEFAULT NULL,
	"phone" TEXT NULL DEFAULT NULL,
	"email" TEXT NULL DEFAULT NULL,
	"is_active" BOOLEAN NULL DEFAULT true,
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table public.cms_activity_log
CREATE TABLE IF NOT EXISTS "cms_activity_log" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"admin_id" VARCHAR NOT NULL,
	"admin_email" TEXT NOT NULL,
	"action" TEXT NOT NULL,
	"target_type" TEXT NOT NULL,
	"target_id" VARCHAR NULL DEFAULT NULL,
	"details" JSONB NULL DEFAULT NULL,
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table public.conversations
CREATE TABLE IF NOT EXISTS "conversations" (
	"id" SERIAL NOT NULL,
	"title" TEXT NOT NULL,
	"created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table public.daily_stats
CREATE TABLE IF NOT EXISTS "daily_stats" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"organization_id" VARCHAR NOT NULL,
	"branch_id" VARCHAR NULL DEFAULT NULL,
	"date" TEXT NOT NULL,
	"total_bills" INTEGER NULL DEFAULT 0,
	"total_revenue" NUMERIC(12,2) NULL DEFAULT '0',
	"total_patients" INTEGER NULL DEFAULT 0,
	"total_tests" INTEGER NULL DEFAULT 0,
	"collection_amount" NUMERIC(12,2) NULL DEFAULT '0',
	"due_amount" NUMERIC(12,2) NULL DEFAULT '0',
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table public.departments
CREATE TABLE IF NOT EXISTS "departments" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"organization_id" VARCHAR NOT NULL,
	"name" TEXT NOT NULL,
	"description" TEXT NULL DEFAULT NULL,
	"consultation_fee" NUMERIC(10,2) NULL DEFAULT '500',
	"is_active" BOOLEAN NULL DEFAULT true,
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table public.doctors
CREATE TABLE IF NOT EXISTS "doctors" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"organization_id" VARCHAR NOT NULL,
	"department_id" VARCHAR NULL DEFAULT NULL,
	"staff_id" VARCHAR NULL DEFAULT NULL,
	"name" TEXT NOT NULL,
	"specialization" TEXT NULL DEFAULT NULL,
	"qualification" TEXT NULL DEFAULT NULL,
	"phone" TEXT NULL DEFAULT NULL,
	"email" TEXT NULL DEFAULT NULL,
	"consultation_fee" NUMERIC(10,2) NULL DEFAULT '500',
	"is_available" BOOLEAN NULL DEFAULT true,
	"is_active" BOOLEAN NULL DEFAULT true,
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table public.doctor_referrals
CREATE TABLE IF NOT EXISTS "doctor_referrals" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"organization_id" VARCHAR NOT NULL,
	"referral_number" TEXT NOT NULL,
	"op_visit_id" VARCHAR NULL DEFAULT NULL,
	"patient_id" VARCHAR NOT NULL,
	"referring_doctor_id" VARCHAR NOT NULL,
	"referred_doctor_id" VARCHAR NOT NULL,
	"reason" TEXT NOT NULL,
	"priority" TEXT NULL DEFAULT 'normal',
	"clinical_notes" TEXT NULL DEFAULT NULL,
	"diagnosis" TEXT NULL DEFAULT NULL,
	"status" TEXT NULL DEFAULT 'pending',
	"completion_notes" TEXT NULL DEFAULT NULL,
	"completed_at" TIMESTAMP NULL DEFAULT NULL,
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table public.icu_monitoring
CREATE TABLE IF NOT EXISTS "icu_monitoring" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"organization_id" VARCHAR NOT NULL,
	"admission_id" VARCHAR NOT NULL,
	"patient_id" VARCHAR NOT NULL,
	"heart_rate" INTEGER NULL DEFAULT NULL,
	"systolic_bp" INTEGER NULL DEFAULT NULL,
	"diastolic_bp" INTEGER NULL DEFAULT NULL,
	"temperature" NUMERIC(4,1) NULL DEFAULT NULL::numeric,
	"sp_o2" INTEGER NULL DEFAULT NULL,
	"respiratory_rate" INTEGER NULL DEFAULT NULL,
	"blood_sugar" NUMERIC(6,1) NULL DEFAULT NULL::numeric,
	"gcs_score" INTEGER NULL DEFAULT NULL,
	"ventilator_mode" TEXT NULL DEFAULT NULL,
	"fi_o2" INTEGER NULL DEFAULT NULL,
	"peep" INTEGER NULL DEFAULT NULL,
	"tidal_volume" INTEGER NULL DEFAULT NULL,
	"oxygen_flow" NUMERIC(4,1) NULL DEFAULT NULL::numeric,
	"urine_output" INTEGER NULL DEFAULT NULL,
	"intake_volume" INTEGER NULL DEFAULT NULL,
	"output_volume" INTEGER NULL DEFAULT NULL,
	"pain_score" INTEGER NULL DEFAULT NULL,
	"consciousness" TEXT NULL DEFAULT NULL,
	"pupil_reaction" TEXT NULL DEFAULT NULL,
	"iv_fluids" TEXT NULL DEFAULT NULL,
	"notes" TEXT NULL DEFAULT NULL,
	"recorded_by" TEXT NULL DEFAULT NULL,
	"recorded_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table public.inventory_items
CREATE TABLE IF NOT EXISTS "inventory_items" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"organization_id" VARCHAR NOT NULL,
	"branch_id" VARCHAR NULL DEFAULT NULL,
	"name" TEXT NOT NULL,
	"category" TEXT NOT NULL,
	"unit" TEXT NOT NULL,
	"current_stock" INTEGER NULL DEFAULT 0,
	"min_stock" INTEGER NULL DEFAULT 10,
	"max_stock" INTEGER NULL DEFAULT NULL,
	"unit_price" NUMERIC(10,2) NULL DEFAULT NULL::numeric,
	"supplier" TEXT NULL DEFAULT NULL,
	"last_restocked" TIMESTAMP NULL DEFAULT NULL,
	"expiry_date" TIMESTAMP NULL DEFAULT NULL,
	"is_active" BOOLEAN NULL DEFAULT true,
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table public.medicines
CREATE TABLE IF NOT EXISTS "medicines" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"organization_id" VARCHAR NOT NULL,
	"name" TEXT NOT NULL,
	"generic_name" TEXT NULL DEFAULT NULL,
	"brand" TEXT NULL DEFAULT NULL,
	"category" TEXT NULL DEFAULT NULL,
	"form" TEXT NULL DEFAULT NULL,
	"strength" TEXT NULL DEFAULT NULL,
	"unit" TEXT NULL DEFAULT NULL,
	"mrp" NUMERIC(10,2) NOT NULL,
	"selling_price" NUMERIC(10,2) NOT NULL,
	"cost_price" NUMERIC(10,2) NULL DEFAULT NULL::numeric,
	"stock" INTEGER NULL DEFAULT 0,
	"reorder_level" INTEGER NULL DEFAULT 10,
	"batch_number" TEXT NULL DEFAULT NULL,
	"expiry_date" TEXT NULL DEFAULT NULL,
	"supplier_id" VARCHAR NULL DEFAULT NULL,
	"shelf_location" TEXT NULL DEFAULT NULL,
	"requires_prescription" BOOLEAN NULL DEFAULT false,
	"is_active" BOOLEAN NULL DEFAULT true,
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	"barcode" TEXT NULL DEFAULT NULL,
	"hsn_code" TEXT NULL DEFAULT NULL,
	"manufacturer" TEXT NULL DEFAULT NULL,
	"description" TEXT NULL DEFAULT NULL,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table public.medicine_sales
CREATE TABLE IF NOT EXISTS "medicine_sales" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"organization_id" VARCHAR NOT NULL,
	"invoice_number" TEXT NOT NULL,
	"customer_name" TEXT NULL DEFAULT NULL,
	"customer_phone" TEXT NULL DEFAULT NULL,
	"items" JSONB NOT NULL,
	"subtotal" NUMERIC(10,2) NOT NULL,
	"discount" NUMERIC(10,2) NULL DEFAULT '0',
	"tax" NUMERIC(10,2) NULL DEFAULT '0',
	"total" NUMERIC(10,2) NOT NULL,
	"payment_mode" TEXT NULL DEFAULT 'cash',
	"payment_status" TEXT NULL DEFAULT 'paid',
	"prescription_ref" TEXT NULL DEFAULT NULL,
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table public.messages
CREATE TABLE IF NOT EXISTS "messages" (
	"id" SERIAL NOT NULL,
	"conversation_id" INTEGER NOT NULL,
	"role" TEXT NOT NULL,
	"content" TEXT NOT NULL,
	"created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table public.module_referrals
CREATE TABLE IF NOT EXISTS "module_referrals" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"organization_id" VARCHAR NOT NULL,
	"referral_number" TEXT NOT NULL,
	"source_module" TEXT NOT NULL,
	"target_module" TEXT NOT NULL,
	"patient_id" VARCHAR NULL DEFAULT NULL,
	"patient_name" TEXT NOT NULL,
	"patient_phone" TEXT NULL DEFAULT NULL,
	"op_visit_id" VARCHAR NULL DEFAULT NULL,
	"doctor_name" TEXT NULL DEFAULT NULL,
	"referral_type" TEXT NOT NULL,
	"items" JSONB NOT NULL,
	"notes" TEXT NULL DEFAULT NULL,
	"status" TEXT NULL DEFAULT 'sent',
	"completed_at" TIMESTAMP NULL DEFAULT NULL,
	"linked_sale_id" VARCHAR NULL DEFAULT NULL,
	"linked_test_id" VARCHAR NULL DEFAULT NULL,
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table public.op_visits
CREATE TABLE IF NOT EXISTS "op_visits" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"organization_id" VARCHAR NOT NULL,
	"token_number" INTEGER NOT NULL,
	"token_date" TEXT NOT NULL,
	"patient_id" VARCHAR NOT NULL,
	"doctor_id" VARCHAR NULL DEFAULT NULL,
	"department_id" VARCHAR NULL DEFAULT NULL,
	"visit_type" TEXT NOT NULL DEFAULT 'new',
	"source" TEXT NOT NULL DEFAULT 'walk_in',
	"status" TEXT NOT NULL DEFAULT 'booked',
	"symptoms" TEXT NULL DEFAULT NULL,
	"diagnosis" TEXT NULL DEFAULT NULL,
	"notes" TEXT NULL DEFAULT NULL,
	"consultation_fee" NUMERIC(10,2) NULL DEFAULT NULL::numeric,
	"payment_mode" TEXT NULL DEFAULT NULL,
	"payment_status" TEXT NULL DEFAULT 'unpaid',
	"queue_position" INTEGER NULL DEFAULT NULL,
	"scheduled_time" TEXT NULL DEFAULT NULL,
	"consultation_started_at" TIMESTAMP NULL DEFAULT NULL,
	"consultation_ended_at" TIMESTAMP NULL DEFAULT NULL,
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	"consultation_type" TEXT NOT NULL DEFAULT 'in_person',
	"scheduled_date" TEXT NULL DEFAULT NULL,
	"meeting_room_id" VARCHAR NULL DEFAULT NULL,
	"payment_transaction_id" TEXT NULL DEFAULT NULL,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table public.organizations
CREATE TABLE IF NOT EXISTS "organizations" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"name" TEXT NOT NULL,
	"logo" TEXT NULL DEFAULT NULL,
	"address" TEXT NULL DEFAULT NULL,
	"city" TEXT NULL DEFAULT NULL,
	"state" TEXT NULL DEFAULT NULL,
	"pincode" TEXT NULL DEFAULT NULL,
	"phone" TEXT NULL DEFAULT NULL,
	"email" TEXT NULL DEFAULT NULL,
	"website" TEXT NULL DEFAULT NULL,
	"gst_number" TEXT NULL DEFAULT NULL,
	"pan_number" TEXT NULL DEFAULT NULL,
	"license_number" TEXT NULL DEFAULT NULL,
	"invoice_prefix" TEXT NULL DEFAULT 'INV',
	"report_header" TEXT NULL DEFAULT NULL,
	"report_footer" TEXT NULL DEFAULT NULL,
	"owner_id" VARCHAR NULL DEFAULT NULL,
	"is_onboarded" BOOLEAN NULL DEFAULT false,
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	"show_logo" BOOLEAN NULL DEFAULT true,
	"show_qr_code" BOOLEAN NULL DEFAULT true,
	"primary_color" TEXT NULL DEFAULT '#2DD4BF',
	"accent_color" TEXT NULL DEFAULT '#0F766E',
	"header_color" TEXT NULL DEFAULT '#0D9488',
	"upi_qr_code_url" TEXT NULL DEFAULT NULL,
	"upi_id" TEXT NULL DEFAULT NULL,
	"subscribed_modules" JSONB NULL DEFAULT '["dialab"]',
	"default_consultation_fee" TEXT NULL DEFAULT '500',
	"token_prefix" TEXT NULL DEFAULT 'T',
	"pharmacy_name" TEXT NULL DEFAULT NULL,
	"default_markup_percent" TEXT NULL DEFAULT '15',
	"low_stock_threshold" INTEGER NULL DEFAULT 10,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table public.organization_booking_settings
CREATE TABLE IF NOT EXISTS "organization_booking_settings" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"organization_id" VARCHAR NOT NULL,
	"booking_enabled" BOOLEAN NULL DEFAULT true,
	"booking_page_title" TEXT NULL DEFAULT NULL,
	"booking_page_description" TEXT NULL DEFAULT NULL,
	"home_collection_enabled" BOOLEAN NULL DEFAULT false,
	"home_collection_charge" NUMERIC(10,2) NULL DEFAULT '0',
	"home_collection_min_order" NUMERIC(10,2) NULL DEFAULT NULL::numeric,
	"available_time_slots" JSONB NULL DEFAULT NULL,
	"booking_lead_time" INTEGER NULL DEFAULT 1,
	"max_bookings_per_slot" INTEGER NULL DEFAULT 5,
	"working_days" JSONB NULL DEFAULT '[1, 2, 3, 4, 5, 6]',
	"notify_on_booking" BOOLEAN NULL DEFAULT true,
	"notification_email" TEXT NULL DEFAULT NULL,
	"notification_phone" TEXT NULL DEFAULT NULL,
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY ("id"),
	UNIQUE ("organization_id")
);

-- Data exporting was unselected.

-- Dumping structure for table public.patients
CREATE TABLE IF NOT EXISTS "patients" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"organization_id" VARCHAR NOT NULL,
	"patient_id" TEXT NOT NULL,
	"first_name" TEXT NOT NULL,
	"last_name" TEXT NOT NULL,
	"phone" TEXT NOT NULL,
	"email" TEXT NULL DEFAULT NULL,
	"date_of_birth" TEXT NULL DEFAULT NULL,
	"gender" TEXT NULL DEFAULT NULL,
	"address" TEXT NULL DEFAULT NULL,
	"blood_group" TEXT NULL DEFAULT NULL,
	"family_group_id" VARCHAR NULL DEFAULT NULL,
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	"source" TEXT NULL DEFAULT 'walk_in',
	"module" TEXT NULL DEFAULT 'diagnostics',
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table public.patient_vitals
CREATE TABLE IF NOT EXISTS "patient_vitals" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"organization_id" VARCHAR NOT NULL,
	"patient_id" VARCHAR NOT NULL,
	"op_visit_id" VARCHAR NULL DEFAULT NULL,
	"height" NUMERIC(5,1) NULL DEFAULT NULL::numeric,
	"weight" NUMERIC(5,1) NULL DEFAULT NULL::numeric,
	"bmi" NUMERIC(4,1) NULL DEFAULT NULL::numeric,
	"blood_pressure" TEXT NULL DEFAULT NULL,
	"pulse" INTEGER NULL DEFAULT NULL,
	"temperature" NUMERIC(4,1) NULL DEFAULT NULL::numeric,
	"sp_o2" INTEGER NULL DEFAULT NULL,
	"recorded_by" VARCHAR NULL DEFAULT NULL,
	"recorded_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table public.pharmacy_orders
CREATE TABLE IF NOT EXISTS "pharmacy_orders" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"organization_id" VARCHAR NOT NULL,
	"order_number" TEXT NOT NULL,
	"customer_name" TEXT NOT NULL,
	"customer_phone" TEXT NOT NULL,
	"customer_address" TEXT NULL DEFAULT NULL,
	"items" JSONB NOT NULL,
	"subtotal" NUMERIC(10,2) NOT NULL,
	"total" NUMERIC(10,2) NOT NULL,
	"notes" TEXT NULL DEFAULT NULL,
	"status" TEXT NULL DEFAULT 'pending',
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table public.prescriptions
CREATE TABLE IF NOT EXISTS "prescriptions" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"op_visit_id" VARCHAR NOT NULL,
	"organization_id" VARCHAR NOT NULL,
	"medicine_name" TEXT NOT NULL,
	"dosage" TEXT NULL DEFAULT NULL,
	"frequency" TEXT NULL DEFAULT NULL,
	"duration" TEXT NULL DEFAULT NULL,
	"instructions" TEXT NULL DEFAULT NULL,
	"quantity" INTEGER NULL DEFAULT NULL,
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	"follow_up_date" TEXT NULL DEFAULT NULL,
	"language" TEXT NULL DEFAULT NULL,
	"translated_medicine_name" TEXT NULL DEFAULT NULL,
	"translated_dosage" TEXT NULL DEFAULT NULL,
	"translated_frequency" TEXT NULL DEFAULT NULL,
	"translated_duration" TEXT NULL DEFAULT NULL,
	"translated_instructions" TEXT NULL DEFAULT NULL,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table public.reports
CREATE TABLE IF NOT EXISTS "reports" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"report_number" TEXT NOT NULL,
	"organization_id" VARCHAR NOT NULL,
	"bill_id" VARCHAR NOT NULL,
	"patient_id" VARCHAR NOT NULL,
	"pdf_url" TEXT NULL DEFAULT NULL,
	"status" TEXT NULL DEFAULT 'pending',
	"generated_by" VARCHAR NULL DEFAULT NULL,
	"generated_at" TIMESTAMP NULL DEFAULT NULL,
	"delivered_at" TIMESTAMP NULL DEFAULT NULL,
	"delivery_method" TEXT NULL DEFAULT NULL,
	"version" INTEGER NULL DEFAULT 1,
	"ai_summary" TEXT NULL DEFAULT NULL,
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY ("id"),
	UNIQUE ("report_number")
);

-- Data exporting was unselected.

-- Dumping structure for table public.report_shares
CREATE TABLE IF NOT EXISTS "report_shares" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"report_id" VARCHAR NOT NULL,
	"organization_id" VARCHAR NOT NULL,
	"share_method" TEXT NOT NULL,
	"recipient_phone" TEXT NULL DEFAULT NULL,
	"recipient_email" TEXT NULL DEFAULT NULL,
	"share_link" TEXT NULL DEFAULT NULL,
	"status" TEXT NULL DEFAULT 'sent',
	"sent_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	"viewed_at" TIMESTAMP NULL DEFAULT NULL,
	"sent_by" VARCHAR NULL DEFAULT NULL,
	"error_message" TEXT NULL DEFAULT NULL,
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table public.samples
CREATE TABLE IF NOT EXISTS "samples" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"sample_id" TEXT NOT NULL,
	"organization_id" VARCHAR NOT NULL,
	"bill_id" VARCHAR NOT NULL,
	"patient_id" VARCHAR NOT NULL,
	"test_id" VARCHAR NOT NULL,
	"status" TEXT NULL DEFAULT 'collected',
	"collected_by" VARCHAR NULL DEFAULT NULL,
	"collected_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	"processed_by" VARCHAR NULL DEFAULT NULL,
	"processed_at" TIMESTAMP NULL DEFAULT NULL,
	"result" TEXT NULL DEFAULT NULL,
	"result_value" TEXT NULL DEFAULT NULL,
	"is_abnormal" BOOLEAN NULL DEFAULT false,
	"notes" TEXT NULL DEFAULT NULL,
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	"result_data" JSONB NULL DEFAULT NULL,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table public.sessions
CREATE TABLE IF NOT EXISTS "sessions" (
	"sid" VARCHAR NOT NULL,
	"sess" JSONB NOT NULL,
	"expire" TIMESTAMP NOT NULL,
	PRIMARY KEY ("sid")
)
CREATE INDEX "IDX_session_expire" ON "" ("expire");;

-- Data exporting was unselected.

-- Dumping structure for table public.staff
CREATE TABLE IF NOT EXISTS "staff" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"user_id" VARCHAR NULL DEFAULT NULL,
	"username" TEXT NOT NULL,
	"email" TEXT NOT NULL,
	"full_name" TEXT NOT NULL,
	"phone" TEXT NULL DEFAULT NULL,
	"role" TEXT NOT NULL DEFAULT 'receptionist',
	"organization_id" VARCHAR NULL DEFAULT NULL,
	"branch_id" VARCHAR NULL DEFAULT NULL,
	"is_active" BOOLEAN NULL DEFAULT true,
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	"password" TEXT NULL DEFAULT NULL,
	"module_access" JSONB NULL DEFAULT '["dialab"]',
	"page_permissions" JSONB NULL DEFAULT NULL,
	PRIMARY KEY ("id"),
	UNIQUE ("username")
);

-- Data exporting was unselected.

-- Dumping structure for table public.super_admins
CREATE TABLE IF NOT EXISTS "super_admins" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"email" TEXT NOT NULL,
	"password" TEXT NOT NULL,
	"name" TEXT NOT NULL,
	"is_active" BOOLEAN NULL DEFAULT true,
	"last_login_at" TIMESTAMP NULL DEFAULT NULL,
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY ("id"),
	UNIQUE ("email")
);

-- Data exporting was unselected.

-- Dumping structure for table public.suppliers
CREATE TABLE IF NOT EXISTS "suppliers" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"organization_id" VARCHAR NOT NULL,
	"name" TEXT NOT NULL,
	"contact_person" TEXT NULL DEFAULT NULL,
	"phone" TEXT NULL DEFAULT NULL,
	"email" TEXT NULL DEFAULT NULL,
	"address" TEXT NULL DEFAULT NULL,
	"gst_number" TEXT NULL DEFAULT NULL,
	"is_active" BOOLEAN NULL DEFAULT true,
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table public.tests
CREATE TABLE IF NOT EXISTS "tests" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"organization_id" VARCHAR NOT NULL,
	"name" TEXT NOT NULL,
	"code" TEXT NOT NULL,
	"category" TEXT NOT NULL,
	"description" TEXT NULL DEFAULT NULL,
	"price" NUMERIC(10,2) NOT NULL,
	"normal_range" TEXT NULL DEFAULT NULL,
	"unit" TEXT NULL DEFAULT NULL,
	"sample_type" TEXT NULL DEFAULT NULL,
	"turnaround_time" TEXT NULL DEFAULT NULL,
	"is_active" BOOLEAN NULL DEFAULT true,
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	"report_template" JSONB NULL DEFAULT NULL,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table public.test_packages
CREATE TABLE IF NOT EXISTS "test_packages" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"organization_id" VARCHAR NOT NULL,
	"name" TEXT NOT NULL,
	"description" TEXT NULL DEFAULT NULL,
	"test_ids" JSONB NOT NULL,
	"original_price" NUMERIC(10,2) NOT NULL,
	"discounted_price" NUMERIC(10,2) NOT NULL,
	"discount_percent" NUMERIC(5,2) NULL DEFAULT NULL::numeric,
	"valid_from" TIMESTAMP NULL DEFAULT NULL,
	"valid_until" TIMESTAMP NULL DEFAULT NULL,
	"is_active" BOOLEAN NULL DEFAULT true,
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY ("id")
);

-- Data exporting was unselected.

-- Dumping structure for table public.test_reports
CREATE TABLE IF NOT EXISTS "test_reports" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"report_number" TEXT NOT NULL,
	"organization_id" VARCHAR NOT NULL,
	"branch_id" VARCHAR NULL DEFAULT NULL,
	"bill_id" VARCHAR NOT NULL,
	"sample_id" VARCHAR NOT NULL,
	"patient_id" VARCHAR NOT NULL,
	"test_id" VARCHAR NOT NULL,
	"result_data" JSONB NULL DEFAULT NULL,
	"interpretation" TEXT NULL DEFAULT NULL,
	"ai_summary" TEXT NULL DEFAULT NULL,
	"instrument_used" TEXT NULL DEFAULT NULL,
	"methodology" TEXT NULL DEFAULT NULL,
	"status" TEXT NULL DEFAULT 'pending',
	"entered_by" VARCHAR NULL DEFAULT NULL,
	"entered_at" TIMESTAMP NULL DEFAULT NULL,
	"verified_by" VARCHAR NULL DEFAULT NULL,
	"verified_at" TIMESTAMP NULL DEFAULT NULL,
	"finalized_by" VARCHAR NULL DEFAULT NULL,
	"finalized_at" TIMESTAMP NULL DEFAULT NULL,
	"is_locked" BOOLEAN NULL DEFAULT false,
	"pdf_url" TEXT NULL DEFAULT NULL,
	"version" INTEGER NULL DEFAULT 1,
	"parent_report_id" VARCHAR NULL DEFAULT NULL,
	"revision_notes" TEXT NULL DEFAULT NULL,
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY ("id"),
	UNIQUE ("report_number")
);

-- Data exporting was unselected.

-- Dumping structure for table public.users
CREATE TABLE IF NOT EXISTS "users" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"email" VARCHAR NULL DEFAULT NULL,
	"first_name" VARCHAR NULL DEFAULT NULL,
	"last_name" VARCHAR NULL DEFAULT NULL,
	"profile_image_url" VARCHAR NULL DEFAULT NULL,
	"created_at" TIMESTAMP NULL DEFAULT now(),
	"updated_at" TIMESTAMP NULL DEFAULT now(),
	"phone" VARCHAR NULL DEFAULT NULL,
	"password" VARCHAR NULL DEFAULT NULL,
	"auth_provider" VARCHAR NULL DEFAULT 'email',
	"google_id" VARCHAR NULL DEFAULT NULL,
	"is_email_verified" TIMESTAMP NULL DEFAULT NULL,
	"email_verified" TIMESTAMP NULL DEFAULT NULL,
	"username" VARCHAR NULL DEFAULT NULL,
	"name" VARCHAR NULL DEFAULT NULL,
	"image" VARCHAR NULL DEFAULT NULL,
	"role" VARCHAR NULL DEFAULT 'user',
	PRIMARY KEY ("id"),
	UNIQUE ("email")
);

-- Data exporting was unselected.

-- Dumping structure for table public.verification_tokens
CREATE TABLE IF NOT EXISTS "verification_tokens" (
	"identifier" VARCHAR NOT NULL,
	"token" VARCHAR NOT NULL,
	"expires" TIMESTAMP NOT NULL,
	PRIMARY KEY ("identifier", "token")
);

-- Data exporting was unselected.

-- Dumping structure for table public.wards
CREATE TABLE IF NOT EXISTS "wards" (
	"id" VARCHAR NOT NULL DEFAULT gen_random_uuid(),
	"organization_id" VARCHAR NOT NULL,
	"name" TEXT NOT NULL,
	"type" TEXT NOT NULL DEFAULT 'general',
	"floor" TEXT NULL DEFAULT NULL,
	"total_beds" INTEGER NOT NULL DEFAULT 0,
	"description" TEXT NULL DEFAULT NULL,
	"in_charge" TEXT NULL DEFAULT NULL,
	"contact_extension" TEXT NULL DEFAULT NULL,
	"is_active" BOOLEAN NULL DEFAULT true,
	"created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY ("id")
);


