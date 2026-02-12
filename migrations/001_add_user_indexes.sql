-- Add indexes for optimized user lookups
-- These indexes significantly improve performance for authentication flows

-- Index for email lookups (getUserByEmail)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index for invitation token lookups (getUserByInvitationToken)
CREATE INDEX IF NOT EXISTS idx_users_invitation_token ON users(invitation_token);

-- Index for email verification token lookups (getUserByVerificationToken)
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token);

-- Index for username lookups (future use)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
