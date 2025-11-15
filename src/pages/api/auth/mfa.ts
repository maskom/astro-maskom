import type { APIRoute } from "astro";
import { mfaService } from "../../../lib/security/mfa";
import { SecurityMiddleware, getSecurityContext } from "../../../lib/security/middleware";
import { securityAuditLogger } from "../../../lib/security/audit";
import { SecurityAction } from "../../../lib/security/types";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const securityContext = await SecurityMiddleware.createSecurityContext(request, cookies);
    
    if (!securityContext) {
      return new Response("Authentication required", { status: 401 });
    }

    const { email } = await request.json();
    
    if (!email) {
      return new Response("Email is required", { status: 400 });
    }

    // Generate TOTP secret
    const { secret, qrCodeUrl } = mfaService.generateTOTPSecret(email);

    // In a real implementation, you would generate a QR code image
    // For now, we'll return the URL that can be used to generate one
    
    await securityAuditLogger.logSecurityAction(
      securityContext.userId,
      SecurityAction.MFA_ENABLE,
      "mfa_setup",
      securityContext.ipAddress,
      securityContext.userAgent,
      true,
      { email, secret_generated: true }
    );

    return new Response(JSON.stringify({
      secret,
      qrCodeUrl,
      instructions: "Scan this QR code with your authenticator app or enter the secret manually"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('MFA setup error:', error);
    return new Response("Failed to setup MFA", { status: 500 });
  }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    const securityContext = await SecurityMiddleware.createSecurityContext(request, cookies);
    
    if (!securityContext) {
      return new Response("Authentication required", { status: 401 });
    }

    const { secret, verificationCode } = await request.json();
    
    if (!secret || !verificationCode) {
      return new Response("Secret and verification code are required", { status: 400 });
    }

    // Verify the TOTP code
    const isValid = await mfaService.verifyTOTP(secret, verificationCode);
    
    if (!isValid) {
      await securityAuditLogger.logSecurityAction(
        securityContext.userId,
        SecurityAction.MFA_ENABLE,
        "mfa_verification",
        securityContext.ipAddress,
        securityContext.userAgent,
        false,
        { reason: "invalid_verification_code" }
      );
      
      return new Response("Invalid verification code", { status: 400 });
    }

    // Enable MFA for the user
    const success = await mfaService.enableMFA(securityContext.userId, secret);
    
    if (!success) {
      return new Response("Failed to enable MFA", { status: 500 });
    }

    // Generate backup codes
    const backupCodes = mfaService.generateBackupCodes();

    await securityAuditLogger.logSecurityAction(
      securityContext.userId,
      SecurityAction.MFA_ENABLE,
      "mfa_enabled",
      securityContext.ipAddress,
      securityContext.userAgent,
      true,
      { backup_codes_count: backupCodes.length }
    );

    return new Response(JSON.stringify({
      message: "MFA enabled successfully",
      backupCodes
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('MFA enable error:', error);
    return new Response("Failed to enable MFA", { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    const securityContext = await SecurityMiddleware.createSecurityContext(request, cookies);
    
    if (!securityContext) {
      return new Response("Authentication required", { status: 401 });
    }

    const { verificationCode } = await request.json();
    
    if (!verificationCode) {
      return new Response("Verification code is required", { status: 400 });
    }

    // Get current MFA secret to verify
    const profile = await mfaService.getUserSecurityProfile(securityContext.userId);
    
    if (!profile?.mfa_secret) {
      return new Response("MFA is not enabled", { status: 400 });
    }

    // Verify the TOTP code before disabling
    const isValid = await mfaService.verifyTOTP(profile.mfa_secret, verificationCode);
    
    if (!isValid) {
      await securityAuditLogger.logSecurityAction(
        securityContext.userId,
        SecurityAction.MFA_DISABLE,
        "mfa_disable_attempt",
        securityContext.ipAddress,
        securityContext.userAgent,
        false,
        { reason: "invalid_verification_code" }
      );
      
      return new Response("Invalid verification code", { status: 400 });
    }

    // Disable MFA
    const success = await mfaService.disableMFA(securityContext.userId);
    
    if (!success) {
      return new Response("Failed to disable MFA", { status: 500 });
    }

    await securityAuditLogger.logSecurityAction(
      securityContext.userId,
      SecurityAction.MFA_DISABLE,
      "mfa_disabled",
      securityContext.ipAddress,
      securityContext.userAgent,
      true
    );

    return new Response(JSON.stringify({
      message: "MFA disabled successfully"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('MFA disable error:', error);
    return new Response("Failed to disable MFA", { status: 500 });
  }
};