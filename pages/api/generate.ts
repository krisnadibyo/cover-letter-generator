import type { NextApiRequest, NextApiResponse } from "next";
import { generateCoverLetter } from "@/lib/deepseek";
import formidable from "formidable";
import { IncomingForm } from "formidable";
import fs from "fs";

// Disable the default body parser to handle form data
export const config = {
  api: {
    bodyParser: false,
  },
};

type ResponseData = {
  coverLetter?: string;
  message?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  console.log("API ROUTE CALLED - Pages Router");

  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ message: "Method not allowed. This API expects POST requests." });
  }

  try {
    // Parse form data
    const form = new IncomingForm();
    const [fields, files] = await new Promise<
      [formidable.Fields, formidable.Files]
    >((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve([fields, files]);
      });
    });

    // Extract form data
    const jobDescription = fields.jobDescription?.[0] || "";
    const companyProfile = fields.companyProfile?.[0] || "";
    const maxWords = parseInt(fields.maxWords?.[0] || "400");
    const useStream = true; // Always use streaming for better user experience

    // Get the CV file
    const cvFile = files.cvFile?.[0];
    if (!cvFile) {
      return res.status(400).json({ message: "CV file is required" });
    }

    // Read the file content
    const cvBuffer = await new Promise<Buffer>((resolve, reject) => {
      fs.readFile(
        cvFile.filepath,
        (err: NodeJS.ErrnoException | null, data: Buffer) => {
          if (err) return reject(err);
          resolve(data);
        }
      );
    });

    // Set up SSE headers for streaming
    if (useStream) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable buffering for Nginx
      });

      // Send an initial message to establish the connection
      res.write("data: \n\n");

      // Send a message to indicate processing has started
      res.write("data: Starting to generate your cover letter...\n\n");
    }

    // Generate the cover letter
    const result = await generateCoverLetter({
      jobDescription,
      companyProfile,
      cvBuffer,
      maxWords,
      stream: useStream,
    });

    // If streaming is enabled, process the stream
    if (useStream && result instanceof Response) {
      if (!result.body) {
        throw new Error("No response body from DeepSeek API");
      }

      const reader = result.body.getReader();

      try {
        // Send a message to indicate generation has started
        res.write("data: \n\n");

        // Variable to control typing speed
        let charCount = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Process the SSE data from DeepSeek
          const text = new TextDecoder().decode(value);
          const lines = text.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                // Parse the JSON data
                const jsonData = JSON.parse(line.substring(6));

                // Extract the content from the delta
                const content = jsonData.choices?.[0]?.delta?.content;
                if (content) {
                  // Send each character individually for a real typing effect
                  for (const char of content) {
                    // Special handling for newlines to ensure proper formatting
                    if (char === "\n") {
                      // Send a special marker for newlines that the client will interpret
                      res.write(`data: <NEWLINE>\n\n`);
                    } else {
                      // Send regular characters as normal
                      res.write(`data: ${char}\n\n`);
                    }

                    charCount++;

                    // Add a tiny delay between characters for a more realistic typing effect
                    // Vary the delay based on character type and position
                    if (char === "." || char === "!" || char === "?") {
                      // Longer pause after sentence endings
                      await new Promise((resolve) => setTimeout(resolve, 30));
                    } else if (char === "," || char === ";" || char === ":") {
                      // Medium pause after punctuation
                      await new Promise((resolve) => setTimeout(resolve, 20));
                    } else if (char === " " || char === "\n") {
                      // Short pause after spaces and newlines
                      await new Promise((resolve) => setTimeout(resolve, 10));
                    } else if (charCount % 15 === 0) {
                      // Occasional slight pause for realism
                      await new Promise((resolve) => setTimeout(resolve, 5));
                    } else {
                      // Minimal pause between regular characters for faster typing
                      await new Promise((resolve) => setTimeout(resolve, 2));
                    }
                  }
                }
              } catch {
                // Silently continue on parse errors
              }
            }
          }
        }
      } catch (streamError) {
        console.error("Stream processing error:", streamError);
      } finally {
        // Send a completion message
        res.write("data: [DONE]\n\n");
        res.end();
      }
      return;
    } else if (!useStream) {
      // For non-streaming requests
      return res.status(200).json({ coverLetter: result as string });
    } else {
      // Fallback if streaming failed
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }
  } catch (error) {
    console.error("Error:", error);
    if (res.headersSent) {
      // If headers are already sent, we need to end the response
      res.write(
        `data: ${JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
        })}\n\n`
      );
      res.write("data: [DONE]\n\n");
      res.end();
    } else {
      return res.status(500).json({
        message: "Failed to generate cover letter",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
