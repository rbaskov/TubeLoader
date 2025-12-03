import session from "express-session";
import type { Express, RequestHandler } from "express";
import { SQLiteSessionStore } from "./sqliteSessionStore";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const sessionStore = new SQLiteSessionStore({ ttl: sessionTtl });
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
}

export const requireAuth: RequestHandler = (req: any, res, next) => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  req.authUserId = userId;
  next();
};
