"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeftIcon, RepositoryIcon, PlusIcon, SettingsIcon, ListIcon } from "@/components/icons"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { EnvironmentManager } from "@/components/environment-manager"
import { BulkOperations } from "@/components/bulk-operations"
import { GlobalSecretsList } from "@/components/global-secrets-list"
import { CreateEnvironmentDialog } from "@/components/create-environment-dialog"
import { getGitHubApiUrl, getGitHubHeaders } from "@/lib/github-api"

interface Organization {
  id: number
  login: string
  avatar_url: string
  description?: string
}

interface Repository {
  id: number
  name: string
  full_name: string
  description?: string
  private: boolean
  default_branch: string
  updated_at: string
}

interface Environment {
  id: number
  name: string
  protection_rules: any[]
  deployment_branch_policy?: {
    protected_branches: boolean
    custom_branch_policies: boolean
  }
}

interface RepositoryGridProps {
  organization: Organization
  token: string
  onBack: () => void
}

const COMMON_ENVIRONMENTS = ["production", "staging", "development", "preview"]

export function RepositoryGrid({ organization, token, onBack }: RepositoryGridProps) {
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [environments, setEnvironments] = useState<Record<string, Environment[]>>({})
  const [loading, setLoading] = useState(true)
  const [environmentsLoading, setEnvironmentsLoading] = useState<Record<string, boolean>>({})

  const [selectedRepo, setSelectedRepo] = useState<string>("")
  const [selectedEnv, setSelectedEnv] = useState<string>("")
  const [isManagerOpen, setIsManagerOpen] = useState(false)
  const [isGlobalListOpen, setIsGlobalListOpen] = useState(false)
  const [isBulkOpsOpen, setIsBulkOpsOpen] = useState(false)
  const [bulkOpsPreset, setBulkOpsPreset] = useState<{ repo?: string; env?: string } | null>(null)
  const [isCreateEnvOpen, setIsCreateEnvOpen] = useState(false)

  useEffect(() => {
    fetchRepositories()
  }, [organization])

  const fetchRepositories = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${getGitHubApiUrl()}/orgs/${organization.login}/repos?per_page=100&sort=updated`, {
        headers: getGitHubHeaders(token),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch repositories")
      }

      const repos = await response.json()
      setRepositories(repos)

      // Fetch environments for each repository
      repos.forEach((repo: Repository) => {
        fetchEnvironments(repo.name)
      })
    } catch (error) {
      console.error("Error fetching repositories:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEnvironments = async (repoName: string) => {
    setEnvironmentsLoading((prev) => ({ ...prev, [repoName]: true }))
    try {
      const response = await fetch(`${getGitHubApiUrl()}/repos/${organization.login}/${repoName}/environments`, {
        headers: getGitHubHeaders(token),
      })

      if (response.ok) {
        const data = await response.json()
        setEnvironments((prev) => ({
          ...prev,
          [repoName]: data.environments || [],
        }))
      } else {
        // If environments endpoint fails, set empty array
        setEnvironments((prev) => ({
          ...prev,
          [repoName]: [],
        }))
      }
    } catch (error) {
      console.error(`Error fetching environments for ${repoName}:`, error)
      setEnvironments((prev) => ({
        ...prev,
        [repoName]: [],
      }))
    } finally {
      setEnvironmentsLoading((prev) => ({ ...prev, [repoName]: false }))
    }
  }

  const createEnvironment = async (repoName: string, envName: string) => {
    try {
      const response = await fetch(
        `${getGitHubApiUrl()}/repos/${organization.login}/${repoName}/environments/${envName}`,
        {
          method: "PUT",
          headers: {
            ...getGitHubHeaders(token),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      )

      if (response.ok) {
        // Refresh environments for this repo
        fetchEnvironments(repoName)
      } else {
        console.error("Failed to create environment")
      }
    } catch (error) {
      console.error("Error creating environment:", error)
    }
  }

  const openEnvironmentManager = (repoName: string, envName: string) => {
    setSelectedRepo(repoName)
    setSelectedEnv(envName)
    setIsManagerOpen(true)
  }

  const closeEnvironmentManager = () => {
    setIsManagerOpen(false)
    setSelectedRepo("")
    setSelectedEnv("")
  }

  const hasEnvironment = (repoName: string, envName: string) => {
    const repoEnvs = environments[repoName] || []
    return repoEnvs.some((env) => env.name === envName)
  }

  const getAllEnvironments = () => {
    const allEnvs = new Set<string>()
    Object.values(environments).forEach((envList) => {
      envList.forEach((env) => allEnvs.add(env.name))
    })
    return Array.from(allEnvs).sort()
  }

  const openBulkOperations = (repoName?: string, envName?: string) => {
    setBulkOpsPreset({ repo: repoName, env: envName })
    setIsBulkOpsOpen(true)
  }

  const hasSecretsOrVariables = (repoName: string, envName: string) => {
    return hasEnvironment(repoName, envName)
  }

  const displayEnvironments = getAllEnvironments().length > 0 ? getAllEnvironments() : COMMON_ENVIRONMENTS

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading repositories...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={organization.avatar_url || "/placeholder.svg"} alt={organization.login} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                {organization.login.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold text-foreground">{organization.login}</h2>
              <p className="text-sm text-muted-foreground">{repositories.length} repositories</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 bg-transparent" onClick={() => setIsGlobalListOpen(true)}>
            <ListIcon className="h-4 w-4" />
            List secrets
          </Button>
          <Button variant="outline" className="gap-2 bg-transparent" onClick={() => setIsCreateEnvOpen(true)}>
            <PlusIcon className="h-4 w-4" />
            Create Environment
          </Button>
          <Button className="gap-2" onClick={() => openBulkOperations()}>
            <SettingsIcon className="h-4 w-4" />
            Bulk Operations
          </Button>
        </div>
      </div>

      {/* Repository Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RepositoryIcon className="h-5 w-5" />
            Repository Environments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header Row */}
              <div
                className={`grid gap-4 pb-4 border-b border-border`}
                style={{ gridTemplateColumns: `300px repeat(${displayEnvironments.length}, 1fr)` }}
              >
                <div className="font-medium text-sm text-muted-foreground">Repository</div>
                {displayEnvironments.map((env) => (
                  <div key={env} className="font-medium text-sm text-muted-foreground text-center capitalize">
                    {env}
                  </div>
                ))}
              </div>

              {/* Repository Rows */}
              <div className="space-y-3 pt-4">
                {repositories.map((repo) => (
                  <div
                    key={repo.id}
                    className="grid gap-4 items-center py-3 hover:bg-accent/30 rounded-lg px-2 -mx-2 transition-colors"
                    style={{ gridTemplateColumns: `300px repeat(${displayEnvironments.length}, 1fr)` }}
                  >
                    {/* Repository Info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm truncate">{repo.name}</h3>
                        {repo.private && (
                          <Badge variant="secondary" className="text-xs">
                            Private
                          </Badge>
                        )}
                      </div>
                      {repo.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{repo.description}</p>
                      )}
                    </div>

                    {/* Environment Columns */}
                    {displayEnvironments.map((envName) => (
                      <div key={envName} className="flex justify-center">
                        {environmentsLoading[repo.name] ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b border-primary"></div>
                        ) : hasEnvironment(repo.name, envName) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs h-7 bg-transparent"
                            onClick={() => openEnvironmentManager(repo.name, envName)}
                          >
                            <SettingsIcon className="h-3 w-3" />
                            Manage
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 text-xs h-7 text-muted-foreground hover:text-foreground"
                            onClick={() => openBulkOperations(repo.name, envName)}
                          >
                            <PlusIcon className="h-3 w-3" />
                            Create
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {repositories.length === 0 && (
        <div className="text-center py-12">
          <RepositoryIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Repositories Found</h3>
          <p className="text-muted-foreground">
            This organization doesn't have any repositories or you don't have access to them.
          </p>
        </div>
      )}

      <EnvironmentManager
        isOpen={isManagerOpen}
        onClose={closeEnvironmentManager}
        organization={organization.login}
        repository={selectedRepo}
        environment={selectedEnv}
        token={token}
        allRepositories={repositories.map((repo) => ({ name: repo.name, full_name: repo.full_name }))}
      />

      <GlobalSecretsList
        isOpen={isGlobalListOpen}
        onClose={() => setIsGlobalListOpen(false)}
        organization={organization.login}
        repositories={repositories.map((repo) => ({ name: repo.name, full_name: repo.full_name }))}
        token={token}
      />

      <BulkOperations
        isOpen={isBulkOpsOpen}
        onClose={() => {
          setIsBulkOpsOpen(false)
          setBulkOpsPreset(null)
        }}
        organization={organization.login}
        token={token}
        repositories={repositories.map((repo) => ({ name: repo.name, full_name: repo.full_name }))}
        preset={bulkOpsPreset}
        onEnvironmentCreated={() => {
          repositories.forEach((repo) => fetchEnvironments(repo.name))
        }}
      />

      <CreateEnvironmentDialog
        isOpen={isCreateEnvOpen}
        onClose={() => setIsCreateEnvOpen(false)}
        organization={organization.login}
        token={token}
        repositories={repositories.map((repo) => ({ name: repo.name, full_name: repo.full_name }))}
        onEnvironmentCreated={() => {
          repositories.forEach((repo) => fetchEnvironments(repo.name))
        }}
      />
    </div>
  )
}
