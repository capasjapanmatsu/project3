-- Create a function to handle account deletion
CREATE OR REPLACE FUNCTION handle_account_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- When a user is deleted from auth.users, we want to clean up related data
  -- This function will be triggered by a webhook from the account-delete function
  
  -- Delete user's profile
  DELETE FROM profiles WHERE id = OLD.id;
  
  -- Delete user's dogs
  DELETE FROM dogs WHERE owner_id = OLD.id;
  
  -- Delete user's reservations
  DELETE FROM reservations WHERE user_id = OLD.id;
  
  -- Delete user's payment cards
  DELETE FROM payment_cards WHERE user_id = OLD.id;
  
  -- Delete user's cart items
  DELETE FROM cart_items WHERE user_id = OLD.id;
  
  -- Delete user's orders
  DELETE FROM orders WHERE user_id = OLD.id;
  
  -- Delete user's notifications
  DELETE FROM notifications WHERE user_id = OLD.id;
  
  -- Delete user's friend requests
  DELETE FROM friend_requests 
  WHERE requester_id = OLD.id OR requested_id = OLD.id;
  
  -- Delete user's friendships
  DELETE FROM friendships 
  WHERE user1_id = OLD.id OR user2_id = OLD.id;
  
  -- Delete user's blacklisted dogs
  DELETE FROM dog_blacklist WHERE user_id = OLD.id;
  
  -- Delete user's QR shares
  DELETE FROM qr_shares 
  WHERE shared_by_user_id = OLD.id OR shared_to_user_id = OLD.id;
  
  -- Delete user's entrance QR codes
  DELETE FROM entrance_qr_codes WHERE user_id = OLD.id;
  
  -- Delete user's reviews
  DELETE FROM dog_park_reviews WHERE user_id = OLD.id;
  
  -- Mark Stripe customer as deleted
  UPDATE stripe_customers 
  SET deleted_at = now() 
  WHERE user_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger for account deletion
-- Note: This would normally be triggered by a webhook, but we're setting it up
-- for completeness. In practice, the account-delete function would handle this.
DROP TRIGGER IF EXISTS account_deletion_trigger ON auth.users;
CREATE TRIGGER account_deletion_trigger
AFTER DELETE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_account_deletion();