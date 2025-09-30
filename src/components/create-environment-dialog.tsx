"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { PlusIcon } from "@/components/icons"
import { toast } from "@/hooks/use-toast"
import { getGitHubApiUrl, getGitHubHeaders } from "@/lib/github-api"

interface Repository {
  name: string
  full_name: string
}

interface CreateEnvironmentDialogProps {
  isOpen: boolean
  onClose: () => void
  organization: string
  token: string
  repositories: Repository[]
  onEnvironmentCreated?: () => void
}

interface CreationResult {
  repo: string
  success: boolean
  error?: string
}

export function CreateEnvironmentDialog({
  isOpen,
  onClose,
  organization,
  token,
  repositories,
  onEnvironmentCreated,
}: CreateEnvironmentDialogProps) {
  const [environmentName, setEnvironmentName] = useState("")
  const [selectedRepos, setSelectedRepos] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<CreationResult[]>([])

  const handleRepoSelection = (repoName: string, checked: boolean) => {
    if (checked) {
      setSelectedRepos([...selectedRepos, repoName])
    } else {
      setSelectedRepos(selectedRepos.filter((r) => r !== repoName))
    }
  }

  const selectAllRepos = () => {
    setSelectedRepos(repositories.map((r) => r.name))
  }

  const clearAllRepos = () => {
    setSelectedRepos([])
  }

  const createEnvironments = async () => {
    if (!environmentName.trim() || selectedRepos.length === 0) {
      return
    }

    setIsCreating(true)
    setProgress(0)
    setResults([])

    const totalOperations = selectedRepos.length
    let completedOperations = 0
    const creationResults: CreationResult[] = []

    for (const repo of selectedRepos) {
      try {
        const response = await fetch(
          `${getGitHubApiUrl()}/repos/${organization}/${repo}/environments/${environmentName}`,
          {
            method: "PUT",
            headers: {
              ...getGitHubHeaders(token),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
          },
        )

        creationResults.push({
          repo,
          success: response.ok,
          error: response.ok ? undefined : `HTTP ${response.status}`,
        })
      } catch (error) {
        creationResults.push({
          repo,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }

      completedOperations++
      setProgress((completedOperations / totalOperations) * 100)
    }

    setResults(creationResults)
    setIsCreating(false)

    const successCount = creationResults.filter((r) => r.success).length
    toast({
      title: "Environment Creation Complete",
      description: `Successfully created "${environmentName}" in ${successCount}/${totalOperations} repositories`,
    })

    if (onEnvironmentCreated) {
      onEnvironmentCreated()
    }
  }

  const resetForm = () => {
    setEnvironmentName("")
    setSelectedRepos([])
    setResults([])
    setProgress(0)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusIcon className="h-5 w-5" />
            Create Environment
          </DialogTitle>
          <DialogDescription>Create a new environment across multiple repositories in bulk</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Environment Name */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Environment Name</CardTitle>
              <CardDescription>Enter the name for the new environment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="env-name" className="text-xs">
                  Name
                </Label>
                <Input
                  id="env-name"
                  placeholder="e.g., production, staging, preview"
                  value={environmentName}
                  onChange={(e) => setEnvironmentName(e.target.value.toLowerCase())}
                  className="font-mono text-sm"
                  disabled={isCreating}
                />
              </div>
            </CardContent>
          </Card>

          {/* Repository Selection */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Select Repositories ({selectedRepos.length} selected)</CardTitle>
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
                        id={`create-env-repo-${repo.name}`}
                        checked={selectedRepos.includes(repo.name)}
                        onCheckedChange={(checked) => handleRepoSelection(repo.name, checked as boolean)}
                        disabled={isCreating}
                      />
                      <Label htmlFor={`create-env-repo-${repo.name}`} className="text-sm flex-1">
                        {repo.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Create Button */}
          <Button
            onClick={createEnvironments}
            disabled={!environmentName || selectedRepos.length === 0 || isCreating}
            className="w-full"
          >
            {isCreating
              ? "Creating Environments..."
              : `Create "${environmentName}" in ${selectedRepos.length} ${selectedRepos.length === 1 ? "Repository" : "Repositories"}`}
          </Button>

          {/* Progress Section */}
          {isCreating && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Creation Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Progress value={progress} className="w-full" />
                  <p className="text-xs text-muted-foreground text-center">{Math.round(progress)}% complete</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Section */}
          {results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Creation Results</CardTitle>
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
                          <span className="font-mono text-xs">{result.repo}</span>
                        </div>
                        {result.error && <span className="text-xs text-muted-foreground">{result.error}</span>}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={resetForm} disabled={isCreating}>
              Reset Form
            </Button>
            <Button variant="outline" onClick={handleClose} disabled={isCreating}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
