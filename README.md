# 🏃‍♂️ FitTrack - Health & Fitness Tracker

A comprehensive full-stack health and fitness tracking application built with React, Node.js, and modern web technologies. Track your workouts, nutrition, sleep, and health metrics with beautiful visualizations and AI-powered insights.

## ✨ Features

### 🎯 Core Functionality
- **Dashboard Overview** - Interactive dashboard with real-time health metrics
- **Workout Tracking** - Log and analyze various exercise types with duration and intensity
- **Nutrition Monitoring** - Track meals, calories, and macronutrients with food suggestions
- **Sleep Analysis** - Monitor sleep patterns, quality, and consistency
- **Daily Metrics** - Record steps, calories, water intake, and other health indicators
- **Wearable Integration** - Connect with popular fitness devices and apps

### 🚀 Advanced Features
- **AI Recommendations** - Personalized suggestions based on your activity patterns
- **Goal Setting** - Create and track custom fitness and health goals
- **Achievement System** - Earn badges and celebrate milestones
- **Analytics & Insights** - Detailed trends and progress analysis
- **Responsive Design** - Beautiful UI that works on all devices
- **Dark/Light Theme** - Customizable appearance (coming soon)

### 📊 Data Visualization
- Interactive charts and graphs using Recharts
- Weekly and monthly progress tracking
- Macro nutrient breakdowns
- Sleep quality trends
- Workout distribution analysis

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks and context
- **Vite** - Fast build tool and development server
- **React Router** - Client-side routing
- **Recharts** - Beautiful, responsive charts
- **Lucide React** - Modern icon library
- **Framer Motion** - Smooth animations
- **CSS3** - Custom styling with CSS variables

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **Prisma** - Modern database toolkit and ORM
- **SQLite** - Lightweight database (easily switchable)
- **JWT** - Secure authentication
- **Zod** - Schema validation
- **bcryptjs** - Password hashing

### DevOps & Tools
- **ESLint** - Code linting
- **Nodemon** - Development server auto-restart
- **CORS** - Cross-origin resource sharing
- **Helmet** - Security middleware
- **Morgan** - HTTP request logging

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Health-Fitness-Tracker
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Set up environment variables**
   ```bash
   cd ../server
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Initialize the database**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

6. **Start the development servers**

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

7. **Open your browser**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:4000

## 📁 Project Structure

```
Health-Fitness-Tracker/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── state/         # Context and state management
│   │   ├── api/           # API client configuration
│   │   ├── styles/        # CSS styles
│   │   └── main.jsx       # Application entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   ├── middleware/    # Express middleware
│   │   ├── utils/         # Utility functions
│   │   ├── config/        # Configuration files
│   │   └── index.js       # Server entry point
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   ├── package.json
│   └── .env               # Environment variables
│
└── README.md
```

## 🔧 API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user

### Health Data
- `GET/POST /metrics` - Daily health metrics
- `GET/POST /workouts` - Workout logs
- `GET/POST /meals` - Meal and nutrition data
- `GET/POST /sleep` - Sleep session tracking
- `GET/POST /wearables` - Wearable device sync

### Analytics & Goals
- `GET /analytics/dashboard` - Comprehensive analytics
- `GET /analytics/recommendations` - AI recommendations
- `GET /analytics/achievements` - User achievements
- `GET/POST /goals` - Goal management

## 🎨 Features in Detail

### Dashboard
- Real-time health metrics overview
- Quick action buttons for logging data
- Recent activity feed
- Progress indicators with goal tracking
- Interactive charts showing weekly trends

### Workout Tracking
- Support for 14+ workout types
- Intensity levels (light, moderate, vigorous)
- Automatic calorie burn estimation
- Workout history and statistics
- Exercise type distribution analysis

### Nutrition Monitoring
- Comprehensive meal logging
- Macro nutrient tracking (protein, carbs, fat)
- Food suggestion database
- Daily nutrition goals and progress
- Meal type distribution (breakfast, lunch, dinner, snacks)

### Sleep Analysis
- Sleep session logging with start/end times
- Sleep quality rating system
- Interruption tracking
- Sleep consistency scoring
- Optimal sleep range indicators

### Wearable Integration
- Support for major fitness platforms:
  - Fitbit
  - Apple Health
  - Google Fit
  - Garmin
  - Samsung Health
  - Polar
  - Strava
  - MyFitnessPal
- Automatic data synchronization
- Sync history and status tracking

### Goal System
- Customizable goal templates
- Progress tracking with visual indicators
- Goal categories (Health, Fitness, Cardio, etc.)
- Achievement milestones
- Goal completion celebrations

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Input validation with Zod schemas
- CORS protection
- Helmet security middleware
- Environment variable protection

## 🎯 Future Enhancements

- [ ] Social features and friend challenges
- [ ] Nutrition barcode scanning
- [ ] Workout video integration
- [ ] Advanced AI coaching
- [ ] Mobile app (React Native)
- [ ] Offline data synchronization
- [ ] Export data functionality
- [ ] Integration with healthcare providers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Recharts for beautiful data visualizations
- Prisma for excellent database tooling
- Lucide for clean, modern icons
- The React and Node.js communities

---

**Built with ❤️ for health and fitness enthusiasts**
