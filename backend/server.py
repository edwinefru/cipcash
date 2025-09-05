from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta, date
import jwt
import bcrypt
from bson import ObjectId
import httpx
import base64
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client.cipcash_app

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'cipcash-super-secret-jwt-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI(title="CipCash API - Send Money to Africa", version="3.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enhanced Pydantic Models with Complete KYC
class UserKYC(BaseModel):
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    date_of_birth: str  # Changed from date to str for MongoDB compatibility
    nationality: str
    gender: str = Field(..., pattern="^(male|female|other)$")
    email: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state_province: str
    postal_code: str
    country: str
    id_type: str = Field(..., pattern="^(passport|national_id|drivers_license|other)$")
    id_number: str
    id_expiry_date: Optional[str] = None  # Changed from date to str for MongoDB compatibility
    id_issuing_country: str
    occupation: str
    employer_name: Optional[str] = None
    annual_income_range: str = Field(..., pattern="^(under_25k|25k_50k|50k_100k|100k_250k|250k_500k|over_500k)$")
    source_of_funds: str = Field(..., pattern="^(salary|business|investment|inheritance|gift|other)$")
    profile_picture: Optional[str] = None

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    kyc_data: UserKYC
    is_kyc_verified: bool = False
    kyc_verification_date: Optional[str] = None  # Changed from datetime to str
    kyc_rejection_reason: Optional[str] = None
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())  # Changed from datetime to str
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())  # Changed from datetime to str

class UserCreate(BaseModel):
    kyc_data: UserKYC
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class KYCApprovalRequest(BaseModel):
    user_id: str
    approved: bool
    reason: Optional[str] = None
    admin_notes: Optional[str] = None

class AdminSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    # MTN Remittance Settings
    mtn_api_key: Optional[str] = None
    mtn_api_secret: Optional[str] = None
    mtn_subscription_key: Optional[str] = None
    mtn_base_url: str = "https://sandbox.momodeveloper.mtn.com"
    
    # Payment Provider Settings
    stripe_api_key: Optional[str] = None
    stripe_webhook_secret: Optional[str] = None
    paypal_client_id: Optional[str] = None
    paypal_client_secret: Optional[str] = None
    google_pay_merchant_id: Optional[str] = None
    apple_pay_merchant_id: Optional[str] = None
    
    # Chat & Communication Settings
    chat_api_key: Optional[str] = None
    chat_webhook_url: Optional[str] = None
    pusher_app_id: Optional[str] = None
    pusher_key: Optional[str] = None
    pusher_secret: Optional[str] = None
    pusher_cluster: Optional[str] = None
    
    # Notification Settings
    fcm_server_key: Optional[str] = None
    apns_key_id: Optional[str] = None
    apns_team_id: Optional[str] = None
    
    # Supabase Settings
    supabase_url: Optional[str] = None
    supabase_anon_key: Optional[str] = None
    supabase_service_key: Optional[str] = None
    
    # Currency & Compliance Settings
    currency_api_key: Optional[str] = None
    compliance_webhook_url: Optional[str] = None
    aml_screening_api_key: Optional[str] = None
    
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())  # Changed from datetime to str

class SupportedCountry(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    country_code: str
    country_name: str
    currency_code: str
    currency_name: str
    is_active: bool = True
    mtn_supported: bool = True
    flag_emoji: str
    phone_code: str
    daily_limit: float = 10000.0
    monthly_limit: float = 50000.0
    transfer_fee_percentage: float = 2.5
    minimum_transfer: float = 10.0

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    sender_id: str
    receiver_id: str
    message: str
    message_type: str = "text"  # text, image, file
    chat_room_id: str
    is_read: bool = False
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())  # Changed from datetime to str

class ChatRoom(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    participants: List[str]
    room_type: str  # admin_user, user_beneficiary
    title: str
    last_message: Optional[str] = None
    last_message_time: Optional[str] = None  # Changed from datetime to str
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())  # Changed from datetime to str

class TransactionAnalytics(BaseModel):
    total_transactions: int
    total_volume: float
    success_rate: float
    average_transaction: float
    daily_transactions: List[Dict[str, Any]]
    top_countries: List[Dict[str, Any]]
    revenue_breakdown: Dict[str, float]

