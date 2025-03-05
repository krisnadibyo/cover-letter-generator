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
  const [streamedContent, setStreamedContent] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);

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
    setStreamedContent("");
    setIsInitialLoading(true);

    try {
      const formData = new FormData();
      formData.append("jobDescription", data.jobDescription);
      formData.append("companyProfile", data.companyProfile);
      formData.append("maxWords", data.maxWords.toString());
      formData.append("cvFile", data.cvFile[0]);

      // Set streaming mode immediately to show the UI
      setCurrentStep("Generating your cover letter...");
      setIsStreaming(true);

      // Use the fetch API to make the request
      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate cover letter");
      }

      // Check if the response is a stream
      if (response.headers.get("Content-Type")?.includes("text/event-stream")) {
        let fullContent = "";

        // Use the ReadableStream API for real-time updates
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Failed to get stream reader");
        }

        // Process the stream in real-time
        const processStream = async () => {
          try {
            const decoder = new TextDecoder();
            let receivedFirstChar = false;

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              // Decode the chunk
              const chunk = decoder.decode(value, { stream: true });

              // Process the SSE format
              const events = chunk.split("\n\n");

              for (const event of events) {
                if (event.startsWith("data: ") && event !== "data: [DONE]") {
                  // Extract the character (we're sending one character at a time)
                  const char = event.substring(6);

                  // Skip the initial message
                  if (char === "Starting to generate your cover letter...") {
                    continue;
                  }

                  // Turn off initial loading when we get the first real character
                  if (!receivedFirstChar) {
                    console.log(
                      "First character received, turning off loading:",
                      char
                    );
                    setIsInitialLoading(false);
                    receivedFirstChar = true;
                  }

                  // Handle special newline marker
                  if (char === "<NEWLINE>") {
                    fullContent += "\n";
                  } else {
                    fullContent += char;
                  }

                  // Update the UI immediately with each character
                  setStreamedContent(fullContent);

                  // Auto-scroll to the bottom
                  requestAnimationFrame(() => {
                    const contentContainer =
                      document.querySelector(".content-container");
                    if (contentContainer) {
                      contentContainer.scrollTop =
                        contentContainer.scrollHeight;
                    }
                  });
                } else if (event === "data: [DONE]") {
                  // Stream is complete
                  break;
                }
              }
            }

            // Process any remaining text
            const remaining = decoder.decode();
            if (remaining) {
              const events = remaining.split("\n\n");
              for (const event of events) {
                if (event.startsWith("data: ") && event !== "data: [DONE]") {
                  const char = event.substring(6);

                  // Skip the initial message
                  if (char === "Starting to generate your cover letter...") {
                    continue;
                  }

                  // Make sure loading is turned off if we get here
                  if (!receivedFirstChar) {
                    console.log(
                      "First character in remaining text, turning off loading:",
                      char
                    );
                    setIsInitialLoading(false);
                    receivedFirstChar = true;
                  }

                  // Handle special newline marker
                  if (char === "<NEWLINE>") {
                    fullContent += "\n";
                  } else {
                    fullContent += char;
                  }

                  setStreamedContent(fullContent);
                }
              }
            }

            // Set the final content
            setCoverLetter(fullContent);

            // Ensure loading is turned off at the end
            if (isInitialLoading) {
              console.log("Stream complete, turning off loading");
              setIsInitialLoading(false);
            }
          } catch (streamError) {
            console.error("Error processing stream:", streamError);
            throw new Error("Failed to process streaming response");
          }
        };

        // Start processing the stream
        await processStream();
      } else {
        // Fallback to JSON response if not streaming
        const result = await response.json();
        setCoverLetter(result.coverLetter);
      }
    } catch (err) {
      console.error("Error generating cover letter:", err);
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsSubmitting(false);
      setCurrentStep(null);
      setIsStreaming(false);
    }
  }

  const resetForm = () => {
    setCoverLetter(null);
    setError(null);
    setStreamedContent("");
    form.reset();
  };

  if (coverLetter) {
    return <ResultsDisplay coverLetter={coverLetter} onReset={resetForm} />;
  }

  return (
    <Card className="p-6">
      {isSubmitting ? (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">
            {isStreaming
              ? "Generating your cover letter in real-time..."
              : currentStep || "Processing..."}
          </h3>

          {isStreaming ? (
            <div className="relative">
              <div
                className="content-container border p-4 rounded-md bg-muted/50 whitespace-pre-wrap min-h-[300px] max-h-[500px] overflow-y-auto"
                style={{
                  lineHeight: "1.6",
                  letterSpacing: "0.01em",
                  fontFamily: "Georgia, serif",
                  fontSize: "1rem",
                  padding: "1.5rem",
                  whiteSpace: "pre-wrap",
                }}
              >
                {isInitialLoading ? (
                  <div className="flex flex-col items-center justify-center h-[250px]">
                    <div className="relative w-16 h-16">
                      <div className="absolute top-0 left-0 w-full h-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                      <div
                        className="absolute top-1 left-1 w-14 h-14 border-4 border-t-transparent border-r-primary border-b-transparent border-l-transparent rounded-full animate-spin"
                        style={{
                          animationDirection: "reverse",
                          animationDuration: "1.5s",
                        }}
                      ></div>
                    </div>
                    <p className="mt-4 text-muted-foreground">
                      Crafting your personalized cover letter...
                    </p>
                  </div>
                ) : (
                  <>
                    {streamedContent}
                    {/* Blinking cursor effect at the end of the text */}
                    <span
                      className="inline-block animate-pulse ml-[1px] align-middle"
                      style={{
                        height: "1.2em",
                        width: "2px",
                        backgroundColor: "#000",
                        marginLeft: "1px",
                        position: "relative",
                        top: "2px",
                      }}
                    ></span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <LoadingState currentStep={currentStep} />
          )}
        </div>
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
