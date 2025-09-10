-- SQL function to create a demo user if needed for complaint submission
CREATE OR REPLACE FUNCTION create_demo_user()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  demo_id uuid;
BEGIN
  -- Generate a new UUID for the demo user
  demo_id := gen_random_uuid();
  
  -- Insert the demo user with the generated ID
  INSERT INTO users (
    id, 
    email, 
    password, 
    full_name, 
    phone_number, 
    user_type, 
    address, 
    is_active, 
    created_at, 
    updated_at
  ) 
  VALUES (
    demo_id,
    'demo@civicrezo.org',
    'not-a-real-password-hash',
    'Demo User',
    '1234567890',
    'citizen',
    'Demo Address',
    true,
    NOW(),
    NOW()
  );
  
  -- Return the new user's ID
  RETURN demo_id;
END;
$$;
