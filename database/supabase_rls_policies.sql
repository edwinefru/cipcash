-- RemitAfrica Supabase Row Level Security (RLS) Policies
-- This file contains comprehensive RLS policies for data security and compliance

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE supported_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;

-- Create custom roles for different access levels
-- Note: These roles should be created by a superuser
-- CREATE ROLE app_user;
-- CREATE ROLE app_admin;
-- CREATE ROLE app_readonly;

-- Users table policies
-- Users can only see and modify their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Admin can view all users (for KYC verification)
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND email IN ('admin@remitafrica.com', 'support@remitafrica.com')
        )
    );

-- Admin can update user KYC status
CREATE POLICY "Admins can update user KYC status" ON users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND email IN ('admin@remitafrica.com', 'support@remitafrica.com')
        )
    );

-- Supported countries policies
-- Everyone can read supported countries (public data)
CREATE POLICY "Everyone can view supported countries" ON supported_countries
    FOR SELECT USING (true);

-- Only admins can modify supported countries
CREATE POLICY "Admins can modify supported countries" ON supported_countries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND email IN ('admin@remitafrica.com', 'support@remitafrica.com')
        )
    );

-- Payment methods policies
-- Users can only see their own payment methods
CREATE POLICY "Users can view own payment methods" ON payment_methods
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment methods" ON payment_methods
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment methods" ON payment_methods
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment methods" ON payment_methods
    FOR DELETE USING (auth.uid() = user_id);

-- Recipients policies
-- Users can only see their own recipients
CREATE POLICY "Users can view own recipients" ON recipients
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recipients" ON recipients
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipients" ON recipients
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipients" ON recipients
    FOR DELETE USING (auth.uid() = user_id);

-- Exchange rates policies
-- Everyone can read exchange rates (public data needed for calculations)
CREATE POLICY "Everyone can view exchange rates" ON exchange_rates
    FOR SELECT USING (true);

-- Only admins can modify exchange rates
CREATE POLICY "Admins can modify exchange rates" ON exchange_rates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND email IN ('admin@remitafrica.com', 'support@remitafrica.com')
        )
    );

-- Transfer reasons policies
-- Everyone can read transfer reasons (public data)
CREATE POLICY "Everyone can view transfer reasons" ON transfer_reasons
    FOR SELECT USING (true);

-- Only admins can modify transfer reasons
CREATE POLICY "Admins can modify transfer reasons" ON transfer_reasons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND email IN ('admin@remitafrica.com', 'support@remitafrica.com')
        )
    );

-- Transactions policies
-- Users can only see their own transactions
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own transactions
CREATE POLICY "Users can insert own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own transactions (limited fields)
CREATE POLICY "Users can update own transactions" ON transactions
    FOR UPDATE USING (
        auth.uid() = user_id 
        AND transfer_status NOT IN ('completed', 'cancelled')
    );

-- Admins can view all transactions (for support and compliance)
CREATE POLICY "Admins can view all transactions" ON transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND email IN ('admin@remitafrica.com', 'support@remitafrica.com')
        )
    );

-- Admins can update transaction status
CREATE POLICY "Admins can update transaction status" ON transactions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND email IN ('admin@remitafrica.com', 'support@remitafrica.com')
        )
    );

-- Transaction status history policies
-- Users can view history of their own transactions
CREATE POLICY "Users can view own transaction history" ON transaction_status_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM transactions 
            WHERE id = transaction_id 
            AND user_id = auth.uid()
        )
    );

-- System can insert status history (no user restriction)
CREATE POLICY "System can insert transaction history" ON transaction_status_history
    FOR INSERT WITH CHECK (true);

-- Admins can view all transaction history
CREATE POLICY "Admins can view all transaction history" ON transaction_status_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND email IN ('admin@remitafrica.com', 'support@remitafrica.com')
        )
    );

-- Admin settings policies
-- Only admins can access admin settings
CREATE POLICY "Admins can view admin settings" ON admin_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND email IN ('admin@remitafrica.com', 'support@remitafrica.com')
        )
    );

CREATE POLICY "Admins can modify admin settings" ON admin_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND email IN ('admin@remitafrica.com', 'support@remitafrica.com')
        )
    );

-- Notifications policies
-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- System can insert notifications for users
CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications" ON notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND email IN ('admin@remitafrica.com', 'support@remitafrica.com')
        )
    );

-- API logs policies
-- Users can view their own API logs
CREATE POLICY "Users can view own api logs" ON api_logs
    FOR SELECT USING (auth.uid() = user_id);

-- System can insert API logs
CREATE POLICY "System can insert api logs" ON api_logs
    FOR INSERT WITH CHECK (true);

-- Admins can view all API logs (for debugging and compliance)
CREATE POLICY "Admins can view all api logs" ON api_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND email IN ('admin@remitafrica.com', 'support@remitafrica.com')
        )
    );

