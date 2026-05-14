import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Express } from "express";
import { db } from "../db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";

export function setupGoogleAuth(app: Express) {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.warn("[Auth] Google/LinkedIn Client ID or Secret not found. Google Auth disabled.");
        return;
    }

    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: "/api/auth/google/callback",
                scope: ["profile", "email"],
            },
            async (_accessToken, _refreshToken, profile, done) => {
                try {
                    const email = profile.emails?.[0]?.value;
                    const googleId = profile.id;

                    if (!email) {
                        return done(new Error("No email found from Google provider"), undefined);
                    }

                    // Check if user exists by googleId or email
                    let [user] = await db
                        .select()
                        .from(users)
                        .where(eq(users.email, email))
                        .limit(1);

                    if (!user) {
                        // Create new user
                        const [newUser] = await db
                            .insert(users)
                            .values({
                                email,
                                googleId,
                                firstName: profile.name?.givenName,
                                lastName: profile.name?.familyName,
                                profileImageUrl: profile.photos?.[0]?.value,
                                authProvider: "google",
                                isEmailVerified: new Date(),
                            })
                            .returning();
                        user = newUser;
                    } else {
                        // Update existing user with googleId if missing
                        if (!user.googleId) {
                            const [updatedUser] = await db
                                .update(users)
                                .set({
                                    googleId,
                                    authProvider: user.authProvider === "email" ? "google" : user.authProvider,
                                    profileImageUrl: user.profileImageUrl || profile.photos?.[0]?.value
                                })
                                .where(eq(users.id, user.id))
                                .returning();
                            user = updatedUser;
                        }
                    }

                    return done(null, user);
                } catch (error) {
                    return done(error as Error, undefined);
                }
            }
        )
    );

    // Serialize user to session
    passport.serializeUser((user: any, done) => {
        done(null, user.id);
    });

    // Deserialize user from session
    passport.deserializeUser(async (id: string, done) => {
        try {
            const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
            done(null, user || false);
        } catch (error) {
            // Avoid crashing requests when a stale/invalid session cookie is present
            // or when the backing store has a transient issue.
            console.error("Deserialize user error:", error);
            done(null, false);
        }
    });

    // Routes
    app.get(
        "/api/auth/google",
        passport.authenticate("google", { scope: ["profile", "email"] })
    );

    app.get(
        "/api/auth/google/callback",
        passport.authenticate("google", { failureRedirect: "/sign-in" }),
        (req, res) => {
            // Successful authentication
            // Manually set the custom session user object to match customAuth.ts
            const user = req.user as any;
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

            res.redirect("/");
        }
    );
}
