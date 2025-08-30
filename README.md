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

## 🏗️ Architecture

### Frontend (React Native + Expo)
- **Location:** `civic-rezo-frontend/`
- **Technology:** React Native, Expo, React Navigation
- **Features:** Environmental theme, separate citizen and admin portals
- **UI:** Nature-inspired gradients, professional Ionicons, responsive design

### Backend (Node.js + Express)
- **Location:** `civic-rezo-backend/`
- **Technology:** Node.js, Express, JWT Authentication
- **Features:** RESTful API, User management, Complaint processing

### Database (Supabase)
- **Technology:** PostgreSQL with Row Level Security
- **Features:** Real-time subscriptions, File storage, Authentication
- **Schema:** `supabase-schema-complete.sql`

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Goldmauler/IIT-Delhi.git
   cd IIT-Delhi
   ```

2. **Set up the backend**
   ```bash
   cd civic-rezo-backend
   npm install
   cp .env.example .env
   # Edit .env with your Supabase credentials
   npm start
   ```

3. **Set up the frontend**
   ```bash
   cd civic-rezo-frontend
   npm install
   npx expo start
   ```

4. **Set up the database**
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Copy and run the contents of `supabase-schema-complete.sql`

### Environment Variables

#### Backend (.env)
```env
SUPABASE_URL=https://edragfuoklcgdgtospuq.supabase.co
SUPABASE_KEY=your_supabase_key
JWT_SECRET=your_jwt_secret
PORT=3001
```

#### Frontend (.env)
```env
EXPO_PUBLIC_API_URL=http://YOUR_IP:3001
EXPO_PUBLIC_SUPABASE_URL=https://edragfuoklcgdgtospuq.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

## 🌟 Features

### ✅ Implemented Features
- **Environmental Theme** - Complete nature-inspired UI redesign
- **User Authentication** - Separate portals for citizens and admins
- **EcoReports Dashboard** - Environmental-focused citizen interface
- **EcoAdmin Portal** - Administrative environmental management
- **Password Visibility** - Enhanced security UX
- **Gradient Design** - Professional forest and ocean themes
- **Responsive Layout** - Proper alignment and spacing
- **Icon Integration** - Professional Ionicons throughout

### 🔄 Planned AI Features
- **Image Verification** - CNN model for fake complaint detection
- **Emotion Analysis** - DistilBERT for urgency detection
- **Multilingual Support** - Bhashini API integration
- **Priority Scoring** - Combined AI metrics for complaint ranking
- **Real-time Heatmaps** - Mapbox integration for complaint visualization

## 📂 Project Structure

```
IIT-Delhi/
├── civic-rezo-frontend/          # React Native app
│   ├── src/
│   │   ├── components/           # Reusable components
│   │   ├── screens/              # Screen components
│   │   │   ├── auth/             # Authentication screens
│   │   │   ├── citizen/          # Citizen portal
│   │   │   └── admin/            # Admin portal
│   │   ├── theme/                # Environmental theme
│   │   │   └── EnvironmentalTheme.js
│   │   └── utils/                # Utility functions
│   ├── App.js                    # Main app entry point
│   └── package.json
├── civic-rezo-backend/           # Node.js API
│   ├── src/
│   │   ├── controllers/          # Route controllers
│   │   ├── middleware/           # Express middleware
│   │   ├── routes/               # API routes
│   │   └── utils/                # Utility functions
│   ├── server.js                 # Server entry point
│   └── package.json
├── supabase-schema-complete.sql  # Database schema
├── environmental-theme-report.md # Theme documentation
└── README.md                     # This file
```

## 🎨 Environmental Theme

### Color Palette
- **Primary:** Forest greens (#2E7D32, #60AD5E, #1B5E20)
- **Secondary:** Ocean blues (#0277BD, #58A5F0, #01579B)
- **Accents:** Earth tones (amber, teal, lime)
- **Neutrals:** Natural stone-inspired grays

### Components
- **Citizen Dashboard:** "EcoReports" portal with environmental actions
- **Admin Dashboard:** "EcoAdmin" control with governance tools
- **Authentication:** Environmental gradients and professional styling
- **Theme System:** Centralized design tokens for consistency

## 🛠️ Development Commands

### Backend
```bash
cd civic-rezo-backend
npm start          # Start development server
npm test           # Run tests
npm run lint       # Lint code
```

### Frontend
```bash
cd civic-rezo-frontend
npx expo start     # Start Expo development server
npx expo start --web  # Start web version
npm test           # Run tests
```

## 📊 Current Status

- ✅ Backend API with authentication
- ✅ React Native frontend with environmental theme
- ✅ Database schema with proper relationships
- ✅ Separate citizen and admin portals
- ✅ Enhanced UI with professional design
- ✅ Password visibility and security features
- ✅ Responsive design with proper alignment
- 🔄 AI integration in progress
- 🔄 Real-time features planned

## 🎯 Roadmap

### Phase 1: Core Platform ✅
- User authentication and authorization
- Basic complaint CRUD operations
- Dashboard interfaces
- Environmental theme implementation

### Phase 2: AI Integration 🔄
- Image verification using CNN
- Emotion analysis with DistilBERT
- Priority scoring algorithm
- Multilingual support with Bhashini

### Phase 3: Advanced Features 📋
- Real-time heatmaps with Mapbox
- Push notifications
- Advanced analytics
- Mobile app deployment

## 🤝 Collaboration

### Git Workflow
1. Create feature branches for new features
2. Commit regularly with descriptive messages
3. Pull requests for code review before merging
4. Keep main branch stable and deployable

### Commit Convention
```
feat: add citizen dashboard
fix: resolve login authentication issue
docs: update README with setup instructions
style: improve environmental theme UI
```

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Team

- **Developer:** kirankishoreV-07
- **GitHub:** Goldmauler
- **Institution:** IIT Delhi

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact: kirankishoreV-07

---

**Built with 🌱 for better environmental governance and civic responsibility**
