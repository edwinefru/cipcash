#!/usr/bin/env python3
"""
Backend API Testing Suite for Mobile Money Remittance Application
Tests authentication, admin settings, countries, exchange rates, and data validation
"""

import requests
import json
import time
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get the backend URL from environment
BACKEND_URL = os.getenv('EXPO_PUBLIC_BACKEND_URL', 'http://localhost:8001')
API_BASE_URL = f"{BACKEND_URL}/api"

print(f"Testing backend API at: {API_BASE_URL}")

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_results = {
            'authentication': {},
            'admin_settings': {},
            'countries': {},
            'exchange_rates': {},
            'data_validation': {},
            'kyc_system': {},
            'compliance': {},
            'payment_methods': {},
            'summary': {'passed': 0, 'failed': 0, 'errors': []}
        }
        
    def log_result(self, category, test_name, success, message="", data=None):
        """Log test result"""
        result = {
            'success': success,
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'data': data
        }
        self.test_results[category][test_name] = result
        
        if success:
            self.test_results['summary']['passed'] += 1
            print(f"✅ {category}.{test_name}: {message}")
        else:
            self.test_results['summary']['failed'] += 1
            self.test_results['summary']['errors'].append(f"{category}.{test_name}: {message}")
            print(f"❌ {category}.{test_name}: {message}")
    
    def test_health_check(self):
        """Test basic health check endpoint"""
        try:
            response = self.session.get(f"{API_BASE_URL}/health")
            if response.status_code == 200:
                data = response.json()
                self.log_result('data_validation', 'health_check', True, 
                              f"API is healthy - Status: {data.get('status')}", data)
                return True
            else:
                self.log_result('data_validation', 'health_check', False, 
                              f"Health check failed with status {response.status_code}")
                return False
        except Exception as e:
            self.log_result('data_validation', 'health_check', False, f"Health check error: {str(e)}")
            return False
    
    def test_user_registration(self):
        """Test user registration with enhanced KYC data structure"""
        test_user = {
            "kyc_data": {
                "first_name": "John",
                "middle_name": "Michael",
                "last_name": "Doe",
                "date_of_birth": "1990-05-15",
                "nationality": "US",
                "gender": "male",
                "email": "john.doe@example.com",
                "phone": "+1234567890",
                "address_line1": "123 Main Street",
                "address_line2": "Apt 4B",
                "city": "New York",
                "state_province": "NY",
                "postal_code": "10001",
                "country": "US",
                "id_type": "passport",
                "id_number": "P123456789",
                "id_expiry_date": "2030-12-31",
                "id_issuing_country": "US",
                "occupation": "Software Engineer",
                "employer_name": "Tech Corp Inc",
                "annual_income_range": "100k_250k",
                "source_of_funds": "salary"
            },
            "password": "SecurePass123!"
        }
        
        try:
            response = self.session.post(f"{API_BASE_URL}/auth/register", json=test_user)
            if response.status_code == 200:
                data = response.json()
                if 'access_token' in data and 'token_type' in data:
                    self.auth_token = data['access_token']
                    self.log_result('authentication', 'user_registration', True, 
                                  "User registered successfully with valid token", data)
                    return True
                else:
                    self.log_result('authentication', 'user_registration', False, 
                                  "Registration response missing token fields")
                    return False
            else:
                self.log_result('authentication', 'user_registration', False, 
                              f"Registration failed with status {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result('authentication', 'user_registration', False, f"Registration error: {str(e)}")
            return False
    
    def test_user_login(self):
        """Test user login with correct credentials"""
        login_data = {
            "email": "john.doe@example.com",
            "password": "SecurePass123!"
        }
        
        try:
            response = self.session.post(f"{API_BASE_URL}/auth/login", json=login_data)
            if response.status_code == 200:
                data = response.json()
                if 'access_token' in data and 'token_type' in data:
                    self.auth_token = data['access_token']
                    self.log_result('authentication', 'user_login', True, 
                                  "User login successful with valid token", data)
                    return True
                else:
                    self.log_result('authentication', 'user_login', False, 
                                  "Login response missing token fields")
                    return False
            else:
                self.log_result('authentication', 'user_login', False, 
                              f"Login failed with status {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result('authentication', 'user_login', False, f"Login error: {str(e)}")
            return False
    
    def test_invalid_login(self):
        """Test login with invalid credentials"""
        invalid_login = {
            "email": "john.doe@example.com",
            "password": "WrongPassword"
        }
        
        try:
            response = self.session.post(f"{API_BASE_URL}/auth/login", json=invalid_login)
            if response.status_code == 401:
                self.log_result('authentication', 'invalid_login', True, 
                              "Invalid login correctly rejected with 401")
                return True
            else:
                self.log_result('authentication', 'invalid_login', False, 
                              f"Invalid login should return 401, got {response.status_code}")
                return False
        except Exception as e:
            self.log_result('authentication', 'invalid_login', False, f"Invalid login test error: {str(e)}")
            return False
    
    def test_jwt_token_validation(self):
        """Test JWT token validation on protected endpoint"""
        if not self.auth_token:
            self.log_result('authentication', 'jwt_validation', False, "No auth token available for testing")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            response = self.session.get(f"{API_BASE_URL}/auth/me", headers=headers)
            if response.status_code == 200:
                data = response.json()
                if ('kyc_data' in data and 'email' in data['kyc_data'] and 
                    data['kyc_data']['email'] == 'john.doe@example.com'):
                    self.log_result('authentication', 'jwt_validation', True, 
                                  "JWT token validation successful with KYC data", data)
                    return True
                else:
                    self.log_result('authentication', 'jwt_validation', False, 
                                  "JWT validation returned unexpected user data structure")
                    return False
            else:
                self.log_result('authentication', 'jwt_validation', False, 
                              f"JWT validation failed with status {response.status_code}")
                return False
        except Exception as e:
            self.log_result('authentication', 'jwt_validation', False, f"JWT validation error: {str(e)}")
            return False
    
    def test_protected_endpoint_without_token(self):
        """Test protected endpoint access without token"""
        try:
            response = self.session.get(f"{API_BASE_URL}/auth/me")
            if response.status_code == 403:
                self.log_result('authentication', 'protected_without_token', True, 
                              "Protected endpoint correctly rejected request without token")
                return True
            else:
                self.log_result('authentication', 'protected_without_token', False, 
                              f"Protected endpoint should return 403, got {response.status_code}")
                return False
        except Exception as e:
            self.log_result('authentication', 'protected_without_token', False, 
                          f"Protected endpoint test error: {str(e)}")
            return False
    
    def test_get_admin_settings(self):
        """Test getting enhanced admin settings with all payment providers"""
        try:
            response = self.session.get(f"{API_BASE_URL}/admin/settings")
            if response.status_code == 200:
                data = response.json()
                required_fields = ['mtn_base_url', 'updated_at', 'apple_pay_merchant_id', 
                                 'google_pay_merchant_id', 'supabase_url', 'supabase_anon_key']
                if all(field in data for field in required_fields):
                    self.log_result('admin_settings', 'get_enhanced_settings', True, 
                                  "Enhanced admin settings retrieved with all payment providers", data)
                    return True
                else:
                    missing_fields = [field for field in required_fields if field not in data]
                    self.log_result('admin_settings', 'get_enhanced_settings', False, 
                                  f"Admin settings missing enhanced fields: {missing_fields}")
                    return False
            else:
                self.log_result('admin_settings', 'get_enhanced_settings', False, 
                              f"Get admin settings failed with status {response.status_code}")
                return False
        except Exception as e:
            self.log_result('admin_settings', 'get_enhanced_settings', False, f"Get admin settings error: {str(e)}")
            return False
    
    def test_update_admin_settings(self):
        """Test updating enhanced admin settings with all payment providers"""
        update_data = {
            "mtn_api_key": "test_mtn_api_key_12345",
            "mtn_api_secret": "test_mtn_secret_67890",
            "mtn_subscription_key": "test_subscription_key_abcde",
            "stripe_api_key": "sk_test_stripe_key_12345",
            "apple_pay_merchant_id": "merchant.com.example.remittance",
            "google_pay_merchant_id": "google_pay_merchant_12345",
            "supabase_url": "https://test.supabase.co",
            "supabase_anon_key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test"
        }
        
        try:
            response = self.session.put(f"{API_BASE_URL}/admin/settings", json=update_data)
            if response.status_code == 200:
                data = response.json()
                if (data.get('mtn_api_key') == update_data['mtn_api_key'] and 
                    data.get('stripe_api_key') == update_data['stripe_api_key'] and
                    data.get('apple_pay_merchant_id') == update_data['apple_pay_merchant_id'] and
                    data.get('supabase_url') == update_data['supabase_url']):
                    self.log_result('admin_settings', 'update_enhanced_settings', True, 
                                  "Enhanced admin settings updated successfully with all payment providers", data)
                    return True
                else:
                    self.log_result('admin_settings', 'update_enhanced_settings', False, 
                                  "Enhanced admin settings update did not persist correctly")
                    return False
            else:
                self.log_result('admin_settings', 'update_settings', False, 
                              f"Update admin settings failed with status {response.status_code}")
                return False
        except Exception as e:
            self.log_result('admin_settings', 'update_settings', False, f"Update admin settings error: {str(e)}")
            return False
    
    def test_get_supported_countries(self):
        """Test getting all 24 MTN MoMo supported countries with enhanced data"""
        try:
            response = self.session.get(f"{API_BASE_URL}/countries")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) >= 24:
                    # Check for all 24 MTN MoMo countries
                    country_codes = [country.get('country_code') for country in data]
                    expected_codes = ['BJ', 'CM', 'CI', 'CD', 'SZ', 'ET', 'GA', 'GH', 'GW', 'GN', 
                                    'KE', 'LR', 'MG', 'MW', 'MZ', 'NG', 'CG', 'RW', 'SN', 'SL', 
                                    'ZA', 'TZ', 'UG', 'ZM']
                    
                    # Check for enhanced data structure
                    sample_country = data[0] if data else {}
                    required_fields = ['country_code', 'country_name', 'currency_code', 
                                     'flag_emoji', 'phone_code']
                    
                    if (len(data) >= 24 and 
                        all(field in sample_country for field in required_fields) and
                        len([code for code in expected_codes if code in country_codes]) >= 20):
                        self.log_result('countries', 'get_all_mtn_countries', True, 
                                      f"All {len(data)} MTN MoMo countries loaded with enhanced data (flags, phone codes)", 
                                      {"total_countries": len(data), "sample": sample_country})
                        return True
                    else:
                        missing = [code for code in expected_codes if code not in country_codes]
                        self.log_result('countries', 'get_all_mtn_countries', False, 
                                      f"Missing MTN countries or enhanced data: {missing}")
                        return False
                else:
                    self.log_result('countries', 'get_all_mtn_countries', False, 
                                  f"Expected 24+ countries, got {len(data) if isinstance(data, list) else 0}")
                    return False
            else:
                self.log_result('countries', 'get_all_mtn_countries', False, 
                              f"Get countries failed with status {response.status_code}")
                return False
        except Exception as e:
            self.log_result('countries', 'get_all_mtn_countries', False, f"Get countries error: {str(e)}")
            return False
    
    def test_exchange_rates(self):
        """Test exchange rate endpoints for supported currencies"""
        currency_pairs = [
            ('USD', 'XAF'),
            ('USD', 'NGN'), 
            ('USD', 'GHS'),
            ('USD', 'ZAR'),
            ('USD', 'KES')
        ]
        
        all_passed = True
        
        for from_curr, to_curr in currency_pairs:
            try:
                response = self.session.get(f"{API_BASE_URL}/exchange-rates/{from_curr}/{to_curr}")
                if response.status_code == 200:
                    data = response.json()
                    if 'rate' in data and isinstance(data['rate'], (int, float)) and data['rate'] > 0:
                        self.log_result('exchange_rates', f'{from_curr}_to_{to_curr}', True, 
                                      f"Exchange rate {from_curr}/{to_curr}: {data['rate']}", data)
                    else:
                        self.log_result('exchange_rates', f'{from_curr}_to_{to_curr}', False, 
                                      "Invalid exchange rate data format")
                        all_passed = False
                else:
                    self.log_result('exchange_rates', f'{from_curr}_to_{to_curr}', False, 
                                  f"Exchange rate request failed with status {response.status_code}")
                    all_passed = False
            except Exception as e:
                self.log_result('exchange_rates', f'{from_curr}_to_{to_curr}', False, 
                              f"Exchange rate error: {str(e)}")
                all_passed = False
        
        return all_passed
    
    def test_get_all_exchange_rates(self):
        """Test getting all exchange rates"""
        try:
            response = self.session.get(f"{API_BASE_URL}/exchange-rates")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result('exchange_rates', 'get_all_rates', True, 
                                  f"Retrieved {len(data)} exchange rates", data)
                    return True
                else:
                    self.log_result('exchange_rates', 'get_all_rates', False, 
                                  "Exchange rates endpoint returned invalid format")
                    return False
            else:
                self.log_result('exchange_rates', 'get_all_rates', False, 
                              f"Get all exchange rates failed with status {response.status_code}")
                return False
        except Exception as e:
            self.log_result('exchange_rates', 'get_all_rates', False, f"Get all exchange rates error: {str(e)}")
            return False
    
    def test_user_transactions(self):
        """Test getting user transactions (requires authentication)"""
        if not self.auth_token:
            self.log_result('data_validation', 'user_transactions', False, "No auth token for transaction test")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            response = self.session.get(f"{API_BASE_URL}/transactions", headers=headers)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result('data_validation', 'user_transactions', True, 
                                  f"User transactions retrieved successfully ({len(data)} transactions)", data)
                    return True
                else:
                    self.log_result('data_validation', 'user_transactions', False, 
                                  "Transactions endpoint returned invalid format")
                    return False
            else:
                self.log_result('data_validation', 'user_transactions', False, 
                              f"Get user transactions failed with status {response.status_code}")
                return False
        except Exception as e:
            self.log_result('data_validation', 'user_transactions', False, f"User transactions error: {str(e)}")
            return False
    
    def test_profile_picture_upload(self):
        """Test profile picture upload endpoint"""
        if not self.auth_token:
            self.log_result('kyc_system', 'profile_picture_upload', False, "No auth token for profile picture test")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Create a simple test image (1x1 pixel PNG)
        import base64
        test_image_data = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
        
        files = {'file': ('test.png', test_image_data, 'image/png')}
        
        try:
            response = self.session.post(f"{API_BASE_URL}/auth/upload-profile-picture", 
                                       headers=headers, files=files)
            if response.status_code == 200:
                data = response.json()
                if 'profile_picture_url' in data and data['profile_picture_url'].startswith('data:image'):
                    self.log_result('kyc_system', 'profile_picture_upload', True, 
                                  "Profile picture uploaded successfully", data)
                    return True
                else:
                    self.log_result('kyc_system', 'profile_picture_upload', False, 
                                  "Profile picture upload response invalid")
                    return False
            else:
                self.log_result('kyc_system', 'profile_picture_upload', False, 
                              f"Profile picture upload failed with status {response.status_code}")
                return False
        except Exception as e:
            self.log_result('kyc_system', 'profile_picture_upload', False, f"Profile picture upload error: {str(e)}")
            return False
    
    def test_transfer_reasons(self):
        """Test transfer reasons endpoint"""
        try:
            response = self.session.get(f"{API_BASE_URL}/transfer-reasons")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) >= 10:
                    # Check for expected transfer reasons
                    reason_codes = [reason.get('code') for reason in data]
                    expected_codes = ['family_support', 'education', 'medical', 'business', 'investment']
                    
                    if all(code in reason_codes for code in expected_codes):
                        self.log_result('compliance', 'transfer_reasons', True, 
                                      f"All {len(data)} transfer reasons loaded successfully", data)
                        return True
                    else:
                        missing = [code for code in expected_codes if code not in reason_codes]
                        self.log_result('compliance', 'transfer_reasons', False, 
                                      f"Missing expected transfer reasons: {missing}")
                        return False
                else:
                    self.log_result('compliance', 'transfer_reasons', False, 
                                  f"Expected 10+ transfer reasons, got {len(data) if isinstance(data, list) else 0}")
                    return False
            else:
                self.log_result('compliance', 'transfer_reasons', False, 
                              f"Get transfer reasons failed with status {response.status_code}")
                return False
        except Exception as e:
            self.log_result('compliance', 'transfer_reasons', False, f"Transfer reasons error: {str(e)}")
            return False
    
    def test_payment_methods(self):
        """Test payment methods CRUD operations"""
        if not self.auth_token:
            self.log_result('payment_methods', 'crud_operations', False, "No auth token for payment methods test")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            # Test GET payment methods
            response = self.session.get(f"{API_BASE_URL}/payment-methods", headers=headers)
            if response.status_code != 200:
                self.log_result('payment_methods', 'crud_operations', False, 
                              f"Get payment methods failed with status {response.status_code}")
                return False
            
            # Test POST payment method
            payment_method = {
                "method_type": "credit_card",
                "last_four": "1234",
                "card_brand": "visa",
                "expiry_month": 12,
                "expiry_year": 2025,
                "is_default": True
            }
            
            response = self.session.post(f"{API_BASE_URL}/payment-methods", 
                                       json=payment_method, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if (data.get('last_four') == '1234' and 
                    data.get('card_brand') == 'visa' and
                    data.get('method_type') == 'credit_card'):
                    self.log_result('payment_methods', 'crud_operations', True, 
                                  "Payment method CRUD operations working correctly", data)
                    return True
                else:
                    self.log_result('payment_methods', 'crud_operations', False, 
                                  "Payment method data not persisted correctly")
                    return False
            else:
                self.log_result('payment_methods', 'crud_operations', False, 
                              f"Add payment method failed with status {response.status_code}")
                return False
        except Exception as e:
            self.log_result('payment_methods', 'crud_operations', False, f"Payment methods error: {str(e)}")
            return False
    
    def test_enhanced_exchange_rates(self):
        """Test enhanced exchange rates for all supported currencies"""
        enhanced_currency_pairs = [
            ('USD', 'XOF'),  # West African CFA franc
            ('USD', 'XAF'),  # Central African CFA franc
            ('USD', 'CDF'),  # Congolese franc
            ('USD', 'ETB'),  # Ethiopian birr
            ('USD', 'GNF'),  # Guinean franc
            ('USD', 'LRD'),  # Liberian dollar
            ('USD', 'MGA'),  # Malagasy ariary
            ('USD', 'MWK'),  # Malawian kwacha
            ('USD', 'MZN'),  # Mozambican metical
            ('USD', 'RWF'),  # Rwandan franc
            ('USD', 'SLE'),  # Sierra Leonean leone
            ('USD', 'TZS'),  # Tanzanian shilling
            ('USD', 'UGX'),  # Ugandan shilling
            ('USD', 'ZMW'),  # Zambian kwacha
        ]
        
        all_passed = True
        successful_rates = 0
        
        for from_curr, to_curr in enhanced_currency_pairs:
            try:
                response = self.session.get(f"{API_BASE_URL}/exchange-rates/{from_curr}/{to_curr}")
                if response.status_code == 200:
                    data = response.json()
                    if 'rate' in data and isinstance(data['rate'], (int, float)) and data['rate'] > 0:
                        successful_rates += 1
                    else:
                        all_passed = False
                else:
                    all_passed = False
            except Exception:
                all_passed = False
        
        if successful_rates >= 10:  # At least 10 enhanced currency pairs working
            self.log_result('exchange_rates', 'enhanced_currencies', True, 
                          f"Enhanced exchange rates working for {successful_rates}/{len(enhanced_currency_pairs)} currency pairs")
            return True
        else:
            self.log_result('exchange_rates', 'enhanced_currencies', False, 
                          f"Only {successful_rates}/{len(enhanced_currency_pairs)} enhanced currency pairs working")
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Mobile Money Remittance Backend API Tests")
        print("=" * 60)
        
        # Test basic connectivity first
        if not self.test_health_check():
            print("❌ Health check failed - API may not be running")
            return self.test_results
        
        # Authentication tests
        print("\n🔐 Testing Authentication System...")
        self.test_user_registration()
        self.test_user_login()
        self.test_invalid_login()
        self.test_jwt_token_validation()
        self.test_protected_endpoint_without_token()
        
        # Admin settings tests
        print("\n⚙️ Testing Admin Settings Management...")
        self.test_get_admin_settings()
        self.test_update_admin_settings()
        
        # Countries and exchange rates tests
        print("\n🌍 Testing Countries and Exchange Rates...")
        self.test_get_supported_countries()
        self.test_exchange_rates()
        self.test_get_all_exchange_rates()
        
        # Data validation tests
        print("\n📊 Testing Data Structure Validation...")
        self.test_user_transactions()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📋 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {self.test_results['summary']['passed']}")
        print(f"❌ Failed: {self.test_results['summary']['failed']}")
        
        if self.test_results['summary']['errors']:
            print("\n🚨 FAILED TESTS:")
            for error in self.test_results['summary']['errors']:
                print(f"   • {error}")
        
        return self.test_results

def main():
    """Main test execution"""
    tester = BackendTester()
    results = tester.run_all_tests()
    
    # Save results to file
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n📄 Detailed results saved to: /app/backend_test_results.json")
    
    # Return exit code based on test results
    if results['summary']['failed'] > 0:
        exit(1)
    else:
        exit(0)

if __name__ == "__main__":
    main()