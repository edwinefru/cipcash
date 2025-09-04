-- RemitAfrica Supabase Database Schema
-- This file contains the complete database schema and Row Level Security (RLS) policies
-- for the mobile money remittance application

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table with comprehensive KYC information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    nationality VARCHAR(100) NOT NULL,
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    
    -- Contact Information
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    country VARCHAR(100) NOT NULL,
    
    -- Identification
    id_type VARCHAR(50) NOT NULL CHECK (id_type IN ('passport', 'national_id', 'drivers_license', 'other')),
    id_number VARCHAR(100) NOT NULL,
    id_expiry_date DATE,
    id_issuing_country VARCHAR(100) NOT NULL,
    
    -- Employment/Source of Income
    occupation VARCHAR(100) NOT NULL,
    employer_name VARCHAR(200),
    annual_income_range VARCHAR(50) NOT NULL CHECK (annual_income_range IN ('under_25k', '25k_50k', '50k_100k', '100k_250k', '250k_500k', 'over_500k')),
    source_of_funds VARCHAR(50) NOT NULL CHECK (source_of_funds IN ('salary', 'business', 'investment', 'inheritance', 'gift', 'other')),
    
    -- Profile Picture (base64 encoded)
    profile_picture TEXT,
    
    -- Authentication
    password_hash TEXT NOT NULL,
    
    -- KYC Status
    is_kyc_verified BOOLEAN DEFAULT FALSE,
    kyc_verification_date TIMESTAMPTZ,
    kyc_verification_notes TEXT,
    
    -- Account Status
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Compliance
    terms_accepted_at TIMESTAMPTZ,
    privacy_policy_accepted_at TIMESTAMPTZ,
    marketing_consent BOOLEAN DEFAULT FALSE
);

-- Supported countries table
CREATE TABLE supported_countries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code VARCHAR(2) UNIQUE NOT NULL,
    country_name VARCHAR(100) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    currency_name VARCHAR(100) NOT NULL,
    flag_emoji VARCHAR(10) NOT NULL,
    phone_code VARCHAR(10) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    mtn_supported BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment methods table
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    method_type VARCHAR(20) NOT NULL CHECK (method_type IN ('credit_card', 'debit_card', 'apple_pay', 'google_pay', 'paypal')),
    
    -- Card details (encrypted/tokenized)
    last_four VARCHAR(4),
    card_brand VARCHAR(20),
    expiry_month INTEGER CHECK (expiry_month BETWEEN 1 AND 12),
    expiry_year INTEGER CHECK (expiry_year > EXTRACT(YEAR FROM NOW())),
    
    -- Payment processor references
    stripe_payment_method_id VARCHAR(100),
    paypal_payment_method_id VARCHAR(100),
    
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recipients table with KYC information
CREATE TABLE recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    
    -- Address Information
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100) NOT NULL,
    country_code VARCHAR(2) NOT NULL REFERENCES supported_countries(country_code),
    
    -- Relationship and Purpose
    relationship_to_sender VARCHAR(20) NOT NULL CHECK (relationship_to_sender IN ('family', 'friend', 'business', 'other')),
    recipient_type VARCHAR(20) DEFAULT 'individual' CHECK (recipient_type IN ('individual', 'business')),
    
    -- For business recipients
    business_name VARCHAR(200),
    business_registration_number VARCHAR(100),
    
    -- Verification status
    is_verified BOOLEAN DEFAULT FALSE,
    verification_date TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicate recipients
    UNIQUE(user_id, phone, country_code)
);

-- Exchange rates table
CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(15, 6) NOT NULL,
    source VARCHAR(50) DEFAULT 'manual',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(from_currency, to_currency)
);

-- Transfer reasons table
CREATE TABLE transfer_reasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    recipient_id UUID NOT NULL REFERENCES recipients(id),
    
    -- Transfer Details
    amount_sent DECIMAL(15, 2) NOT NULL,
    currency_sent VARCHAR(3) NOT NULL,
    amount_received DECIMAL(15, 2) NOT NULL,
    currency_received VARCHAR(3) NOT NULL,
    exchange_rate DECIMAL(15, 6) NOT NULL,
    
    -- Purpose and Compliance
    transfer_reason_code VARCHAR(50) NOT NULL REFERENCES transfer_reasons(code),
    transfer_description TEXT,
    
    -- Payment Information
    payment_method_id UUID REFERENCES payment_methods(id),
    payment_processor VARCHAR(20) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
    
    -- Transfer Status
    transfer_status VARCHAR(20) DEFAULT 'pending' CHECK (transfer_status IN ('pending', 'processing', 'sent', 'delivered', 'failed', 'cancelled')),
    
    -- References
    transaction_reference VARCHAR(100) UNIQUE NOT NULL,
    mtn_reference VARCHAR(100),
    payment_reference VARCHAR(100),
    
    -- Fees and Costs
    transfer_fee DECIMAL(10, 2) DEFAULT 0,
    exchange_fee DECIMAL(10, 2) DEFAULT 0,
    payment_processing_fee DECIMAL(10, 2) DEFAULT 0,
    total_fees DECIMAL(10, 2) DEFAULT 0,
    total_cost DECIMAL(15, 2) NOT NULL,
    
    -- Delivery Information
    estimated_delivery_date TIMESTAMPTZ,
    actual_delivery_date TIMESTAMPTZ,
    delivery_method VARCHAR(50) DEFAULT 'mobile_money',
    
    -- Compliance and Audit
    aml_check_status VARCHAR(20) DEFAULT 'pending' CHECK (aml_check_status IN ('pending', 'approved', 'flagged', 'rejected')),
    aml_check_date TIMESTAMPTZ,
    compliance_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    
    -- Indexes for better performance
    CONSTRAINT positive_amounts CHECK (amount_sent > 0 AND amount_received > 0)
);

