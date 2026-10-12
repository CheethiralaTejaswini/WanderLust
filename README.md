# 🌍 Wanderlust – Modern Travel & Accommodation Platform

**Wanderlust** is a full-featured, modern vacation rental and travel experiences platform inspired by **Airbnb**, built using **Node.js, Express.js, MongoDB, Mongoose, Passport.js, and EJS**.

It empowers travelers to explore global destinations, discover stays with category filters, view routes and directions via Google Maps, check nearby attractions and dining, reserve accommodation with live availability checking, book cab transfers, and manage everything through an interactive user dashboard.

---

## ✨ Features Overview

### 1. 🔐 User Authentication & Google OAuth 2.0
- **Google OAuth 2.0 Integration**: Register and log in instantly with your Google account using `passport-google-oauth20`.
- **Account Linking**: Automatically links Google logins to existing accounts by verified email and Google provider ID, preventing duplicate accounts.
- **Local Authentication**: Username/password signup and login powered by `passport-local` and `passport-local-mongoose`.
- **Session Management**: Persistent sessions backed by `connect-mongo` and `express-session` with secure HTTP-only cookies.
- **User Navbar Display**: Displays profile image/avatar, display name, and user menu dropdown with direct links to dashboard, bookings, listings, and logout.

### 2. 🏠 Airbnb-Style Home Page & UI
- **Modern Airbnb Design System**: Built with Plus Jakarta Sans typography, Airbnb coral theme (`#FF385C`), and clean card layouts.
- **Hero Destination Search Bar**: Search by destination query, check-in date, check-out date, and number of guests.
- **Category Filter Carousel**: 13 category filters (Trending, Beaches, Mountains, Iconic Cities, Rooms, Castles, Amazing Pools, Camping, Farms, Arctic, Resorts, Adventure, Villas) with horizontal scroll.
- **Tax Switcher**: Interactive toggle to switch between prices before taxes and after taxes (18% GST).
- **Responsive Listing Cards**: Aspect-ratio image cards with favorite wishlist toggle, rating score, location, and price.

### 3. 🏡 Listing Management (CRUD)
- **Create Listings**: Enter title, description, price, location, country, category, property type (Villa, Entire home, Cabin, etc.), max guests, bedrooms, and amenities checklist.
- **Dual Image Uploads**: Upload images directly through **Multer & Cloudinary** with automatic fallback to disk storage or direct image URLs.
- **Edit & Delete**: Secure authorization middleware (`isOwner`) guarantees only listing creators can modify or delete listings.
- **Search & Filter**: Search by destination keywords and filter by price range, category, guest capacity, and accommodation type.

### 4. 🗺️ Google Maps Integration & Directions
- **Interactive Map on Details Page**: Visualizes destination coordinates with exact pin markers.
- **Route & Directions Planner**: Enter your starting location (city, airport, landmark) to calculate driving route distance and estimated travel duration.
- **Open in Google Maps**: Direct one-click link to open driving/transit directions in the official Google Maps app or website.
- **Automatic Geocoding**: Automatically resolves geographic coordinates for destinations using Google Maps Geocoding API or built-in coordinates lookup.

### 5. 🏨 Nearby Hotels, Restaurants & Attractions
- **Local Recommendations**: Displays nearby hotels & resorts, restaurants & cafes, and tourist sights around the destination coordinates.
- **Direct Navigation**: Shows distance, star ratings, address, and Google Maps directions links for each nearby place.
- **Distinctly Labeled**: Clearly distinguished from Wanderlust listings as external local recommendations.

### 6. 🚕 Cab Booking & Transportation
- **Dedicated Cab Transfer System**: Book rides directly from any listing details page or through the cab booking portal.
- **Vehicle Selection**: Economy Hatchback, Sedan Comfort, SUV Prime, and Luxury Executive.
- **Transparent Fare Calculation**: Real-time upfront fare breakdown based on base rates, per-kilometer charges, and estimated distance.
- **Internal MongoDB Bookings**: Generates unique reference vouchers (`CAB-XXXXXX`) tracked in the database and user dashboard.
- **Partner App Integration**: Quick deep-links to launch Uber (`m.uber.com`) or Ola (`book.olacabs.com`) with the destination pre-filled.

### 7. 📅 Accommodation Booking System
- **Real-Time Availability Engine**: Prevents double-booking or overlapping reservations on the same listing for confirmed dates.
- **Interactive Price Calculator**: Computes nightly stay cost, cleaning fee, service fee, and total amount before reservation.
- **Confirmation Voucher & Receipt**: Generates printable confirmation vouchers with unique codes (`WND-XXXXXX`).
- **Cancellation Policy**: Users can cancel eligible reservations directly from their profile.

### 8. 👤 User Dashboard & Profile
- **Overview Card**: Displays avatar, Google verification badge, email, and travel statistics.
- **My Reservations Tab**: View all accommodation bookings with dates, guest counts, and status badges.
- **My Listings Tab**: View and manage properties you host with quick edit/view links.
- **My Cab Rides Tab**: View all cab transfer vouchers, pickup/dropoff details, and driver notes.
- **My Reviews Tab**: Manage reviews written across listings.
- **Profile Editor**: Update display name, bio, phone number, and avatar image.

