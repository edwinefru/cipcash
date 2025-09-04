from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
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
from datetime import datetime, timedelta
import jwt
import bcrypt
from bson import ObjectId
import httpx

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
app = FastAPI(title="Mobile Money Remittance API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Pydantic Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    email: str
    phone: str
    first_name: str
    last_name: str
    country: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    email: str
    phone: str
    first_name: str
    last_name: str
    country: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

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
    supabase_url: Optional[str] = None
    supabase_anon_key: Optional[str] = None
    currency_api_key: Optional[str] = None

class SupportedCountry(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    country_code: str  # CM, NG, GH, ZA, KE
    country_name: str  # Cameroon, Nigeria, Ghana, South Africa, Kenya
    currency_code: str  # XAF, NGN, GHS, ZAR, KES
    currency_name: str
    is_active: bool = True
    mtn_supported: bool = True

class ExchangeRate(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    from_currency: str
    to_currency: str
    rate: float
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    user_id: str
    recipient_phone: str
    recipient_name: str
    recipient_country: str
    amount_sent: float
    currency_sent: str
    amount_received: float
    currency_received: str
    exchange_rate: float
    payment_method: str  # stripe, paypal, google_pay
    payment_status: str  # pending, processing, completed, failed
    transfer_status: str  # pending, processing, completed, failed
    transaction_reference: str = Field(default_factory=lambda: str(uuid.uuid4()))
    mtn_reference: Optional[str] = None
    payment_reference: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
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

# Initialize default data
async def initialize_default_data():
    # Initialize supported countries
    countries = [
        {"country_code": "CM", "country_name": "Cameroon", "currency_code": "XAF", "currency_name": "Central African CFA franc"},
        {"country_code": "NG", "country_name": "Nigeria", "currency_code": "NGN", "currency_name": "Nigerian naira"},
        {"country_code": "GH", "country_name": "Ghana", "currency_code": "GHS", "currency_name": "Ghanaian cedi"},
        {"country_code": "ZA", "country_name": "South Africa", "currency_code": "ZAR", "currency_name": "South African rand"},
        {"country_code": "KE", "country_name": "Kenya", "currency_code": "KES", "currency_name": "Kenyan shilling"},
    ]
    
    for country_data in countries:
        existing = await db.supported_countries.find_one({"country_code": country_data["country_code"]})
        if not existing:
            country = SupportedCountry(**country_data)
            await db.supported_countries.insert_one(country.dict())
    
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
    existing_user = await db.users.find_one({"email": user_data.email})
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
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user.get('password_hash', '')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": str(user['_id'])})
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

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
    countries = await db.supported_countries.find({"is_active": True}).to_list(100)
    return [SupportedCountry(**{**country, "id": str(country["_id"])}) for country in countries]

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
        # Default rates for demo (in production, fetch from external API)
        default_rates = {
            ("USD", "XAF"): 580.0,
            ("USD", "NGN"): 460.0,
            ("USD", "GHS"): 12.0,
            ("USD", "ZAR"): 18.5,
            ("USD", "KES"): 130.0,
            ("EUR", "XAF"): 655.0,
            ("EUR", "NGN"): 520.0,
            ("EUR", "GHS"): 13.5,
            ("EUR", "ZAR"): 20.0,
            ("EUR", "KES"): 145.0,
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

# Include the router in the main app
app.include_router(api_router)

# Mount static files for admin dashboard
try:
    app.mount("/admin", StaticFiles(directory=ROOT_DIR / "static", html=True), name="static")
except:
    # Create static directory if it doesn't exist
    (ROOT_DIR / "static").mkdir(exist_ok=True)
    app.mount("/admin", StaticFiles(directory=ROOT_DIR / "static", html=True), name="static")

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
    logger.info("Mobile Money Remittance API started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()