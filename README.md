# 🌱 CivicStack - Environmental Civic Complaint Management

**Team:** Goldmauler (IIT Delhi)  
**Developer:** kirankishoreV-07  
**Project:** Hack for Governance & Public Systems  
**Theme:** Environmental Urban Feedback Systems

## 📱 Project Overview

CivicStack is a comprehensive environmental civic complaint management system that leverages AI to prioritize and verify urban infrastructure complaints. The system features an environmental theme, multilingual support, real-time heatmaps, and intelligent prioritization to improve municipal governance.

## 🌍 Environmental Focus

This application has been redesigned with an **"EcoReports"** theme, focusing on:
- 🌱 Environmental complaint management
- 🍃 Nature-inspired UI design with forest and ocean gradients
- 🌳 Sustainability-focused messaging and branding
- 🌊 Professional environmental color palette

- **Multilingual Support**: Support for 22+ Indian languages using Bhashini API
- **AI-Powered Verification**: CNN-based image validation to filter fake complaints
- **Emotion & Sentiment Analysis**: DistilBERT for understanding complaint urgency
- **Location-Based Prioritization**: Proximity scoring for sensitive areas
- **Real-Time Heatmaps**: Live complaint visualization using Mapbox
- **Role-Based Dashboards**: Separate interfaces for citizens and administrators
- **AI Chatbot Integration**: Civic information and support assistant

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Native  │    │   Node.js API   │    │    Supabase     │
│    Frontend     │◄──►│    Backend      │◄──►│    Database     │
│   (Expo CLI)    │    │   (Express.js)  │    │   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Tech Stack

**Frontend:**
- React Native with Expo
- React Navigation
- Supabase JS Client
- AsyncStorage for local storage

**Backend:**
- Node.js with Express.js
- Supabase for database and authentication
- JWT for session management
- Multer for file uploads

**Database:**
- Supabase (PostgreSQL)
- Row Level Security (RLS)
- Real-time subscriptions

**Future Integrations:**
- Bhashini API (Multilingual)
- TensorFlow Lite (AI Verification)
- Mapbox (Heatmaps)
- Hugging Face (NLP)

## 📁 Project Structure

```
CIVIC-REZO/
├── civic-rezo-frontend/          # React Native App
│   ├── src/
│   │   └── screens/
│   │       ├── auth/            # Login/Signup screens
│   │       ├── citizen/         # Citizen dashboard
│   │       └── admin/           # Admin dashboard
│   ├── config/
│   │   └── supabase.js         # Database configuration
│   └── App.js                  # Main navigation
│
├── civic-rezo-backend/          # Node.js API
│   ├── routes/
│   │   ├── auth.js             # Authentication routes
│   │   ├── complaints.js       # Complaint management
│   │   └── admin.js            # Admin operations
│   ├── server.js               # Main server file
│   └── .env                    # Environment variables
│
└── database-schema.sql          # Supabase database schema
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CIVIC-REZO
   ```

2. **Set up the backend**
   ```bash
   cd civic-rezo-backend
   npm install
   
   # Configure environment variables
   cp .env.example .env
   # Edit .env with your Supabase credentials
   
   # Start the backend server
   npm run dev
   ```

3. **Set up the database**
   - Open your Supabase project dashboard
   - Go to SQL Editor
   - Run the contents of `database-schema.sql`

4. **Set up the frontend**
   ```bash
   cd civic-rezo-frontend
   npm install
   
   # Start the Expo development server
   npx expo start
   ```

### Environment Variables

Create a `.env` file in the backend directory:

```env
NODE_ENV=development
PORT=5000
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
JWT_SECRET=your-jwt-secret
```

## 📱 Features Implementation Status

### ✅ Completed
- [x] User authentication (login/signup)
- [x] Role-based access (citizen/admin)
- [x] Supabase integration
- [x] Basic dashboard interfaces
- [x] Database schema design
- [x] API structure setup

### 🚧 In Progress
- [ ] Complaint submission with image upload
- [ ] AI image verification (CNN model)
- [ ] Multilingual support (Bhashini integration)
- [ ] Emotion analysis (DistilBERT)
- [ ] Location-based prioritization
- [ ] Real-time heatmaps (Mapbox)
- [ ] Push notifications
- [ ] AI chatbot integration

### 📋 Planned
- [ ] Advanced admin analytics
- [ ] Escalation workflows
- [ ] Complaint tracking system
- [ ] Department assignment
- [ ] Mobile app optimization
- [ ] Voice input support

## 🎨 UI/UX Design

### Color Scheme
- **Primary Green**: `#2E7D32` (Citizen theme)
- **Primary Blue**: `#1976D2` (Admin theme)
- **Success**: `#4CAF50`
- **Warning**: `#FF9800`
- **Error**: `#F44336`
- **Background**: `#F5F5F5`

### User Flows

1. **Citizen Journey**
   - Sign up/Login → Dashboard → Submit Complaint → Track Status

2. **Admin Journey**
   - Login → Dashboard → Review Complaints → Assign/Resolve → Analytics

## 🗄️ Database Schema

The database includes the following main tables:
- `users` - User authentication and profiles
- `complaints` - Complaint details and metadata
- `complaint_votes` - Citizen voting on complaint importance
- `complaint_updates` - Status change tracking
- `notifications` - User notifications
- `departments` - Municipal departments

## 🔐 Security Features

- JWT-based authentication
- Row Level Security (RLS) in Supabase
- Input validation and sanitization
- CORS protection
- Environment variable protection

## 🚀 Deployment

### Backend Deployment
- Can be deployed on platforms like Heroku, Railway, or Vercel
- Environment variables must be configured in production

### Frontend Deployment
- Build using `expo build`
- Deploy to Google Play Store / Apple App Store
- Or use Expo's web build for browser access

## 📊 Future Enhancements

1. **AI Integration**
   - Advanced image recognition for complaint categorization
   - Natural language processing for priority detection
   - Predictive analytics for resource allocation

2. **IoT Integration**
   - Smart sensor data integration
   - Automated complaint generation
   - Real-time environmental monitoring

3. **Blockchain**
   - Transparent complaint tracking
   - Immutable resolution records
   - Decentralized voting mechanisms

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Team REZO

- **Team Leader**: Vimalharihar Kumar
- **Project**: CivicStack - Urban Feedback Systems
- **Hackathon**: Hack for Governance & Public Systems

## 📞 Support

For support and queries, please contact:
- Email: support@civicstack.com
- GitHub Issues: [Create an issue](https://github.com/your-repo/issues)

---

*Built with ❤️ for better civic governance in India*
