"use client"

import { useState } from "react"
import { Check, Copy, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface ResultsDisplayProps {
  coverLetter: string
  onReset: () => void
}

export function ResultsDisplay({ coverLetter, onReset }: ResultsDisplayProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(coverLetter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Your Generated Cover Letter</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-muted p-4 rounded-md whitespace-pre-wrap font-serif text-sm md:text-base leading-relaxed">
          {coverLetter}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onReset} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Create Another
        </Button>
        <Button onClick={handleCopy} className="gap-2">
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy to Clipboard
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

