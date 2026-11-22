import type { Request, Response, NextFunction } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { supabase } from "../libs/db.js";



const COLUMNS = "id, clerk_user_id, nome, email";


export const requireUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({ status: "fail", error: "unauthorized" });
  }

  const { data: existing, error: selectError } = await supabase
    .from("usuarios")
    .select(COLUMNS)
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (selectError) {
    console.error("requireUser select error:", selectError);
    return res.status(500).json({ status: "fail", error: selectError.message });
  }

  if(existing) {
    res.locals.usuario = existing;
    return next();
  }

  const clerkUser = await clerkClient.users.getUser(userId);

  const email = clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ?? null;

  const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;

  const { data: created, error: upsertError } = await supabase
    .from("usuarios")
    .upsert(
      {
        clerk_user_id: userId,
        nome: name,
        email,
      },
      { onConflict: "clerk_user_id" },
    )
    .select(COLUMNS)
    .single();

    if (upsertError) {
      console.error("requireUser upsert error:", upsertError);
      return res.status(500).json({ status: "fail", error: upsertError.message });
    }

    res.locals.usuario = created;
    next();
}
