import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/utils/db";
import { hashPassword, signToken, COOKIE_NAME } from "@/utils/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return NextResponse.json(
        { success: false, message: "Username must be at least 3 characters long" },
        { status: 400 },
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters long" },
        { status: 400 },
      );
    }

    const cleanUsername = username.trim();
    const db = getDb();

    // Check if username already exists
    const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(cleanUsername);
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Username is already taken" },
        { status: 409 },
      );
    }

    // Hash password and insert
    const passwordHash = await hashPassword(password);
    const result = db
      .prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
      .run(cleanUsername, passwordHash);

    const userId = Number(result.lastInsertRowid);
    const token = signToken({ userId, username: cleanUsername });

    const response = NextResponse.json({
      success: true,
      user: { id: userId, username: cleanUsername },
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