-- Additional security functions
-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_id 
        AND email IN ('admin@remitafrica.com', 'support@remitafrica.com')
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is KYC verified
CREATE OR REPLACE FUNCTION is_kyc_verified(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_id 
        AND is_kyc_verified = true
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check daily transaction limits
CREATE OR REPLACE FUNCTION check_daily_limit(user_id UUID, amount DECIMAL)
RETURNS BOOLEAN AS $$
DECLARE
    daily_total DECIMAL;
    max_limit DECIMAL;
BEGIN
    -- Get today's total transactions for user
    SELECT COALESCE(SUM(amount_sent), 0)
    INTO daily_total
    FROM transactions
    WHERE user_id = check_daily_limit.user_id
    AND DATE(created_at) = CURRENT_DATE
    AND transfer_status NOT IN ('cancelled', 'failed');
    
    -- Get max daily limit from admin settings
    SELECT max_daily_limit
    INTO max_limit
    FROM admin_settings
    LIMIT 1;
    
    -- Check if adding this amount would exceed limit
    RETURN (daily_total + amount) <= COALESCE(max_limit, 10000);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check monthly transaction limits
CREATE OR REPLACE FUNCTION check_monthly_limit(user_id UUID, amount DECIMAL)
RETURNS BOOLEAN AS $$
DECLARE
    monthly_total DECIMAL;
    max_limit DECIMAL;
BEGIN
    -- Get this month's total transactions for user
    SELECT COALESCE(SUM(amount_sent), 0)
    INTO monthly_total
    FROM transactions
    WHERE user_id = check_monthly_limit.user_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND transfer_status NOT IN ('cancelled', 'failed');
    
    -- Get max monthly limit from admin settings
    SELECT max_monthly_limit
    INTO max_limit
    FROM admin_settings
    LIMIT 1;
    
    -- Check if adding this amount would exceed limit
    RETURN (monthly_total + amount) <= COALESCE(max_limit, 50000);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced policies with compliance checks
-- Policy to prevent transactions above daily/monthly limits
CREATE POLICY "Enforce daily transaction limits" ON transactions
    FOR INSERT WITH CHECK (
        check_daily_limit(auth.uid(), amount_sent) = true
    );

CREATE POLICY "Enforce monthly transaction limits" ON transactions
    FOR INSERT WITH CHECK (
        check_monthly_limit(auth.uid(), amount_sent) = true
    );

-- Policy to require KYC for large transactions
CREATE POLICY "Require KYC for large transactions" ON transactions
    FOR INSERT WITH CHECK (
        CASE 
            WHEN amount_sent >= (SELECT kyc_required_threshold FROM admin_settings LIMIT 1) 
            THEN is_kyc_verified(auth.uid()) = true
            ELSE true
        END
    );

-- Audit policies - log important actions
-- Note: These would typically be implemented with triggers or application code

-- Grant permissions to application roles
-- Note: These should be run by a superuser and adjusted based on your setup

-- GRANT USAGE ON SCHEMA public TO app_user, app_admin, app_readonly;

-- Readonly role permissions
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_readonly;

-- App user permissions (regular users)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON users, payment_methods, recipients, transactions, notifications TO app_user;
-- GRANT SELECT ON supported_countries, exchange_rates, transfer_reasons TO app_user;
-- GRANT INSERT ON api_logs TO app_user;

-- Admin permissions (admin users)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO app_admin;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO app_admin;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_admin;

-- Additional security considerations:
-- 1. Implement rate limiting at the application level
-- 2. Use connection pooling with limited connections per user
-- 3. Implement API key authentication for service-to-service calls
-- 4. Regular security audits and penetration testing
-- 5. Monitor for suspicious patterns and implement alerting
-- 6. Implement data encryption for sensitive fields (PII, financial data)
-- 7. Regular backup and disaster recovery testing
-- 8. Compliance with financial regulations (AML, KYC, PCI DSS)

-- Example of how to create encrypted fields (requires pgcrypto extension)
-- ALTER TABLE users ADD COLUMN encrypted_ssn TEXT;
-- 
-- Function to encrypt sensitive data
-- CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT)
-- RETURNS TEXT AS $$
-- BEGIN
--     RETURN encode(encrypt(data::bytea, 'encryption_key_here', 'aes'), 'base64');
-- END;
-- $$ LANGUAGE plpgsql;
-- 
-- Function to decrypt sensitive data
-- CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data TEXT)
-- RETURNS TEXT AS $$
-- BEGIN
--     RETURN convert_from(decrypt(decode(encrypted_data, 'base64'), 'encryption_key_here', 'aes'), 'UTF8');
-- END;
-- $$ LANGUAGE plpgsql;

-- Comments for table and column documentation
COMMENT ON TABLE users IS 'User accounts with comprehensive KYC information for compliance';
COMMENT ON COLUMN users.is_kyc_verified IS 'KYC verification status - required for high-value transactions';
COMMENT ON COLUMN users.profile_picture IS 'Base64 encoded profile picture for user identification';

COMMENT ON TABLE transactions IS 'All money transfer transactions with complete audit trail';
COMMENT ON COLUMN transactions.aml_check_status IS 'Anti-money laundering check status for compliance';
COMMENT ON COLUMN transactions.transaction_reference IS 'Unique reference for customer service and tracking';

COMMENT ON TABLE transaction_status_history IS 'Audit trail for all transaction status changes';
COMMENT ON TABLE api_logs IS 'API access logs for security monitoring and debugging';

COMMENT ON FUNCTION is_admin IS 'Check if user has admin privileges';
COMMENT ON FUNCTION is_kyc_verified IS 'Check if user has completed KYC verification';
COMMENT ON FUNCTION check_daily_limit IS 'Enforce daily transaction limits for compliance';
COMMENT ON FUNCTION check_monthly_limit IS 'Enforce monthly transaction limits for compliance';