class ComplianceReport(BaseModel):
    kyc_completion_rate: float
    aml_flagged_transactions: int
    suspicious_activities: int
    regulatory_reports_pending: int
    compliance_score: float

# Helper Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return User(**{**user, "id": str(user["_id"])})
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def is_admin_user(current_user: User = Depends(get_current_user)):
    admin_emails = ['admin@cipcash.com', 'support@cipcash.com']
    if current_user.kyc_data.email not in admin_emails:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# Initialize default data with all 24 MTN MoMo countries
async def initialize_default_data():
    countries = [
        {"country_code": "BJ", "country_name": "Benin", "currency_code": "XOF", "currency_name": "West African CFA franc", "flag_emoji": "🇧🇯", "phone_code": "+229"},
        {"country_code": "CM", "country_name": "Cameroon", "currency_code": "XAF", "currency_name": "Central African CFA franc", "flag_emoji": "🇨🇲", "phone_code": "+237"},
        {"country_code": "CI", "country_name": "Côte d'Ivoire", "currency_code": "XOF", "currency_name": "West African CFA franc", "flag_emoji": "🇨🇮", "phone_code": "+225"},
        {"country_code": "CD", "country_name": "Democratic Republic of Congo", "currency_code": "CDF", "currency_name": "Congolese franc", "flag_emoji": "🇨🇩", "phone_code": "+243"},
        {"country_code": "SZ", "country_name": "Eswatini", "currency_code": "SZL", "currency_name": "Swazi lilangeni", "flag_emoji": "🇸🇿", "phone_code": "+268"},
        {"country_code": "ET", "country_name": "Ethiopia", "currency_code": "ETB", "currency_name": "Ethiopian birr", "flag_emoji": "🇪🇹", "phone_code": "+251"},
        {"country_code": "GA", "country_name": "Gabon", "currency_code": "XAF", "currency_name": "Central African CFA franc", "flag_emoji": "🇬🇦", "phone_code": "+241"},
        {"country_code": "GH", "country_name": "Ghana", "currency_code": "GHS", "currency_name": "Ghanaian cedi", "flag_emoji": "🇬🇭", "phone_code": "+233"},
        {"country_code": "GW", "country_name": "Guinea Bissau", "currency_code": "XOF", "currency_name": "West African CFA franc", "flag_emoji": "🇬🇼", "phone_code": "+245"},
        {"country_code": "GN", "country_name": "Guinea Conakry", "currency_code": "GNF", "currency_name": "Guinean franc", "flag_emoji": "🇬🇳", "phone_code": "+224"},
        {"country_code": "KE", "country_name": "Kenya", "currency_code": "KES", "currency_name": "Kenyan shilling", "flag_emoji": "🇰🇪", "phone_code": "+254"},
        {"country_code": "LR", "country_name": "Liberia", "currency_code": "LRD", "currency_name": "Liberian dollar", "flag_emoji": "🇱🇷", "phone_code": "+231"},
        {"country_code": "MG", "country_name": "Madagascar", "currency_code": "MGA", "currency_name": "Malagasy ariary", "flag_emoji": "🇲🇬", "phone_code": "+261"},
        {"country_code": "MW", "country_name": "Malawi", "currency_code": "MWK", "currency_name": "Malawian kwacha", "flag_emoji": "🇲🇼", "phone_code": "+265"},
        {"country_code": "MZ", "country_name": "Mozambique", "currency_code": "MZN", "currency_name": "Mozambican metical", "flag_emoji": "🇲🇿", "phone_code": "+258"},
        {"country_code": "NG", "country_name": "Nigeria", "currency_code": "NGN", "currency_name": "Nigerian naira", "flag_emoji": "🇳🇬", "phone_code": "+234"},
        {"country_code": "CG", "country_name": "Republic of Congo", "currency_code": "XAF", "currency_name": "Central African CFA franc", "flag_emoji": "🇨🇬", "phone_code": "+242"},
        {"country_code": "RW", "country_name": "Rwanda", "currency_code": "RWF", "currency_name": "Rwandan franc", "flag_emoji": "🇷🇼", "phone_code": "+250"},
        {"country_code": "SN", "country_name": "Senegal", "currency_code": "XOF", "currency_name": "West African CFA franc", "flag_emoji": "🇸🇳", "phone_code": "+221"},
        {"country_code": "SL", "country_name": "Sierra Leone", "currency_code": "SLE", "currency_name": "Sierra Leonean leone", "flag_emoji": "🇸🇱", "phone_code": "+232"},
        {"country_code": "ZA", "country_name": "South Africa", "currency_code": "ZAR", "currency_name": "South African rand", "flag_emoji": "🇿🇦", "phone_code": "+27"},
        {"country_code": "TZ", "country_name": "Tanzania", "currency_code": "TZS", "currency_name": "Tanzanian shilling", "flag_emoji": "🇹🇿", "phone_code": "+255"},
        {"country_code": "UG", "country_name": "Uganda", "currency_code": "UGX", "currency_name": "Ugandan shilling", "flag_emoji": "🇺🇬", "phone_code": "+256"},
        {"country_code": "ZM", "country_name": "Zambia", "currency_code": "ZMW", "currency_name": "Zambian kwacha", "flag_emoji": "🇿🇲", "phone_code": "+260"},
    ]
    
    for country_data in countries:
        existing = await db.supported_countries.find_one({"country_code": country_data["country_code"]})
        if not existing:
            country = SupportedCountry(**country_data)
            await db.supported_countries.insert_one(country.dict())
    
    # Initialize transfer reasons
    transfer_reasons = [
        {"code": "family_support", "description": "Family Support", "category": "personal"},
        {"code": "education", "description": "Education Expenses", "category": "personal"},
        {"code": "medical", "description": "Medical Expenses", "category": "personal"},
        {"code": "business", "description": "Business Operations", "category": "business"},
        {"code": "investment", "description": "Investment", "category": "business"},
        {"code": "property", "description": "Property Purchase", "category": "investment"},
        {"code": "loan_repayment", "description": "Loan Repayment", "category": "financial"},
        {"code": "gift", "description": "Gift", "category": "personal"},
        {"code": "travel", "description": "Travel Expenses", "category": "personal"},
        {"code": "other", "description": "Other", "category": "other"},
    ]
    
    for reason_data in transfer_reasons:
        existing = await db.transfer_reasons.find_one({"code": reason_data["code"]})
        if not existing:
            await db.transfer_reasons.insert_one(reason_data)
    
    # Initialize admin settings
    existing_settings = await db.admin_settings.find_one()
    if not existing_settings:
        settings = AdminSettings()
        await db.admin_settings.insert_one(settings.dict())

