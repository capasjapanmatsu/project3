/*
  # Fix RLS Policies for pet_facilities table
  
  This migration addresses the missing RLS policies for the pet_facilities table
  which is preventing admin users from deleting facility applications.
*/

-- =====================================================
-- 1. ENABLE RLS AND CREATE ADMIN POLICIES
-- =====================================================

-- Enable RLS on pet_facilities if not already enabled
ALTER TABLE pet_facilities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "pet_facilities_select_all" ON pet_facilities;
DROP POLICY IF EXISTS "pet_facilities_owner_insert" ON pet_facilities;
DROP POLICY IF EXISTS "pet_facilities_owner_update" ON pet_facilities;
DROP POLICY IF EXISTS "pet_facilities_owner_delete" ON pet_facilities;
DROP POLICY IF EXISTS "pet_facilities_admin_all" ON pet_facilities;
DROP POLICY IF EXISTS "pet_facilities_admin_manage" ON pet_facilities;
DROP POLICY IF EXISTS "pet_facilities_public_select" ON pet_facilities;

-- =====================================================
-- 2. CREATE COMPREHENSIVE POLICIES
-- =====================================================

-- Allow public/authenticated users to view all facilities (for listings)
CREATE POLICY "pet_facilities_select_all"
  ON pet_facilities
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to insert their own facilities
CREATE POLICY "pet_facilities_owner_insert"
  ON pet_facilities
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Allow owners to update their own facilities
CREATE POLICY "pet_facilities_owner_update"
  ON pet_facilities
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Allow owners to delete their own facilities (soft delete concept)
CREATE POLICY "pet_facilities_owner_delete"
  ON pet_facilities
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- CRITICAL: Allow admins to do everything (including delete)
CREATE POLICY "pet_facilities_admin_all"
  ON pet_facilities
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type IN ('admin', 'superadmin')
    )
  );

-- =====================================================
-- 3. CREATE ADMIN UTILITY FUNCTIONS
-- =====================================================

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_pet_facilities_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND user_type IN ('admin', 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely delete pet facility (admin only)
CREATE OR REPLACE FUNCTION admin_delete_pet_facility(facility_id_param uuid)
RETURNS jsonb AS $$
DECLARE
  v_facility_exists boolean;
  v_is_admin boolean;
  v_facility_name text;
BEGIN
  -- Check if user is admin
  SELECT is_pet_facilities_admin() INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Admin permission required'
    );
  END IF;
  
  -- Check if facility exists
  SELECT EXISTS(
    SELECT 1 FROM pet_facilities WHERE id = facility_id_param
  ), name INTO v_facility_exists, v_facility_name
  FROM pet_facilities WHERE id = facility_id_param;
  
  IF NOT v_facility_exists THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Facility not found'
    );
  END IF;
  
  -- Delete related images first (if table exists)
  BEGIN
    DELETE FROM facility_images WHERE facility_id = facility_id_param;
  EXCEPTION
    WHEN undefined_table THEN
      -- Table doesn't exist, skip
      NULL;
  END;
  
  -- Delete the facility
  DELETE FROM pet_facilities WHERE id = facility_id_param;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Facility deleted successfully',
    'facility_name', v_facility_name
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', format('Error deleting facility: %s', SQLERRM)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. GRANT NECESSARY PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON pet_facilities TO authenticated;
GRANT DELETE ON pet_facilities TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- 5. VERIFICATION AND LOGGING
-- =====================================================

-- Log the successful creation of policies
DO $$
BEGIN
  RAISE NOTICE 'Pet facilities RLS policies created successfully';
  RAISE NOTICE 'Admin users can now delete pet facilities';
  RAISE NOTICE 'Facility owners can manage their own facilities';
  RAISE NOTICE 'Public users can view all facilities';
END $$; 