### 9. 💬 Reviews, Ratings & Feedback
- **5-Star Starability Rating**: Leave ratings from 1 to 5 stars with detailed comments.
- **Reviewer Info**: Shows reviewer avatar, username, review date, and star badge.
- **Author Authorization**: Only review authors can delete their reviews (`isreviewAuthor`).
- **Support & Feedback Page**: Submit suggestions, feature requests, or bug reports via `/feedback`.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | EJS (Embedded JavaScript templates), EJS-Mate, HTML5, Vanilla CSS3 (Custom Airbnb Design System), Bootstrap 5.3.3, FontAwesome 6.5.1 |
| **Backend** | Node.js (v18+ / v22), Express.js (v5) |
| **Database** | MongoDB, Mongoose ODM |
| **Authentication** | Passport.js, `passport-local`, `passport-local-mongoose`, `passport-google-oauth20` |
| **Session Store** | `express-session`, `connect-mongo` (MongoDB session store) |
| **File Uploads** | Multer, Cloudinary (`cloudinary`, `multer-storage-cloudinary-v2`) |
| **Validation** | Joi Schema Validator |
| **Maps & Location** | Google Maps Platform (Maps JavaScript, Places, Geocoding, Directions API) |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.x or later installed)
- [MongoDB](https://www.mongodb.com/) (running locally on `mongodb://127.0.0.1:27017` or MongoDB Atlas URI)

### 1. Installation
Clone the repository and install all dependencies:

\`\`\`bash
npm install
\`\`\`

*(On Windows PowerShell, use `npm.cmd install` if execution policy is restricted).*

### 2. Environment Variables Configuration
Create a `.env` file in the root directory (you can copy `.env.example`):

\`\`\`env
# Server & Sessions
PORT=8080
SECRET=your_super_secret_session_key_here
MONGO_URL=mongodb://127.0.0.1:27017/wanderlust

# Cloudinary (for image uploads)
CLOUD_NAME=your_cloudinary_cloud_name
CLOUD_API_KEY=your_cloudinary_api_key
CLOUD_API_SECRET=your_cloudinary_api_secret

# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:8080/auth/google/callback

# Google Maps API Key (Optional but recommended)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
\`\`\`

> **Note on Google Credentials:**
> - To enable Google OAuth, create credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) and set Authorized redirect URI to `http://localhost:8080/auth/google/callback`.
> - If Google OAuth credentials are not provided, local registration/login and all other features continue to function seamlessly.

### 3. Initialize / Seed Database (Optional)
To populate the database with initial sample listings:

\`\`\`bash
node init/index.js
\`\`\`

### 4. Start the Application
Start the server:

\`\`\`bash
node app.js
\`\`\`

Open your browser and visit:
👉 **[http://localhost:8080](http://localhost:8080)**

---

## 📂 Project Structure

\`\`\`
MAJOR PROJECT/
├── .env                  # Environment secrets (ignored by Git)
├── .env.example          # Template for environment variables
├── .gitignore            # Git exclusion rules
├── app.js                # Express app initialization, sessions, passport, routes
├── cloudConfig.js        # Multer & Cloudinary storage configuration
├── middleware.js         # Authentication, authorization, and validation middleware
├── package.json          # Project dependencies and metadata
├── schema.js             # Joi input validation schemas
├── controllers/          # Business logic handlers
│   ├── bookings.js       # Accommodation booking logic
│   ├── cabs.js           # Cab transfers and ride estimation logic
│   ├── feedback.js       # Feedback & bug report logic
│   ├── listings.js       # Listings CRUD and category filtering logic
│   ├── reviews.js        # Review creation and deletion logic
│   └── users.js          # Authentication, Google OAuth, and profile logic
├── models/               # Mongoose database models
│   ├── booking.js        # AccommodationBooking schema
│   ├── cabBooking.js     # CabBooking schema
│   ├── feedback.js       # Feedback schema
│   ├── listing.js        # Listing schema
│   ├── review.js         # Review schema
│   └── user.js           # User schema (local + Google OAuth)
├── public/               # Static assets
│   ├── css/
│   │   ├── rating.css    # Starability rating styles
│   │   └── style.css     # Airbnb-inspired modern stylesheet
│   └── js/
│       └── script.js     # Client-side scripts (taxes toggle, validation, alerts)
├── routes/               # Express router modules
│   ├── booking.js        # /bookings routes
│   ├── cab.js            # /cabs routes
│   ├── feedback.js       # /feedback routes
│   ├── listing.js        # /listings routes
│   ├── review.js         # /listings/:id/reviews routes
│   └── user.js           # /signup, /login, /profile, /auth/google routes
├── utils/                # Utility helpers
│   ├── ExpressError.js   # Custom error class
│   ├── geocoder.js       # Geocoding, nearby places, and cab fare helper
│   └── wrapAsync.js      # Async handler wrapper
└── views/                # EJS templates
    ├── error.ejs         # Centralized error page
    ├── bookings/         # Booking vouchers and reservations list
    ├── cabs/             # Cab booking form and vouchers
    ├── feedback/         # Feedback submission form
    ├── includes/         # Navbar, footer, and flash messages
    ├── layouts/          # Boilerplate layout with Google fonts and Bootstrap
    ├── listings/         # Index, show, new, and edit listing pages
    ├── static/           # About, Privacy, and Terms pages
    └── users/            # Login, signup, and profile dashboard
\`\`\`

---

## 🔒 Security Best Practices
- Passwords salted and hashed with `passport-local-mongoose` (PBKDF2).
- Route authorization guards (`isloggedIn`, `isOwner`, `isreviewAuthor`).
- Server-side Joi validation for all listing, review, booking, and cab requests.
- MongoDB injection mitigation with Mongoose parameter binding.
- Sessions stored in MongoDB with `sameSite: "lax"` and `httpOnly: true`.
- Sensitive credentials loaded exclusively from `.env`.

---

## 📄 License
ISC License &copy; Wanderlust Platform.
