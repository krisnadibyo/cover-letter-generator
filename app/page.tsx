import { CoverLetterForm } from "@/components/cover-letter-form"

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Cover Letter Generator</h1>
        <p className="text-muted-foreground">
          Generate tailored cover letters based on your CV, job description, and company profile
        </p>
      </div>
      <CoverLetterForm />
    </main>
  )
}

