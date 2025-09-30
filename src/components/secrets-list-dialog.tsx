"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KeyIcon, SettingsIcon, ListIcon } from "@/components/icons"
import { toast } from "@/hooks/use-toast"
import { getGitHubApiUrl, getGitHubHeaders } from "@/lib/github-api"

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

interface SecretsListDialogProps {
  isOpen: boolean
  onClose: () => void
  organization: string
  repository: string
  environment: string
  token: string
}

export function SecretsListDialog({
  isOpen,
  onClose,
  organization,
  repository,
  environment,
  token,
}: SecretsListDialogProps) {
  const [secrets, setSecrets] = useState<Secret[]>([])
  const [variables, setVariables] = useState<Variable[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("secrets")

  useEffect(() => {
    if (isOpen) {
      fetchSecrets()
      fetchVariables()
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListIcon className="h-5 w-5" />
            Secrets & Variables List
          </DialogTitle>
          <DialogDescription>
            Viewing secrets and variables for <Badge variant="outline">{repository}</Badge> in{" "}
            <Badge variant="outline">{environment}</Badge>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="secrets">Secrets ({secrets.length})</TabsTrigger>
            <TabsTrigger value="variables">Variables ({variables.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="secrets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <KeyIcon className="h-4 w-4" />
                  Secrets
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : secrets.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No secrets found</p>
                ) : (
                  <div className="space-y-2">
                    {secrets.map((secret) => (
                      <div
                        key={secret.name}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
                      >
                        <div className="flex-1">
                          <p className="font-mono text-sm font-medium">{secret.name}</p>
                          <div className="flex gap-4 mt-1">
                            <p className="text-xs text-muted-foreground">
                              Created: {new Date(secret.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Updated: {new Date(secret.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          Secret
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="variables" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <SettingsIcon className="h-4 w-4" />
                  Variables
                </CardTitle>
              </CardHeader>
              <CardContent>
                {variables.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No variables found</p>
                ) : (
                  <div className="space-y-2">
                    {variables.map((variable) => (
                      <div
                        key={variable.name}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-sm font-medium">{variable.name}</p>
                          <p className="font-mono text-xs text-muted-foreground truncate mt-1">{variable.value}</p>
                          <div className="flex gap-4 mt-1">
                            <p className="text-xs text-muted-foreground">
                              Created: {new Date(variable.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Updated: {new Date(variable.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          Variable
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
