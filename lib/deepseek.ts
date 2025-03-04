// @ts-expect-error - No type definitions for pdf-parse
import pdfParse from "pdf-parse";

interface GenerateCoverLetterParams {
  jobDescription: string;
  companyProfile: string;
  cvBuffer: Buffer;
  maxWords: number;
}

export async function generateCoverLetter({
  jobDescription,
  companyProfile,
  cvBuffer,
  maxWords,
}: GenerateCoverLetterParams): Promise<string> {
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
5. Be approximately ${maxWords} words in length
6. Follow standard cover letter formatting
7. Not include any placeholders or fields to be filled in later
`;

    console.log("Prompt length:", prompt.length);
    console.log("API Key available:", !!process.env.DEEPSEEK_API_KEY);
    // Make the API request - using the correct endpoint from the documentation
    console.log("Making API request to DeepSeek...");
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
      }),
    });

    // Log the response status and headers for debugging
    console.log("Response status:", response.status);
    console.log(
      "Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    // Get the response text first to check what's being returned
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

    if (!response.ok) {
      console.error("API error response:", responseText);
      throw new Error(
        `API error (${response.status}): ${responseText.substring(0, 200)}...`
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
