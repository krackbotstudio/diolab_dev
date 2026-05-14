import { db } from "./server/db";
import { users } from "./shared/models/auth";
import { hashPassword } from "./server/utils/password";

async function testRegister() {
    try {
        const email = `test-${Date.now()}@example.com`;
        const password = "password123";
        const hashedPassword = await hashPassword(password);

        console.log("Attempting to insert user into DB...");
        const [newUser] = await db.insert(users).values({
            email,
            password: hashedPassword,
            firstName: "Test",
            lastName: "User",
            authProvider: "email",
        }).returning();

        console.log("Successfully created user:", newUser.id);
    } catch (err: any) {
        console.error("Registration test failed:");
        console.error(err.message || err);
        if (err.code) console.error("Error Code:", err.code);
    } finally {
        process.exit();
    }
}

testRegister();
