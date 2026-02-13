import type { Express } from "express";
import passport from "passport";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { sendEmail } from "../../resendClient";

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Don't send sensitive fields
      const { passwordHash, passwordResetToken, passwordResetExpiresAt, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Signup with email/password
  app.post("/api/auth/signup", async (req, res, next) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Validate inputs
      if (!email || !password) {
        return res.status(400).json({ message: "Correo y contraseña son obligatorios" });
      }
      if (password.length < 8) {
        return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Correo electrónico inválido" });
      }

      // Check if user already exists
      const existingUser = await authStorage.getUserByEmail(email.toLowerCase());
      if (existingUser) {
        return res.status(409).json({ message: "Ya existe una cuenta con este correo electrónico" });
      }

      // Hash password
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(password, salt);

      // Create user via upsertUser (handles admin grants, verification emails, etc.)
      const user = await authStorage.upsertUser({
        email: email.toLowerCase(),
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        passwordHash,
      });

      // Log user in immediately
      req.login(user, (err: any) => {
        if (err) {
          console.error("Login after signup failed:", err);
          return res.status(500).json({ message: "Cuenta creada, pero error al iniciar sesión" });
        }
        const { passwordHash: _, passwordResetToken, passwordResetExpiresAt, ...safeUser } = user;
        return res.status(201).json(safeUser);
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Error al crear la cuenta" });
    }
  });

  // Login with email/password
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Error interno del servidor" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Correo o contraseña incorrectos" });
      }
      req.login(user, (loginErr: any) => {
        if (loginErr) {
          console.error("Session login error:", loginErr);
          return res.status(500).json({ message: "Error al iniciar sesión" });
        }
        const { passwordHash, passwordResetToken, passwordResetExpiresAt, ...safeUser } = user;
        return res.json(safeUser);
      });
    })(req, res, next);
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Error al cerrar sesión" });
      }
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("Session destroy error:", destroyErr);
        }
        res.clearCookie("connect.sid");
        return res.json({ message: "Sesión cerrada exitosamente" });
      });
    });
  });

  // Backward-compat: GET /api/logout redirects to login page
  app.get("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.redirect("/login");
      });
    });
  });

  // Forgot password — send reset email
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "El correo es obligatorio" });
      }

      const user = await authStorage.getUserByEmail(email.toLowerCase());

      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ message: "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña" });
      }

      // Generate reset token
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await authStorage.setPasswordResetToken(user.id, token, expiresAt);

      // Send password reset email
      const baseUrl = process.env.APP_BASE_URL || "https://cogniboost.co";
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;

      await sendEmail(user.email!, "password_reset", {
        firstName: user.firstName || "estudiante",
        resetUrl,
      });

      return res.json({ message: "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Error al procesar la solicitud" });
    }
  });

  // Reset password — validate token and set new password
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ message: "Token y nueva contraseña son obligatorios" });
      }
      if (password.length < 8) {
        return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" });
      }

      const user = await authStorage.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ message: "Enlace inválido o expirado" });
      }

      // Check token expiration
      if (!user.passwordResetExpiresAt || new Date() > user.passwordResetExpiresAt) {
        await authStorage.clearPasswordResetToken(user.id);
        return res.status(400).json({ message: "El enlace ha expirado. Solicita uno nuevo." });
      }

      // Hash new password and update
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(password, salt);

      await authStorage.updatePassword(user.id, passwordHash);
      await authStorage.clearPasswordResetToken(user.id);

      return res.json({ message: "Contraseña actualizada exitosamente. Ya puedes iniciar sesión." });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Error al restablecer la contraseña" });
    }
  });
}
