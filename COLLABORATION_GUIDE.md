# 🤝 CivicStack Collaboration Guide

## 📋 Project Status
✅ **Successfully pushed to GitHub:** https://github.com/Goldmauler/IIT-Delhi

## 👥 Team Setup

### Primary Developer
- **GitHub Username:** kirankishoreV-07
- **Email:** kirankishorew07@example.com
- **Repository:** https://github.com/Goldmauler/IIT-Delhi

### Adding Your Friend as Collaborator

1. **Go to GitHub Repository:** https://github.com/Goldmauler/IIT-Delhi
2. **Click "Settings" tab** (top right of repository)
3. **Click "Collaborators"** in left sidebar
4. **Click "Add people"** button
5. **Enter your friend's GitHub username**
6. **Select "Write" permission level**
7. **Send invitation**

## 🚀 Friend's Setup Instructions

### Step 1: Clone the Repository
```bash
# Clone the repository
git clone https://github.com/Goldmauler/IIT-Delhi.git
cd IIT-Delhi

# Configure Git (replace with their details)
git config user.name "YourFriendUsername"
git config user.email "friend@example.com"
```

### Step 2: Set Up Backend
```bash
cd civic-rezo-backend
npm install
cp .env.example .env
# Edit .env with your Supabase credentials:
# SUPABASE_URL=https://edragfuoklcgdgtospuq.supabase.co
# SUPABASE_KEY=your_actual_supabase_key
# JWT_SECRET=your_jwt_secret
# PORT=3001
npm start
```

### Step 3: Set Up Frontend (New Terminal)
```bash
cd civic-rezo-frontend
npm install
cp .env.example .env
# Edit .env with your network IP:
# EXPO_PUBLIC_API_URL=http://YOUR_IP:3001
# EXPO_PUBLIC_SUPABASE_URL=https://edragfuoklcgdgtospuq.supabase.co
# EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
npx expo start
```

### Step 4: Database Setup
1. Go to Supabase dashboard
2. Navigate to SQL Editor
3. Copy and run contents of `supabase-schema-complete.sql`

## 📝 Daily Collaboration Workflow

### Morning Routine
```bash
# Always start by pulling latest changes
git checkout main
git pull origin main

# Create a new feature branch
git checkout -b feature/your-feature-name
```

### During Development
```bash
# Make changes to files
# Add and commit regularly with descriptive messages
git add .
git commit -m "feat: add complaint submission form"

# Push your feature branch
git push origin feature/your-feature-name
```

### Evening Routine
```bash
# Push your feature branch if not done yet
git push origin feature/your-feature-name

# Create Pull Request on GitHub for code review
# After review and merge, update main
git checkout main
git pull origin main
git branch -d feature/your-feature-name
```

## 🎯 Commit Message Convention

### Types
- **feat:** New feature
- **fix:** Bug fix
- **docs:** Documentation changes
- **style:** UI/styling changes
- **refactor:** Code refactoring
- **test:** Adding tests

### Examples
```bash
git commit -m "feat: add environmental theme to login screen"
git commit -m "fix: resolve network connection issue on iOS"
git commit -m "style: improve dashboard card alignment"
git commit -m "docs: update setup instructions in README"
```

## 🔄 Feature Branch Strategy

### Creating Feature Branches
```bash
# For new features
git checkout -b feature/complaint-submission
git checkout -b feature/admin-analytics
git checkout -b feature/ai-integration

# For bug fixes
git checkout -b fix/login-validation
git checkout -b fix/network-timeout

# For UI improvements
git checkout -b style/environmental-theme
git checkout -b style/responsive-design
```

### Pull Request Process
1. **Create feature branch** and make changes
2. **Push feature branch** to GitHub
3. **Create Pull Request** on GitHub
4. **Add description** of changes made
5. **Request review** from teammate
6. **Address feedback** if any
7. **Merge after approval**
8. **Delete feature branch** after merge

## 🛠️ Development Areas

### Suggested Work Division

#### Person 1 (kirankishoreV-07):
- ✅ Environmental theme implementation
- ✅ Authentication system
- ✅ Dashboard interfaces
- 🔄 AI integration (Image verification, Emotion analysis)
- 🔄 Multilingual support

#### Person 2 (Friend):
- 🔄 Complaint CRUD operations
- 🔄 Real-time notifications
- 🔄 Map integration (Mapbox)
- 🔄 Advanced analytics
- 🔄 Testing and deployment

## 🚨 Conflict Resolution

### If Merge Conflicts Occur:
```bash
# Pull latest changes
git pull origin main

# If conflicts, manually edit files to resolve
# Look for <<<<<<< HEAD and >>>>>>> markers
# Keep the code you want, remove conflict markers

# After resolving conflicts
git add .
git commit -m "resolve: merge conflicts in feature"
git push origin feature/your-branch
```

## 📱 Testing Workflow

### Before Committing:
1. **Test backend:** `npm start` in `civic-rezo-backend`
2. **Test frontend:** `npx expo start` in `civic-rezo-frontend`
3. **Test on device:** Use Expo Go app on mobile
4. **Check console:** No errors in terminal
5. **Verify UI:** Environmental theme looks good

### Testing Checklist:
- [ ] Backend starts without errors
- [ ] Frontend loads on mobile device
- [ ] Authentication works (login/signup)
- [ ] Dashboard displays correctly
- [ ] Environmental theme applied
- [ ] No console errors

## 🎨 Current Features Implemented

### ✅ Completed
- Environmental theme with forest/ocean gradients
- User authentication (citizen/admin portals)
- Enhanced dashboards with professional styling
- Password visibility toggles
- Responsive design and proper alignment
- Comprehensive database schema
- Documentation and collaboration setup

### 🔄 Ready for Development
- Complaint submission and management
- Image upload functionality
- AI verification and emotion analysis
- Real-time notifications
- Map integration with hotspots
- Advanced analytics and reporting

## 📞 Communication

### For Quick Questions:
- Use GitHub Issues for bugs and feature requests
- Comment on Pull Requests for code-specific discussions
- Use commit messages for explaining changes

### Project Management:
- **GitHub Issues:** Track bugs and feature requests
- **GitHub Projects:** Organize tasks and sprints
- **Pull Requests:** Code review and discussion

## 🎯 Next Steps

1. **Your friend clones repository** and sets up environment
2. **Choose feature areas** from the development division above
3. **Create feature branches** for parallel development
4. **Regular commits and pulls** to stay synchronized
5. **Code reviews** through Pull Requests
6. **Test frequently** to catch issues early

## 🔗 Important Links

- **Repository:** https://github.com/Goldmauler/IIT-Delhi
- **Supabase Dashboard:** https://edragfuoklcgdgtospuq.supabase.co
- **Expo Documentation:** https://docs.expo.dev/
- **React Native Documentation:** https://reactnative.dev/

---

**Happy Collaborative Coding! 🌱💻**
