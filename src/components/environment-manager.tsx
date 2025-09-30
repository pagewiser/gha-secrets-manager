"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { KeyIcon, PlusIcon, SettingsIcon, TrashIcon, EditIcon, ListIcon } from "@/components/icons"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"
import { getGitHubApiUrl, getGitHubHeaders } from "@/lib/github-api"
import { SecretsListDialog } from "@/components/secrets-list-dialog"

interface Secret {
  name: string
  created_at: string
  updated_at: string
}

interface Variable {
  name: string
  value: string
  created_at: string
  updated_at: string
}

interface Repository {
  name: string
  full_name: string
}

interface EnvironmentManagerProps {
  isOpen: boolean
  onClose: () => void
  organization: string
  repository: string
  environment: string
  token: string
  allRepositories: Repository[]
}

export function EnvironmentManager({
  isOpen,
  onClose,
  organization,
  repository,
  environment,
  token,
  allRepositories,
}: EnvironmentManagerProps) {
  const [secrets, setSecrets] = useState<Secret[]>([])
  const [variables, setVariables] = useState<Variable[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("secrets")

  // Form states
  const [secretName, setSecretName] = useState("")
  const [secretValue, setSecretValue] = useState("")
  const [variableName, setVariableName] = useState("")
  const [variableValue, setVariableValue] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string>("")

  // Edit states
  const [editingSecret, setEditingSecret] = useState<string>("")
  const [editingVariable, setEditingVariable] = useState<string>("")
  const [editSecretValue, setEditSecretValue] = useState("")
  const [editVariableValue, setEditVariableValue] = useState("")

  // Bulk operation states
  const [selectedRepos, setSelectedRepos] = useState<string[]>([repository])
  const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>([environment])
  const [bulkMode, setBulkMode] = useState(false)

  const [isListDialogOpen, setIsListDialogOpen] = useState(false)

  const commonEnvironments = ["production", "staging", "development", "preview"]

  useEffect(() => {
    if (isOpen) {
      fetchSecrets()
      fetchVariables()
      setSelectedRepos([repository])
      setSelectedEnvironments([environment])
    }
  }, [isOpen, repository, environment])

  const fetchSecrets = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `${getGitHubApiUrl()}/repos/${organization}/${repository}/environments/${environment}/secrets`,
        {
          headers: getGitHubHeaders(token),
        },
      )

      if (response.ok) {
        const data = await response.json()
        setSecrets(data.secrets || [])
      }
    } catch (error) {
      console.error("Error fetching secrets:", error)
      toast({
        title: "Error",
        description: "Failed to fetch secrets",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchVariables = async () => {
    try {
      const response = await fetch(
        `${getGitHubApiUrl()}/repos/${organization}/${repository}/environments/${environment}/variables`,
        {
          headers: getGitHubHeaders(token),
        },
      )

      if (response.ok) {
        const data = await response.json()
        setVariables(data.variables || [])
      }
    } catch (error) {
      console.error("Error fetching variables:", error)
    }
  }

  const createSecret = async () => {
    if (!secretName.trim() || !secretValue.trim()) return

    setIsCreating(true)
    try {
      const targetRepos = bulkMode ? selectedRepos : [repository]
      const targetEnvs = bulkMode ? selectedEnvironments : [environment]
      let successCount = 0
      const totalCount = targetRepos.length * targetEnvs.length

      for (const repo of targetRepos) {
        for (const env of targetEnvs) {
          // For GitHub API, we need to encrypt the secret value properly
          // This is a simplified version - in production, you'd use libsodium
          const response = await fetch(
            `${getGitHubApiUrl()}/repos/${organization}/${repo}/environments/${env}/secrets/${secretName}`,
            {
              method: "PUT",
              headers: {
                ...getGitHubHeaders(token),
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                encrypted_value: btoa(secretValue), // Simplified - use proper encryption in production
              }),
            },
          )

          if (response.ok) {
            successCount++
          }
        }
      }

      toast({
        title: "Secret Created",
        description: `Successfully created secret in ${successCount}/${totalCount} locations`,
      })

      setSecretName("")
      setSecretValue("")
      fetchSecrets()
    } catch (error) {
      console.error("Error creating secret:", error)
      toast({
        title: "Error",
        description: "Failed to create secret",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const createVariable = async () => {
    if (!variableName.trim() || !variableValue.trim()) return

    setIsCreating(true)
    try {
      const targetRepos = bulkMode ? selectedRepos : [repository]
      const targetEnvs = bulkMode ? selectedEnvironments : [environment]
      let successCount = 0
      const totalCount = targetRepos.length * targetEnvs.length

      for (const repo of targetRepos) {
        for (const env of targetEnvs) {
          const response = await fetch(
            `${getGitHubApiUrl()}/repos/${organization}/${repo}/environments/${env}/variables`,
            {
              method: "POST",
              headers: {
                ...getGitHubHeaders(token),
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: variableName,
                value: variableValue,
              }),
            },
          )

          if (response.ok) {
            successCount++
          }
        }
      }

      toast({
        title: "Variable Created",
        description: `Successfully created variable in ${successCount}/${totalCount} locations`,
      })

      setVariableName("")
      setVariableValue("")
      fetchVariables()
    } catch (error) {
      console.error("Error creating variable:", error)
      toast({
        title: "Error",
        description: "Failed to create variable",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const updateSecret = async (secretName: string, newValue: string) => {
    try {
      const response = await fetch(
        `${getGitHubApiUrl()}/repos/${organization}/${repository}/environments/${environment}/secrets/${secretName}`,
        {
          method: "PUT",
          headers: {
            ...getGitHubHeaders(token),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            encrypted_value: btoa(newValue),
          }),
        },
      )

      if (response.ok) {
        toast({
          title: "Secret Updated",
          description: `Successfully updated ${secretName}`,
        })
        setEditingSecret("")
        setEditSecretValue("")
        fetchSecrets()
      }
    } catch (error) {
      console.error("Error updating secret:", error)
      toast({
        title: "Error",
        description: "Failed to update secret",
        variant: "destructive",
      })
    }
  }

  const updateVariable = async (variableName: string, newValue: string) => {
    try {
      const response = await fetch(
        `${getGitHubApiUrl()}/repos/${organization}/${repository}/environments/${environment}/variables/${variableName}`,
        {
          method: "PATCH",
          headers: {
            ...getGitHubHeaders(token),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            value: newValue,
          }),
        },
      )

      if (response.ok) {
        toast({
          title: "Variable Updated",
          description: `Successfully updated ${variableName}`,
        })
        setEditingVariable("")
        setEditVariableValue("")
        fetchVariables()
      }
    } catch (error) {
      console.error("Error updating variable:", error)
      toast({
        title: "Error",
        description: "Failed to update variable",
        variant: "destructive",
      })
    }
  }

  const deleteSecret = async (secretName: string) => {
    setIsDeleting(secretName)
    try {
      const response = await fetch(
        `${getGitHubApiUrl()}/repos/${organization}/${repository}/environments/${environment}/secrets/${secretName}`,
        {
          method: "DELETE",
          headers: getGitHubHeaders(token),
        },
      )

      if (response.ok) {
        toast({
          title: "Secret Deleted",
          description: `Successfully deleted ${secretName}`,
        })
        fetchSecrets()
      }
    } catch (error) {
      console.error("Error deleting secret:", error)
      toast({
        title: "Error",
        description: "Failed to delete secret",
        variant: "destructive",
      })
    } finally {
      setIsDeleting("")
    }
  }

  const deleteVariable = async (variableName: string) => {
    setIsDeleting(variableName)
    try {
      const response = await fetch(
        `${getGitHubApiUrl()}/repos/${organization}/${repository}/environments/${environment}/variables/${variableName}`,
        {
          method: "DELETE",
          headers: getGitHubHeaders(token),
        },
      )

      if (response.ok) {
        toast({
          title: "Variable Deleted",
          description: `Successfully deleted ${variableName}`,
        })
        fetchVariables()
      }
    } catch (error) {
      console.error("Error deleting variable:", error)
      toast({
        title: "Error",
        description: "Failed to delete variable",
        variant: "destructive",
      })
    } finally {
      setIsDeleting("")
    }
  }

  const handleRepoSelection = (repoName: string, checked: boolean) => {
    if (checked) {
      setSelectedRepos([...selectedRepos, repoName])
    } else {
      setSelectedRepos(selectedRepos.filter((r) => r !== repoName))
    }
  }

  const handleEnvSelection = (envName: string, checked: boolean) => {
    if (checked) {
      setSelectedEnvironments([...selectedEnvironments, envName])
    } else {
      setSelectedEnvironments(selectedEnvironments.filter((e) => e !== envName))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Environment Management
          </DialogTitle>
          <DialogDescription>
            Manage secrets and variables for <Badge variant="outline">{repository}</Badge> in{" "}
            <Badge variant="outline">{environment}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Bulk Mode Toggle */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Bulk Operations</CardTitle>
                  <CardDescription className="text-xs">
                    Apply changes to multiple repositories and environments
                  </CardDescription>
                </div>
                <Switch checked={bulkMode} onCheckedChange={setBulkMode} />
              </div>
            </CardHeader>
            {bulkMode && (
              <CardContent className="pt-0">
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Repository Selection */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Repositories ({selectedRepos.length} selected)</Label>
                    <div className="max-h-32 overflow-y-auto space-y-1 border rounded-md p-2">
                      {allRepositories.map((repo) => (
                        <div key={repo.name} className="flex items-center space-x-2">
                          <Checkbox
                            id={`repo-${repo.name}`}
                            checked={selectedRepos.includes(repo.name)}
                            onCheckedChange={(checked) => handleRepoSelection(repo.name, checked as boolean)}
                          />
                          <Label htmlFor={`repo-${repo.name}`} className="text-xs">
                            {repo.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Environment Selection */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Environments ({selectedEnvironments.length} selected)</Label>
                    <div className="space-y-1 border rounded-md p-2">
                      {commonEnvironments.map((env) => (
                        <div key={env} className="flex items-center space-x-2">
                          <Checkbox
                            id={`env-${env}`}
                            checked={selectedEnvironments.includes(env)}
                            onCheckedChange={(checked) => handleEnvSelection(env, checked as boolean)}
                          />
                          <Label htmlFor={`env-${env}`} className="text-xs capitalize">
                            {env}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="secrets">Secrets</TabsTrigger>
              <TabsTrigger value="variables">Variables</TabsTrigger>
            </TabsList>

            <TabsContent value="secrets" className="space-y-4">
              {/* Create Secret Form */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <PlusIcon className="h-4 w-4" />
                      Create Secret
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 bg-transparent"
                      onClick={() => setIsListDialogOpen(true)}
                    >
                      <ListIcon className="h-3 w-3" />
                      List
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="secret-name" className="text-xs">
                        Name
                      </Label>
                      <Input
                        id="secret-name"
                        placeholder="SECRET_NAME"
                        value={secretName}
                        onChange={(e) => setSecretName(e.target.value.toUpperCase())}
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secret-value" className="text-xs">
                        Value
                      </Label>
                      <Input
                        id="secret-value"
                        type="password"
                        placeholder="Enter secret value"
                        value={secretValue}
                        onChange={(e) => setSecretValue(e.target.value)}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={createSecret}
                    disabled={!secretName || !secretValue || isCreating}
                    className="w-full"
                  >
                    {isCreating
                      ? "Creating..."
                      : bulkMode
                        ? `Create in ${selectedRepos.length * selectedEnvironments.length} locations`
                        : "Create Secret"}
                  </Button>
                </CardContent>
              </Card>

              {/* Existing Secrets */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <KeyIcon className="h-4 w-4" />
                    Existing Secrets ({secrets.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                    </div>
                  ) : secrets.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No secrets found</p>
                  ) : (
                    <div className="space-y-2">
                      {secrets.map((secret) => (
                        <div
                          key={secret.name}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
                        >
                          <div className="flex-1">
                            <p className="font-mono text-sm font-medium">{secret.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Updated {new Date(secret.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {editingSecret === secret.name ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="password"
                                  placeholder="New value"
                                  value={editSecretValue}
                                  onChange={(e) => setEditSecretValue(e.target.value)}
                                  className="w-32 h-8 text-xs"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => updateSecret(secret.name, editSecretValue)}
                                  disabled={!editSecretValue}
                                  className="h-8 px-2"
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingSecret("")
                                    setEditSecretValue("")
                                  }}
                                  className="h-8 px-2"
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingSecret(secret.name)
                                    setEditSecretValue("")
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <EditIcon className="h-3 w-3" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                      disabled={isDeleting === secret.name}
                                    >
                                      {isDeleting === secret.name ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                                      ) : (
                                        <TrashIcon className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Secret</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete the secret "{secret.name}"? This action cannot
                                        be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteSecret(secret.name)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="variables" className="space-y-4">
              {/* Create Variable Form */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <PlusIcon className="h-4 w-4" />
                      Create Variable
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 bg-transparent"
                      onClick={() => setIsListDialogOpen(true)}
                    >
                      <ListIcon className="h-3 w-3" />
                      List
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="variable-name" className="text-xs">
                        Name
                      </Label>
                      <Input
                        id="variable-name"
                        placeholder="VARIABLE_NAME"
                        value={variableName}
                        onChange={(e) => setVariableName(e.target.value.toUpperCase())}
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="variable-value" className="text-xs">
                        Value
                      </Label>
                      <Input
                        id="variable-value"
                        placeholder="Enter variable value"
                        value={variableValue}
                        onChange={(e) => setVariableValue(e.target.value)}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={createVariable}
                    disabled={!variableName || !variableValue || isCreating}
                    className="w-full"
                  >
                    {isCreating
                      ? "Creating..."
                      : bulkMode
                        ? `Create in ${selectedRepos.length * selectedEnvironments.length} locations`
                        : "Create Variable"}
                  </Button>
                </CardContent>
              </Card>

              {/* Existing Variables */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <SettingsIcon className="h-4 w-4" />
                    Existing Variables ({variables.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {variables.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No variables found</p>
                  ) : (
                    <div className="space-y-2">
                      {variables.map((variable) => (
                        <div
                          key={variable.name}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-sm font-medium">{variable.name}</p>
                            {editingVariable === variable.name ? (
                              <Input
                                value={editVariableValue}
                                onChange={(e) => setEditVariableValue(e.target.value)}
                                className="mt-1 font-mono text-xs"
                                placeholder="New value"
                              />
                            ) : (
                              <p className="font-mono text-xs text-muted-foreground truncate">{variable.value}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Updated {new Date(variable.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {editingVariable === variable.name ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => updateVariable(variable.name, editVariableValue)}
                                  disabled={!editVariableValue}
                                  className="h-8 px-2"
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingVariable("")
                                    setEditVariableValue("")
                                  }}
                                  className="h-8 px-2"
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingVariable(variable.name)
                                    setEditVariableValue(variable.value)
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <EditIcon className="h-3 w-3" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                      disabled={isDeleting === variable.name}
                                    >
                                      {isDeleting === variable.name ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                                      ) : (
                                        <TrashIcon className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Variable</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete the variable "{variable.name}"? This action
                                        cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteVariable(variable.name)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>

      <SecretsListDialog
        isOpen={isListDialogOpen}
        onClose={() => setIsListDialogOpen(false)}
        organization={organization}
        repository={repository}
        environment={environment}
        token={token}
      />
    </Dialog>
  )
}
