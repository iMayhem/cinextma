import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/utils/db";
import { getCurrentUser } from "@/utils/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ history: [] });
    }

    const db = getDb();
    const history = db
      .prepare(
        `SELECT id, media_type, tmdb_id, title, poster_path, backdrop_path, season, episode, episode_title, watched_at
         FROM watch_history
         WHERE user_id = ?
         ORDER BY watched_at DESC
         LIMIT 100`,
      )
      .all(user.userId);

    return NextResponse.json({ history });
  } catch (error: any) {
    console.error("Get history error:", error);
    return NextResponse.json({ history: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const {
      media_type,
      tmdb_id,
      title,
      poster_path = null,
      backdrop_path = null,
      season = null,
      episode = null,
      episode_title = null,
    } = body;

    if (!media_type || !tmdb_id || !title) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 },
      );
    }

    const db = getDb();

    // Check if an existing entry exists for this media (and season/episode if TV)
    let existing;
    if (media_type === "tv" && season && episode) {
      existing = db
        .prepare(
          "SELECT id FROM watch_history WHERE user_id = ? AND media_type = ? AND tmdb_id = ? AND season = ? AND episode = ?",
        )
        .get(user.userId, media_type, tmdb_id, season, episode) as { id: number } | undefined;
    } else {
      existing = db
        .prepare(
          "SELECT id FROM watch_history WHERE user_id = ? AND media_type = ? AND tmdb_id = ? AND season IS NULL",
        )
        .get(user.userId, media_type, tmdb_id) as { id: number } | undefined;
    }

    if (existing) {
      // Update watched_at
      db.prepare(
        "UPDATE watch_history SET watched_at = CURRENT_TIMESTAMP, title = ?, poster_path = ?, backdrop_path = ?, episode_title = ? WHERE id = ?",
      ).run(title, poster_path, backdrop_path, episode_title, existing.id);
    } else {
      // Insert new
      db.prepare(
        `INSERT INTO watch_history (user_id, media_type, tmdb_id, title, poster_path, backdrop_path, season, episode, episode_title, watched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      ).run(
        user.userId,
        media_type,
        tmdb_id,
        title,
        poster_path,
        backdrop_path,
        season,
        episode,
        episode_title,
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Save history error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const db = getDb();

    if (id) {
      db.prepare("DELETE FROM watch_history WHERE id = ? AND user_id = ?").run(id, user.userId);
    } else {
      db.prepare("DELETE FROM watch_history WHERE user_id = ?").run(user.userId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete history error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
