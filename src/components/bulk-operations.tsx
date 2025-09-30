"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PlusIcon, SettingsIcon } from "@/components/icons"
import { toast } from "@/hooks/use-toast"
import { getGitHubApiUrl, getGitHubHeaders } from "@/lib/github-api"

interface Repository {
  name: string
  full_name: string
}

interface BulkOperationsProps {
  organization: string
  token: string
  repositories: Repository[]
  isOpen?: boolean
  onClose?: () => void
  preset?: { repo?: string; env?: string } | null
  onEnvironmentCreated?: () => void
  trigger?: React.ReactNode
}

interface OperationResult {
  repo: string
  environment: string
  success: boolean
  error?: string
}

const COMMON_ENVIRONMENTS = ["production", "staging", "development", "preview"]

export function BulkOperations({
  organization,
  token,
  repositories,
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  preset,
  onEnvironmentCreated,
  trigger,
}: BulkOperationsProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [selectedRepos, setSelectedRepos] = useState<string[]>([])
  const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>([])
  const [secretName, setSecretName] = useState("")
  const [secretValue, setSecretValue] = useState("")
  const [variableName, setVariableName] = useState("")
  const [variableValue, setVariableValue] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<OperationResult[]>([])
  const [activeTab, setActiveTab] = useState("secrets")

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen
  const setIsOpen = controlledOnClose ? (open: boolean) => !open && controlledOnClose() : setInternalIsOpen

  useEffect(() => {
    if (isOpen && preset) {
      if (preset.repo) {
        setSelectedRepos([preset.repo])
      }
      if (preset.env) {
        setSelectedEnvironments([preset.env])
      }
    }
  }, [isOpen, preset])

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

  const selectAllRepos = () => {
    setSelectedRepos(repositories.map((r) => r.name))
  }

  const clearAllRepos = () => {
    setSelectedRepos([])
  }

  const selectAllEnvs = () => {
    setSelectedEnvironments([...COMMON_ENVIRONMENTS])
  }

  const clearAllEnvs = () => {
    setSelectedEnvironments([])
  }

  const createEnvironmentIfNeeded = async (repoName: string, envName: string): Promise<boolean> => {
    try {
      const checkResponse = await fetch(
        `${getGitHubApiUrl()}/repos/${organization}/${repoName}/environments/${envName}`,
        {
          headers: getGitHubHeaders(token),
        },
      )

      if (checkResponse.status === 404) {
        const createResponse = await fetch(
          `${getGitHubApiUrl()}/repos/${organization}/${repoName}/environments/${envName}`,
          {
            method: "PUT",
            headers: {
              ...getGitHubHeaders(token),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
          },
        )
        if (createResponse.ok && onEnvironmentCreated) {
          onEnvironmentCreated()
        }
        return createResponse.ok
      }

      return checkResponse.ok
    } catch (error) {
      console.error(`Error creating environment ${envName} for ${repoName}:`, error)
      return false
    }
  }

  const bulkCreateSecrets = async () => {
    if (!secretName.trim() || !secretValue.trim() || selectedRepos.length === 0 || selectedEnvironments.length === 0) {
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setResults([])

    const totalOperations = selectedRepos.length * selectedEnvironments.length
    let completedOperations = 0
    const operationResults: OperationResult[] = []

    for (const repo of selectedRepos) {
      for (const env of selectedEnvironments) {
        try {
          const envCreated = await createEnvironmentIfNeeded(repo, env)
          if (!envCreated) {
            operationResults.push({
              repo,
              environment: env,
              success: false,
              error: "Failed to create/access environment",
            })
            completedOperations++
            setProgress((completedOperations / totalOperations) * 100)
            continue
          }

          const response = await fetch(
            `${getGitHubApiUrl()}/repos/${organization}/${repo}/environments/${env}/secrets/${secretName}`,
            {
              method: "PUT",
              headers: {
                ...getGitHubHeaders(token),
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                encrypted_value: btoa(secretValue),
              }),
            },
          )

          operationResults.push({
            repo,
            environment: env,
            success: response.ok,
            error: response.ok ? undefined : `HTTP ${response.status}`,
          })
        } catch (error) {
          operationResults.push({
            repo,
            environment: env,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          })
        }

        completedOperations++
        setProgress((completedOperations / totalOperations) * 100)
      }
    }

    setResults(operationResults)
    setIsProcessing(false)

    const successCount = operationResults.filter((r) => r.success).length
    toast({
      title: "Bulk Secret Creation Complete",
      description: `Successfully created secret in ${successCount}/${totalOperations} locations`,
    })
  }

  const bulkCreateVariables = async () => {
    if (
      !variableName.trim() ||
      !variableValue.trim() ||
      selectedRepos.length === 0 ||
      selectedEnvironments.length === 0
    ) {
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setResults([])

    const totalOperations = selectedRepos.length * selectedEnvironments.length
    let completedOperations = 0
    const operationResults: OperationResult[] = []

    for (const repo of selectedRepos) {
      for (const env of selectedEnvironments) {
        try {
          const envCreated = await createEnvironmentIfNeeded(repo, env)
          if (!envCreated) {
            operationResults.push({
              repo,
              environment: env,
              success: false,
              error: "Failed to create/access environment",
            })
            completedOperations++
            setProgress((completedOperations / totalOperations) * 100)
            continue
          }

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

          operationResults.push({
            repo,
            environment: env,
            success: response.ok,
            error: response.ok ? undefined : `HTTP ${response.status}`,
          })
        } catch (error) {
          operationResults.push({
            repo,
            environment: env,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          })
        }

        completedOperations++
        setProgress((completedOperations / totalOperations) * 100)
      }
    }

    setResults(operationResults)
    setIsProcessing(false)

    const successCount = operationResults.filter((r) => r.success).length
    toast({
      title: "Bulk Variable Creation Complete",
      description: `Successfully created variable in ${successCount}/${totalOperations} locations`,
    })
  }

  const resetForm = () => {
    setSelectedRepos([])
    setSelectedEnvironments([])
    setSecretName("")
    setSecretValue("")
    setVariableName("")
    setVariableValue("")
    setResults([])
    setProgress(0)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Bulk Operations
          </DialogTitle>
          <DialogDescription>
            Create secrets and variables across multiple repositories and environments
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Repositories ({selectedRepos.length} selected)</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={selectAllRepos} className="text-xs h-7 bg-transparent">
                      Select All
                    </Button>
                    <Button size="sm" variant="outline" onClick={clearAllRepos} className="text-xs h-7 bg-transparent">
                      Clear
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {repositories.map((repo) => (
                      <div key={repo.name} className="flex items-center space-x-2">
                        <Checkbox
                          id={`bulk-repo-${repo.name}`}
                          checked={selectedRepos.includes(repo.name)}
                          onCheckedChange={(checked) => handleRepoSelection(repo.name, checked as boolean)}
                        />
                        <Label htmlFor={`bulk-repo-${repo.name}`} className="text-sm flex-1">
                          {repo.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Environments ({selectedEnvironments.length} selected)</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={selectAllEnvs} className="text-xs h-7 bg-transparent">
                      Select All
                    </Button>
                    <Button size="sm" variant="outline" onClick={clearAllEnvs} className="text-xs h-7 bg-transparent">
                      Clear
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {COMMON_ENVIRONMENTS.map((env) => (
                    <div key={env} className="flex items-center space-x-2">
                      <Checkbox
                        id={`bulk-env-${env}`}
                        checked={selectedEnvironments.includes(env)}
                        onCheckedChange={(checked) => handleEnvSelection(env, checked as boolean)}
                      />
                      <Label htmlFor={`bulk-env-${env}`} className="text-sm capitalize">
                        {env}
                      </Label>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    Environments will be created automatically if they don't exist
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="secrets">Bulk Secrets</TabsTrigger>
              <TabsTrigger value="variables">Bulk Variables</TabsTrigger>
            </TabsList>

            <TabsContent value="secrets" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <PlusIcon className="h-4 w-4" />
                    Create Secret Across Selected Locations
                  </CardTitle>
                  <CardDescription>
                    This will create the secret in {selectedRepos.length} repositories across{" "}
                    {selectedEnvironments.length} environments ({selectedRepos.length * selectedEnvironments.length}{" "}
                    total operations)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bulk-secret-name" className="text-xs">
                        Secret Name
                      </Label>
                      <Input
                        id="bulk-secret-name"
                        placeholder="SECRET_NAME"
                        value={secretName}
                        onChange={(e) => setSecretName(e.target.value.toUpperCase())}
                        className="font-mono text-sm"
                        disabled={isProcessing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bulk-secret-value" className="text-xs">
                        Secret Value
                      </Label>
                      <Input
                        id="bulk-secret-value"
                        type="password"
                        placeholder="Enter secret value"
                        value={secretValue}
                        onChange={(e) => setSecretValue(e.target.value)}
                        className="font-mono text-sm"
                        disabled={isProcessing}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={bulkCreateSecrets}
                    disabled={
                      !secretName ||
                      !secretValue ||
                      selectedRepos.length === 0 ||
                      selectedEnvironments.length === 0 ||
                      isProcessing
                    }
                    className="w-full"
                  >
                    {isProcessing
                      ? "Creating Secrets..."
                      : `Create Secret in ${selectedRepos.length * selectedEnvironments.length} Locations`}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="variables" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <PlusIcon className="h-4 w-4" />
                    Create Variable Across Selected Locations
                  </CardTitle>
                  <CardDescription>
                    This will create the variable in {selectedRepos.length} repositories across{" "}
                    {selectedEnvironments.length} environments ({selectedRepos.length * selectedEnvironments.length}{" "}
                    total operations)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bulk-variable-name" className="text-xs">
                        Variable Name
                      </Label>
                      <Input
                        id="bulk-variable-name"
                        placeholder="VARIABLE_NAME"
                        value={variableName}
                        onChange={(e) => setVariableName(e.target.value.toUpperCase())}
                        className="font-mono text-sm"
                        disabled={isProcessing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bulk-variable-value" className="text-xs">
                        Variable Value
                      </Label>
                      <Input
                        id="bulk-variable-value"
                        placeholder="Enter variable value"
                        value={variableValue}
                        onChange={(e) => setVariableValue(e.target.value)}
                        className="font-mono text-sm"
                        disabled={isProcessing}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={bulkCreateVariables}
                    disabled={
                      !variableName ||
                      !variableValue ||
                      selectedRepos.length === 0 ||
                      selectedEnvironments.length === 0 ||
                      isProcessing
                    }
                    className="w-full"
                  >
                    {isProcessing
                      ? "Creating Variables..."
                      : `Create Variable in ${selectedRepos.length * selectedEnvironments.length} Locations`}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {isProcessing && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Operation Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Progress value={progress} className="w-full" />
                  <p className="text-xs text-muted-foreground text-center">{Math.round(progress)}% complete</p>
                </div>
              </CardContent>
            </Card>
          )}

          {results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Operation Results</CardTitle>
                <CardDescription>
                  {results.filter((r) => r.success).length} successful, {results.filter((r) => !r.success).length}{" "}
                  failed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {results.map((result, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant={result.success ? "default" : "destructive"} className="text-xs">
                            {result.success ? "Success" : "Failed"}
                          </Badge>
                          <span className="font-mono text-xs">
                            {result.repo}/{result.environment}
                          </span>
                        </div>
                        {result.error && <span className="text-xs text-muted-foreground">{result.error}</span>}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={resetForm} disabled={isProcessing}>
              Reset Form
            </Button>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isProcessing}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
