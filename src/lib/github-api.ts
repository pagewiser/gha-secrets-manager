// GitHub API utility functions for enterprise support
export function getGitHubApiUrl(): string {
  const enterpriseUrl = process.env.NEXT_PUBLIC_GITHUB_ENTERPRISE_URL
  if (enterpriseUrl) {
    // Remove trailing slash and add /api/v3
    return `${enterpriseUrl.replace(/\/$/, "")}/api/v3`
  }
  return "https://api.github.com"
}

export function getGitHubHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
  }
}
