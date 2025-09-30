"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BuildingIcon } from "@/components/icons"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Organization {
  id: number
  login: string
  avatar_url: string
  description?: string
}

interface OrganizationSelectorProps {
  organizations: Organization[]
  onSelect: (org: Organization) => void
  loading: boolean
}

export function OrganizationSelector({ organizations, onSelect, loading }: OrganizationSelectorProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading organizations...</p>
        </div>
      </div>
    )
  }

  if (organizations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <BuildingIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>No Organizations Found</CardTitle>
            <CardDescription>
              You don't have access to any organizations with the provided token. Make sure your token has the correct
              permissions.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-foreground mb-2">Select Organization</h2>
        <p className="text-muted-foreground">Choose an organization to manage its repositories and environments</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {organizations.map((org) => (
          <Card key={org.id} className="hover:bg-accent/50 transition-colors cursor-pointer group">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={org.avatar_url || "/placeholder.svg"} alt={org.login} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {org.login.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{org.login}</CardTitle>
                  {org.description && (
                    <CardDescription className="text-sm line-clamp-2">{org.description}</CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                onClick={() => onSelect(org)}
                className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                variant="outline"
              >
                Select Organization
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center pt-6 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Showing {organizations.length} organization{organizations.length !== 1 ? "s" : ""} accessible with your token
        </p>
      </div>
    </div>
  )
}
