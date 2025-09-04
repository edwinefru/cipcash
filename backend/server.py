from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta, date
import jwt
import bcrypt
from bson import ObjectId
import httpx
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client.remittance_app

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI(title="Mobile Money Remittance API", version="2.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enhanced Pydantic Models with KYC
class UserKYC(BaseModel):
    # Personal Information
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    date_of_birth: date
    nationality: str
    gender: str = Field(..., pattern="^(male|female|other)$")
    
    # Contact Information
    email: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state_province: str
    postal_code: str
    country: str
    
    # Identification
    id_type: str = Field(..., regex="^(passport|national_id|drivers_license|other)$")
    id_number: str
    id_expiry_date: Optional[date] = None
    id_issuing_country: str
    
    # Employment/Source of Income
    occupation: str
    employer_name: Optional[str] = None
    annual_income_range: str = Field(..., regex="^(under_25k|25k_50k|50k_100k|100k_250k|250k_500k|over_500k)$")
    source_of_funds: str = Field(..., regex="^(salary|business|investment|inheritance|gift|other)$")
    
    # Profile Picture
    profile_picture: Optional[str] = None  # base64 encoded image

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    kyc_data: UserKYC
    is_kyc_verified: bool = False
    kyc_verification_date: Optional[datetime] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    kyc_data: UserKYC
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class RecipientKYC(BaseModel):
    # Personal Information
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    phone: str
    
    # Address Information
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state_province: str
    country: str
    
    # Relationship and Purpose
    relationship_to_sender: str = Field(..., regex="^(family|friend|business|other)$")
    recipient_type: str = Field(..., regex="^(individual|business)$")
    
    # For business recipients
    business_name: Optional[str] = None
    business_registration_number: Optional[str] = None

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
    
    # Supabase Settings
    supabase_url: Optional[str] = None
    supabase_anon_key: Optional[str] = None
    
    # Currency Settings
    currency_api_key: Optional[str] = None
    
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class AdminSettingsUpdate(BaseModel):
    mtn_api_key: Optional[str] = None
    mtn_api_secret: Optional[str] = None
    mtn_subscription_key: Optional[str] = None
    mtn_base_url: Optional[str] = None
    stripe_api_key: Optional[str] = None
    stripe_webhook_secret: Optional[str] = None
    paypal_client_id: Optional[str] = None
    paypal_client_secret: Optional[str] = None
    google_pay_merchant_id: Optional[str] = None
    apple_pay_merchant_id: Optional[str] = None
    supabase_url: Optional[str] = None
    supabase_anon_key: Optional[str] = None
    currency_api_key: Optional[str] = None

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

class PaymentMethod(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    user_id: str
    method_type: str = Field(..., regex="^(credit_card|debit_card|apple_pay|google_pay|paypal)$")
    last_four: Optional[str] = None
    card_brand: Optional[str] = None
    expiry_month: Optional[int] = None
    expiry_year: Optional[int] = None
    is_default: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TransferReason(BaseModel):
    code: str
    description: str
    category: str

class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    user_id: str
    
    # Recipient Information
    recipient_data: RecipientKYC
    
    # Transfer Details
    amount_sent: float
    currency_sent: str
    amount_received: float
    currency_received: str
    exchange_rate: float
    
    # Purpose and Compliance
    transfer_reason: str
    transfer_description: Optional[str] = None
    
    # Payment Information
    payment_method: str
    payment_method_id: Optional[str] = None
    payment_status: str = Field(default="pending")
    transfer_status: str = Field(default="pending")
    
    # References
    transaction_reference: str = Field(default_factory=lambda: str(uuid.uuid4()))
    mtn_reference: Optional[str] = None
    payment_reference: Optional[str] = None
    
    # Fees and Costs
    transfer_fee: float = 0.0
    exchange_fee: float = 0.0
    total_cost: float = 0.0
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    estimated_delivery: Optional[datetime] = None

class ExchangeRate(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    from_currency: str
    to_currency: str
    rate: float
    updated_at: datetime = Field(default_factory=datetime.utcnow)

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

# Initialize default data with all 24 MTN MoMo countries
async def initialize_default_data():
    # All 24 MTN MoMo supported countries
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
    
    # Initialize admin settings if not exists
    existing_settings = await db.admin_settings.find_one()
    if not existing_settings:
        settings = AdminSettings()
        await db.admin_settings.insert_one(settings.dict())

# API Routes

# Authentication Routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"kyc_data.email": user_data.kyc_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password and create user
    hashed_password = hash_password(user_data.password)
    user_dict = user_data.dict()
    del user_dict['password']
    user_dict['password_hash'] = hashed_password
    user_dict['_id'] = ObjectId()
    
    await db.users.insert_one(user_dict)
    
    # Create token
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

# Profile Picture Upload
@api_router.post("/auth/upload-profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Read file and convert to base64
    contents = await file.read()
    base64_image = base64.b64encode(contents).decode('utf-8')
    image_url = f"data:{file.content_type};base64,{base64_image}"
    
    # Update user profile
    await db.users.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$set": {"kyc_data.profile_picture": image_url, "updated_at": datetime.utcnow()}}
    )
    
    return {"profile_picture_url": image_url}

# Payment Methods
@api_router.get("/payment-methods", response_model=List[PaymentMethod])
async def get_payment_methods(current_user: User = Depends(get_current_user)):
    methods = await db.payment_methods.find({"user_id": current_user.id}).to_list(100)
    return [PaymentMethod(**{**method, "id": str(method["_id"])}) for method in methods]

@api_router.post("/payment-methods", response_model=PaymentMethod)
async def add_payment_method(
    method: PaymentMethod,
    current_user: User = Depends(get_current_user)
):
    method.user_id = current_user.id
    method_dict = method.dict()
    method_dict['_id'] = ObjectId()
    
    await db.payment_methods.insert_one(method_dict)
    return PaymentMethod(**{**method_dict, "id": str(method_dict["_id"])})

# Admin Routes
@api_router.get("/admin/settings", response_model=AdminSettings)
async def get_admin_settings():
    settings = await db.admin_settings.find_one()
    if not settings:
        settings = AdminSettings()
        await db.admin_settings.insert_one(settings.dict())
        return settings
    return AdminSettings(**{**settings, "id": str(settings["_id"])})

@api_router.put("/admin/settings", response_model=AdminSettings)
async def update_admin_settings(settings_update: AdminSettingsUpdate):
    existing_settings = await db.admin_settings.find_one()
    if not existing_settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    
    update_data = {k: v for k, v in settings_update.dict().items() if v is not None}
    update_data['updated_at'] = datetime.utcnow()
    
    await db.admin_settings.update_one(
        {"_id": existing_settings["_id"]},
        {"$set": update_data}
    )
    
    updated_settings = await db.admin_settings.find_one({"_id": existing_settings["_id"]})
    return AdminSettings(**{**updated_settings, "id": str(updated_settings["_id"])})

# Countries Routes
@api_router.get("/countries", response_model=List[SupportedCountry])
async def get_supported_countries():
    countries = await db.supported_countries.find({"is_active": True}).sort("country_name", 1).to_list(100)
    return [SupportedCountry(**{**country, "id": str(country["_id"])}) for country in countries]

# Transfer Reasons
@api_router.get("/transfer-reasons")
async def get_transfer_reasons():
    reasons = await db.transfer_reasons.find().to_list(100)
    return [{"code": reason["code"], "description": reason["description"], "category": reason["category"]} for reason in reasons]

# Exchange Rates Routes
@api_router.get("/exchange-rates")
async def get_exchange_rates():
    rates = await db.exchange_rates.find().to_list(100)
    return [{"from_currency": rate["from_currency"], "to_currency": rate["to_currency"], "rate": rate["rate"], "updated_at": rate["updated_at"]} for rate in rates]

@api_router.get("/exchange-rates/{from_currency}/{to_currency}")
async def get_exchange_rate(from_currency: str, to_currency: str):
    rate = await db.exchange_rates.find_one({
        "from_currency": from_currency.upper(),
        "to_currency": to_currency.upper()
    })
    if not rate:
        # Enhanced default rates for all supported currencies
        default_rates = {
            ("USD", "XOF"): 580.0,  # Benin, Côte d'Ivoire, Guinea Bissau, Senegal
            ("USD", "XAF"): 600.0,  # Cameroon, Gabon, Republic of Congo
            ("USD", "CDF"): 2000.0,  # Democratic Republic of Congo
            ("USD", "SZL"): 18.5,   # Eswatini
            ("USD", "ETB"): 55.0,   # Ethiopia
            ("USD", "GHS"): 12.0,   # Ghana
            ("USD", "GNF"): 8500.0, # Guinea Conakry
            ("USD", "KES"): 130.0,  # Kenya
            ("USD", "LRD"): 150.0,  # Liberia
            ("USD", "MGA"): 4500.0, # Madagascar
            ("USD", "MWK"): 1100.0, # Malawi
            ("USD", "MZN"): 64.0,   # Mozambique
            ("USD", "NGN"): 460.0,  # Nigeria
            ("USD", "RWF"): 1100.0, # Rwanda
            ("USD", "SLE"): 22.0,   # Sierra Leone
            ("USD", "ZAR"): 18.5,   # South Africa
            ("USD", "TZS"): 2300.0, # Tanzania
            ("USD", "UGX"): 3700.0, # Uganda
            ("USD", "ZMW"): 25.0,   # Zambia
            ("EUR", "XOF"): 655.0,
            ("EUR", "XAF"): 680.0,
            ("EUR", "NGN"): 520.0,
            ("EUR", "GHS"): 13.5,
            ("EUR", "ZAR"): 20.0,
            ("EUR", "KES"): 145.0,
            ("GBP", "NGN"): 590.0,
            ("GBP", "GHS"): 15.0,
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

# Transactions Routes
@api_router.get("/transactions", response_model=List[Transaction])
async def get_user_transactions(current_user: User = Depends(get_current_user)):
    transactions = await db.transactions.find({"user_id": current_user.id}).sort("created_at", -1).to_list(100)
    return [Transaction(**{**tx, "id": str(tx["_id"])}) for tx in transactions]

@api_router.get("/admin/transactions", response_model=List[Transaction])
async def get_all_transactions():
    transactions = await db.transactions.find().sort("created_at", -1).to_list(100)
    return [Transaction(**{**tx, "id": str(tx["_id"])}) for tx in transactions]

# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Admin dashboard route
@app.get("/admin")
async def admin_dashboard():
    from fastapi.responses import FileResponse
    return FileResponse(ROOT_DIR / "static" / "admin.html")

@app.get("/admin/")
async def admin_dashboard_slash():
    from fastapi.responses import FileResponse
    return FileResponse(ROOT_DIR / "static" / "admin.html")

# Include the router in the main app
app.include_router(api_router)

# Mount static files for admin dashboard
try:
    app.mount("/admin-static", StaticFiles(directory=ROOT_DIR / "static", html=True), name="static")
except:
    # Create static directory if it doesn't exist
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
    logger.info("Mobile Money Remittance API v2.0 started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()