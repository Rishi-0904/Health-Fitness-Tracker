# 🚀 FitTrack Setup Guide

## Quick Start

### 1. Install Dependencies

**Backend:**
```bash
cd server
npm install
```

**Frontend:**
```bash
cd client
npm install
```

### 2. Database Setup

```bash
cd server
npm run prisma:generate
npm run prisma:migrate
```

### 3. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000
- **API Health Check**: http://localhost:4000/health

## 🎯 What You Get

### ✅ Complete Features
- **User Authentication** - Register, login, secure JWT tokens
- **Dashboard** - Interactive overview with charts and quick stats
- **Workout Tracking** - 14+ exercise types with intensity levels
- **Nutrition Monitoring** - Meal logging with macro tracking
- **Sleep Analysis** - Sleep quality and pattern tracking
- **Daily Metrics** - Steps, calories, water intake logging
- **Goals System** - Create and track custom fitness goals
- **Wearable Integration** - Mock integration with popular devices
- **Analytics & AI** - Smart recommendations and insights
- **Achievement System** - Badges and milestone celebrations

### 🎨 Modern UI Features
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Interactive Charts** - Beautiful data visualizations with Recharts
- **Modern Styling** - Clean, professional CSS with smooth animations
- **Loading States** - Proper loading indicators and error handling
- **Form Validation** - Client and server-side validation

### 🔧 Technical Features
- **RESTful API** - Well-structured backend with proper error handling
- **Database ORM** - Prisma with SQLite (easily switchable to PostgreSQL)
- **Security** - Password hashing, JWT tokens, input validation
- **Code Quality** - ESLint, proper error handling, async/await patterns

## 📊 API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login  
- `GET /auth/me` - Get current user profile

### Health Data
- `GET/POST /metrics` - Daily health metrics
- `GET/POST /workouts` - Workout logging and history
- `GET/POST /meals` - Nutrition and meal tracking
- `GET/POST /sleep` - Sleep session logging
- `GET/POST /wearables` - Wearable device sync

### Advanced Features
- `GET /analytics/dashboard` - Comprehensive user analytics
- `GET /analytics/recommendations` - AI-powered recommendations
- `GET /analytics/achievements` - User achievement system
- `GET/POST /goals` - Goal management system

## 🎮 Demo Data

The application includes:
- **Food Database** - 10+ common foods with nutritional data
- **Workout Types** - 14 different exercise categories
- **Goal Templates** - 8 pre-built goal templates
- **Mock Wearables** - 8 popular fitness device integrations

## 🔒 Security Features

- **Password Hashing** - bcryptjs with salt rounds
- **JWT Authentication** - Secure token-based auth
- **Input Validation** - Zod schema validation
- **CORS Protection** - Configured for development
- **Helmet Security** - Security headers middleware

## 🎯 Next Steps

1. **Customize Goals** - Add your personal fitness goals
2. **Log Activities** - Start tracking workouts, meals, and sleep
3. **Connect Devices** - Try the wearable integration (mock data)
4. **View Analytics** - Check your progress and get AI recommendations
5. **Earn Achievements** - Complete milestones to unlock badges

## 🛠️ Development Notes

### Database Schema
The app uses a comprehensive schema with:
- Users with authentication
- Daily metrics tracking
- Workout logs with intensity
- Meal logs with macronutrients
- Sleep sessions with quality ratings
- Wearable sync history
- Goals with progress tracking

### Frontend Architecture
- **React 18** with modern hooks
- **Context API** for state management
- **React Router** for navigation
- **Axios** for API calls
- **Recharts** for data visualization

### Backend Architecture
- **Express.js** with middleware
- **Prisma ORM** with SQLite
- **Zod** for validation
- **JWT** for authentication
- **Async/await** patterns throughout

## 🎨 Customization

### Adding New Features
1. **New API Endpoint**: Add route in `/server/src/routes/`
2. **New Page**: Add component in `/client/src/pages/`
3. **New Chart**: Use Recharts components
4. **New Goal Type**: Add to goal templates

### Styling
- Modify `/client/src/styles/main.css`
- CSS variables for easy theming
- Responsive breakpoints included

### Database Changes
1. Update `/server/prisma/schema.prisma`
2. Run `npm run prisma:migrate`
3. Update API routes accordingly

## 🚀 Production Deployment

### Environment Variables
Create `.env` in server directory:
```
PORT=4000
CLIENT_URL=https://your-frontend-domain.com
JWT_SECRET=your-super-secret-jwt-key
DATABASE_URL="your-production-database-url"
```

### Build Commands
```bash
# Frontend
cd client
npm run build

# Backend (if needed)
cd server
npm start
```

## 🎉 Congratulations!

You now have a fully functional, modern fitness tracking application with:
- ✅ Complete user authentication
- ✅ Comprehensive health tracking
- ✅ Beautiful data visualizations  
- ✅ AI-powered insights
- ✅ Goal management system
- ✅ Achievement badges
- ✅ Responsive design
- ✅ Production-ready code

**Happy tracking! 🏃‍♂️💪**