# Authentication Routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    existing_user = await db.users.find_one({"kyc_data.email": user_data.kyc_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = hash_password(user_data.password)
    user_dict = user_data.dict()
    del user_dict['password']
    user_dict['password_hash'] = hashed_password
    user_dict['_id'] = ObjectId()
    
    # Convert datetime objects to strings for MongoDB compatibility
    user_dict['created_at'] = datetime.utcnow().isoformat()
    user_dict['updated_at'] = datetime.utcnow().isoformat()
    
    await db.users.insert_one(user_dict)
    
    access_token = create_access_token(data={"sub": str(user_dict['_id'])})
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"kyc_data.email": user_data.email})
    if not user or not verify_password(user_data.password, user.get('password_hash', '')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": str(user['_id'])})
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# KYC Management Routes
@api_router.post("/admin/kyc/approve")
async def approve_kyc(request: KYCApprovalRequest, admin: User = Depends(is_admin_user)):
    try:
        user_id = ObjectId(request.user_id)
        update_data = {
            "is_kyc_verified": request.approved,
            "updated_at": datetime.utcnow().isoformat()  # Convert to string
        }
        
        if request.approved:
            update_data["kyc_verification_date"] = datetime.utcnow().isoformat()  # Convert to string
            update_data["kyc_rejection_reason"] = None
        else:
            update_data["kyc_rejection_reason"] = request.reason or "KYC documents do not meet requirements"
            update_data["kyc_verification_date"] = None
        
        result = await db.users.update_one(
            {"_id": user_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get updated user
        updated_user = await db.users.find_one({"_id": user_id})
        
        # Create notification for user
        notification = {
            "_id": ObjectId(),
            "user_id": request.user_id,
            "title": "KYC Verification Update",
            "message": f"Your KYC verification has been {'approved' if request.approved else 'rejected'}",
            "type": "kyc_update",
            "is_read": False,
            "created_at": datetime.utcnow().isoformat()  # Convert to string
        }
        await db.notifications.insert_one(notification)
        
        return {
            "success": True,
            "message": f"KYC {'approved' if request.approved else 'rejected'} successfully",
            "user": User(**{**updated_user, "id": str(updated_user["_id"])})
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating KYC status: {str(e)}")

@api_router.get("/admin/kyc/pending")
async def get_pending_kyc(admin: User = Depends(is_admin_user)):
    pending_users = await db.users.find({"is_kyc_verified": False}).to_list(100)
    return [User(**{**user, "id": str(user["_id"])}) for user in pending_users]

# Chat System Routes
@api_router.post("/chat/rooms")
async def create_chat_room(participants: List[str], room_type: str, title: str, current_user: User = Depends(get_current_user)):
    room_data = {
        "_id": ObjectId(),
        "participants": participants,
        "room_type": room_type,
        "title": title,
        "created_at": datetime.utcnow()
    }
    
    await db.chat_rooms.insert_one(room_data)
    return ChatRoom(**{**room_data, "id": str(room_data["_id"])})

@api_router.get("/chat/rooms")
async def get_user_chat_rooms(current_user: User = Depends(get_current_user)):
    rooms = await db.chat_rooms.find({"participants": current_user.id}).to_list(100)
    return [ChatRoom(**{**room, "id": str(room["_id"])}) for room in rooms]

@api_router.post("/chat/messages")
async def send_message(message: str, chat_room_id: str, receiver_id: str, current_user: User = Depends(get_current_user)):
    message_data = {
        "_id": ObjectId(),
        "sender_id": current_user.id,
        "receiver_id": receiver_id,
        "message": message,
        "chat_room_id": chat_room_id,
        "created_at": datetime.utcnow()
    }
    
    await db.chat_messages.insert_one(message_data)
    
    # Update room last message
    await db.chat_rooms.update_one(
        {"_id": ObjectId(chat_room_id)},
        {"$set": {"last_message": message, "last_message_time": datetime.utcnow()}}
    )
    
    return ChatMessage(**{**message_data, "id": str(message_data["_id"])})

@api_router.get("/chat/messages/{chat_room_id}")
async def get_chat_messages(chat_room_id: str, current_user: User = Depends(get_current_user)):
    messages = await db.chat_messages.find({"chat_room_id": chat_room_id}).sort("created_at", 1).to_list(100)
    return [ChatMessage(**{**msg, "id": str(msg["_id"])}) for msg in messages]

# Analytics Routes
@api_router.get("/admin/analytics/transactions")
async def get_transaction_analytics(admin: User = Depends(is_admin_user)):
    # Get transaction statistics
    total_transactions = await db.transactions.count_documents({})
    
    # Calculate total volume
    pipeline = [
        {"$group": {"_id": None, "total_volume": {"$sum": "$amount_sent"}}}
    ]
    volume_result = await db.transactions.aggregate(pipeline).to_list(1)
    total_volume = volume_result[0]["total_volume"] if volume_result else 0
    
    # Calculate success rate
    successful_transactions = await db.transactions.count_documents({"transfer_status": "completed"})
    success_rate = (successful_transactions / total_transactions * 100) if total_transactions > 0 else 0
    
    # Daily transactions for last 30 days
    daily_transactions = []
    for i in range(30):
        date = datetime.utcnow() - timedelta(days=i)
        start_date = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = start_date + timedelta(days=1)
        
        count = await db.transactions.count_documents({
            "created_at": {"$gte": start_date, "$lt": end_date}
        })
        
        daily_transactions.append({
            "date": start_date.strftime("%Y-%m-%d"),
            "count": count
        })
    
    # Top countries
    top_countries_pipeline = [
        {"$group": {"_id": "$recipient_data.country", "volume": {"$sum": "$amount_sent"}, "count": {"$sum": 1}}},
        {"$sort": {"volume": -1}},
        {"$limit": 5}
    ]
    top_countries_result = await db.transactions.aggregate(top_countries_pipeline).to_list(5)
    
    return TransactionAnalytics(
        total_transactions=total_transactions,
        total_volume=total_volume,
        success_rate=success_rate,
        average_transaction=total_volume / total_transactions if total_transactions > 0 else 0,
        daily_transactions=daily_transactions,
        top_countries=top_countries_result,
        revenue_breakdown={
            "transfer_fees": total_volume * 0.025,
            "exchange_margin": total_volume * 0.015,
            "premium_features": total_volume * 0.005
        }
    )

@api_router.get("/admin/analytics/users")
async def get_user_analytics(admin: User = Depends(is_admin_user)):
    total_users = await db.users.count_documents({})
    verified_users = await db.users.count_documents({"is_kyc_verified": True})
    pending_users = await db.users.count_documents({"is_kyc_verified": False})
    active_users = await db.users.count_documents({"is_active": True})
    
    # Monthly growth
    monthly_growth = []
    for i in range(6):
        date = datetime.utcnow() - timedelta(days=30*i)
        start_date = date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end_date = (start_date + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        
        count = await db.users.count_documents({
            "created_at": {"$gte": start_date, "$lte": end_date}
        })
        
        monthly_growth.append({
            "month": start_date.strftime("%b %Y"),
            "users": count
        })
    
    return {
        "total_users": total_users,
        "verified_users": verified_users,
        "pending_users": pending_users,
        "active_users": active_users,
        "monthly_growth": monthly_growth
    }

# Compliance Routes
@api_router.get("/admin/compliance/report")
async def get_compliance_report(admin: User = Depends(is_admin_user)):
    total_users = await db.users.count_documents({})
    verified_users = await db.users.count_documents({"is_kyc_verified": True})
    kyc_completion_rate = (verified_users / total_users * 100) if total_users > 0 else 0
    
    # Simulate AML flagged transactions
    flagged_transactions = await db.transactions.count_documents({"aml_status": "flagged"})
    
    return ComplianceReport(
        kyc_completion_rate=kyc_completion_rate,
        aml_flagged_transactions=flagged_transactions,
        suspicious_activities=5,  # Mock data
        regulatory_reports_pending=2,  # Mock data
        compliance_score=96.8
    )

# Countries Management Routes
@api_router.get("/countries", response_model=List[SupportedCountry])
async def get_supported_countries():
    countries = await db.supported_countries.find({"is_active": True}).sort("country_name", 1).to_list(100)
    return [SupportedCountry(**{**country, "id": str(country["_id"])}) for country in countries]

@api_router.put("/admin/countries/{country_id}")
async def update_country(country_id: str, country_data: dict, admin: User = Depends(is_admin_user)):
    result = await db.supported_countries.update_one(
        {"_id": ObjectId(country_id)},
        {"$set": {**country_data, "updated_at": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Country not found")
    
    updated_country = await db.supported_countries.find_one({"_id": ObjectId(country_id)})
    return SupportedCountry(**{**updated_country, "id": str(updated_country["_id"])})

# Exchange Rates Routes
@api_router.get("/exchange-rates/{from_currency}/{to_currency}")
async def get_exchange_rate(from_currency: str, to_currency: str):
    rate = await db.exchange_rates.find_one({
        "from_currency": from_currency.upper(),
        "to_currency": to_currency.upper()
    })
    
    if not rate:
        # Enhanced default rates for all supported currencies
        default_rates = {
            ("USD", "XOF"): 580.0, ("USD", "XAF"): 600.0, ("USD", "CDF"): 2000.0,
            ("USD", "SZL"): 18.5, ("USD", "ETB"): 55.0, ("USD", "GHS"): 12.0,
            ("USD", "GNF"): 8500.0, ("USD", "KES"): 130.0, ("USD", "LRD"): 150.0,
            ("USD", "MGA"): 4500.0, ("USD", "MWK"): 1100.0, ("USD", "MZN"): 64.0,
            ("USD", "NGN"): 460.0, ("USD", "RWF"): 1100.0, ("USD", "SLE"): 22.0,
            ("USD", "ZAR"): 18.5, ("USD", "TZS"): 2300.0, ("USD", "UGX"): 3700.0,
            ("USD", "ZMW"): 25.0, ("EUR", "XOF"): 655.0, ("EUR", "XAF"): 680.0,
            ("EUR", "NGN"): 520.0, ("EUR", "GHS"): 13.5, ("EUR", "ZAR"): 20.0,
            ("EUR", "KES"): 145.0, ("GBP", "NGN"): 590.0, ("GBP", "GHS"): 15.0,
            ("GBP", "KES"): 165.0,
        }
        
        rate_key = (from_currency.upper(), to_currency.upper())
        if rate_key in default_rates:
            rate_data = {
                "from_currency": from_currency.upper(),
                "to_currency": to_currency.upper(),
                "rate": default_rates[rate_key],
                "updated_at": datetime.utcnow()
            }
            await db.exchange_rates.insert_one(rate_data)
            return {"rate": default_rates[rate_key], "updated_at": rate_data["updated_at"]}
        else:
            raise HTTPException(status_code=404, detail="Exchange rate not found")
    
    return {"rate": rate["rate"], "updated_at": rate["updated_at"]}

@api_router.put("/admin/exchange-rates")
async def update_exchange_rates(rates: Dict[str, float], admin: User = Depends(is_admin_user)):
    for rate_pair, rate_value in rates.items():
        from_currency, to_currency = rate_pair.split("-")
        await db.exchange_rates.update_one(
            {"from_currency": from_currency, "to_currency": to_currency},
            {"$set": {"rate": rate_value, "updated_at": datetime.utcnow()}},
            upsert=True
        )
    
    return {"success": True, "message": "Exchange rates updated successfully"}

# Admin Settings Routes
@api_router.get("/admin/settings", response_model=AdminSettings)
async def get_admin_settings():
    settings = await db.admin_settings.find_one()
    if not settings:
        settings = AdminSettings()
        await db.admin_settings.insert_one(settings.dict())
        return settings
    return AdminSettings(**{**settings, "id": str(settings["_id"])})

@api_router.put("/admin/settings", response_model=AdminSettings)
async def update_admin_settings(settings_update: dict):
    existing_settings = await db.admin_settings.find_one()
    if not existing_settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    
    update_data = {k: v for k, v in settings_update.items() if v is not None}
    update_data['updated_at'] = datetime.utcnow().isoformat()  # Convert to string
    
    await db.admin_settings.update_one(
        {"_id": existing_settings["_id"]},
        {"$set": update_data}
    )
    
    updated_settings = await db.admin_settings.find_one({"_id": existing_settings["_id"]})
    return AdminSettings(**{**updated_settings, "id": str(updated_settings["_id"])})

# Transfer Reasons
@api_router.get("/transfer-reasons")
async def get_transfer_reasons():
    reasons = await db.transfer_reasons.find().to_list(100)
    return [{"code": reason["code"], "description": reason["description"], "category": reason["category"]} for reason in reasons]

# Transactions Routes
@api_router.get("/transactions")
async def get_user_transactions(current_user: User = Depends(get_current_user)):
    transactions = await db.transactions.find({"user_id": current_user.id}).sort("created_at", -1).to_list(100)
    return transactions

@api_router.get("/admin/transactions")
async def get_all_transactions(admin: User = Depends(is_admin_user)):
    transactions = await db.transactions.find().sort("created_at", -1).to_list(100)
    return transactions

@api_router.put("/admin/transactions/{transaction_id}/status")
async def update_transaction_status(transaction_id: str, status: str, admin: User = Depends(is_admin_user)):
    result = await db.transactions.update_one(
        {"_id": ObjectId(transaction_id)},
        {"$set": {"transfer_status": status, "updated_at": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return {"success": True, "message": f"Transaction status updated to {status}"}

# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "CipCash API", "timestamp": datetime.utcnow()}

# Admin dashboard routes
@app.get("/admin")
async def admin_dashboard():
    from fastapi.responses import FileResponse
    return FileResponse(ROOT_DIR / "static" / "admin" / "index.html")

@app.get("/admin/")
async def admin_dashboard_slash():
    from fastapi.responses import FileResponse
    return FileResponse(ROOT_DIR / "static" / "admin" / "index.html")

@api_router.get("/admin-dashboard")
async def admin_dashboard_api():
    from fastapi.responses import FileResponse
    return FileResponse(ROOT_DIR / "static" / "admin" / "index.html")

# Include the router in the main app
app.include_router(api_router)

# Mount static files for admin dashboard
try:
    app.mount("/admin-static", StaticFiles(directory=ROOT_DIR / "static", html=True), name="static")
except:
    (ROOT_DIR / "static").mkdir(exist_ok=True)
    app.mount("/admin-static", StaticFiles(directory=ROOT_DIR / "static", html=True), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await initialize_default_data()
    logger.info("🚀 CipCash API v3.0 - Ultimate Fintech Platform Started Successfully!")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()