-- Transaction status history for audit trail
CREATE TABLE transaction_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    status_type VARCHAR(20) NOT NULL CHECK (status_type IN ('payment', 'transfer')),
    notes TEXT,
    changed_by UUID REFERENCES users(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin settings table
CREATE TABLE admin_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- MTN Remittance Settings
    mtn_api_key TEXT,
    mtn_api_secret TEXT,
    mtn_subscription_key TEXT,
    mtn_base_url VARCHAR(255) DEFAULT 'https://sandbox.momodeveloper.mtn.com',
    
    -- Payment Provider Settings
    stripe_api_key TEXT,
    stripe_webhook_secret TEXT,
    paypal_client_id TEXT,
    paypal_client_secret TEXT,
    google_pay_merchant_id TEXT,
    apple_pay_merchant_id TEXT,
    
    -- Currency Settings
    currency_api_key TEXT,
    currency_api_provider VARCHAR(50) DEFAULT 'fixer',
    
    -- Business Settings
    company_name VARCHAR(200) DEFAULT 'RemitAfrica',
    support_email VARCHAR(255),
    support_phone VARCHAR(50),
    
    -- Compliance Settings
    max_daily_limit DECIMAL(15, 2) DEFAULT 10000,
    max_monthly_limit DECIMAL(15, 2) DEFAULT 50000,
    kyc_required_threshold DECIMAL(10, 2) DEFAULT 1000,
    
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('transaction', 'kyc', 'security', 'promotional', 'system')),
    
    -- Delivery channels
    push_sent BOOLEAN DEFAULT FALSE,
    email_sent BOOLEAN DEFAULT FALSE,
    sms_sent BOOLEAN DEFAULT FALSE,
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    
    -- Related data
    transaction_id UUID REFERENCES transactions(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- API logs table for compliance and debugging
CREATE TABLE api_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    
    -- Request/Response data (be careful with sensitive data)
    request_headers JSONB,
    response_headers JSONB,
    
    -- Performance
    response_time_ms INTEGER,
    
    -- Client information
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_kyc_status ON users(is_kyc_verified);
CREATE INDEX idx_users_active ON users(is_active);

CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_default ON payment_methods(user_id, is_default) WHERE is_default = TRUE;

CREATE INDEX idx_recipients_user_id ON recipients(user_id);
CREATE INDEX idx_recipients_country ON recipients(country_code);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_recipient_id ON transactions(recipient_id);
CREATE INDEX idx_transactions_status ON transactions(transfer_status);
CREATE INDEX idx_transactions_payment_status ON transactions(payment_status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_reference ON transactions(transaction_reference);

CREATE INDEX idx_transaction_history_transaction_id ON transaction_status_history(transaction_id);
CREATE INDEX idx_transaction_history_created_at ON transaction_status_history(created_at);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_type ON notifications(type);

CREATE INDEX idx_api_logs_user_id ON api_logs(user_id);
CREATE INDEX idx_api_logs_created_at ON api_logs(created_at);
CREATE INDEX idx_api_logs_endpoint ON api_logs(endpoint);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supported_countries_updated_at BEFORE UPDATE ON supported_countries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipients_updated_at BEFORE UPDATE ON recipients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exchange_rates_updated_at BEFORE UPDATE ON exchange_rates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create transaction status history
CREATE OR REPLACE FUNCTION create_transaction_status_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create history if payment_status or transfer_status changed
    IF (OLD.payment_status IS DISTINCT FROM NEW.payment_status) THEN
        INSERT INTO transaction_status_history (
            transaction_id, 
            previous_status, 
            new_status,
            status_type,
            notes
        ) VALUES (
            NEW.id,
            OLD.payment_status,
            NEW.payment_status,
            'payment',
            'Payment status updated'
        );
    END IF;
    
    IF (OLD.transfer_status IS DISTINCT FROM NEW.transfer_status) THEN
        INSERT INTO transaction_status_history (
            transaction_id,
            previous_status,
            new_status,
            status_type,
            notes
        ) VALUES (
            NEW.id,
            OLD.transfer_status,
            NEW.transfer_status,
            'transfer',
            'Transfer status updated'
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for transaction status history
CREATE TRIGGER transaction_status_history_trigger
    AFTER UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION create_transaction_status_history();

-- Insert default data
INSERT INTO supported_countries (country_code, country_name, currency_code, currency_name, flag_emoji, phone_code) VALUES
('BJ', 'Benin', 'XOF', 'West African CFA franc', '🇧🇯', '+229'),
('CM', 'Cameroon', 'XAF', 'Central African CFA franc', '🇨🇲', '+237'),
('CI', 'Côte d''Ivoire', 'XOF', 'West African CFA franc', '🇨🇮', '+225'),
('CD', 'Democratic Republic of Congo', 'CDF', 'Congolese franc', '🇨🇩', '+243'),
('SZ', 'Eswatini', 'SZL', 'Swazi lilangeni', '🇸🇿', '+268'),
('ET', 'Ethiopia', 'ETB', 'Ethiopian birr', '🇪🇹', '+251'),
('GA', 'Gabon', 'XAF', 'Central African CFA franc', '🇬🇦', '+241'),
('GH', 'Ghana', 'GHS', 'Ghanaian cedi', '🇬🇭', '+233'),
('GW', 'Guinea Bissau', 'XOF', 'West African CFA franc', '🇬🇼', '+245'),
('GN', 'Guinea Conakry', 'GNF', 'Guinean franc', '🇬🇳', '+224'),
('KE', 'Kenya', 'KES', 'Kenyan shilling', '🇰🇪', '+254'),
('LR', 'Liberia', 'LRD', 'Liberian dollar', '🇱🇷', '+231'),
('MG', 'Madagascar', 'MGA', 'Malagasy ariary', '🇲🇬', '+261'),
('MW', 'Malawi', 'MWK', 'Malawian kwacha', '🇲🇼', '+265'),
('MZ', 'Mozambique', 'MZN', 'Mozambican metical', '🇲🇿', '+258'),
('NG', 'Nigeria', 'NGN', 'Nigerian naira', '🇳🇬', '+234'),
('CG', 'Republic of Congo', 'XAF', 'Central African CFA franc', '🇨🇬', '+242'),
('RW', 'Rwanda', 'RWF', 'Rwandan franc', '🇷🇼', '+250'),
('SN', 'Senegal', 'XOF', 'West African CFA franc', '🇸🇳', '+221'),
('SL', 'Sierra Leone', 'SLE', 'Sierra Leonean leone', '🇸🇱', '+232'),
('ZA', 'South Africa', 'ZAR', 'South African rand', '🇿🇦', '+27'),
('TZ', 'Tanzania', 'TZS', 'Tanzanian shilling', '🇹🇿', '+255'),
('UG', 'Uganda', 'UGX', 'Ugandan shilling', '🇺🇬', '+256'),
('ZM', 'Zambia', 'ZMW', 'Zambian kwacha', '🇿🇲', '+260');

INSERT INTO transfer_reasons (code, description, category) VALUES
('family_support', 'Family Support', 'personal'),
('education', 'Education Expenses', 'personal'),
('medical', 'Medical Expenses', 'personal'),
('business', 'Business Operations', 'business'),
('investment', 'Investment', 'business'),
('property', 'Property Purchase', 'investment'),
('loan_repayment', 'Loan Repayment', 'financial'),
('gift', 'Gift', 'personal'),
('travel', 'Travel Expenses', 'personal'),
('other', 'Other', 'other');

INSERT INTO admin_settings (id) VALUES (uuid_generate_v4());

-- Default exchange rates
INSERT INTO exchange_rates (from_currency, to_currency, rate) VALUES
('USD', 'XOF', 580.0), ('USD', 'XAF', 600.0), ('USD', 'CDF', 2000.0),
('USD', 'SZL', 18.5), ('USD', 'ETB', 55.0), ('USD', 'GHS', 12.0),
('USD', 'GNF', 8500.0), ('USD', 'KES', 130.0), ('USD', 'LRD', 150.0),
('USD', 'MGA', 4500.0), ('USD', 'MWK', 1100.0), ('USD', 'MZN', 64.0),
('USD', 'NGN', 460.0), ('USD', 'RWF', 1100.0), ('USD', 'SLE', 22.0),
('USD', 'ZAR', 18.5), ('USD', 'TZS', 2300.0), ('USD', 'UGX', 3700.0),
('USD', 'ZMW', 25.0), ('EUR', 'XOF', 655.0), ('EUR', 'XAF', 680.0),
('EUR', 'NGN', 520.0), ('EUR', 'GHS', 13.5), ('EUR', 'ZAR', 20.0),
('EUR', 'KES', 145.0), ('GBP', 'NGN', 590.0), ('GBP', 'GHS', 15.0),
('GBP', 'KES', 165.0);