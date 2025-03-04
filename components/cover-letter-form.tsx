"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { LoadingState } from "@/components/loading-state";
import { ResultsDisplay } from "@/components/results-display";

const MAX_JOB_DESCRIPTION_LENGTH = 2000;
const MAX_COMPANY_PROFILE_LENGTH = 1000;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const formSchema = z.object({
  jobDescription: z
    .string()
    .min(1, "Job description is required")
    .max(
      MAX_JOB_DESCRIPTION_LENGTH,
      `Job description must be less than ${MAX_JOB_DESCRIPTION_LENGTH} characters`
    ),
  companyProfile: z
    .string()
    .min(1, "Company profile is required")
    .max(
      MAX_COMPANY_PROFILE_LENGTH,
      `Company profile must be less than ${MAX_COMPANY_PROFILE_LENGTH} characters`
    ),
  maxWords: z
    .number()
    .min(100, "Minimum word count is 100")
    .max(1000, "Maximum word count is 1000"),
  cvFile: z
    .any()
    .refine(
      (files) => {
        return files instanceof FileList && files.length > 0;
      },
      {
        message: "CV file is required",
      }
    )
    .refine(
      (files) => {
        if (!(files instanceof FileList) || files.length === 0) return false;
        return files[0]?.type === "application/pdf";
      },
      {
        message: "Only PDF files are accepted",
      }
    )
    .refine(
      (files) => {
        if (!(files instanceof FileList) || files.length === 0) return false;
        return files[0]?.size <= MAX_FILE_SIZE;
      },
      {
        message: "File size must be less than 5MB",
      }
    ),
});

type FormValues = z.infer<typeof formSchema>;

export function CoverLetterForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobDescription: "",
      companyProfile: "",
      maxWords: 200,
    },
  });

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    setCurrentStep("Preparing your CV for analysis...");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("jobDescription", data.jobDescription);
      formData.append("companyProfile", data.companyProfile);
      formData.append("maxWords", data.maxWords.toString());
      formData.append("cvFile", data.cvFile[0]);

      setCurrentStep("Analyzing your CV and job requirements...");

      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate cover letter");
      }

      setCurrentStep("Crafting your personalized cover letter...");

      const result = await response.json();
      setCoverLetter(result.coverLetter);
    } catch (err) {
      console.error("Error generating cover letter:", err);
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsSubmitting(false);
      setCurrentStep(null);
    }
  }

  const resetForm = () => {
    setCoverLetter(null);
    setError(null);
    form.reset();
  };

  if (coverLetter) {
    return <ResultsDisplay coverLetter={coverLetter} onReset={resetForm} />;
  }

  return (
    <Card className="p-6">
      {isSubmitting ? (
        <LoadingState currentStep={currentStep} />
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="jobDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Job Description <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Paste the job description here"
                        className="min-h-[120px]"
                        {...field}
                      />
                      <div className="text-xs text-muted-foreground text-right">
                        {field.value.length}/{MAX_JOB_DESCRIPTION_LENGTH}{" "}
                        characters
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Include the full job description to help generate a more
                    relevant cover letter.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="companyProfile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Company Profile <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Provide information about the company"
                        className="min-h-[100px]"
                        {...field}
                      />
                      <div className="text-xs text-muted-foreground text-right">
                        {field.value.length}/{MAX_COMPANY_PROFILE_LENGTH}{" "}
                        characters
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Include details about the company culture, values, and
                    mission.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cvFile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Upload CV <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files) {
                          field.onChange(files);
                        }
                      }}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      disabled={field.disabled}
                    />
                  </FormControl>
                  <FormDescription>
                    Upload your CV in PDF format (max 5MB).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxWords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Maximum Word Count{" "}
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={100}
                      max={250}
                      {...field}
                      onChange={(e) =>
                        field.onChange(Number.parseInt(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Recommended range: 100-200 words.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive rounded-md text-destructive text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !form.formState.isValid}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Generate Cover Letter
            </Button>
          </form>
        </Form>
      )}
    </Card>
  );
}
