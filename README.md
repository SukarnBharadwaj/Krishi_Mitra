

# 🌾 Krishi Mitra — Farmer’s Friend

## Overview

*Krishi Mitra* is a unified digital agriculture platform designed to support farmers by providing a centralized system for crop exchange, equipment rental, MSP tracking, AI crop recommendations, multilingual support, and secure transactions. The platform bridges the gap between farmers, suppliers, and government agencies.



## Features

### 🔐 User Authentication

* Secure registration and login
* Aadhaar-based verification (concept)
* Role-Based Access Control for Farmer / Supplier / Government Official

### 🌾 Crop Marketplace

* Add, update, delete, and view crop listings
* Barter exchange system
* Crop buying/selling workflows

### 🚜 Equipment Rental

* Rent tractors, harvesters, and farming tools
* Check availability in real time

### 🏷 Minimum Support Price (MSP)

* Real-time MSP updates
* Ensures market transparency

### 🌍 Multi-Language Support

* Supports English, Hindi, Odia, etc.
* Dynamic UI text changes via JSON mapping

### 🤖 AI-Based Crop Recommendation

* Suggests crops based on soil, weather, and location
* Lightweight model with fast inference

### 💬 Real-Time Chat

* Live communication between farmers & buyers
* Powered by Flask-SocketIO

### 💳 Payment Integration

* UPI / Wallet-based transaction flow
* Tokenization for security

---

## Tech Stack

### Frontend

* *HTML5, **CSS3, **JavaScript*
* Responsive mobile-first design
* Fetch API, AJAX
* Real-time UI updates & form validations

### Backend

* *Flask (Python)*
* RESTful API architecture
* Flask-SocketIO for real-time chat
* AI model integration through API endpoints
* Payment gateway simulation

### Database

* JSON-based storage for prototype
* Supports migration to MongoDB or PostgreSQL

---

## Project Structure


krishi-mitra/
│── backend/
│   ├── app.py
│   ├── ai_model.py
│   ├── routes/
│   ├── utils/
│   └── database.json
│
│── frontend/
│   ├── index.html
│   ├── dashboard.html
│   ├── chatbot.html
│   ├── recommendation.html
│   ├── js/
│   └── css/
│
│── README.md
└── API_DOCS.md


---

## System Architecture

* Flask backend manages authentication, listings, MSP, AI suggestions
* Frontend communicates via REST APIs
* WebSockets handle live chat
* AI model returns predictions through dedicated endpoint
* Payment gateway processes simulated transactions

---

## Testing

Major test cases include:

* User registration & login
* Adding and updating crop listings
* Barter and purchase flows
* AI recommendation accuracy
* Chat message delivery
