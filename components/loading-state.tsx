import { Loader2 } from "lucide-react"

interface LoadingStateProps {
  currentStep: string | null
}

export function LoadingState({ currentStep }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <h3 className="text-xl font-medium mb-2">Generating your cover letter</h3>
      {currentStep && <p className="text-muted-foreground">{currentStep}</p>}
      <div className="mt-8 max-w-md text-sm text-muted-foreground text-center">
        <p>
          We&apos;re analyzing your CV and crafting a personalized cover letter that highlights your relevant skills and
          experience. This may take a moment.
        </p>
      </div>
    </div>
  )
}

