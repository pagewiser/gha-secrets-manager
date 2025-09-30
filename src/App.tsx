"use client"

import { useState } from "react"
import { TokenInput } from "@/components/token-input"
import { OrganizationSelector } from "@/components/organization-selector"
import { RepositoryGrid } from "@/components/repository-grid"
import { GitHubIcon } from "@/components/icons"
import { getGitHubApiUrl, getGitHubHeaders } from "@/lib/github-api"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"

interface Organization {
  id: number
  login: string
  avatar_url: string
  description?: string
}

function App() {
  const [token, setToken] = useState<string>("")
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchOrganizations = async (githubToken: string) => {
    setLoading(true)
    try {
      const response = await fetch(`${getGitHubApiUrl()}/user/orgs`, {
        headers: getGitHubHeaders(githubToken),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch organizations")
      }

      const orgs = await response.json()
      setOrganizations(orgs)
    } catch (error) {
      console.error("Error fetching organizations:", error)
      setToken("")
    } finally {
      setLoading(false)
    }
  }

  const handleTokenSubmit = (newToken: string) => {
    setToken(newToken)
    fetchOrganizations(newToken)
  }

  const handleTokenClear = () => {
    setToken("")
    setOrganizations([])
    setSelectedOrg(null)
  }

  const handleOrgSelect = (org: Organization) => {
    setSelectedOrg(org)
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GitHubIcon className="h-8 w-8" />
                <div>
                  <h1 className="text-xl font-semibold text-foreground">GitHub Organization Manager</h1>
                  <p className="text-sm text-muted-foreground">Manage repositories, environments, and secrets</p>
                </div>
              </div>
              {token && (
                <button
                  onClick={handleTokenClear}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear Token
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8">
          {!token ? (
            <TokenInput onSubmit={handleTokenSubmit} loading={loading} />
          ) : !selectedOrg ? (
            <OrganizationSelector organizations={organizations} onSelect={handleOrgSelect} loading={loading} />
          ) : (
            <RepositoryGrid organization={selectedOrg} token={token} onBack={() => setSelectedOrg(null)} />
          )}
        </main>

        <Toaster />
      </div>
    </ThemeProvider>
  )
}

export default App
