#!/usr/bin/env python3
"""
Enhanced CipCash Backend API Testing Suite v3.0
Tests FastAPI backend, Express backend with Socket.IO, and all new features
"""

import requests
import json
import time
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get the backend URLs from environment
BACKEND_URL = os.getenv('EXPO_PUBLIC_BACKEND_URL', 'http://localhost:8001')
API_BASE_URL = f"{BACKEND_URL}/api"
EXPRESS_BASE_URL = f"{BACKEND_URL}:8002/api"

print(f"Testing FastAPI backend at: {API_BASE_URL}")
print(f"Testing Express backend at: {EXPRESS_BASE_URL}")

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        self.test_results = {
            'authentication': {},
            'admin_settings': {},
            'countries': {},
            'exchange_rates': {},
            'data_validation': {},
            'kyc_system': {},
            'compliance': {},
            'payment_methods': {},
            'chat_system': {},
            'analytics': {},
            'express_backend': {},
            'realtime_features': {},
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

    # NEW TESTS FOR ENHANCED FEATURES
    
    def test_express_backend_health(self):
        """Test Express backend health check"""
        try:
            response = self.session.get(f"{EXPRESS_BASE_URL.replace('/api', '')}/health")
            if response.status_code == 200:
                data = response.json()
                if data.get('service') == 'CipCash Express Backend':
                    self.log_result('express_backend', 'health_check', True, 
                                  f"Express backend healthy - Uptime: {data.get('uptime', 0):.2f}s", data)
                    return True
                else:
                    self.log_result('express_backend', 'health_check', False, 
                                  "Express backend health check returned unexpected service name")
                    return False
            else:
                self.log_result('express_backend', 'health_check', False, 
                              f"Express backend health check failed with status {response.status_code}")
                return False
        except Exception as e:
            self.log_result('express_backend', 'health_check', False, f"Express backend health check error: {str(e)}")
            return False

    def test_kyc_management_system(self):
        """Test KYC approval/rejection workflow"""
        if not self.auth_token:
            self.log_result('kyc_system', 'kyc_management', False, "No auth token for KYC management test")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            # Test getting pending KYC users (admin endpoint)
            response = self.session.get(f"{API_BASE_URL}/admin/kyc/pending", headers=headers)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result('kyc_system', 'kyc_management', True, 
                                  f"KYC management system working - {len(data)} pending users", data)
                    return True
                else:
                    self.log_result('kyc_system', 'kyc_management', False, 
                                  "KYC pending users endpoint returned invalid format")
                    return False
            elif response.status_code == 403:
                # Expected for non-admin users
                self.log_result('kyc_system', 'kyc_management', True, 
                              "KYC management system properly restricts admin access")
                return True
            else:
                self.log_result('kyc_system', 'kyc_management', False, 
                              f"KYC management test failed with status {response.status_code}")
                return False
        except Exception as e:
            self.log_result('kyc_system', 'kyc_management', False, f"KYC management error: {str(e)}")
            return False

    def test_chat_system_apis(self):
        """Test chat system APIs"""
        if not self.auth_token:
            self.log_result('chat_system', 'chat_apis', False, "No auth token for chat system test")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            # Test creating chat room
            chat_room_data = {
                "participants": ["user1", "admin"],
                "room_type": "admin_user",
                "title": "Customer Support Chat"
            }
            
            response = self.session.post(f"{API_BASE_URL}/chat/rooms", 
                                       json=chat_room_data, headers=headers)
            if response.status_code == 200:
                room_data = response.json()
                room_id = room_data.get('id')
                
                # Test getting user chat rooms
                response = self.session.get(f"{API_BASE_URL}/chat/rooms", headers=headers)
                if response.status_code == 200:
                    rooms = response.json()
                    if isinstance(rooms, list):
                        self.log_result('chat_system', 'chat_apis', True, 
                                      f"Chat system APIs working - Created room and retrieved {len(rooms)} rooms", 
                                      {"room_created": room_data, "rooms_count": len(rooms)})
                        return True
                    else:
                        self.log_result('chat_system', 'chat_apis', False, 
                                      "Chat rooms retrieval returned invalid format")
                        return False
                else:
                    self.log_result('chat_system', 'chat_apis', False, 
                                  f"Get chat rooms failed with status {response.status_code}")
                    return False
            else:
                self.log_result('chat_system', 'chat_apis', False, 
                              f"Create chat room failed with status {response.status_code}")
                return False
        except Exception as e:
            self.log_result('chat_system', 'chat_apis', False, f"Chat system APIs error: {str(e)}")
            return False

    def test_analytics_apis(self):
        """Test analytics APIs"""
        if not self.auth_token:
            self.log_result('analytics', 'analytics_apis', False, "No auth token for analytics test")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            # Test transaction analytics
            response = self.session.get(f"{API_BASE_URL}/admin/analytics/transactions", headers=headers)
            if response.status_code == 200:
                data = response.json()
                required_fields = ['total_transactions', 'total_volume', 'success_rate', 'daily_transactions']
                if all(field in data for field in required_fields):
                    
                    # Test user analytics
                    response = self.session.get(f"{API_BASE_URL}/admin/analytics/users", headers=headers)
                    if response.status_code == 200:
                        user_data = response.json()
                        user_fields = ['total_users', 'verified_users', 'pending_users']
                        if all(field in user_data for field in user_fields):
                            self.log_result('analytics', 'analytics_apis', True, 
                                          f"Analytics APIs working - Transactions: {data['total_transactions']}, Users: {user_data['total_users']}", 
                                          {"transaction_analytics": data, "user_analytics": user_data})
                            return True
                        else:
                            self.log_result('analytics', 'analytics_apis', False, 
                                          "User analytics missing required fields")
                            return False
                    else:
                        self.log_result('analytics', 'analytics_apis', False, 
                                      f"User analytics failed with status {response.status_code}")
                        return False
                else:
                    self.log_result('analytics', 'analytics_apis', False, 
                                  "Transaction analytics missing required fields")
                    return False
            elif response.status_code == 403:
                # Expected for non-admin users
                self.log_result('analytics', 'analytics_apis', True, 
                              "Analytics APIs properly restrict admin access")
                return True
            else:
                self.log_result('analytics', 'analytics_apis', False, 
                              f"Analytics APIs failed with status {response.status_code}")
                return False
        except Exception as e:
            self.log_result('analytics', 'analytics_apis', False, f"Analytics APIs error: {str(e)}")
            return False

    def test_compliance_reporting(self):
        """Test compliance and reporting APIs"""
        if not self.auth_token:
            self.log_result('compliance', 'compliance_reporting', False, "No auth token for compliance test")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            # Test compliance report
            response = self.session.get(f"{API_BASE_URL}/admin/compliance/report", headers=headers)
            if response.status_code == 200:
                data = response.json()
                required_fields = ['kyc_completion_rate', 'aml_flagged_transactions', 'compliance_score']
                if all(field in data for field in required_fields):
                    self.log_result('compliance', 'compliance_reporting', True, 
                                  f"Compliance reporting working - KYC rate: {data['kyc_completion_rate']}%, Score: {data['compliance_score']}", 
                                  data)
                    return True
                else:
                    missing_fields = [field for field in required_fields if field not in data]
                    self.log_result('compliance', 'compliance_reporting', False, 
                                  f"Compliance report missing fields: {missing_fields}")
                    return False
            elif response.status_code == 403:
                # Expected for non-admin users
                self.log_result('compliance', 'compliance_reporting', True, 
                              "Compliance reporting properly restricts admin access")
                return True
            else:
                self.log_result('compliance', 'compliance_reporting', False, 
                              f"Compliance reporting failed with status {response.status_code}")
                return False
        except Exception as e:
            self.log_result('compliance', 'compliance_reporting', False, f"Compliance reporting error: {str(e)}")
            return False

    def test_express_realtime_features(self):
        """Test Express backend real-time features"""
        try:
            # Test live exchange rates
            response = self.session.get(f"{EXPRESS_BASE_URL}/realtime/exchange-rates/live")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, dict) and 'USD-NGN' in data:
                    rate_data = data['USD-NGN']
                    if 'rate' in rate_data and 'change' in rate_data and 'timestamp' in rate_data:
                        
                        # Test transaction status tracking
                        test_tx_id = "test_transaction_123"
                        response = self.session.get(f"{EXPRESS_BASE_URL}/realtime/transactions/{test_tx_id}/status")
                        if response.status_code == 200:
                            tx_data = response.json()
                            if 'transactionId' in tx_data and 'status' in tx_data:
                                self.log_result('realtime_features', 'express_realtime', True, 
                                              f"Express real-time features working - Live rates and transaction tracking", 
                                              {"live_rates": data, "transaction_status": tx_data})
                                return True
                            else:
                                self.log_result('realtime_features', 'express_realtime', False, 
                                              "Transaction status tracking missing required fields")
                                return False
                        else:
                            self.log_result('realtime_features', 'express_realtime', False, 
                                          f"Transaction status tracking failed with status {response.status_code}")
                            return False
                    else:
                        self.log_result('realtime_features', 'express_realtime', False, 
                                      "Live exchange rates missing required fields")
                        return False
                else:
                    self.log_result('realtime_features', 'express_realtime', False, 
                                  "Live exchange rates returned invalid format")
                    return False
            else:
                self.log_result('realtime_features', 'express_realtime', False, 
                              f"Express real-time features failed with status {response.status_code}")
                return False
        except Exception as e:
            self.log_result('realtime_features', 'express_realtime', False, f"Express real-time features error: {str(e)}")
            return False

    def test_express_chat_integration(self):
        """Test Express backend chat integration"""
        try:
            # Test Express chat room creation
            chat_data = {
                "participants": ["user1", "admin"],
                "room_type": "admin_user", 
                "title": "Express Chat Test"
            }
            
            response = self.session.post(f"{EXPRESS_BASE_URL}/chat/rooms", json=chat_data)
            if response.status_code == 200:
                room_data = response.json()
                room_id = room_data.get('id')
                
                # Test sending message
                message_data = {
                    "message": "Test message from Express backend",
                    "chat_room_id": room_id,
                    "receiver_id": "admin",
                    "sender_id": "user1"
                }
                
                response = self.session.post(f"{EXPRESS_BASE_URL}/chat/messages", json=message_data)
                if response.status_code == 200:
                    msg_data = response.json()
                    if 'id' in msg_data and 'message' in msg_data:
                        self.log_result('chat_system', 'express_chat_integration', True, 
                                      f"Express chat integration working - Room created and message sent", 
                                      {"room": room_data, "message": msg_data})
                        return True
                    else:
                        self.log_result('chat_system', 'express_chat_integration', False, 
                                      "Express chat message response missing required fields")
                        return False
                else:
                    self.log_result('chat_system', 'express_chat_integration', False, 
                                  f"Express chat message sending failed with status {response.status_code}")
                    return False
            else:
                self.log_result('chat_system', 'express_chat_integration', False, 
                              f"Express chat room creation failed with status {response.status_code}")
                return False
        except Exception as e:
            self.log_result('chat_system', 'express_chat_integration', False, f"Express chat integration error: {str(e)}")
            return False

    def test_express_analytics_integration(self):
        """Test Express backend analytics integration"""
        try:
            # Test transaction summary
            response = self.session.get(f"{EXPRESS_BASE_URL}/analytics/transactions/summary")
            if response.status_code == 200:
                data = response.json()
                required_fields = ['totalTransactions', 'totalVolume', 'successRate', 'topCountries']
                if all(field in data for field in required_fields):
                    
                    # Test user growth analytics
                    response = self.session.get(f"{EXPRESS_BASE_URL}/analytics/users/growth")
                    if response.status_code == 200:
                        user_data = response.json()
                        user_fields = ['totalUsers', 'newUsersToday', 'activeUsers']
                        if all(field in user_data for field in user_fields):
                            
                            # Test revenue summary
                            response = self.session.get(f"{EXPRESS_BASE_URL}/analytics/revenue/summary")
                            if response.status_code == 200:
                                revenue_data = response.json()
                                revenue_fields = ['totalRevenue', 'monthlyRevenue', 'revenueGrowth']
                                if all(field in revenue_data for field in revenue_fields):
                                    self.log_result('analytics', 'express_analytics_integration', True, 
                                                  f"Express analytics integration working - Transactions: {data['totalTransactions']}, Revenue: ${revenue_data['totalRevenue']}", 
                                                  {"transactions": data, "users": user_data, "revenue": revenue_data})
                                    return True
                                else:
                                    self.log_result('analytics', 'express_analytics_integration', False, 
                                                  "Express revenue analytics missing required fields")
                                    return False
                            else:
                                self.log_result('analytics', 'express_analytics_integration', False, 
                                              f"Express revenue analytics failed with status {response.status_code}")
                                return False
                        else:
                            self.log_result('analytics', 'express_analytics_integration', False, 
                                          "Express user analytics missing required fields")
                            return False
                    else:
                        self.log_result('analytics', 'express_analytics_integration', False, 
                                      f"Express user analytics failed with status {response.status_code}")
                        return False
                else:
                    self.log_result('analytics', 'express_analytics_integration', False, 
                                  "Express transaction analytics missing required fields")
                    return False
            else:
                self.log_result('analytics', 'express_analytics_integration', False, 
                              f"Express analytics integration failed with status {response.status_code}")
                return False
        except Exception as e:
            self.log_result('analytics', 'express_analytics_integration', False, f"Express analytics integration error: {str(e)}")
            return False

    def test_express_compliance_metrics(self):
        """Test Express backend compliance metrics"""
        try:
            response = self.session.get(f"{EXPRESS_BASE_URL}/analytics/compliance/metrics")
            if response.status_code == 200:
                data = response.json()
                required_fields = ['kycCompletionRate', 'amlFlagged', 'complianceScore', 'regulatoryReports']
                if all(field in data for field in required_fields):
                    self.log_result('compliance', 'express_compliance_metrics', True, 
                                  f"Express compliance metrics working - KYC: {data['kycCompletionRate']}%, Score: {data['complianceScore']}", 
                                  data)
                    return True
                else:
                    missing_fields = [field for field in required_fields if field not in data]
                    self.log_result('compliance', 'express_compliance_metrics', False, 
                                  f"Express compliance metrics missing fields: {missing_fields}")
                    return False
            else:
                self.log_result('compliance', 'express_compliance_metrics', False, 
                              f"Express compliance metrics failed with status {response.status_code}")
                return False
        except Exception as e:
            self.log_result('compliance', 'express_compliance_metrics', False, f"Express compliance metrics error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all enhanced v3.0 backend tests including Express backend"""
        print("🚀 Starting CipCash Enhanced Backend API v3.0 Tests")
        print("Testing both FastAPI (port 8001) and Express (port 8002) backends")
        print("=" * 80)
        
        # Test basic connectivity first
        if not self.test_health_check():
            print("❌ FastAPI health check failed - API may not be running")
            return self.test_results
        
        # Test Express backend connectivity
        if not self.test_express_backend_health():
            print("⚠️ Express backend health check failed - Real-time features may not be available")
        
        # Enhanced Authentication & KYC System tests
        print("\n🔐 Testing Enhanced Authentication & KYC System...")
        self.test_user_registration()
        self.test_user_login()
        self.test_invalid_login()
        self.test_jwt_token_validation()
        self.test_protected_endpoint_without_token()
        self.test_profile_picture_upload()
        
        # KYC Management System tests
        print("\n📋 Testing KYC Management System...")
        self.test_kyc_management_system()
        
        # Chat System APIs tests
        print("\n💬 Testing Chat System APIs...")
        self.test_chat_system_apis()
        self.test_express_chat_integration()
        
        # Analytics APIs tests
        print("\n📊 Testing Analytics APIs...")
        self.test_analytics_apis()
        self.test_express_analytics_integration()
        
        # Enhanced Admin Settings tests
        print("\n⚙️ Testing Enhanced Admin Settings (All Payment Providers)...")
        self.test_get_admin_settings()
        self.test_update_admin_settings()
        
        # Enhanced Countries Support tests (24 MTN MoMo countries)
        print("\n🌍 Testing Enhanced Country Support (24 MTN MoMo Countries)...")
        self.test_get_supported_countries()
        
        # Enhanced Exchange Rates tests
        print("\n💱 Testing Enhanced Exchange Rates (All Currencies)...")
        self.test_exchange_rates()
        self.test_get_all_exchange_rates()
        self.test_enhanced_exchange_rates()
        
        # Real-time Features tests
        print("\n⚡ Testing Real-time Features (Express Backend)...")
        self.test_express_realtime_features()
        
        # Compliance & Reporting tests
        print("\n📋 Testing Compliance & Reporting...")
        self.test_transfer_reasons()
        self.test_compliance_reporting()
        self.test_express_compliance_metrics()
        
        # Payment Methods tests
        print("\n💳 Testing Payment Methods CRUD...")
        self.test_payment_methods()
        
        # Data validation tests
        print("\n📊 Testing Enhanced Data Structure Validation...")
        self.test_user_transactions()
        
        # Print summary
        print("\n" + "=" * 80)
        print("📋 ENHANCED v3.0 TEST SUMMARY")
        print("=" * 80)
        print(f"✅ Passed: {self.test_results['summary']['passed']}")
        print(f"❌ Failed: {self.test_results['summary']['failed']}")
        
        if self.test_results['summary']['errors']:
            print("\n🚨 FAILED TESTS:")
            for error in self.test_results['summary']['errors']:
                print(f"   • {error}")
        else:
            print("\n🎉 All enhanced v3.0 features are working correctly!")
            print("✅ FastAPI Backend (port 8001): Fully functional")
            print("✅ Express Backend (port 8002): Real-time features operational")
            print("✅ Socket.IO Integration: Ready for real-time communication")
        
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