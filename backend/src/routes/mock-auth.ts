import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { mockUsers } from '../mock/data';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'demo-refresh-secret';

// Register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, firstName, lastName } = req.body;
  
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({
      success: false,
      error: 'All fields are required',
    });
  }
  
  if (mockUsers.has(email)) {
    return res.status(409).json({
      success: false,
      error: 'Email already registered',
    });
  }
  
  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: `user-${Date.now()}`,
    email,
    passwordHash,
    firstName,
    lastName,
    role: 'CUSTOMER',
    isActive: true,
    isEmailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  mockUsers.set(email, user);
  
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  const refreshToken = jwt.sign(
    { userId: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  );
  
  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      accessToken,
      refreshToken,
    },
  });
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required',
    });
  }
  
  const user = mockUsers.get(email);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials',
    });
  }
  
  const isValid = await bcrypt.compare(password, user.passwordHash);
  
  if (!isValid) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials',
    });
  }
  
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  const refreshToken = jwt.sign(
    { userId: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  );
  
  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      accessToken,
      refreshToken,
    },
  });
});

// Refresh token
router.post('/refresh', (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: 'Refresh token required',
    });
  }
  
  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
    
    // Find user
    let foundUser = null;
    for (const user of mockUsers.values()) {
      if (user.id === decoded.userId) {
        foundUser = user;
        break;
      }
    }
    
    if (!foundUser) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
      });
    }
    
    const accessToken = jwt.sign(
      { userId: foundUser.id, email: foundUser.email, role: foundUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    const newRefreshToken = jwt.sign(
      { userId: foundUser.id },
      JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );
    
    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch {
    return res.status(401).json({
      success: false,
      error: 'Invalid refresh token',
    });
  }
});

// Logout
router.post('/logout', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

// Get current user
router.get('/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated',
    });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    let foundUser = null;
    for (const user of mockUsers.values()) {
      if (user.id === decoded.userId) {
        foundUser = user;
        break;
      }
    }
    
    if (!foundUser) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
      });
    }
    
    res.json({
      success: true,
      data: {
        id: foundUser.id,
        email: foundUser.email,
        firstName: foundUser.firstName,
        lastName: foundUser.lastName,
        role: foundUser.role,
      },
    });
  } catch {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }
});

export default router;

