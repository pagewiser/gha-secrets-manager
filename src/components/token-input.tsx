"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { KeyIcon } from "@/components/icons"

interface TokenInputProps {
  onSubmit: (token: string) => void
  loading: boolean
}

export function TokenInput({ onSubmit, loading }: TokenInputProps) {
  const [token, setToken] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (token.trim()) {
      onSubmit(token.trim())
    }
  }

  const isEnterprise = !!process.env.NEXT_PUBLIC_GITHUB_ENTERPRISE_URL

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <KeyIcon className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">{isEnterprise ? "GitHub Enterprise" : "GitHub"} Access Token</CardTitle>
          <CardDescription className="text-balance">
            Enter your {isEnterprise ? "GitHub Enterprise" : "GitHub"} personal access token to manage your
            organization's repositories and environments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="font-mono"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Token needs: <code className="text-xs bg-muted px-1 py-0.5 rounded">repo</code>,{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">admin:org</code>,{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">admin:repo_hook</code> scopes
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={!token.trim() || loading}>
              {loading ? "Connecting..." : `Connect to ${isEnterprise ? "GitHub Enterprise" : "GitHub"}`}
            </Button>
          </form>
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Your token is stored in memory only and will be requested each time you access the app
            </p>
            {isEnterprise && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Connected to: {process.env.NEXT_PUBLIC_GITHUB_ENTERPRISE_URL}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
