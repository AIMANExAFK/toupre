import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const URL  = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? "";
const KEY  = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

/*
  ── SQL à exécuter dans Supabase > SQL Editor ─────────────────────────────
  (une seule fois, pour créer les tables)

  -- Profils utilisateurs (extension de auth.users)
  CREATE TABLE public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT,
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Public profiles viewable" ON public.profiles FOR SELECT USING (true);
  CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

  -- Trigger: crée un profil à chaque inscription
  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
  BEGIN
    INSERT INTO public.profiles (id, name, avatar_url)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'avatar_url');
    RETURN NEW;
  END;
  $$;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

  -- Annonces
  CREATE TABLE public.listings (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title         TEXT NOT NULL,
    description   TEXT,
    category      TEXT,
    price_per_day NUMERIC(10,2),
    photos        TEXT[],
    location      JSONB,
    created_at    TIMESTAMPTZ DEFAULT NOW()
  );
  ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Anyone can read listings"  ON public.listings FOR SELECT USING (true);
  CREATE POLICY "Owner can insert listings" ON public.listings FOR INSERT WITH CHECK (auth.uid() = owner_id);
  CREATE POLICY "Owner can update listings" ON public.listings FOR UPDATE USING (auth.uid() = owner_id);
  CREATE POLICY "Owner can delete listings" ON public.listings FOR DELETE USING (auth.uid() = owner_id);

  -- Réservations
  CREATE TABLE public.bookings (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id   UUID REFERENCES public.listings(id) ON DELETE SET NULL,
    user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    start_date   DATE,
    end_date     DATE,
    days         INT,
    total_price  NUMERIC(10,2),
    service_fee  NUMERIC(10,2),
    status       TEXT DEFAULT 'pending',
    created_at   TIMESTAMPTZ DEFAULT NOW()
  );
  ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users see own bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "Users insert own bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
  ─────────────────────────────────────────────────────────────────────────
*/

const ExpoSecureStoreAdapter =
  Platform.OS === "web"
    ? undefined
    : {
        getItem:    (key: string) => SecureStore.getItemAsync(key),
        setItem:    (key: string, value: string) => SecureStore.setItemAsync(key, value),
        removeItem: (key: string) => SecureStore.deleteItemAsync(key),
      };

export const supabase = createClient(URL, KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
  },
});
