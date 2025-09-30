"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KeyIcon, SettingsIcon, ListIcon, AlertCircleIcon } from "@/components/icons"
import { toast } from "@/hooks/use-toast"
import { getGitHubApiUrl, getGitHubHeaders } from "@/lib/github-api"

interface Repository {
  name: string
  full_name: string
}

interface SecretLocation {
  name: string
  locations: Array<{
    repository: string
    environment: string
  }>
  missingIn: Array<{
    repository: string
    environment: string
  }>
}

interface VariableLocation {
  name: string
  value?: string
  locations: Array<{
    repository: string
    environment: string
    value: string
  }>
  missingIn: Array<{
    repository: string
    environment: string
  }>
}

interface GlobalSecretsListProps {
  isOpen: boolean
  onClose: () => void
  organization: string
  repositories: Repository[]
  token: string
  trigger?: React.ReactNode
}

const COMMON_ENVIRONMENTS = ["production", "staging", "development", "preview"]

export function GlobalSecretsList({ isOpen, onClose, organization, repositories, token }: GlobalSecretsListProps) {
  const [secretsMap, setSecretsMap] = useState<Map<string, SecretLocation>>(new Map())
  const [variablesMap, setVariablesMap] = useState<Map<string, VariableLocation>>(new Map())
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("secrets")

  useEffect(() => {
    if (isOpen) {
      fetchAllSecretsAndVariables()
    }
  }, [isOpen])

  const fetchAllSecretsAndVariables = async () => {
    setLoading(true)
    const newSecretsMap = new Map<string, SecretLocation>()
    const newVariablesMap = new Map<string, VariableLocation>()

    try {
      // Fetch secrets and variables for each repo/env combination
      for (const repo of repositories) {
        for (const env of COMMON_ENVIRONMENTS) {
          // Fetch secrets
          try {
            const secretsResponse = await fetch(
              `${getGitHubApiUrl()}/repos/${organization}/${repo.name}/environments/${env}/secrets`,
              {
                headers: getGitHubHeaders(token),
              },
            )

            if (secretsResponse.ok) {
              const secretsData = await secretsResponse.json()
              const secrets = secretsData.secrets || []

              secrets.forEach((secret: { name: string }) => {
                if (!newSecretsMap.has(secret.name)) {
                  newSecretsMap.set(secret.name, {
                    name: secret.name,
                    locations: [],
                    missingIn: [],
                  })
                }
                newSecretsMap.get(secret.name)!.locations.push({
                  repository: repo.name,
                  environment: env,
                })
              })
            }
          } catch (error) {
            console.error(`Error fetching secrets for ${repo.name}/${env}:`, error)
          }

          // Fetch variables
          try {
            const variablesResponse = await fetch(
              `${getGitHubApiUrl()}/repos/${organization}/${repo.name}/environments/${env}/variables`,
              {
                headers: getGitHubHeaders(token),
              },
            )

            if (variablesResponse.ok) {
              const variablesData = await variablesResponse.json()
              const variables = variablesData.variables || []

              variables.forEach((variable: { name: string; value: string }) => {
                if (!newVariablesMap.has(variable.name)) {
                  newVariablesMap.set(variable.name, {
                    name: variable.name,
                    locations: [],
                    missingIn: [],
                  })
                }
                newVariablesMap.get(variable.name)!.locations.push({
                  repository: repo.name,
                  environment: env,
                  value: variable.value,
                })
              })
            }
          } catch (error) {
            console.error(`Error fetching variables for ${repo.name}/${env}:`, error)
          }
        }
      }

      // Calculate missing locations
      const allLocations = repositories.flatMap((repo) =>
        COMMON_ENVIRONMENTS.map((env) => ({ repository: repo.name, environment: env })),
      )

      newSecretsMap.forEach((secret) => {
        const existingLocations = new Set(secret.locations.map((loc) => `${loc.repository}:${loc.environment}`))
        secret.missingIn = allLocations.filter((loc) => !existingLocations.has(`${loc.repository}:${loc.environment}`))
      })

      newVariablesMap.forEach((variable) => {
        const existingLocations = new Set(variable.locations.map((loc) => `${loc.repository}:${loc.environment}`))
        variable.missingIn = allLocations.filter(
          (loc) => !existingLocations.has(`${loc.repository}:${loc.environment}`),
        )
      })

      setSecretsMap(newSecretsMap)
      setVariablesMap(newVariablesMap)
    } catch (error) {
      console.error("Error fetching secrets and variables:", error)
      toast({
        title: "Error",
        description: "Failed to fetch secrets and variables",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const secretsList = Array.from(secretsMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  const variablesList = Array.from(variablesMap.values()).sort((a, b) => a.name.localeCompare(b.name))

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListIcon className="h-5 w-5" />
            Global Secrets & Variables Overview
          </DialogTitle>
          <DialogDescription>
            View all secrets and variables across {repositories.length} repositories and {COMMON_ENVIRONMENTS.length}{" "}
            environments
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Scanning all repositories and environments...</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="secrets">Secrets ({secretsList.length})</TabsTrigger>
              <TabsTrigger value="variables">Variables ({variablesList.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="secrets" className="space-y-4">
              {secretsList.length === 0 ? (
                <Card>
                  <CardContent className="py-12">
                    <p className="text-sm text-muted-foreground text-center">No secrets found</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {secretsList.map((secret) => (
                    <Card key={secret.name}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <KeyIcon className="h-4 w-4" />
                            <CardTitle className="text-base font-mono">{secret.name}</CardTitle>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {secret.locations.length} locations
                            </Badge>
                            {secret.missingIn.length > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {secret.missingIn.length} missing
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Defined in */}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">Defined in:</p>
                          <div className="flex flex-wrap gap-1">
                            {secret.locations.map((loc, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {loc.repository} / {loc.environment}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Missing in */}
                        {secret.missingIn.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-destructive mb-2 flex items-center gap-1">
                              <AlertCircleIcon className="h-3 w-3" />
                              Missing in:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {secret.missingIn.map((loc, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs text-muted-foreground">
                                  {loc.repository} / {loc.environment}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="variables" className="space-y-4">
              {variablesList.length === 0 ? (
                <Card>
                  <CardContent className="py-12">
                    <p className="text-sm text-muted-foreground text-center">No variables found</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {variablesList.map((variable) => (
                    <Card key={variable.name}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <SettingsIcon className="h-4 w-4" />
                            <CardTitle className="text-base font-mono">{variable.name}</CardTitle>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {variable.locations.length} locations
                            </Badge>
                            {variable.missingIn.length > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {variable.missingIn.length} missing
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Defined in */}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">Defined in:</p>
                          <div className="space-y-1">
                            {variable.locations.map((loc, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-xs">
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {loc.repository} / {loc.environment}
                                </Badge>
                                <span className="font-mono text-muted-foreground truncate">{loc.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Missing in */}
                        {variable.missingIn.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-destructive mb-2 flex items-center gap-1">
                              <AlertCircleIcon className="h-3 w-3" />
                              Missing in:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {variable.missingIn.map((loc, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs text-muted-foreground">
                                  {loc.repository} / {loc.environment}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
