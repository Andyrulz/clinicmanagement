-- Fix token encoding issue
-- Execute this in Supabase SQL Editor

-- Updated function to generate secure invitation tokens with proper encoding
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
  -- Use base64 encoding (supported) and replace URL-unsafe characters
  RETURN translate(encode(gen_random_bytes(32), 'base64'), '+/=', '-_');
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT 'Token generation test: ' || generate_invitation_token() as test_result;

SELECT 'Token generation function updated successfully!' as result;
