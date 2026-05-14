import { Express, RequestHandler } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { db } from "../db";
import { users } from "@shared/models/auth";
import { eq, or } from "drizzle-orm";

const SALT_ROUNDS = 10;

// Validation schemas
const registerSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
}).refine(data => data.email || data.phone, {
  message: "Either email or phone is required"
});

const loginSchema = z.object({
  identifier: z.string().min(1, "Email or phone is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});

export function setupCustomAuth(app: Express) {
  // Register endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: validation.error.errors[0].message
        });
      }

      const { email, phone, password, firstName, lastName } = validation.data;

      // Check if user already exists
      const existingUser = await db.select().from(users).where(
        email
          ? eq(users.email, email)
          : phone
            ? eq(users.phone, phone)
            : eq(users.email, "")
      ).limit(1);

      if (existingUser.length > 0) {
        return res.status(400).json({
          message: "An account with this email or phone already exists"
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      // Create user
      const [newUser] = await db.insert(users).values({
        email: email || null,
        phone: phone || null,
        password: hashedPassword,
        firstName,
        lastName: lastName || null,
        authProvider: "email",
      }).returning();

      // Log the user in
      (req as any).session.userId = newUser.id;
      (req as any).session.user = {
        id: newUser.id,
        email: newUser.email,
        phone: newUser.phone,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        profileImageUrl: newUser.profileImageUrl,
        authProvider: newUser.authProvider,
      };

      res.status(201).json({
        message: "Account created successfully",
        user: {
          id: newUser.id,
          email: newUser.email,
          phone: newUser.phone,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          profileImageUrl: newUser.profileImageUrl,
        }
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: validation.error.errors[0].message
        });
      }

      const { identifier, password, rememberMe } = validation.data;

      // Find user by email or phone
      const [user] = await db.select().from(users).where(
        or(
          eq(users.email, identifier),
          eq(users.phone, identifier)
        )
      ).limit(1);

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.password) {
        return res.status(401).json({
          message: "This account does not have a password set. Please contact support."
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set session with extended expiry if rememberMe
      if (rememberMe) {
        (req as any).session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      }

      (req as any).session.userId = user.id;
      (req as any).session.user = {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        authProvider: user.authProvider,
      };


      res.json({
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", async (req, res) => {
    try {
      (req as any).session.destroy((err: any) => {
        if (err) {
          return res.status(500).json({ message: "Logout failed" });
        }
        res.clearCookie('connect.sid');
        res.json({ message: "Logged out successfully" });
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  // Get current user endpoint
  app.get("/api/auth/me", async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      if (sessionUser) {
        return res.json(sessionUser);
      }

      res.status(401).json({ message: "Not authenticated" });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Also serve on /api/auth/user for backward compatibility with client
  app.get("/api/auth/user", async (req, res) => {
    try {
      console.log("[DEBUG /api/auth/user] Session exists:", !!req.session);
      console.log("[DEBUG /api/auth/user] Session ID:", req.sessionID);
      console.log("[DEBUG /api/auth/user] Session user:", (req as any).session?.user);
      console.log("[DEBUG /api/auth/user] Session userId:", (req as any).session?.userId);
      
      const sessionUser = (req as any).session?.user;
      if (sessionUser) {
        return res.json(sessionUser);
      }

      res.status(401).json({ message: "Not authenticated" });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });
}

// Middleware to check if user is authenticated via session
export const isAuthenticated: RequestHandler = (req, res, next) => {
  const sessionUser = (req as any).session?.user;

  if (sessionUser) {
    return next();
  }

  res.status(401).json({ message: "Unauthorized" });
};
