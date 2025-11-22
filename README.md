# Banking Website

A full-stack banking website built with Node.js, Express, React, Tailwind CSS, and MongoDB Atlas.

## Features

- 🔐 User Authentication (Register/Login with JWT)
- 👤 Admin Panel with user management
- 💰 Account Management
- 💸 Deposit & Withdrawal
- 🔄 Money Transfer between accounts
- 📊 Transaction History & Monitoring
- 🔐 Biometric Authentication for high-value transactions
- 🎨 Modern UI with Tailwind CSS
- 🔒 Secure password hashing with bcrypt
- ☁️ MongoDB Atlas cloud database

## Quick Setup

### 1. Database & Admin Setup
```bash
cd backend
npm run setup
```
This command will:
- Update existing users with proper role fields
- Create an admin account
- Display database statistics

### 2. Admin Credentials
- **Email**: `admin@securebank.com`
- **Password**: `admin123`
- **Admin Portal**: `http://localhost:3000/admin/login`

### 3. Start the Application
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend  
cd frontend
npm start
```

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14 or higher)
- npm or yarn
- MongoDB Atlas account (free tier available)

## MongoDB Atlas Setup

1. **Create a MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Sign up for a free account

2. **Create a Cluster**
   - Click "Build a Database"
   - Choose the FREE shared cluster
   - Select your preferred cloud provider and region
   - Click "Create Cluster"

3. **Configure Database Access**
   - Go to "Database Access" in the left sidebar
   - Click "Add New Database User"
   - Choose authentication method (Username and Password)
   - Create a username and secure password
   - Set user privileges to "Read and write to any database"
   - Click "Add User"

4. **Configure Network Access**
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"
   - For development, click "Allow Access from Anywhere" (0.0.0.0/0)
   - For production, add your specific IP addresses
   - Click "Confirm"

5. **Get Connection String**
   - Go to "Database" in the left sidebar
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string (it looks like: `mongodb+srv://<username>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority`)
   - Replace `<username>` with your database username
   - Replace `<password>` with your database password

## Installation

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```bash
cp .env.example .env
```

4. Edit the `.env` file with your configuration:
```env
PORT=5000
MONGODB_URI=mongodb+srv://your-username:your-password@cluster.mongodb.net/bankingdb?retryWrites=true&w=majority
JWT_SECRET=your_secure_random_string_here
NODE_ENV=development
```

**Important:** 
- Replace the MongoDB URI with your actual connection string from MongoDB Atlas
- Change `JWT_SECRET` to a long, random string for security
- Never commit the `.env` file to version control

5. Start the backend server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the React development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Project Structure

```
Banking-Website/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js     # Authentication logic
│   │   └── transactionController.js  # Transaction logic
│   ├── middleware/
│   │   └── auth.js               # JWT authentication middleware
│   ├── models/
│   │   ├── User.js               # User schema
│   │   └── Transaction.js        # Transaction schema
│   ├── routes/
│   │   ├── authRoutes.js         # Auth endpoints
│   │   └── transactionRoutes.js  # Transaction endpoints
│   ├── .env.example              # Environment variables template
│   ├── .gitignore
│   ├── package.json
│   └── server.js                 # Express server entry point
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.js         # Navigation component
    │   │   └── PrivateRoute.js   # Protected route wrapper
    │   ├── context/
    │   │   └── AuthContext.js    # Authentication context
    │   ├── pages/
    │   │   ├── Login.js          # Login page
    │   │   ├── Register.js       # Registration page
    │   │   ├── Dashboard.js      # Main dashboard
    │   │   ├── Transactions.js   # Transaction history
    │   │   └── Transfer.js       # Money transfer page
    │   ├── App.js                # Main app component
    │   ├── index.css             # Tailwind CSS styles
    │   └── index.js              # React entry point
    ├── .gitignore
    ├── package.json
    ├── postcss.config.js
    └── tailwind.config.js
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)

### Transactions
- `GET /api/transactions` - Get all transactions (protected)
- `POST /api/transactions/deposit` - Deposit money (protected)
- `POST /api/transactions/withdraw` - Withdraw money (protected)
- `POST /api/transactions/transfer` - Transfer money (protected)

## Usage

1. **Register an Account**
   - Open `http://localhost:3000/register`
   - Fill in your details (first name, last name, email, password)
   - Choose account type (Checking or Savings)
   - Click "Create account"
   - You'll receive a $1000 welcome bonus!

2. **Login**
   - Use your registered email and password
   - Click "Sign in"

3. **Dashboard**
   - View your current balance
   - See recent transactions
   - Quick deposit/withdrawal
   - Access quick actions

4. **Make a Transaction**
   - **Deposit:** Enter amount and optional description, click "Deposit"
   - **Withdraw:** Enter amount and optional description, click "Withdraw"
   - **Transfer:** Go to Transfer page, enter recipient account number, amount, and click "Send Money"

5. **View Transactions**
   - Click "Transactions" in the navigation
   - Filter by type: All, Deposits, Withdrawals, Transfers

## Security Features

- Password hashing with bcrypt
- JWT-based authentication
- Protected API routes
- Environment variables for sensitive data
- CORS enabled for frontend-backend communication

## Technologies Used

### Backend
- Node.js
- Express.js
- MongoDB & Mongoose
- JWT (JSON Web Tokens)
- bcryptjs
- dotenv
- CORS

### Frontend
- React 18
- React Router v6
- Axios
- Tailwind CSS
- Context API for state management

## Troubleshooting

### MongoDB Connection Issues
- Ensure your IP address is whitelisted in MongoDB Atlas Network Access
- Verify your username and password in the connection string
- Check that your cluster is running

### Port Already in Use
- If port 5000 or 3000 is already in use, change the PORT in `.env` (backend) or modify the React start script

### Dependencies Issues
- Delete `node_modules` folder and `package-lock.json`
- Run `npm install` again

## Future Enhancements

- Account statements/reports
- Email notifications
- Two-factor authentication
- Bill payments
- Scheduled transfers
- Mobile responsive improvements
- Dark mode

## License

MIT License

## Author

Built with ❤️ for learning purposes
