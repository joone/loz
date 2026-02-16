interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

interface TokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
  interval?: number;
}

interface CopilotTokenResponse {
  token: string;
  expires_at: number;
}

// Public client ID used by GitHub Copilot CLI and other tools
const GITHUB_OAUTH_CLIENT_ID = "Iv1.b507a08c87ecfe98";

export class GitHubCopilotAuth {
  private githubToken: string | null = null;
  private copilotToken: string | null = null;
  private copilotTokenExpiry: number = 0;

  /**
   * Initiates the OAuth device code flow
   */
  async requestDeviceCode(): Promise<DeviceCodeResponse> {
    const response = await fetch("https://github.com/login/device/code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: GITHUB_OAUTH_CLIENT_ID,
        scope: "read:user",
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to request device code: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }

  /**
   * Polls for the OAuth access token after user authorizes
   * Returns the token on success, null if still pending, or throws on error
   */
  async pollForToken(
    deviceCode: string,
  ): Promise<{ token: string | null; newInterval?: number }> {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: GITHUB_OAUTH_CLIENT_ID,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to poll for token: ${response.status} ${response.statusText}`,
      );
    }

    const data: TokenResponse = await response.json();

    if (data.error) {
      if (data.error === "authorization_pending") {
        // User hasn't authorized yet, continue polling
        return { token: null };
      } else if (data.error === "slow_down") {
        // Need to slow down polling - return new interval
        return { token: null, newInterval: data.interval };
      } else if (data.error === "expired_token" || data.error === "token_expired") {
        throw new Error("Device code expired. Please restart authentication.");
      } else if (data.error === "access_denied") {
        throw new Error("Access denied by user");
      } else {
        throw new Error(`Authentication error: ${data.error} - ${data.error_description || ""}`);
      }
    }

    if (data.access_token) {
      this.githubToken = data.access_token;
      return { token: data.access_token };
    }

    return { token: null };
  }

  /**
   * Exchanges GitHub OAuth token for Copilot-specific token
   */
  async exchangeForCopilotToken(githubToken: string): Promise<string> {
    const response = await fetch(
      "https://api.github.com/copilot_internal/v2/token",
      {
        method: "GET",
        headers: {
          authorization: `token ${githubToken}`,
          "editor-version": "Neovim/0.6.1",
          "editor-plugin-version": "copilot.vim/1.16.0",
          "user-agent": "GithubCopilot/1.155.0",
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to exchange for Copilot token: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const data: CopilotTokenResponse = await response.json();
    this.copilotToken = data.token;
    this.copilotTokenExpiry = data.expires_at;

    return data.token;
  }

  /**
   * Gets a valid Copilot token, refreshing if necessary
   */
  async getCopilotToken(githubToken?: string): Promise<string> {
    const token = githubToken || this.githubToken;
    if (!token) {
      throw new Error("No GitHub token available");
    }

    // Check if we have a valid token
    const now = Date.now() / 1000; // Convert to seconds
    if (this.copilotToken && this.copilotTokenExpiry > now + 60) {
      // Token valid for at least 1 more minute
      return this.copilotToken;
    }

    // Need to refresh the token
    return await this.exchangeForCopilotToken(token);
  }

  /**
   * Complete OAuth flow with user interaction
   */
  async authenticate(
    onUserCode: (userCode: string, verificationUri: string) => Promise<void>,
  ): Promise<string> {
    // Step 1: Request device code
    const deviceCodeResponse = await this.requestDeviceCode();

    // Step 2: Show user code and verification URL
    await onUserCode(
      deviceCodeResponse.user_code,
      deviceCodeResponse.verification_uri,
    );

    // Step 3: Poll for token with dynamic interval
    let pollInterval = deviceCodeResponse.interval;
    const expiresAt = Date.now() + deviceCodeResponse.expires_in * 1000;

    while (Date.now() < expiresAt) {
      // Wait for the required interval before polling
      await new Promise((resolve) => setTimeout(resolve, pollInterval * 1000));

      const result = await this.pollForToken(deviceCodeResponse.device_code);
      
      if (result.token) {
        // Exchange for Copilot token
        await this.exchangeForCopilotToken(result.token);
        return result.token;
      }

      // If we got a new interval (slow_down error), update it
      if (result.newInterval) {
        pollInterval = result.newInterval;
      }
    }

    throw new Error("Authentication timed out. Please try again.");
  }

  /**
   * Set GitHub token directly (useful for testing or token reuse)
   */
  setGitHubToken(token: string): void {
    this.githubToken = token;
  }

  /**
   * Get stored GitHub token
   */
  getGitHubToken(): string | null {
    return this.githubToken;
  }
}
