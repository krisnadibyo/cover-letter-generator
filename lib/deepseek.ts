// @ts-expect-error - No type definitions for pdf-parse
import pdfParse from "pdf-parse";

interface GenerateCoverLetterParams {
  jobDescription: string;
  companyProfile: string;
  cvBuffer: Buffer;
  maxWords: number;
  stream?: boolean;
}

export async function generateCoverLetter({
  jobDescription,
  companyProfile,
  cvBuffer,
  maxWords,
  stream = true,
}: GenerateCoverLetterParams): Promise<Response | string> {
  try {
    // Extract text from the PDF
    const pdfData = await pdfParse(cvBuffer);
    const cvText = pdfData.text;

    console.log("Extracted CV text length:", cvText.length);

    // Create the prompt with CV text included
    const prompt = `
You are a professional cover letter writer. Your task is to generate a tailored cover letter based on the following information:

Job Description:
${jobDescription}

Company Profile:
${companyProfile}

CV Content:
${cvText}

Based on the above CV content, please:
1. Identify relevant skills and experience
2. Extract professional achievements
3. Understand the candidate's background and qualifications

The cover letter should:
1. Be professional and engaging
2. Highlight relevant experience from the CV that matches the job description
3. Demonstrate understanding of the company based on the profile
4. Include a strong opening and closing
5. Be approximately at ${maxWords} words max in length
6. Only include the cover letter text, no need to include headers or footers
7. Use appropriate line breaks between paragraphs
8. Include proper spacing and formatting
9. Not include any placeholders or fields to be filled in later

IMPORTANT: Use proper paragraph breaks and formatting. Each paragraph should be separated by a blank line.
`;

    console.log("Prompt length:", prompt.length);
    console.log("API Key available:", !!process.env.DEEPSEEK_API_KEY);
    console.log("Making API request to DeepSeek...");
    console.log("Streaming enabled:", stream);

    // Make the API request with streaming enabled if requested
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2048,
        stream: stream,
      }),
    });

    // Log the response status and headers for debugging
    console.log("Response status:", response.status);
    console.log(
      "Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const responseText = await response.text();
      console.error("API error response:", responseText);
      throw new Error(
        `API error (${response.status}): ${responseText.substring(0, 200)}...`
      );
    }

    // If streaming is enabled, create a direct passthrough of the stream
    if (stream) {
      console.log("Returning stream response directly");
      return response;
    }

    // For non-streaming requests, handle as before
    const responseText = await response.text();
    console.log("Response text preview:", responseText.substring(0, 200));

    // Try to parse as JSON if possible
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse response as JSON:", parseError);
      throw new Error(
        `Invalid JSON response (${response.status}): ${responseText.substring(
          0,
          200
        )}...`
      );
    }

    // Extract the generated cover letter from the response
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error(
        `Unexpected response format: ${JSON.stringify(data).substring(
          0,
          200
        )}...`
      );
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error("DeepSeek API error:", error);
    // Provide a more user-friendly error message
    if (error instanceof Error) {
      throw new Error(`Failed to generate cover letter: ${error.message}`);
    }
    throw new Error("Failed to generate cover letter due to an unknown error");
  }
}
