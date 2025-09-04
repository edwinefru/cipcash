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
        """Test getting supported countries list"""
        try:
            response = self.session.get(f"{API_BASE_URL}/countries")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Check for expected countries
                    country_codes = [country.get('country_code') for country in data]
                    expected_codes = ['CM', 'NG', 'GH', 'ZA', 'KE']
                    
                    if all(code in country_codes for code in expected_codes):
                        self.log_result('countries', 'get_supported_countries', True, 
                                      f"All expected countries found: {country_codes}", data)
                        return True
                    else:
                        missing = [code for code in expected_codes if code not in country_codes]
                        self.log_result('countries', 'get_supported_countries', False, 
                                      f"Missing expected countries: {missing}")
                        return False
                else:
                    self.log_result('countries', 'get_supported_countries', False, 
                                  "Countries endpoint returned empty or invalid data")
                    return False
            else:
                self.log_result('countries', 'get_supported_countries', False, 
                              f"Get countries failed with status {response.status_code}")
                return False
        except Exception as e:
            self.log_result('countries', 'get_supported_countries', False, f"Get countries error: {str(e)}")
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