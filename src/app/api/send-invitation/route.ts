import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const { email, invitationToken, inviterName, clinicName, role } = await request.json()

    // Validate required fields
    if (!email || !invitationToken || !inviterName || !clinicName || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create invitation URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const invitationUrl = `${baseUrl}/signup?invitation=${invitationToken}`

    const emailSubject = `You're invited to join ${clinicName} on CMS`
    const emailHtml = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">You're Invited!</h2>
            <p>Hello,</p>
            <p><strong>${inviterName}</strong> has invited you to join <strong>${clinicName}</strong> as a <strong>${role}</strong> on the Clinic Management System.</p>
            
            <div style="margin: 30px 0; text-align: center;">
              <a href="${invitationUrl}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Accept Invitation
              </a>
            </div>
            
            <p>Or copy and paste this link in your browser:</p>
            <p style="background-color: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all;">
              ${invitationUrl}
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
    `

    // Check email service configuration
    const resendApiKey = process.env.RESEND_API_KEY
    const gmailUser = process.env.GMAIL_USER
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD
    const emailFromName = process.env.EMAIL_FROM_NAME || 'Clinic Management System'

    // Try Gmail SMTP first if configured
    if (gmailUser && gmailAppPassword && gmailAppPassword !== 'your_gmail_app_password_here') {
      try {
        console.log('� Attempting to send email via Gmail SMTP...', {
          to: email,
          from: gmailUser,
          subject: emailSubject
        })

        // Create Gmail transporter
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: gmailUser,
            pass: gmailAppPassword,
          },
        })

        // Send email
        const info = await transporter.sendMail({
          from: `"${emailFromName}" <${gmailUser}>`,
          to: email,
          subject: emailSubject,
          html: emailHtml,
        })

        console.log('✅ Email sent successfully via Gmail:', info.messageId)

        return NextResponse.json({ 
          success: true, 
          message: 'Invitation email sent successfully via Gmail!',
          invitationUrl,
          messageId: info.messageId,
          emailConfigured: true,
          emailService: 'gmail'
        })

      } catch (gmailError) {
        console.error('❌ Gmail SMTP error:', gmailError)
        
        let gmailErrorMessage = gmailError instanceof Error ? gmailError.message : 'Unknown Gmail error'
        if (gmailErrorMessage.includes('Invalid login')) {
          gmailErrorMessage = 'Gmail authentication failed. Please check your app password and ensure 2FA is enabled.'
        }

        return NextResponse.json({ 
          success: false, 
          message: 'Failed to send email via Gmail SMTP',
          error: gmailErrorMessage,
          invitationUrl,
          emailConfigured: true,
          emailService: 'gmail'
        })
      }
    }

    // Fallback to Resend if Gmail not configured
    if (!resendApiKey || resendApiKey === 'your_resend_api_key_here') {
      console.log('📧 No email service configured, returning invitation URL only')
      
      return NextResponse.json({ 
        success: true, 
        message: 'Invitation created (no email service configured)',
        invitationUrl,
        emailConfigured: false
      })
    }

    // Send email with Resend
    try {
      const resend = new Resend(resendApiKey)
      
      console.log('🔄 Attempting to send email via Resend...', {
        to: email,
        from: 'onboarding@resend.dev',
        subject: emailSubject
      })
      
      const { data, error } = await resend.emails.send({
        from: 'onboarding@resend.dev', // This is Resend's test domain that works immediately
        to: email,
        subject: emailSubject,
        html: emailHtml,
      })

      if (error) {
        console.error('❌ Resend API error:', error)
        
        // Check for common Resend restrictions
        let userFriendlyError = error.message || JSON.stringify(error)
        let isTestingRestriction = false
        
        // Handle the testing restriction error
        const errorString = JSON.stringify(error)
        if (errorString.includes('testing emails to your own email address') || 
            errorString.includes('verify a domain')) {
          userFriendlyError = `Testing Mode: With an unverified domain, Resend only allows sending emails to your registered email address. To send to other recipients, please verify a domain at resend.com/domains`
          isTestingRestriction = true
        }
        
        return NextResponse.json({ 
          success: false, 
          message: 'Failed to send email via Resend',
          error: userFriendlyError,
          invitationUrl,
          emailConfigured: true,
          isTestingRestriction,
          debugInfo: {
            apiKeyLength: resendApiKey.length,
            apiKeyPrefix: resendApiKey.substring(0, 5),
            errorDetails: error
          }
        })
      }

      console.log('✅ Email sent successfully via Resend:', data)

      return NextResponse.json({ 
        success: true, 
        message: 'Invitation email sent successfully!',
        invitationUrl,
        emailId: data?.id,
        emailConfigured: true
      })

    } catch (emailError) {
      console.error('❌ Email sending exception:', emailError)
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to send invitation email',
        error: emailError instanceof Error ? emailError.message : 'Unknown error',
        invitationUrl,
        emailConfigured: true,
        debugInfo: {
          apiKeyLength: resendApiKey.length,
          apiKeyPrefix: resendApiKey.substring(0, 5),
          errorType: emailError instanceof Error ? emailError.constructor.name : typeof emailError
        }
      })
    }

  } catch (error) {
    console.error('Error in send-invitation API:', error)
    return NextResponse.json(
      { error: 'Failed to send invitation email' },
      { status: 500 }
    )
  }
}
