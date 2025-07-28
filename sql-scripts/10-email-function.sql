-- Create Edge Function for sending invitation emails
-- This will be a Supabase Edge Function (serverless function)
-- We'll create this as a SQL function first, then move to Edge Functions if needed

CREATE OR REPLACE FUNCTION send_invitation_email(
  p_email VARCHAR(255),
  p_invitation_token TEXT,
  p_inviter_name TEXT,
  p_clinic_name TEXT,
  p_role TEXT
)
RETURNS JSON AS $$
DECLARE
  v_invitation_url TEXT;
  v_email_body TEXT;
  v_email_subject TEXT;
BEGIN
  -- Construct invitation URL
  v_invitation_url := 'https://your-domain.com/signup?invitation=' || p_invitation_token;
  
  -- Create email subject
  v_email_subject := 'You''re invited to join ' || p_clinic_name || ' on CMS';
  
  -- Create email body (HTML)
  v_email_body := '
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">You''re Invited!</h2>
          <p>Hello,</p>
          <p><strong>' || p_inviter_name || '</strong> has invited you to join <strong>' || p_clinic_name || '</strong> as a <strong>' || p_role || '</strong> on the Clinic Management System.</p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="' || v_invitation_url || '" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Accept Invitation
            </a>
          </div>
          
          <p>Or copy and paste this link in your browser:</p>
          <p style="background-color: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all;">
            ' || v_invitation_url || '
          </p>
          
          <p style="margin-top: 30px; font-size: 14px; color: #666;">
            This invitation will expire in 72 hours. If you have any questions, please contact your administrator.
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #666;">
            This email was sent from Clinic Management System. If you did not expect this invitation, you can safely ignore this email.
          </p>
        </div>
      </body>
    </html>
  ';
  
  -- For now, return the email details as JSON
  -- In production, this would integrate with an actual email service
  RETURN json_build_object(
    'to', p_email,
    'subject', v_email_subject,
    'html', v_email_body,
    'invitation_url', v_invitation_url,
    'status', 'prepared'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the email function
SELECT send_invitation_email(
  'test@example.com',
  'sample-token-123',
  'Dr. Smith',
  'City Medical Center',
  'staff'
) as email_preview;
