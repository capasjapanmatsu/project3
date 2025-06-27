-- Create a function to handle dog park deletion with proper cascade
CREATE OR REPLACE FUNCTION delete_dog_park_with_dependencies(park_id_param uuid)
RETURNS boolean AS $$
DECLARE
  v_success boolean := false;
BEGIN
  -- Delete facility images first
  DELETE FROM dog_park_facility_images WHERE park_id = park_id_param;
  
  -- Delete review stages
  DELETE FROM dog_park_review_stages WHERE park_id = park_id_param;
  
  -- Delete park images
  DELETE FROM dog_park_images WHERE park_id = park_id_param;
  
  -- Delete the park itself
  DELETE FROM dog_parks WHERE id = park_id_param;
  
  v_success := true;
  RETURN v_success;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error deleting dog park: %', SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create an RPC function to delete a dog park safely
CREATE OR REPLACE FUNCTION delete_rejected_park(p_park_id uuid, p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_park_exists boolean;
  v_is_owner boolean;
  v_is_rejected boolean;
  v_result boolean;
BEGIN
  -- Check if park exists
  SELECT EXISTS(
    SELECT 1 FROM dog_parks WHERE id = p_park_id
  ) INTO v_park_exists;
  
  IF NOT v_park_exists THEN
    RETURN jsonb_build_object('success', false, 'message', 'Park not found');
  END IF;
  
  -- Check if user is the owner
  SELECT EXISTS(
    SELECT 1 FROM dog_parks WHERE id = p_park_id AND owner_id = p_user_id
  ) INTO v_is_owner;
  
  IF NOT v_is_owner THEN
    RETURN jsonb_build_object('success', false, 'message', 'You are not the owner of this park');
  END IF;
  
  -- Check if park is rejected (only rejected parks can be deleted)
  SELECT EXISTS(
    SELECT 1 FROM dog_parks WHERE id = p_park_id AND status = 'rejected'
  ) INTO v_is_rejected;
  
  IF NOT v_is_rejected THEN
    RETURN jsonb_build_object('success', false, 'message', 'Only rejected parks can be deleted');
  END IF;
  
  -- Delete the park and its dependencies
  SELECT delete_dog_park_with_dependencies(p_park_id) INTO v_result;
  
  IF v_result THEN
    RETURN jsonb_build_object('success', true, 'message', 'Park deleted successfully');
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'Failed to delete park');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;