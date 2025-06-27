/*
  # Additional fixes for dog park approval process

  1. Improvements
    - Added missing functions for dog park approval
    - Fixed RLS policies for facility images
*/

-- 施設画像テーブルのRLSポリシーを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'dog_park_facility_images' 
    AND policyname = 'Park owners can manage their facility images'
  ) THEN
    CREATE POLICY "Park owners can manage their facility images" 
      ON dog_park_facility_images
      FOR ALL
      TO public
      USING (EXISTS (
        SELECT 1 FROM dog_parks
        WHERE dog_parks.id = dog_park_facility_images.park_id
        AND dog_parks.owner_id = auth.uid()
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM dog_parks
        WHERE dog_parks.id = dog_park_facility_images.park_id
        AND dog_parks.owner_id = auth.uid()
      ));
  END IF;
END
$$;

-- 管理者がすべての施設画像を管理できるようにするポリシー
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'dog_park_facility_images' 
    AND policyname = 'Admins can manage all facility images'
  ) THEN
    CREATE POLICY "Admins can manage all facility images" 
      ON dog_park_facility_images
      FOR ALL
      TO public
      USING ((auth.jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text)
      WITH CHECK ((auth.jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text);
  END IF;
END
$$;

-- 管理者がすべてのドッグランを管理できるようにするポリシー
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'dog_parks' 
    AND policyname = 'Admins can manage all dog parks'
  ) THEN
    CREATE POLICY "Admins can manage all dog parks" 
      ON dog_parks
      FOR ALL
      TO public
      USING ((auth.jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text)
      WITH CHECK ((auth.jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text);
  END IF;
END
$$;

-- 管理者がすべてのレビューステージを管理できるようにするポリシー
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'dog_park_review_stages' 
    AND policyname = 'Admins can manage all review stages'
  ) THEN
    CREATE POLICY "Admins can manage all review stages" 
      ON dog_park_review_stages
      FOR ALL
      TO public
      USING ((auth.jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text)
      WITH CHECK ((auth.jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text);
  END IF;
END
$$;